import React, { useState, useEffect } from 'react';
import { getUserData } from '../../firebase/userService.js';
import { collection, doc, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Modal, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Box } from '@mui/material';
import { getDownloadURL, ref, getStorage } from 'firebase/storage';

import '../../styles/Budget.css';

function Budget() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [openReceiptModal, setOpenReceiptModal] = useState(false);

  // Firebase Storage reference
  const storage = getStorage();

  let userData = null;

    const fetchUserData = async () => {
        if (!userData) { // Fetch only if not already fetched
          try {
            userData = await getUserData();
            //console.log(`Fetched User Data:`, userData);
          } catch (error) {
            console.error('Failed to fetch user data:', error);
            throw error;
          }
        }
        return userData;
    };

  // Fetch the user's clean receipts from Firestore
  const fetchReceipts = async () => {    try {
      const userData = await getUserData();
      if (!userData) {
        console.error('User data not found.');
        return;
      }

      const userDocRef = doc(db, 'users', userData.uid);
      const crCollectionRef = collection(userDocRef, 'clean-receipts');
      const snapshot = await getDocs(crCollectionRef);

      const fetchedReceipts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setReceipts(fetchedReceipts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      setLoading(false);
    }
  };

  // Fetch receipt data by receiptId
  const fetchReceiptData = async (receiptId) => {
    try {
      const userData = await getUserData();
      if (!userData) {
        console.error('User data not found.');
        return null;
      }

      const userDocRef = doc(db, 'users', userData.uid);
      const receiptDocRef = doc(userDocRef, 'clean-receipts', receiptId);
      const docSnapshot = await getDoc(receiptDocRef);

      if (docSnapshot.exists()) {
        return docSnapshot.data(); // Return the receipt data
      } else {
        console.error('Receipt not found');
        return null;
      }
    } catch (error) {
      console.error('Error fetching receipt data:', error);
      return null;
    }
  };

  // Delete a receipt
  const handleDelete = async (receiptId) => {
    try {
      const userData = await getUserData();
      const userDocRef = doc(db, 'users', userData.uid);
      const receiptDocRef = doc(userDocRef, 'clean-receipts', receiptId);

      await deleteDoc(receiptDocRef);
      console.log('Receipt deleted successfully.');
      setReceipts((prev) => prev.filter((receipt) => receipt.id !== receiptId));
    } catch (error) {
      console.error('Error deleting receipt:', error);
    }
  };

  // Open modal and set selected receipt
  const handleOpenModal = (receipt) => {
    setSelectedReceipt(receipt);
    setOpen(true);
    setImageUrl(null); // Reset image URL when opening the modal
  };

  /// Updated handleViewReceipt to fetch image from Firebase Storage
const handleViewReceipt = async (receiptId) => {
  await fetchUserData();
  if (!userData) return;

  console.log("receipt: " + receiptId);

  try {
    // Fetch the receipt data (receiptInfo) from Firestore
    const userDocRef = doc(db, 'users', userData.uid);
    const receiptRef = doc(userDocRef, 'clean-receipts', receiptId);
    const receiptSnapshot = await getDoc(receiptRef);

    if (receiptSnapshot.exists()) {
      const receiptData = receiptSnapshot.data();

      // Fetch the imageBucketURL directly from the document (root level of clean-receipts)
      const imageBucketURL = receiptData.imageBucket; // Assuming the imageBucketURL is stored as 'imageBucket'

      if (imageBucketURL) {
        // Get the reference to the image in Firebase Storage using the imageBucketURL
        const imageRef = ref(storage, imageBucketURL);

        // Get the download URL of the image
        const imageUrl = await getDownloadURL(imageRef);

        // Set the image URL and open the modal
        setImageUrl(imageUrl); // Update state with the fetched image URL
        setSelectedReceipt(receiptData.receiptInfo); // Set the receipt info from receiptData
        setOpenReceiptModal(true); // Open the modal
      } else {
        console.error("Image URL not found in the receipt document.");
      }
    } else {
      console.error("Receipt document not found.");
    }
  } catch (error) {
    console.error("Error fetching receipt data or image URL: ", error);
  }
};

  // Close modal
  const handleCloseModal = () => {
    setOpen(false);
    setSelectedReceipt(null);
    setImageUrl(null); // Reset image URL when closing the modal
  };

  // Fetch receipts on component mount
  useEffect(() => {
    fetchReceipts();
  }, []);

  if (loading) return <div className="Budget"><h2>Loading receipts...</h2></div>;

  return (
    <div className="Budget">
      <h2>Manage Your Receipts</h2>
      {receipts.length === 0 ? (
        <p>No receipts found.</p>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Store Name</TableCell>
                <TableCell>Total Cost</TableCell>
                <TableCell>Number of Items</TableCell>
                <TableCell>View Receipt</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {receipts.map(({ id, receiptInfo }) => {
                const { store, total, transaction, items } = receiptInfo;
                const itemCount = items ? Object.keys(items).length : 0;

                return (
                  <TableRow key={id}>
                    <TableCell>{transaction ? new Date(transaction.datetime.seconds * 1000).toLocaleDateString() : 'Unknown'}</TableCell>
                    <TableCell>{store ? store.name : 'Unknown Store'}</TableCell>
                    <TableCell>{total ? total.grand_total.toFixed(2) : 'N/A'}</TableCell>
                    <TableCell>
                      <Button onClick={() => handleOpenModal(receiptInfo)}>View ({itemCount})</Button>
                    </TableCell>
                    <TableCell>
                      <Button onClick={() => handleViewReceipt(id)}>View Receipt</Button>
                    </TableCell>
                    <TableCell>
                      <Button onClick={() => handleDelete(id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal to show item details */}
      <Modal open={open} onClose={handleCloseModal}>
        <Box sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
            backgroundColor: 'white', padding: '20px', boxShadow: 24 }}>
          <h2>Items in Receipt</h2>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Unit Price</TableCell>
                  <TableCell>Savings</TableCell>
                  <TableCell>Other</TableCell>
                  <TableCell>Cost</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedReceipt?.items && Object.keys(selectedReceipt.items).map((itemName, index) => {
                  const item = selectedReceipt.items[itemName];

                  return (
                    <TableRow key={index}>
                      <TableCell>{itemName}</TableCell>
                      <TableCell>{item.quantity || 1}</TableCell>
                      <TableCell>{item.unit || 'N/A'}</TableCell>
                      <TableCell>{item.unitPrice ? (typeof item.unitPrice === 'object' ? JSON.stringify(item.unitPrice) : item.unitPrice) : 'N/A'}</TableCell>
                      <TableCell>{item.savings || 0}</TableCell>
                      <TableCell>{item.other ? (typeof item.other === 'object' ? JSON.stringify(item.other) : item.other) : 'N/A'}</TableCell>
                      <TableCell>{item.cost !== undefined ? item.cost.toFixed(2) : 'N/A'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Button onClick={handleCloseModal}>Close</Button>
        </Box>
      </Modal>

      {/* View Receipt Modal */}
      <Modal open={openReceiptModal} onClose={() => setOpenReceiptModal(false)}>
        <Box sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: 'white', padding: '20px', boxShadow: 24 }}>
          <h2>Receipt Details</h2>
          {loadingImage ? (
            <p>Loading image...</p>
          ) : (
            imageUrl && <img src={imageUrl} alt="Receipt" style={{ maxWidth: '100%' }} />
          )}
          <Button onClick={() => setOpenReceiptModal(false)}>Close</Button>
        </Box>
      </Modal>
    </div>
  );
}

export default Budget;


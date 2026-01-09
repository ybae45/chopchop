import React, { useState } from "react";
import { storage, db } from '../../firebase/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDoc, doc } from 'firebase/firestore';
import { v4 } from 'uuid';
import { Button, Dialog, DialogContent, DialogActions, Typography, Stack } from '@mui/material';
import './Orders.css'; // Import the Orders.css file

function Orders() {
    const [imageUpload, setImageUpload] = useState(null); // Selected image
    const [uploadedImageUrl, setUploadedImageUrl] = useState(null); // URL of uploaded image
    const [showDialog, setShowDialog] = useState(false); // To show/hide the modal
    const [documentId, setDocumentId] = useState(null); // Store the document ID

    // Handle file name change: No file selected --> input file
    const setFileData = (target) => {
    const file = target.files[0];
  
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (file && allowedTypes.includes(file.type)) {
      setImageUpload(file);
      uploadImage(file); // Trigger the upload immediately after selecting the file
    } else {
      alert("Only JPEG/JPG/PNGs"); // Display error if file type is not allowed
      setImageUpload(null); // Reset the selected image
    }
  };

  // Receipt(image)-> Firebase Storage + store document ID
  const uploadImage = (file) => {
    if (!file) return;

    const imageRef = ref(storage, `receipt-files/${v4()}_${file.name}`); // prevents duplicate file names
    uploadBytes(imageRef, file).then((snapshot) => {
      getDownloadURL(snapshot.ref).then((url) => {
        setUploadedImageUrl(url);

        const generatedDocumentId = snapshot.metadata.name;
        setDocumentId(generatedDocumentId); 
      });
    });
  };

  // Handle 'Cancel' button: 1. resets form (receipt image) 2. close modal
  const handleCancel = () => {
    setImageUpload(null); // Reset selected image
    setUploadedImageUrl(null); // Reset uploaded image URL
    setDocumentId(null); // Reset document ID
    setShowDialog(false); // Close the modal
  };

  // Handle Auto-parse button click
  const handleAutoParse = async () => {
    if (!documentId) {
      console.log("No document ID available");
      return;
    }

    console.log("Auto-parse clicked");

    // Fetch the parsed data using the stored document ID
    const parsedDataRef = doc(db, "receipts", documentId);
    const parsedDataSnapshot = await getDoc(parsedDataRef);

    if (parsedDataSnapshot.exists()) {
      const parsedData = parsedDataSnapshot.data();

      if (parsedData) {
        



      }
      console.log("Parsed Data:", parsedData);
      



    } else {
      console.log("No parsed data found.");
    }
  };

  // Handle Manual button click
  const handleManual = () => {
    console.log("Manual clicked");
    // Add your manual entry logic here
  };

  return (
    <div className="orders">
      <h2>Orders</h2>
      <div className="App">
        <Button variant="contained" onClick={() => setShowDialog(true)}>
          Add Receipt
        </Button>
      </div>

      {/* Form Dialog with custom class for larger size */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        className="custom-dialog" // Add custom class for styling
      >
        <Typography variant="h4" className="dialog-title">
          Add Receipt
        </Typography>
        <DialogContent>
          <Stack spacing={2} direction="row">
            <div style={{ flex: 1 }}>
              {/* Upload Receipt Button */}
              <Button variant="outlined" component="label" color="secondary">
                Upload Receipt
                <input
                  type="file"
                  hidden
                  onInput={(e) => setFileData(e.target)} // Handle file input immediately
                />
              </Button>
              <Typography>{imageUpload ? imageUpload.name : "No file selected"}</Typography>

              {/* Auto-parse and Manual buttons */}
              <div style={{ marginTop: "16px" }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAutoParse}
                  style={{ marginRight: "8px" }}
                >
                  Auto-parse
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleManual}
                >
                  Manual
                </Button>
              </div>
            </div>

            {/* Display uploaded receipt image */}
            {uploadedImageUrl && (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <img
                    src={uploadedImageUrl}
                    alt="Uploaded receipt"
                    className="uploaded-image"
                    />
                </div>
                )}
        </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="secondary">
            Cancel
          </Button>
          <Button onClick={() => setShowDialog(false)} color="primary" variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Orders;

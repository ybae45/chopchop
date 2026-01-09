// Import libraries
import React, { useState } from "react";
import { storage, db } from '../../firebase/firebaseConfig.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDoc, doc, collection, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import {getUserData} from '../../firebase/userService.js';
import { v4 } from 'uuid';
import { Button, Dialog, DialogContent, DialogActions, IconButton, Modal, Box, Typography, Stack, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DeleteIcon from '@mui/icons-material/Delete'; 
import '../../styles/Orders.css';

function Orders() {
    // Store states and variables
    const [imageUpload, setImageUpload] = useState(null);           // Receipt image
    const [uploadedImageUrl, setUploadedImageUrl] = useState(null); // Receipt URL
    const [showDialog, setShowDialog] = useState(false);            // Receipt upload modal
    const [documentId, setDocumentId] = useState(null);             // Receipt docID
    const [showForm, setShowForm] = useState(false);                // Form visibility
    const [storeName, setStoreName] = useState("");                 // Store name
    const [date, setDate] = useState(null);                         // State for date
    const [totalCost, setTotalCost] = useState("");                 // State for total cost
    const [item, setItem] = useState("");                           // State for item input
    const [itemCost, setItemCost] = useState("");                   // State for item cost input

    const [items, setItems] = useState([
        { itemName: '', id: '', cost: '', expiration: '', reminderDate: null },
    ]);

    const [openReminderModal, setOpenReminderModal] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    //const [notificationActive, setNotificationActive] = useState(false);

    // Track user login information
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

    // Handle file name change: No file selected --> input file name
    const setFileData = (target) => {
        const file = target.files[0];
    
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (file && allowedTypes.includes(file.type)) {
            setImageUpload(file);
            uploadImage(file); // Trigger upload immediately after selecting the file
        } else {
            alert("Only JPEG/JPG/PNGs"); 
            setImageUpload(null); // Reset the selected image
        }
    };

    // Receipt(image)-> Firebase Storage + store document ID
    const uploadImage = async (file) => {
        await fetchUserData();
        if (!file | !userData) return;

        const imageRef = ref(storage, `users/${userData.uid}/receipts/${v4()}_${file.name}`); // prevent duplicate file names
        console.log(imageRef);

        //const imageRef = ref(storage, `receipt-files/${v4()}_${file.name}`); // prevents duplicate file names
        uploadBytes(imageRef, file).then((snapshot) => {
            getDownloadURL(snapshot.ref).then((url) => {
                setUploadedImageUrl(url);

                const generatedDocumentId = snapshot.metadata.name.split('_')[0];
                setDocumentId(generatedDocumentId); 
            });
        });
    };

    // Handle 'Cancel' button: 1. resets form (receipt image) 2. close modal
    const handleCancel = () => {
        setImageUpload(null);           // Reset selected image
        setUploadedImageUrl(null);      // Reset uploaded image URL
        setDocumentId(null);            // Reset document ID
        setShowDialog(false);           // Close the modal
        setShowForm(false);             // Hide form when cancelling
        setStoreName("");               // Clear store name field
        setDate(null);                  // Clear date field
        setTotalCost("");               // Clear total cost field
        setItem("");                    // Clear item input
        setItemCost("");                // Clear item cost input
        setItems([]);                   // Clear items array
    };
    
    // Handle Save button: 1. filters out empty items, 2. saves form into Firestore, 3. reset form
    const handleSave = async () => {
        await fetchUserData();
        if (!userData) return;
    
        try {
            const validItems = items.filter(item => item.name && item.name.trim() !== "");
    
            if (validItems.length === 0) {
                console.error("No valid items to save.");
                return;
            }
    
            // Fetch the existing receipt document
            const userDocRef = doc(db, 'users', userData.uid);
            const receiptDocRef = doc(userDocRef, 'receipts', documentId);
            const receiptSnapshot = await getDoc(receiptDocRef);
    
            let receiptData = {
                receiptInfo: {
                    store: { name: storeName },
                    transaction: { datetime: date },
                    total: { grand_total: totalCost },
                    items: {} // Items will be built dynamically
                },
                timestamp: new Date() // timestamp of form submission
            };
    
            if (receiptSnapshot.exists()) {
                const existingData = receiptSnapshot.data();
    
                // Merge with existing data
                receiptData = {
                    ...existingData, // Keep all original data
                    receiptInfo: {
                        ...existingData.receiptInfo,
                        store: {
                            ...existingData.receiptInfo.store,
                            name: storeName // Override if updated in form
                        },
                        transaction: {
                            ...existingData.receiptInfo.transaction,
                            datetime: date // Override if updated in form
                        },
                        total: {
                            ...existingData.receiptInfo.total,
                            grand_total: totalCost // Override if updated in form
                        },
                        items: { ...existingData.receiptInfo.items }
                    }
                };
    
                // Update items if they were modified
                validItems.forEach(item => {
                    if (item.name in receiptData.receiptInfo.items) {
                        // Update existing item details
                        receiptData.receiptInfo.items[item.name] = {
                            ...receiptData.receiptInfo.items[item.name],
                            cost: item.cost // Update cost if modified
                        };
                    } else {
                        // Add new item
                        receiptData.receiptInfo.items[item.name] = {
                            cost: item.cost || "",
                            quantity: item.quantity || 1,
                            unit: item.unit || "",
                            unitPrice: item.unitPrice || "",
                            savings: item.savings || 0,
                            other: item.other || ""
                        };
                    }
                });
    
                // Remove items not in the form
                for (const name in receiptData.receiptInfo.items) {
                    if (!validItems.some(item => item.name === name)) {
                        delete receiptData.receiptInfo.items[name];
                    }
                }
            } else {
                console.warn("Original receipt not found. Proceeding with form data only.");
            }
    
            // Save updated data into 'clean-receipts'
            const crCollectionRef = collection(userDocRef, 'clean-receipts');
            await addDoc(crCollectionRef, receiptData);
    
            handleCancel(); // Reset the form
    
        } catch (error) {
            console.error("Error saving updated receipt: ", error);
        }
    };
    
    
    // Handle Auto-parse button: 1. show form, 2. retrieve data from firestore 3. autopopulate for Publix receiptds
    const handleAutoParse = async () => {
        await fetchUserData();
        if (!documentId | !userData) return;
        setShowForm(true);

        console.log(userData.uid);
        console.log(documentId);
      
    
        const userDocRef = doc(db, 'users', userData.uid);
        const parsedDataRef = doc(userDocRef, 'receipts', documentId);
        //const parsedDataRef = doc(db, "receipts", documentId);
        const parsedDataSnapshot = await getDoc(parsedDataRef);
        //console.log(parsedDataRef);
 
        if (parsedDataSnapshot.exists()) {
            const parsedData = parsedDataSnapshot.data();
            console.log(parsedData);
    
            if (parsedData && parsedData.receiptInfo?.store?.name) {
                const storeName = parsedData.receiptInfo.store.name;
                setStoreName(storeName);
    
                // If Publix receipt: 
                if (storeName.toLowerCase().includes("publix")) {
                    const grandTotal = parsedData.receiptInfo.total?.grand_total;
                    if (grandTotal) {
                        setTotalCost(grandTotal); // Auto-populate the total cost input
                    } else {
                        console.log("Invalid total cost");
                    }
                    const datetime = parsedData.receiptInfo?.transaction?.datetime;
                    if (datetime) {
                        const parsedDate = new Date(datetime); // Convert to Date object
                        if (!isNaN(parsedDate)) {
                            setDate(parsedDate); // Set the date state
                            console.log("Parsed Date:", parsedDate);
                        } else {
                            console.log("Invalid datetime format:", datetime);
                        }
                    } else {
                        console.log("Datetime not found in receiptInfo/transaction.");
                    }
    
                    // Ensure items is an array, even if it's missing
                    const itemsData = parsedData.receiptInfo.items || {};
                    
                    // Convert the items object to an array, and store the item UUID in each item
                    const itemsArray = Object.keys(itemsData).map(key => {
                        const item = itemsData[key];
                        
                        return {
                            id: item.id,
                            name: key,  // Item name is the key
                            cost: item.cost || "",  // Item cost
                            quantity: item.quantity || 1,  // Item quantity
                            unit: item.unit || "",  // Item unit
                            unitPrice: item.unitPrice || "",  // Item unit price
                            savings: item.savings || 0,  // Item savings
                            other: item.other || ""  // Any other details
                        };
                    });


                    setItems(itemsArray); // Set the items state with parsed item data
                    }
            } else {
                console.log("Parsed data does not include receiptInfo/store/name.");
            }
        }
    };
    
    
    // Handle Manual button click
    const handleAddItemBtn = () => {
        setItems([
            ...items, // Keep existing items
            { name: '', cost: '', reminderDate: null }, // Add new empty item
        ]);
    };

    // Handle reminder
    const handleReminderOpen = (rowIndex) => {
        setSelectedRow(rowIndex);
        setOpenReminderModal(true);
    };

    const handleReminderClose = () => {
        setOpenReminderModal(false);
    };

    const handleReminderDateChange = (newDate) => {
        setItems((prevItems) =>
          prevItems.map((item, index) =>
            index === selectedRow ? { ...item, reminderDate: newDate } : item
          )
        );
    };

    // Function to toggle the notification
    const handleToggleNotification = async (rowIndex) => {
        await fetchUserData();
        if (!userData) return;

        if (!items || rowIndex === undefined || rowIndex === null || rowIndex >= items.length) {
            console.error("Invalid rowIndex or items array is undefined");
            return;
        }
    
        const item = items[rowIndex];
        
        // turn off notifications
        if (item.reminderDate) {
            // Remove the reminder date from the item
            const updatedItems = [...items];
            updatedItems[rowIndex].reminderDate = null; // Set reminderDate to null (inactive)
            setItems(updatedItems);
    
            // Delete the item from Firestore using the document ID
            try {
                const userDocRef = doc(db, 'users', userData.uid);
                const itemRef = doc(userDocRef, 'fridge', item.id);

                await deleteDoc(itemRef); // Delete the document from Firestore
                console.log('Item successfully deleted from Firestore');
            } catch (error) {
                console.error('Error deleting item from Firestore: ', error);
            }
        } else {
            // If the reminderDate is not set, open the reminder modal
            handleReminderOpen(rowIndex);
        }
    };
    

    // Function to save item to Firestore (fridge collection)
    const saveToFridge = async () => {
        await fetchUserData();
        if (!userData) return;
        if (selectedRow !== null && items[selectedRow]) {
            const item = items[selectedRow];
            console.log(item);
    
            // Ensure no fields are undefined or null
            const itemName = item.name || null;
            const cost = item.cost || null;
            const quantity = item.quantity || null;
            const savings = item.savings || null;
            const unit = item.unit || null;
            const unitPrice = item.unitPrice || null;
            const reminderDate = item.reminderDate || null;
            const id = item.id || null;
    
            // Check if itemName is null or an empty string
            if (!itemName) {
                console.log('Item name is required. Item not saved.');
                return; // Exit the function if itemName is empty or null
            }
    
            try {
                // Add the item to Firestore and get the document reference
                if (id !== null) {
                    // If the item has an id, use setDoc to create or overwrite the document with that id
                    const userDocRef = doc(db, 'users', userData.uid);
                    const itemRef = doc(userDocRef, 'fridge', id); // Use the item.id as the document ID
                    await setDoc(itemRef, {
                        itemName,
                        id, 
                        cost,
                        quantity,
                        savings,
                        unit,
                        unitPrice,
                        reminderDate,
                    });
                    console.log('Item successfully saved/updated in fridge');
    
                }
    
            } catch (error) {
                console.error('Error saving item to fridge: ', error);
            }
        }
    };
    
    

    // New function to handle saving the reminder date, setting the alert, and saving to Firestore
    const handleSetAlert = () => {
        if (selectedRow !== null && items[selectedRow].reminderDate) {
            setItems((prevItems) =>
            prevItems.map((item, index) =>
                index === selectedRow
                ? { ...item, reminderDate: items[selectedRow].reminderDate }
                : item
            )
            );
            saveToFridge(); // Save the item to Firestore
            handleReminderClose(); // Close the modal
        }
    };

    // Function to handle row deletion
    const handleDeleteRow = async (index) => {
        console.log("Delete from form");
        setItems((prevItems) => prevItems.filter((_, i) => i !== index));
    };

    // Function to handle Manual
    const handleManual = () => {
        setShowForm(true);
    }


    return (
        <div className="orders">
            <h2>Track Shopping </h2>
            <div className="App">
                <Button variant="contained" onClick={() => setShowDialog(true)}>
                    Add Grocery Trip
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
                    <Stack spacing={1} direction="row" style={{ width: '100%' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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

                            {/* Auto-parse, Manual, and Add item buttons */}
                            <div style={{ marginTop: "8px" }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleAutoParse}
                                    style={{ marginRight: "8px" }}
                                >
                                    Read Receipt
                                </Button>
                                {/* Manual Button */}
                                <Button
                                    variant="contained"
                                    color="default"
                                    onClick={handleManual} // Assuming you have a handleManual function
                                    style={{ marginRight: "8px" }}
                                >
                                    Manual
                                </Button>
                                {/* Add item Button */}
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={handleAddItemBtn} // You can change this if it needs a different handler
                                >
                                    Add item
                                </Button>
                            </div>

                            {/* Display input form if Auto-parse is clicked */}
                            {showForm && (
                                <Stack spacing={2} style={{ marginTop: "10px" }}>
                                    <TextField
                                        label="Store Name"
                                        variant="outlined"
                                        fullWidth
                                        value={storeName}
                                        onChange={(e) => setStoreName(e.target.value)} // Handle store name input
                                    />
                                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                                        <DatePicker
                                            label="Date"
                                            value={date}
                                            onChange={(newValue) => setDate(newValue)} // Handle date input
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    variant="outlined"
                                                    fullWidth
                                                />
                                            )}
                                        />
                                    </LocalizationProvider>
                                    <TextField
                                        label="Total cost ($)"
                                        variant="outlined"
                                        fullWidth
                                        value={totalCost}
                                        onChange={(e) => setTotalCost(e.target.value)} // Handle total cost input
                                    />

                                    {/* Render item rows dynamically */}
                                    {items.map((item, index) => (
                                        <Stack direction="row" spacing={2} style={{ marginTop: "10px", height: "56px" }} key={index}>
                                            <TextField
                                                label="Item"
                                                variant="outlined"
                                                fullWidth
                                                value={item.name}
                                                onChange={(e) => {
                                                    const updatedItems = [...items];
                                                    updatedItems[index].name = e.target.value; // Update item name
                                                    setItems(updatedItems);
                                                }}
                                            />
                                            <TextField
                                                label="Cost ($)"
                                                variant="outlined"
                                                fullWidth
                                                value={item.cost}
                                                onChange={(e) => {
                                                    const updatedItems = [...items];
                                                    updatedItems[index].cost = e.target.value; // Update item cost
                                                    setItems(updatedItems);
                                                }}
                                            />
                                            {/* Notification Bell Icon */}
                                            <span onClick={() => handleToggleNotification(index)}>
                                                {item.reminderDate ? (
                                                    <NotificationsActiveIcon
                                                        style={{ cursor: 'pointer', color: 'green' }}
                                                    />
                                                ) : (
                                                    <NotificationsOffIcon
                                                        style={{ cursor: 'pointer', color: 'gray' }}
                                                    />
                                            )}
                                            </span>
                                            {/* Trash Button */}
                                            <span onClick={() => handleDeleteRow(index)}>
                                                <DeleteIcon style={{ cursor: 'pointer', color: 'rgba(211, 47, 47, 0.7)' }} />
                                            </span>
                                            
                                        </Stack>
                                    ))}
                                    {/* Reminder Modal */}
                                <Modal
                                    open={openReminderModal}
                                    onClose={handleReminderClose}
                                    aria-labelledby="reminder-modal-title"
                                    aria-describedby="reminder-modal-description"
                                >
                                    <Box
                                        style={{
                                            width: "400px",
                                            backgroundColor: "white",
                                            padding: "20px",
                                            margin: "100px auto",
                                            borderRadius: "8px",
                                            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
                                        }}
                                    >
                                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                                            <DatePicker
                                                label="Set Reminder Date"
                                                value={
                                                    selectedRow !== null && items[selectedRow] // Check if selectedRow is valid
                                                        ? items[selectedRow].reminderDate || null // Provide fallback if reminderDate is undefined
                                                        : null
                                                }
                                                onChange={handleReminderDateChange}
                                                renderInput={(params) => <TextField {...params} fullWidth />}
                                            />
                                        </LocalizationProvider>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={handleSetAlert}
                                            style={{ marginTop: '16px' }}
                                            >
                                            Set Alert
                                        </Button>
                                    </Box>
                                </Modal>
                                </Stack>
                            )}

                        </div>

                        {/* Display uploaded receipt image */}
                        {uploadedImageUrl && (
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <img
                                    src={uploadedImageUrl}
                                    alt="Uploaded receipt"
                                    className="uploaded-image"
                                    style={{ maxHeight: '100%', maxWidth: '100%' }}
                                />
                            </div>
                        )}
                    </Stack>
                
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleSave} color="primary" variant="contained"> Save </Button>
                    <Button onClick={handleCancel} color="secondary"> Cancel</Button>
                    <Button onClick={() => setShowDialog(false)} color="primary" variant="contained">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Orders;


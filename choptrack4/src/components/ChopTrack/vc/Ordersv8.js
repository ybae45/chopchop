import React, { useState } from "react";
import { storage, db } from '../../firebase/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDoc, doc, collection, addDoc, deleteDoc } from 'firebase/firestore';
import { v4 } from 'uuid';
import { Button, Dialog, DialogContent, DialogActions, IconButton, Modal, Box, Typography, Stack, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DeleteIcon from '@mui/icons-material/Delete';  // Import Material UI Delete icon

// Function to handle row deletion
import './Orders.css';

function Orders() {
    const [imageUpload, setImageUpload] = useState(null); // Selected image
    const [uploadedImageUrl, setUploadedImageUrl] = useState(null); // URL of uploaded image
    const [showDialog, setShowDialog] = useState(false); // To show/hide the modal
    const [documentId, setDocumentId] = useState(null); // Store the document ID
    const [showForm, setShowForm] = useState(false); // State to toggle form visibility
    const [storeName, setStoreName] = useState(""); // State for store name
    const [date, setDate] = useState(null); // State for date
    const [totalCost, setTotalCost] = useState(""); // State for total cost
    const [item, setItem] = useState(""); // State for item input
    const [itemCost, setItemCost] = useState(""); // State for item cost input
    //const [duration, setDuration] = useState(""); // State for dropdown selection
    //const [items, setItems] = useState([]);

    const [items, setItems] = useState([
        { itemName: '', cost: '', expiration: '', reminderDate: null },
    ]);

    const [openReminderModal, setOpenReminderModal] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [notificationActive, setNotificationActive] = useState(false);

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
        setShowForm(false); // Hide form when cancelling
        setStoreName(""); // Clear store name field
        setDate(null); // Clear date field
        setTotalCost(""); // Clear total cost field
        setItem(""); // Clear item input
        setItemCost(""); // Clear item cost input
        setItems([]); // Clear items array
    };
    

    const handleSave = async () => {
        try {
            // Filter out items where the name is null or empty
            const validItems = items.filter(item => item.name && item.name.trim() !== "");
    
            // Only proceed with saving if there are valid items
            if (validItems.length === 0) {
                console.error("No valid items to save.");
                return; // Exit the function if there are no valid items
            }
    
            // Create a new object with all the form data
            const receiptData = {
                storeName,
                date,
                totalCost,
                items: validItems.map(item => ({
                    name: item.name,
                    cost: item.cost
                })),
                timestamp: new Date() // Store the timestamp for when the receipt is saved
            };
    
            // Add data to Firestore under 'clean-receipts' collection
            const docRef = await addDoc(collection(db, "clean-receipts"), receiptData);
    
            // Reset the form fields after saving
            setImageUpload(null); // Reset selected image
            setUploadedImageUrl(null); // Reset uploaded image URL
            setDocumentId(null); // Reset document ID
            setShowDialog(false); // Close the modal
            setShowForm(false); // Hide form after saving
            setStoreName(""); // Clear store name field
            setDate(null); // Clear date field
            setTotalCost(""); // Clear total cost field
            setItem(""); // Clear item input
            setItemCost(""); // Clear item cost input
            setItems([]); // Clear items array
    
        } catch (error) {
            console.error("Error adding document: ", error);
            // Optionally, show an error message or feedback
        }
    };
    
    
    

    // Handle Auto-parse button click
    const handleAutoParse = async () => {
        if (!documentId) {
            console.log("No document ID available");
            return;
        }
    
        // When auto-parse clicked: create form
        setShowForm(true);
    
        // Fetch the parsed data using the stored document ID
        const parsedDataRef = doc(db, "receipts", documentId);
        const parsedDataSnapshot = await getDoc(parsedDataRef);
    
        // If data exists
        if (parsedDataSnapshot.exists()) {
            const parsedData = parsedDataSnapshot.data();
    
            // Get Store name
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
                    
                    // Convert the items object to an array
                    const itemsArray = Object.keys(itemsData).map(key => ({
                        name: key, // item name is the key
                        cost: itemsData[key].cost || "" // item cost from nested structure

                    }));

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
        if (!items || rowIndex === undefined || rowIndex === null || rowIndex >= items.length) {
            console.error("Invalid rowIndex or items array is undefined");
            return;
        }
    
        const item = items[rowIndex];
    
        if (item.reminderDate) {
            // Remove the reminder date from the item
            const updatedItems = [...items];
            updatedItems[rowIndex].reminderDate = null; // Set reminderDate to null (inactive)
            setItems(updatedItems);
    
            // Delete the item from Firestore using the document ID
            try {
                const itemRef = doc(db, 'fridge', item.id); // Use item.id to reference the document
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
        if (selectedRow !== null && items[selectedRow]) {
            const item = items[selectedRow];
    
            // Ensure no fields are undefined or null
            const itemName = item.name || null;
            const cost = item.cost || null;
            const quantity = item.quantity || null;
            const savings = item.savings || null;
            const unit = item.unit || null;
            const unitPrice = item.unitPrice || null;
            const reminderDate = item.reminderDate || null;
    
            // Check if itemName is null or an empty string
            if (!itemName) {
                console.log('Item name is required. Item not saved.');
                return; // Exit the function if itemName is empty or null
            }
    
            try {
                // Add the item to Firestore and get the document reference
                const docRef = await addDoc(collection(db, 'fridge'), {
                    itemName,
                    cost,
                    quantity,
                    savings,
                    unit,
                    unitPrice,
                    reminderDate,
                });
    
                // Add the Firestore document ID to the item
                setItems((prevItems) =>
                    prevItems.map((item, index) =>
                        index === selectedRow ? { ...item, id: docRef.id } : item
                    )
                );
    
                console.log('Item successfully saved to fridge');
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


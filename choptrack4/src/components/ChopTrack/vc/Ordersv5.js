import React, { useState } from "react";
import { storage, db } from '../../firebase/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDoc, doc } from 'firebase/firestore';
import { v4 } from 'uuid';
import { Button, Dialog, DialogContent, DialogActions, Typography, Stack, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
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
                }
            } else {
                console.log("Parsed data does not include receiptInfo/store/name.");
            }
    
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

                            {/* Auto-parse and Manual buttons */}
                            <div style={{ marginTop: "8px" }}>
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


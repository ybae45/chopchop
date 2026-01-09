// Import libraries
import React, { useState, useEffect } from "react";
import { storage, db } from '../../firebase/firebaseConfig.js';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { getDoc, doc, collection, addDoc, deleteDoc, setDoc, getDocs } from 'firebase/firestore';
import { getUserData } from '../../firebase/userService.js';
import { v4 } from 'uuid';
import { Button, Dialog, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,  Modal, Box, Typography, Stack, TextField, ThemeProvider, createTheme, DialogTitle} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DeleteIcon from '@mui/icons-material/Delete'; 
import '../../styles/Orders.css';
import { styled } from '@mui/material/styles';


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

    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [imageUrl, setImageUrl] = useState(null);
    const [loadingImage, setLoadingImage] = useState(false);
    const [openReceiptModal, setOpenReceiptModal] = useState(false);

    const storage = getStorage();

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

          } catch (error) {
            console.error('Failed to fetch user data:', error);
            throw error;
          }
        }
        return userData;
    };

    // Handle file name change: No file selected --> input file name
    const setFileData = (target) => {
      const file = target;
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
            let receiptDocRef
            // Fetch the existing receipt document
            const userDocRef = doc(db, 'users', userData.uid);
            if (documentId){
              receiptDocRef = doc(userDocRef, 'receipts', documentId);
            }
            else{
              receiptDocRef = doc(userDocRef, 'receipts', v4() )
            }
            
            const receiptSnapshot = await getDoc(receiptDocRef);
    
            let receiptData = {
                receiptInfo: {
                    store: { name: storeName },
                    transaction: { datetime: date },
                    total: { grand_total: totalCost },
                    items: {  } // Items will be built dynamically
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
              console.log("No existing receipt found. Proceeding with form data only.");
              // Initialize receipt data with valid items
              receiptData.receiptInfo.items = validItems.reduce((acc, item) => {
                  acc[item.name] = {
                      cost: item.cost || "",
                      quantity: item.quantity || 1,
                      unit: item.unit || "",
                      unitPrice: item.unitPrice || "",
                      savings: item.savings || 0,
                      other: item.other || ""
                  };
                  return acc;
              }, {});
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
    
        const userDocRef = doc(db, 'users', userData.uid);
        const parsedDataRef = doc(userDocRef, 'receipts', documentId);
        //const parsedDataRef = doc(db, "receipts", documentId);
        const parsedDataSnapshot = await getDoc(parsedDataRef);
 
        if (parsedDataSnapshot.exists()) {
            const parsedData = parsedDataSnapshot.data();
    
            if (parsedData && parsedData.receiptInfo?.store?.name) {
                const storeName = parsedData.receiptInfo.store.name;
                setStoreName(storeName);
    
                // If Publix receipt: 
                //if (storeName.toLowerCase().includes("publix")) {
                if (true) {
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
        setItems((prevItems) => prevItems.filter((_, i) => i !== index));
    };

    // Function to handle Manual
    const handleManual = () => {
        setShowForm(true);
    }

    // Fetch the user's clean receipts from Firestore
  const fetchReceipts = async () => {
    try {
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
        alert("No receipt image found!");
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

   // deuglifying buttons
   const ColorButton = styled(Button)(({ theme, color }) => {
    const darkenColor = (color) => {
      if (color.startsWith('#')) {
        let hex = color.substring(1);
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);

        r = Math.max(0, r - 30);
        g = Math.max(0, g - 30);
        b = Math.max(0, b - 30);

       return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
      return color; 
    };
    return {
      fontFamily: 'AovelSansRounded, sans-serif',
      color: 'white',
      backgroundColor: color, 
      '&:hover': {
        backgroundColor: darkenColor(color), 
      },
      fontSize: '2rem',
      textTransform: 'none',
    };
  }); 
   // custom theme for styling dialog/modals
   const theme = createTheme({
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            marginBottom: '16px',  // space between fields
            '& .MuiInputLabel-root': {
              fontFamily: 'AovelSansRounded, sans-serif',
              fontSize: '1.5rem',
              padding: '0 8px',
              top: '-0.5rem',
              backgroundColor: 'transparent',  
            },
            //input field box
            '& .MuiOutlinedInput-root': {
              height: '40px', 
              fontFamily: 'AovelSansRounded, sans-serif',
              borderRadius: '8px',

              // unfocused state styling
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#ccc', // Light grey border when unfocused
              },

              // focused state styling
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
            },
            //label when focused
            '& .MuiInputLabel-root.Mui-focused': {
              backgroundColor: 'transparent', 
              color: '#58ac3e', 
              transform: 'translateY(-1rem)', 
              visibility: 'visible',
            },
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            fontSize: '2rem',
            fontFamily: 'AovelSansRounded, sans-serif',
            borderRadius: '8px',        // Rounded corners for the table container
            overflow: 'hidden',         // Ensure the table content does not overflow
            boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',  // Box shadow around the table
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            fontSize: '2rem',
            fontFamily: 'AovelSansRounded, sans-serif',
            minWidth: 650,              // Set a minimum width for the table
            borderCollapse: 'collapse', // Collapsing borders between cells
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            fontSize: '2rem',
            fontFamily: 'AovelSansRounded, sans-serif',
            backgroundColor: '#58ac3e',  // Header background color
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontFamily: 'AovelSansRounded, sans-serif',
            backgroundColor: '#58ac3e',  // Header background color
            color: 'white',              // Header text color
            fontSize: '1.5rem',          // Font size for table header
            fontWeight: 'bold',          // Bold header text
            padding: '12px 16px',        // Padding for header cells
          },
          body: {
            fontSize: '1.5rem', // Font size for table body
            fontFamily: 'AovelSansRounded, sans-serif',         
            padding: '12px 16px',        // Padding for body cells
            color: '#333',               // Text color for table body
            borderBottom: '1px solid #ddd', // Border between rows
          },
          root: {
            // '&:hover': {
            //   fontSize: '1.5rem',
            //   fontFamily: 'AovelSansRounded, sans-serif',
            //   backgroundColor: '#f5f5f5', // Background color when row is hovered
            // },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            fontFamily: 'AovelSansRounded, sans-serif', // Custom font
            fontSize: '1.2rem', // Button font size
            padding: '10px 20px', // Padding for buttons
            borderRadius: '0.75rem', // Rounded corners for the button
            textTransform: 'none', // Avoid capitalizing button text
            '&:hover': {
              backgroundColor: '#58ac3e', // Button hover color
              color: 'white', // Hover text color
            },
          },
        },
      },
    },
  });
  

  if (loading) return <div className="Budget"><h2>Loading receipts...</h2></div>;


    return (
      <ThemeProvider theme={theme}>
        <div className="orders">
            <h2>Track Shopping </h2>
            <div className="App">
                <ColorButton color="#176a23" onClick={() => setShowDialog(true)}>
                    Add Grocery Trip
                </ColorButton>
            </div>

            {/* Form Dialog with custom class for larger size */}
            <Dialog
                open={showDialog}
                onClose={() => setShowDialog(false)}
                className="custom-dialog" 
                sx={{
                  '& .MuiDialogTitle-root': {
                    fontFamily: 'AovelSansRounded, sans-serif',
                    backgroundColor: '#58ac3e',
                    color: 'white',
                    textAlign: 'center',
                    fontSize: '2rem',
                    padding: '16px 24px',
                    marginBottom: '0.5rem',
                    borderTopLeftRadius: '1rem',   
                    borderTopRightRadius: '1rem',  
                    borderBottomLeftRadius: '0',   
                    borderBottomRightRadius: '0', 
                  },
                  '& .MuiDialogContent-root': {
                    fontFamily: 'AovelSansRounded, sans-serif',
                    padding: '20px',
                    backgroundColor: 'transparent',
                  }, 
                   
                  '& .MuiDialog-paper': {
                    margin: 0,     
                    padding: 0,    
                    borderRadius: '1rem',
                  },
                }}>
                <DialogTitle>
                    ChopTrack: Add Grocery Trip Details & Receipt
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={1} direction="row" style={{ width: '100%' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* Upload Receipt Button */}
                            <ColorButton component="label" color="#be99cd">
                              Upload Receipt
                              <input
                                type="file"
                                style={{ display: 'none' }} // Hide the input completely
                                onChange={(e) => {
                                  const files = e.target.files;
                                  if (files && files.length > 0) {
                                    setFileData(files[0]); // Only call setFileData if files are selected
                                  } else {
                                    console.warn('No file selected here');
                                  }
                                }}  // Use 'files[0]' to get the selected file
                              />
                            </ColorButton>
                            <Typography sx={{fontFamily: 'AovelSansRounded, sans-serif', fontSize: '1.2rem',}}>{imageUpload ? imageUpload.name : "No file selected"}</Typography>

                            {/* Auto-parse, Manual, and Add item buttons */}
                            <div style={{ marginTop: "8px" }}>
                                <ColorButton
                                    color="#3e5ddc"
                                    onClick={handleAutoParse}
                                    style={{ marginRight: "8px" }}
                                >
                                    Read Receipt
                                </ColorButton>
                                {/* Manual Button */}
                                <ColorButton
                                    color="#c7c7c7"
                                    onClick={handleManual} // Assuming you have a handleManual function
                                    style={{ marginRight: "8px" }}
                                >
                                    Manual
                                </ColorButton>
                                {/* Add item Button */}
                                <ColorButton
                                    color="#58ac3e"
                                    onClick={handleAddItemBtn} // You can change this if it needs a different handler
                                >
                                    Add item
                                </ColorButton>
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
                                            <span onClick={() => handleToggleNotification(index)} style={{verticalAlign: 'middle', 
                                                          position: 'relative',
                                                          top: '-2.5rem' }}>
                                                {item.reminderDate ? (
                                                    <NotificationsActiveIcon
                                                        style={{ cursor: 'pointer', color: 'green', fontSize: '2rem' }}
                                                    />
                                                ) : (
                                                    <NotificationsOffIcon
                                                        style={{ cursor: 'pointer', color: 'gray', fontSize: '2rem' }}
                                                    />
                                            )}
                                            </span>
                                            {/* Trash Button */}
                                            <span onClick={() => handleDeleteRow(index)} style={{verticalAlign: 'middle', 
                                                          position: 'relative',
                                                          top: '-2.5rem' }}>
                                                <DeleteIcon style={{ cursor: 'pointer', color: 'rgba(211, 47, 47, 0.7)' , fontSize: '2rem'}} />
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
                                            padding: "20px 20px 0px 20px",
                                            margin: "100px auto",
                                            borderRadius: "8px",
                                            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
                                            display: 'flex',         // Enable Flexbox layout
                                            justifyContent: 'center', // Center horizontally
                                            alignItems: 'center',     // Center vertically
                                            gap: '2rem',              // Small gap between the DatePicker and Button
                                            flexDirection: 'row',     // Ensure the DatePicker and Button are horizontally aligned
                                        }}
                                    >
                                        <LocalizationProvider dateAdapter={AdapterDateFns} sx={{
                                            '& .MuiInputBase-root': {
                                              display: 'flex',
                                              alignItems: 'center', // Vertically center the input content
                                            },
                                          }}>
                                            <DatePicker
                                                label="Set Reminder Date"
                                                value={
                                                    selectedRow !== null && items[selectedRow] // Check if selectedRow is valid
                                                        ? items[selectedRow].reminderDate || null // Provide fallback if reminderDate is undefined
                                                        : null
                                                }
                                                onChange={handleReminderDateChange}
                                                renderInput={(params) => <TextField sx={{paddingTop: '300px' }}{...params} fullWidth />}
                                            />
                                        </LocalizationProvider>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={handleSetAlert}
                                            style={{ marginTop: '16px', fontSize: '1.5rem', 
                                            display: 'flex',
                                            alignItems: 'center', 
                                            top: "-1.75rem"}}
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
                    <ColorButton onClick={handleSave} color="#58ac3e"> Save </ColorButton>
                    <ColorButton onClick={handleCancel} color="#c12020"> Cancel</ColorButton>
                    <ColorButton onClick={() => setShowDialog(false)} color="#b32d2d" >
                        Close
                    </ColorButton>
                </DialogActions>
            </Dialog>
       
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
                      <TableCell>{total ? parseFloat(total.grand_total).toFixed(2) : 'N/A'}</TableCell>
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
                        <TableCell>{item.cost !== undefined ? parseFloat(item.cost).toFixed(2) : 'N/A'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
  
            <ColorButton color="#428cd2" onClick={handleCloseModal}>Close</ColorButton>
          </Box>
        </Modal>
  
        {/* View Receipt Modal */}
        <Modal open={openReceiptModal} onClose={() => setOpenReceiptModal(false)}>
          <Box sx={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              backgroundColor: 'white', padding: '20px', boxShadow: 24, maxWidth: '80vw', maxHeight: '80vh', overflow: 'auto', borderRadius: '1rem',}}>
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
    </ThemeProvider>
    );
}

export default Orders;


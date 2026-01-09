import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig.js';
import {getUserData} from '../../firebase/userService.js';
import { collection, getDocs, doc, deleteDoc, addDoc } from 'firebase/firestore';
import Calendar from 'react-calendar';
import { Checkbox, FormControlLabel, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, backdropClasses,  ThemeProvider, createTheme  } from '@mui/material';
import 'react-calendar/dist/Calendar.css';
import '../../styles/Fridge.css';
import { styled } from '@mui/material/styles';



function Fridge() {
  const [groceryItems, setGroceryItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null); // State to track selected date
  const [itemsOnSelectedDate, setItemsOnSelectedDate] = useState([]); // State to track items for the selected date
  const [checkedItems, setCheckedItems] = useState([]); // checkbox
  const [openAddAlertDialog, setOpenAddAlertDialog] = useState(false); // To control Add Alert Modal visibility
  const [openConfirmDeletionDialog, setOpenConfirmDeletionDialog] = useState(false); // To control Confirmation Dialog visibility
  const [itemToDelete, setItemToDelete] = useState(null); // To store the item to be deleted

  // Add alert form fields
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: '',
    reminderDate: '',
    cost: '',
    savings: '',
    unit: '',
    unitPrice: {
      price: '',
      unit: ''
    }
  });

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

  // Fetch grocery items from Firestore
  const fetchItems = async () => {
    await fetchUserData();
    if (!userData) return;

    const userDocRef = doc(db, 'users', userData.uid);
    const itemRef = collection(userDocRef, 'fridge');

    const querySnapshot = await getDocs(itemRef);
    const items = querySnapshot.docs.map(doc => ({
      id: doc.id, // Ensure Firestore doc ID is assigned
      ...doc.data()
    }));
    setGroceryItems(items);
  };

  // Fetch items on initial load
  useEffect(() => {
    fetchItems();
  }, []);

  // Group items by their reminder date
  const getItemsByDate = () => {
    const itemsByDate = {};
    groceryItems.forEach(item => {
      if (item.reminderDate) {
        // Ensure reminderDate is a Date object
        const reminderDate = item.reminderDate.toDate ? item.reminderDate.toDate() : new Date(item.reminderDate);
        const dateStr = reminderDate.toLocaleDateString(); // Format the date to match the calendar
        if (!itemsByDate[dateStr]) {
          itemsByDate[dateStr] = [];
        }
        itemsByDate[dateStr].push(item);
      }
    });
    return itemsByDate;
  };

  // Function to handle date selection
  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dateStr = date.toLocaleDateString();
    const itemsByDate = getItemsByDate();
    
    if (itemsByDate[dateStr]) {
      setItemsOnSelectedDate(itemsByDate[dateStr]); // Set items due on the selected date
    } else {
      setItemsOnSelectedDate([]); // If no items for the selected date, clear the list
    }
  };

  // Function to handle custom styling based on the number of items
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const itemsByDate = getItemsByDate();
      const dateStr = date.toLocaleDateString();
      
      if (itemsByDate[dateStr]) {
        if (itemsByDate[dateStr].length === 1) {
          return 'green-day'; // One item
        } else if (itemsByDate[dateStr].length > 1) {
          return 'orange-day'; // Multiple items
        }
      }
    }
    return '';
  };

  // Format the item text based on quantity, unit, and unit price
  const formatItemText = (item) => {
    if (!item.itemName) return '';
    let text = item.itemName;

    if (item.quantity) {
      // Add quantity if exists
      text = `${text} x ${item.quantity}`;
    }

    if (item.unit && item.unitPrice) {
      // Add unit and unitPrice if they exist
      text = `${text} ${item.unit} @${item.unitPrice.price}/${item.unitPrice.unit}`;
    }
    return text;
  };

  // Confirmation checkbox
  const handleCheckboxChange = async (itemId) => {
    setItemToDelete(itemId);
    setOpenConfirmDeletionDialog(true);
  };

  // Function to handle deletion after confirmation
  const handleDeleteConfirmation = async () => {
    await fetchUserData();
    if (!userData) return;

    if (itemToDelete) {
      const userDocRef = doc(db, 'users', userData.uid);
      const itemRef = doc(userDocRef, 'fridge', itemToDelete); 
      await deleteDoc(itemRef); 

      setGroceryItems(prevItems => prevItems.filter(item => item.id !== itemToDelete));
      setItemsOnSelectedDate(prevItems => prevItems.filter(item => item.id !== itemToDelete));
    }

    // Close the dialog
    setOpenConfirmDeletionDialog(false);
    setItemToDelete(null);
  };

  // Close dialog w/o delete
  const handleCancelDeletion = () => {
    setOpenConfirmDeletionDialog(false);
    setItemToDelete(null); 
  };

  // Handle refresh button click
  const handleRefreshClick = () => {
    fetchItems(); 
  };

  // Handle form field changes
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name.includes('unitPrice')) {
      const [key] = name.split('.');
      setNewItem(prev => ({
        ...prev,
        unitPrice: {
          ...prev.unitPrice,
          [key]: value
        }
      }));
    } else {
      setNewItem(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Function to handle the form submission to add a new item
  const handleFormSubmit = async (event) => {
    event.preventDefault();
    try {
      await fetchUserData();
      if (!userData) return;
      const reminderDate = new Date(`${newItem.reminderDate}T00:00:00`); // Ensure time is 00:00:00 for that day
      const userDocRef = doc(db, 'users', userData.uid);
      await addDoc(collection(userDocRef, 'fridge'), {
        itemName: newItem.name,
        quantity: newItem.quantity,
        reminderDate: reminderDate,
        cost: newItem.cost,
        savings: newItem.savings,
        unit: newItem.unit,
        unitPrice: newItem.unitPrice,
      });

      // Reset form and close the modal
      setNewItem({
        name: '',
        quantity: '',
        reminderDate: '',
        cost: '',
        savings: '',
        unit: '',
        unitPrice: {
          price: '',
          unit: ''
        }
      });
      setOpenAddAlertDialog(false);
      fetchItems(); 
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

   // Handle the "Add Alert" button click to open the modal
   const handleAddAlertClick = () => {
    setOpenAddAlertDialog(true);
  };


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
            //label of required fields is below the text field
            '& .MuiInputLabel-root.Mui-required': {
              top: '-3.5rem',
              paddingRight: '24px',  
            },
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
    <div className="Fridge">
      <h2 className="title">Track Grocery Alerts</h2>
      
      <div className="fridge-container">
        {/* Left side: Calendar */}
        <div className="calendar-container">
          <Calendar 
            tileClassName={tileClassName}
            onClickDay={handleDateClick} // Handle date click
          />
        </div>

        {/* Right side: List of items for the selected date */}
        <div className="grocery-list">
          <h3> {selectedDate ? "Items due on: " + selectedDate.toLocaleDateString() : 'Select a date.'}</h3>
          {itemsOnSelectedDate.length === 0 && selectedDate ? (
            <p>No items due.</p>
          ) : (
            <ul>
              {itemsOnSelectedDate.map(item => (
                <li key={item.id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={checkedItems.includes(item.id)}
                        onChange={() => handleCheckboxChange(item.id)} // Call the updated checkbox handler
                        color="primary"
                      />
                    }
                    label={formatItemText(item)} // Display the formatted item text
                    sx={{
                      '& .MuiFormControlLabel-label': {
                        fontFamily: 'AovelSansRounded, sans-serif',
                        fontSize: '1.5rem',       // Adjust font size
                        lineHeight: '1.0',         // Adjust line height to control the height of the label
                        padding: '0 0',          // Adjust padding if needed
                      },
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Buttons Container */}
      <div className="button-container">
        <div className="refresh-button-container">
          <ColorButton color="#58ac3e" variant="contained" onClick={handleRefreshClick}>
            Refresh
          </ColorButton>
        </div>
        
        {/* Add Alert Button */}
        <div className="add-alert-button-container">
          <ColorButton variant="contained" color="#da7b20" onClick={handleAddAlertClick}>
            Add Alert
          </ColorButton>
        </div>
      </div>
       {/* Add Alert Modal */}
       <Dialog open={openAddAlertDialog} onClose={() => setOpenAddAlertDialog(false)}
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
          '& .MuiDialogActions-root': {
            fontFamily: 'AovelSansRounded, sans-serif',
            padding: '16px 24px',
            backgroundColor: 'transparent',
            display: 'flex',
            justifyContent: 'space-between',
          },
          '& .MuiButton-root': {
            fontFamily: 'AovelSansRounded, sans-serif',
            textTransform: 'none',
            fontSize: '2rem',
          },
        }}>
        <DialogTitle>Add New Alert</DialogTitle>
        <DialogContent>
          <form onSubmit={handleFormSubmit}>
            <TextField
              fullWidth
              label="Item Name"
              name="name"
              value={newItem.name}
              onChange={handleInputChange}
              required
              margin="normal"
            />
            <TextField
              fullWidth
              label="Quantity"
              name="quantity"
              type="number"
              value={newItem.quantity}
              onChange={handleInputChange}
              required
              margin="normal"
            />
            <TextField
              fullWidth
              label="Reminder Date"
              name="reminderDate"
              type="date"
              value={newItem.reminderDate}
              onChange={handleInputChange}
              required
              margin="normal"
              sx={{
                '& .MuiInputLabel-root': {
                  visibility: 'hidden',  //label hidden until focused
                },
              }}
            />
            <TextField
              fullWidth
              label="Cost"
              name="cost"
              value={newItem.cost}
              onChange={handleInputChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Savings"
              name="savings"
              value={newItem.savings}
              onChange={handleInputChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Unit"
              name="unit"
              value={newItem.unit}
              onChange={handleInputChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Unit Price (Price)"
              name="unitPrice.price"
              value={newItem.unitPrice.price}
              onChange={handleInputChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Unit Price (Unit)"
              name="unitPrice.unit"
              value={newItem.unitPrice.unit}
              onChange={handleInputChange}
              margin="normal"
            />
            <DialogActions>
              <ColorButton color="#da7b20" onClick={() => setOpenAddAlertDialog(false)}>
                Cancel
              </ColorButton>
              <ColorButton color="#117c56" type="submit">
                Add Alert
              </ColorButton>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={openConfirmDeletionDialog} onClose={handleCancelDeletion}sx={{
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
          '& .MuiDialogActions-root': {
            fontFamily: 'AovelSansRounded, sans-serif',
            padding: '16px 24px',
            backgroundColor: 'transparent',
            display: 'flex',
            justifyContent: 'space-between',
          },
          '& .MuiButton-root': {
            fontFamily: 'AovelSansRounded, sans-serif',
            textTransform: 'none',
            fontSize: '2rem',
          },
        }}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <p>Are you sure you want to remove the alert for this item?</p>
        </DialogContent>
        <DialogActions>
          <ColorButton onClick={handleCancelDeletion} color="#da7b20">
            Cancel
          </ColorButton>
          <ColorButton onClick={handleDeleteConfirmation} color="#117c56">
            Confirm
          </ColorButton>
        </DialogActions>
      </Dialog>
    </div>
    </ThemeProvider>
  );
}

export default Fridge;
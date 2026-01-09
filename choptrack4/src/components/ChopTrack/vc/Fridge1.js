import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import Calendar from 'react-calendar';
import { Checkbox, FormControlLabel, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import 'react-calendar/dist/Calendar.css';
import './Fridge.css';

function Fridge() {
  const [groceryItems, setGroceryItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null); // State to track selected date
  const [itemsOnSelectedDate, setItemsOnSelectedDate] = useState([]); // State to track items for the selected date
  const [checkedItems, setCheckedItems] = useState([]); // checkbox
  const [openDialog, setOpenDialog] = useState(false); // To control the modal
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

  // Fetch grocery items from Firestore
  const fetchItems = async () => {
    const querySnapshot = await getDocs(collection(db, 'fridge'));
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

  const handleCheckboxChange = async (itemId) => {
    // Open confirmation dialog when a checkbox is clicked
    setItemToDelete(itemId);
    setOpenDialog(true);
  };

  // Function to handle deletion after confirmation
  const handleDeleteConfirmation = async () => {
    // If confirmed, remove item from Firestore
    if (itemToDelete) {
      const itemRef = doc(db, 'fridge', itemToDelete); // Reference to the document in Firestore
      await deleteDoc(itemRef); // Delete the document

      // Update the state to remove the item from the UI
      setGroceryItems(prevItems => prevItems.filter(item => item.id !== itemToDelete));
      setItemsOnSelectedDate(prevItems => prevItems.filter(item => item.id !== itemToDelete));
    }

    // Close the dialog
    setOpenDialog(false);
    setItemToDelete(null); // Reset the item to delete
  };

  const handleCancelDeletion = () => {
    // Close the dialog without deleting anything
    setOpenDialog(false);
    setItemToDelete(null); // Reset the item to delete
  };

  // Handle refresh button click
  const handleRefreshClick = () => {
    fetchItems(); // Re-fetch items from Firestore
  };

  

  // Handle add alert button click
  const handleAddAlertClick = () => {
    // Handle adding a new alert (this could open a modal or form to add a new item)
    console.log('Add Alert clicked!');
    // For now, just log the action. You can expand this to open a form/modal to add a new alert
  };

  return (
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
          <h3>Items Due on {selectedDate ? selectedDate.toLocaleDateString() : 'Select a Date'}</h3>
          {itemsOnSelectedDate.length === 0 ? (
            <p>No items due on this date.</p>
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
          <Button variant="contained" color="primary" onClick={handleRefreshClick}>
            Refresh
          </Button>
        </div>
        
        {/* Add Alert Button */}
        <div className="add-alert-button-container">
          <Button variant="contained" color="secondary" onClick={handleAddAlertClick}>
            Add Alert
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={openDialog} onClose={handleCancelDeletion}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <p>Are you sure you want to remove the alert for this item?</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDeletion} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirmation} color="secondary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Fridge;

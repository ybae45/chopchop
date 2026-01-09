import React, { useState, useEffect } from 'react';
import '../../styles/ShoppingList.css';
import { FaTrashAlt } from 'react-icons/fa';

const ShoppingList = () => {
  const [items, setItems] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [storeInput, setStoreInput] = useState('');
  const [activeStoreEditIndex, setActiveStoreEditIndex] = useState(null);
  const [showAddStoreIndex, setShowAddStoreIndex] = useState(null); // Track which item shows the input field
  const [filteredStore, setFilteredStore] = useState('All');

  // Load items from localStorage on component mount
  useEffect(() => {
    try {
      const storedItems = JSON.parse(localStorage.getItem('shoppingList')) || [];
      setItems(storedItems.map(item => ({ ...item })));
    } catch (error) {
      console.error('Error loading shopping list from localStorage:', error);
      setItems([]); // Fallback to an empty array if there's an error
    }
  }, []);

  // Save items to localStorage whenever they change
  useEffect(() => {
    if (items.length > 0) {
      try {
        localStorage.setItem('shoppingList', JSON.stringify(items));
      } catch (error) {
        console.error('Error saving shopping list to localStorage:', error);
      }
    }
  }, [items]);

  // Function to get unique store tags (case-insensitive)
  const getUniqueStoreTags = () => {
    const storeTags = items
      .map(item => item.store)
      .filter(store => store) // Remove undefined/null stores
      .map(store => store.toLowerCase()) // Convert to lowercase for case-insensitive comparison
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

    return storeTags;
  };

  const startEditing = (index) => {
    if (items[index]) {
      setEditingIndex(index);
      setEditingValue(items[index].text);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.key === 'Enter' && editingValue.trim() !== '') {
      const updatedItems = [...items];
      updatedItems[index].text = editingValue;
      setItems(updatedItems);
      setEditingIndex(null);
    }
  };

  const saveEdit = (index) => {
    if (editingValue && editingValue.trim() !== '') {
      const updatedItems = [...items];
      updatedItems[index].text = editingValue;
      setItems(updatedItems);
    } else {
      removeItem(index);
    }
    setEditingIndex(null);
  };

  const addNewItem = () => {
    const newIndex = items.length;
    const newItems = [...items, { text: '', checked: false }];
    setItems(newItems);
    setEditingIndex(newIndex);
    setEditingValue('');
  };

  const handleCheck = (index) => {
    const updatedItems = [...items];
    updatedItems[index].checked = !updatedItems[index].checked;
    setItems(updatedItems);
  };

  const removeItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const removeCheckedItems = () => {
    const updatedItems = items.filter(item => !item.checked);
    setItems(updatedItems);
  };

  const handleStoreChange = (index) => {
    if (storeInput.trim()) {
      const updatedItems = [...items];
      updatedItems[index].store = storeInput.trim();
      setItems(updatedItems);
      setStoreInput(''); // Clear the store input field
      setShowAddStoreIndex(null); // Close the input after saving
    }
  };

  const startEditingStoreTag = (index) => {
    setActiveStoreEditIndex(index);
    setStoreInput(items[index].store || ''); // Pre-fill the store name for editing
  };

  const saveStoreTagEdit = (index) => {
    if (storeInput.trim() !== '') {
      const updatedItems = [...items];
      updatedItems[index].store = storeInput.trim();
      setItems(updatedItems);
    }
    setActiveStoreEditIndex(null); 
    setStoreInput(''); 
  };

  const handleStoreInputKeyPress = (e, index) => {
    if (e.key === 'Enter' && storeInput.trim() !== '') {
      const updatedItems = [...items];
      updatedItems[index].store = storeInput.trim();
      setItems(updatedItems);
      setActiveStoreEditIndex(null); 
      setStoreInput(''); 
    }
  };

  const handleAddStoreClick = (index) => {
    // Only show the input field for the clicked item
    setShowAddStoreIndex((prevIndex) => prevIndex === index ? null : index);
  };

  const handleBlur = () => {
    // If the user clicks elsewhere (i.e., input loses focus), reset the input field and show the button again
    setShowAddStoreIndex(null);
    setStoreInput('');
  };

  // Filter and sort items based on the selected store tag
  const filteredItems = filteredStore === 'All' 
    ? items 
    : items.filter(item => item.store?.toLowerCase() === filteredStore.toLowerCase());

  // Sort the filtered items such that the items with the selected store tag come to the top
  const sortedItems = filteredStore !== 'All'
    ? [
        ...filteredItems.filter(item => item.store?.toLowerCase() === filteredStore.toLowerCase()),
        ...filteredItems.filter(item => item.store?.toLowerCase() !== filteredStore.toLowerCase())
      ]
    : filteredItems;

  return (
    <div>
      <h2>Grocery List</h2>

      {/* Filter Dropdown */}
    <div className="filter-container">
    Filter by store:
    <div className="dropdown">
        <select 
        className="select-dropdown"
        onChange={(e) => setFilteredStore(e.target.value)} 
        value={filteredStore}
        >
        <option value="All">All</option>
        {getUniqueStoreTags().map((tag, index) => (
            <option key={index} value={tag}>
            {tag}
            </option>
        ))}
        </select>
    </div>
    </div>

      {/* List of Items */}
      <div>
        {sortedItems.map((item, index) => (
          item && item.text !== undefined && (
            <div key={index} className={item.checked ? 'checked' : ''}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    onChange={() => handleCheck(index)}
                    checked={item.checked}
                    disabled={editingIndex === index}
                  />
                  {editingIndex === index ? (
                    <div>
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, index)}
                        onBlur={() => saveEdit(index)}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span onClick={() => startEditing(index)}>
                      {item.text || 'Click to add a new item'}
                    </span>
                  )}
                  <button
                    onClick={() => removeItem(index)}
                    className="delete-button"
                  >
                    X
                  </button>
                </div>

                {/* Store Tags */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {item.store ? (
                    <div className="store-tags">
                      <span
                        className="store-tag"
                        onClick={() => startEditingStoreTag(index)}
                      >
                        {item.store}
                      </span>
                    </div>
                  ) : (
                    <div className="store-add">
                      {showAddStoreIndex === null || showAddStoreIndex !== index ? (
                        <button
                          onClick={() => handleAddStoreClick(index)}
                          className="add-store-button"
                        >
                          + Add Store
                        </button>
                      ) : (
                        <div className="store-input-container">
                          <input
                            type="text"
                            value={storeInput}
                            onChange={(e) => setStoreInput(e.target.value)}
                            placeholder="Enter store name"
                            autoFocus
                            onKeyDown={(e) => handleStoreInputKeyPress(e, index)} // Save store name on Enter key
                            onBlur={handleBlur} // Restore "+ Add Store" button when input loses focus
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Editing store name */}
                  {activeStoreEditIndex === index && (
                    <div className="store-input-container">
                      <input
                        type="text"
                        value={storeInput}
                        onChange={(e) => setStoreInput(e.target.value)}
                        placeholder="Edit store name"
                        autoFocus
                        onKeyDown={(e) => handleStoreInputKeyPress(e, index)} // Save on Enter key
                        onBlur={() => saveStoreTagEdit(index)} // Save on blur
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        ))}

        {/* Only show the following buttons when filtered by 'All' */}
        {filteredStore === 'All' && (
        <>
            <div>
            <span className="add-item" onClick={addNewItem}>
                + Click here to add an item
            </span>
            </div>

            <div>
            <span className="add-item" onClick={removeCheckedItems}>
                <FaTrashAlt className="trash-icon" />
                Delete All Checked Items
            </span>
            </div>
        </>
        )}
        
      </div>
    </div>
  );
};

export default ShoppingList;

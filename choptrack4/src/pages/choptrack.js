import React, { useEffect, useState } from 'react';
import { getUserData } from '../firebase/userService.js';

import '../styles/choptrack.css';

import Fridge from '../components/ChopTrack/Fridge.js';
import ShoppingList from '../components/ChopTrack/ShoppingList.js';
import Budget from '../components/ChopTrack/Budget.js';
import Orders from '../components/ChopTrack/Orders.js';
import {auth} from "../firebase/firebaseConfig.js";

function App() {
  const [userName, setUserName] = useState('');  // State to store the user's name
  const [user, setUser] = useState(null);

  // Fetch user data and update the state with the user's name
  const fetchUserData = async () => {
    try {
      const userData = await getUserData();
      if (userData) {
        const { name } = userData;
        console.log(`User Name: ${name}`);
        setUserName(name);  // Set the name in state
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
    document.title = 'ChopTrack';
  }, []);  // Empty dependency array ensures this runs once on mount


  //to make it graceful when you logout on there:
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
      if (authUser) {
      fetchUserData();
      document.title = 'ChopTrack';
      }
    });
    return () => unsubscribe(); // cleanup on component unmount
  }, []);

  if (!user) {
    return (
      <div>
        <p style= {{textAlign: 'center', fontSize: '30px', padding: '3rem'}}>Please log in to view your ChopTrack.</p>
      </div>
    );
  }

  return (
    <div className="App">

      {/* ChopTrack Header */}
      <div className="ct-header">
        {userName ? `Hello, ${userName}! Welcome to ChopTrack :)` : 'Hello! Welcome to ChopTrack :)'}  {/* Display user's name if available */}
      </div>

      {/* Grid Layout */}
      <div className="row">

        {/* My Fridge */}
        <div className="box">
          <Fridge />
        </div>
        <div className="box">
          <ShoppingList />
        </div>
      </div>
      <div className="row">
        <div className="box">
          <Budget />
        </div>
        <div className="box">
          <Orders />
        </div>
      </div>
    </div>
  );
}

export default App;

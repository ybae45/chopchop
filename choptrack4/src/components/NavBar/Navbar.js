import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import '../../styles/Navbar.css';

// Import logo
import logo from "../../assets/placeholder.png";

// Firebase auth
import { auth } from "../../firebase/firebaseConfig.js";
import LoginModal from "../Authentication/LoginModal.js";
import SignupModal from "../Authentication/SignupModal.js";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null); // auth state tracking
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const navRef = useRef(null);


  const openLoginModal = () => {
    setIsLoginModalOpen(true);
    setMenuOpen(false);
  };
  const openSignupModal = () => {
    setIsSignupModalOpen(true);
    setMenuOpen(false);
  };

  const closeLoginModal = () => setIsLoginModalOpen(false);
  const closeSignupModal = () => setIsSignupModalOpen(false);

  // toggle the dropdown menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    const currentUser = auth.currentUser;
    setUser(currentUser); // set the current user in the state

    const intervalId = setInterval(() => {
      const user = auth.currentUser;
      setUser(user);
    }, 1000); // check auth state every second

    return () => clearInterval(intervalId);
  }, []);
  useEffect(() => { //checking authstate
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []); //on component mount

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
          toggleMenu(); // close modal on esc key press
      }
      };
      const handleClickOutside = (event) => {
        if (navRef.current && !navRef.current.contains(event.target)) {
            toggleMenu(); // close modal if the click is outside the modal content but inside the overlay
        }
        if (menuOpen) {
          // Add event listeners only when the menu is open
          document.addEventListener("keydown", handleEscKey);
          document.addEventListener("mousedown", handleClickOutside);
        }
    
        // Cleanup the event listeners when menu is closed
        return () => {
          document.removeEventListener("keydown", handleEscKey);
          document.removeEventListener("mousedown", handleClickOutside);
        };
    };
    // click listener to the document
    document.addEventListener('keydown', handleEscKey);
    document.addEventListener('mousedown', handleClickOutside);
    // cleanup on unmount
    return () => {
        document.removeEventListener('keydown', handleEscKey);
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);


  // Logout handler
  const logoutHandler = () => {
    auth
      .signOut()
      .then(() => {
        setMenuOpen(false); // Close menu after logout
      })
      .catch((error) => {
        console.error("Error logging out: ", error);
      });
  };


  return (
    <>
    <nav className="navbar">
      {/* Logo */}
      <div className="navbar-logo">
        <img src={logo} alt="ChopChop Logo" width="75" />
      </div>

      {/* Hamburger menu button */}
      <button className="menu-toggle" onClick={toggleMenu}>
        {menuOpen ? "✖" : "☰"}
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className={`dropdown-menu ${menuOpen ? "open" : ""}`} ref={navRef}>
          <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/search" onClick={() => setMenuOpen(false)}>ChopGuide</Link>
          {user && <Link to="/track" onClick={() => setMenuOpen(false)}>ChopTrack</Link>}
          {user && <Link to="/account" onClick={() => setMenuOpen(false)}>Account</Link>}
          {user && (
            <p
              className="logoutButton"
              onClick={logoutHandler}
              style={{
                cursor: "pointer",
              }}
            >
              Logout
            </p>
          )}
          {!user && (
            <p
              className="logoutButton"
              onClick={openLoginModal}
              style={{
                cursor: "pointer",
                margin: '0 0',
              }}
            >
              Login
            </p>
          )}
          {!user && (
            <p
              className="logoutButton"
              onClick={openSignupModal}
              style={{
                cursor: "pointer",
                margin: '0 0', 
              }}
            >
              Signup
            </p>
          )}
        </div>
      )}
    </nav>
    {<LoginModal isOpen={isLoginModalOpen} closeModal={closeLoginModal} />}
    {<SignupModal isOpen={isSignupModalOpen} closeModal={closeSignupModal} />}
    </>
  );
}

export default Navbar;

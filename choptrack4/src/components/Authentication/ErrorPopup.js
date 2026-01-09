import React, { useState, useEffect, useRef } from 'react';
// css styling
import '../../styles/animate.css';
import '../../styles/icomoon.css';
import '../../styles/bootstrap.css';
import '../../styles/flexslider.css';
import '../../styles/style.css';

function ErrorPopup({ error, closeErrorPopup }) {
    // references to modal and overlay
    const modalRef = useRef(null);
    const overlayRef = useRef(null);
    const [isOpen, setIsOpen] = useState(true); // Popup visibility
    const [errorMessage, setErrorMessage] = useState(''); // Error message
  
    // changing error message depended on what error we put in
    useEffect(() => {
        let errMess = '';
        console.error(error);
        if (error === 'auth/email-already-in-use') {
            errMess = "Error: This user already exists!"; 
        } else if (error === 'auth/invalid-email') {
            errMess = "Error: Invalid email!"; 
        } else if (error === 'auth/weak-password') {
            errMess = "Error: Invalid password! Must be longer than 6 characters."; 
        } else if (error === 'auth/invalid-password') {
            errMess = "Error: Invalid password!"; 
        } else if (error === 'auth/invalid-email') {
            errMess = "Error: Invalid Email."; 
        } else if (error === 'auth/user-not-found') {
            errMess = "Error: User not found."; 
        } else if (error === 'auth/invalid-credential') {
            errMess = "Error: Invalid Credentials. Maybe an incorrect email or password?"; 
        } else if(error === 'auth/too-many-requests'){
            errMess = "Error: Too many failed login attempts. Reset password or try again later."; 
        } else if(error === 'auth/wrong-password'){
            errMess = "Error: Wrong password."; 
        } else if (error === 'auth/network-request-fail'){
            errMess = "Error: Network error. Please check your connection.";
        } else if (error === "auth/requires-recent-login"){
            errMess = "Error: Please log in again.";
        } else if (error === "auth/user-token-expired"){
            errMess = "Error: Token has expired. Logout and log in again.";
        } else if (error === "auth/unknown"){
            errMess = "Error: Unknown error.";
        }
        else {
            errMess = error; 
        }    
      setErrorMessage(errMess); // Set the error message when error prop changes
    }, [error]); // Only run this effect when 'error' changes
  
    // Function to close the popup
    const closePopup = () => {
      setIsOpen(false);
      closeErrorPopup(); // Close the error popup from the parent
    };

     // close modal if clicking outside the modal (on the overlay)
     useEffect(() => {
      const handleEscKey = (event) => {
        if (event.key === 'Escape') {
            closePopup(); // close modal on Escape key press
        }
        };
        const handleClickOutside = (event) => {
          if (overlayRef.current && !modalRef.current.contains(event.target)) {
              closePopup(); // close modal if the click is outside the modal content but inside the overlay
          }
      };
      // click listener to the document
      document.addEventListener('keydown', handleEscKey);
      document.addEventListener('mousedown', handleClickOutside);
      // cleanup on unmount
      return () => {
          document.removeEventListener('keydown', handleEscKey);
          document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);
     // Open the popup (trigger the fade-in effect)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"; // Disable scrolling when popup is open
    } else {
      document.body.style.overflow = "auto"; // Re-enable scrolling after popup closes
    }
  }, [isOpen]);
  
    return (
      <>
        {isOpen && (
          <div className="popup-overlay" id="popupOverlay" ref={overlayRef}>
            <div className="popup" style={{ display: 'block', zIndex: 999 }} id="popup" ref={modalRef}>
              <span className="close" id="closePopup" onClick={closePopup}>
                &times;
              </span>
              <br />
              <div className="popup-content" id="signupErrorContent">
                <p>{`${errorMessage}`}</p> {/* Display the error message */}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
  
  
  export default ErrorPopup;
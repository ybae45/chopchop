import React, { useState, useEffect, useRef } from 'react';
// css styling
import '../../styles/animate.css';
import '../../styles/icomoon.css';
import '../../styles/bootstrap.css';
import '../../styles/flexslider.css';
import '../../styles/style.css';

function PrivacyPopup({ closePrivPopup }) {
    // references to modal and overlay
    const modalRef = useRef(null);
    const overlayRef = useRef(null);
    const [isOpen, setIsOpen] = useState(true); // Popup visibility
  
  
    // Function to close the popup
    const closePopup = () => {
      setIsOpen(false);
      closePrivPopup(); // Close the error popup from the parent
    };

     // Open the popup (trigger the fade-in effect)
    useEffect(() => {
        if (isOpen) {
        document.body.style.overflow = "hidden"; // Disable scrolling when popup is open
        
        } else {
        document.body.style.overflow = "auto"; // Re-enable scrolling after popup closes
        }
    }, [isOpen]);
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
  
    return (
      <>
        {isOpen && (
          <div className="popup-overlay" ref={overlayRef}>
            <div className="popup" id="privPopup" style={{ display: 'block', zIndex: 998 }} ref={modalRef}>
            <br />
            <h3 style={{ textAlign: 'center', fontSize:'3.5rem' }}>ChopChop Privacy Info</h3>
            <span className="close" id="closePopup" onClick={closePopup}>
                &times;
              </span>
              <div className="popup-content" id="signupErrorContent">
              <h4>What information does ChopChop use? How does it use my information?</h4>
                <p>During the signup process, we ask for four things: your name, email, password, and phone number. As with most other websites, your email and password are collected for authentication purposes. Your email may also be used for communications, such as asking for account verification or for password resets. Your phone number is used by ChopTrack in order to notify you if you have items you wish to rebuy. Finally, your name is just so that we can address you! </p>
                <p>In using ChopTrack, all information you give is voluntary. Here, we give a list of what information we might as for, and why. To track your grocery trips, ChopTrack asks for your receipts. To do this, it auto-parses information from the receipts you upload to give you a comprehensive processing of how much each item cost and the amount of money you spent. It also allows you to add items from receipts to Grocery Alert Tracker. Any items added here are simply sent to you in a message on the date you’ve selected, via the phone number collected early.</p>
                <p>We will never sell your information or use it for advertising purposes.</p>
                <h4>Where is my information held?</h4>
                <p>All the information gathered from users is stored safely in Google Firebase, where access to it is through encrypted channels. </p>
                <h4>What if I delete my account?</h4>
                <p>If you decide to delete your account, all of your personal information (including name, email, phone number, and password) is erased. All receipts you uploaded and the information obtained from any items you marked as “rebuy” are also erased. </p>
                <span id="goodbye" style={{fontSize:'3.5rem' }} onClick={closePopup}> Happy ChopChopping! </span>
              </div>
            </div>
            </div>
        )}
      </>
    );
  }
  
  
  export default PrivacyPopup;
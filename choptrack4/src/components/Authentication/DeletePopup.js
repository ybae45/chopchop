import React, { useState, useEffect, useRef } from 'react';
// css styling
import '../../styles/style.css';

import ErrorPopup from './ErrorPopup.js';
import ReauthenticateForDeletionModal from './ReauthenticateModal.js';

function DeletePopup({ closeDeletePopup }) {
    // references to modal and overlay
    const modalRef = useRef(null);
    const overlayRef = useRef(null);

    const [isOpen, setIsOpen] = useState(true); // Popup visibility
     //error messages
     const [errorMess, setErrorMess] = useState('');
     const [isErrorPopupOpen, setIsErrorPopupOpen] = useState(false);
 
     //open/close forgot error popup
     const openErrorPopup = () => {
       setIsErrorPopupOpen(true); // open forgot pass modal
     };
     const closeErrorPopup = () => setIsErrorPopupOpen(false);

    // Open the popup (trigger the fade-in effect)
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = "hidden"; // Disable scrolling when popup is open
      } else {
        document.body.style.overflow = "auto"; // Re-enable scrolling after popup closes
      }
    }, [isOpen]);
    //error messages
    const [isReauthenticatePopupOpen, setIsReauthenticatePopupOpen] = useState(false);
    
    // close modal if clicking outside the modal (on the overlay)
     const handleClickOutside = (event) => {
      if (overlayRef.current && !modalRef.current.contains(event.target)) {
        closeDeletePopup(); // close modal if the click is outside the modal content but inside the overlay
      }
    };
    const handleEscKey = (event) => {
        if (event.key === 'Escape' && !isErrorPopupOpen) {
            closeDeletePopup(); // close modal on Escape key press
        }
    };

    useEffect(() => {
      if(isErrorPopupOpen || isReauthenticatePopupOpen){
          document.removeEventListener('mousedown', handleClickOutside);
          document.removeEventListener('keydown', handleEscKey);
          return;
      }else{
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscKey);
      }
     
      // cleanup on unmount
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
          document.removeEventListener('keydown', handleEscKey);
           return () => {
        };
      };
    }, [isOpen, isErrorPopupOpen, isReauthenticatePopupOpen]);

    //open/close forgot error popup
    const openReauthenticatePopup = () => {
        setIsReauthenticatePopupOpen(true); // open forgot pass modal
    };
    const closeReauthenticatePopup = () => setIsReauthenticatePopupOpen(false);

    // Function to close the popup
    const closePopup = (e) => {
      setIsOpen(false);
      closeDeletePopup(); // Close the error popup from the parent
    };

    //handling deletion, open reauthenticate for deletion
    const deleteHandler = (e) => {
        e.preventDefault();
        openReauthenticatePopup();
    };
  

    return (
      <>
        {isOpen && (
          <div className="popup-overlay" id="popupOverlay" ref={overlayRef}>
            <div className="popup" style={{ display: 'block', zIndex: 999 }} id="popup" ref={modalRef}>
            <br />
            <br />
            <h3 style={{ textAlign: 'center' }}>Delete account?</h3>
              <span className="close" id="closePopup" onClick={closePopup}>
                &times;
              </span>
              <div className="popup-content" id="signupErrorContent">
              <button
                className="btn green darken-2 z-depth-0"
                style={{ margin: '0 auto', display: 'block' }}
                onClick={(e) => closePopup(e)}
              >
                No, not sure.
              </button>
              <br />
              <button
                className="btn darken-2 z-depth-0"
                style={{ margin: '0 auto', display: 'block', backgroundColor: 'red' }}
                onClick={(e) => deleteHandler(e)}
              >
                Delete.
              </button>
              </div>
            </div>
          </div>
        )}
        {/* error popup */}
        {isErrorPopupOpen && (
            <ErrorPopup error={errorMess} closeErrorPopup={closeErrorPopup} />
        )}
        {/* reauthenticate popup */}
        {isReauthenticatePopupOpen && (
            <ReauthenticateForDeletionModal closeReauthModal={closeReauthenticatePopup}/>
        )}
      </>
    );
  }
  
  
  export default DeletePopup;
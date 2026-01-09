import React, { useState, useRef, useEffect } from 'react';
// css styling
import '../../styles/animate.css';
import '../../styles/icomoon.css';
import '../../styles/bootstrap.css';
import '../../styles/flexslider.css';
import '../../styles/style.css';

import { auth} from "../../firebase/firebaseConfig.js";
import { signInWithEmailAndPassword, sendPasswordResetEmail} from "firebase/auth"; 
//import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js"
//import { getFirestore, doc, getDoc, setDoc, collection } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js"
//import {getAuth, sendEmailVerification, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail} from   "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js"; 
import ErrorPopup from './ErrorPopup.js';


function LoginModal({isOpen, closeModal}) {
    // references to modal and overlay
    const modalRef = useRef(null);
    const overlayRef = useRef(null);

    const [isForgotPassModalOpen, setIsForgotPassModalOpen] = useState(false);
    const [isErrorPopupOpen, setIsErrorPopupOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMess, setErrorMess] = useState('');
  
    //open/close forgot password modal
    const openForgotPassModal = () => {
        closeModal(); // close the login modal when forgot pass is clicked
        setIsForgotPassModalOpen(true); // open forgot pass modal
    };
    const closeForgotPassModal = () => setIsForgotPassModalOpen(false);


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

    // close modal if clicking outside the modal (on the overlay)
    const handleClickOutside = (event) => {
      if (overlayRef.current && !modalRef.current.contains(event.target)) {
          closeModal(); // close modal if the click is outside the modal content but inside the overlay
      }
    };
      const handleEscKey = (event) => {
        if (event.key === 'Escape' && !isErrorPopupOpen) {
            closeModal(); // close modal on Escape key press
        }
    };
    useEffect(() => {
      if(isErrorPopupOpen || isForgotPassModalOpen){
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
    }, [isOpen, isErrorPopupOpen, isForgotPassModalOpen]);


    //handling login form submission
    const loginHandler = (e) => {
        e.preventDefault(); // prevent default form submission behavior
    
        //  login function 
        signInWithEmailAndPassword(auth, email, password)
          .then((cred) => {
            // close modal and reset form
            closeModal();
            setEmail('');
            setPassword('');
          })
          .catch((error) => {
            setErrorMess(error.code);
            openErrorPopup();
            // error handling
          });
      };



  return (
    <>
      {isOpen && !isForgotPassModalOpen && (
        <div className="popup-overlay" id="popupOverlay" ref={overlayRef}>
        <div id="login-modal" className="popup" style={{ zIndex: 1, display: 'block' }} ref={modalRef}>
          <br />
          <h3 style={{ textAlign: 'center' }}>Log In</h3>
          <span className="close" id="close-login-button" onClick={closeModal}>&times;</span>
          <form id="login-form" style={{ padding: '20px', marginLeft: '5px' }}>
            <div className="input-field">
              <input
                type="email"
                id="login-email"
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)} // email input
                required
              />
            </div>
            <div className="input-field">
              <input
                type="password"
                id="login-password"
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)} // password input
                required
              />
            </div>
            <br />
            <button
              className="btn green darken-2 z-depth-0"
              style={{ margin: '0 auto', display: 'block' }}
              onClick={(e) => loginHandler(e)} // pass event to login handler
            >
              Login
            </button>
          </form>
          <button 
            className="logged-out btn green darken-2 z-depth-0" 
            onClick={openForgotPassModal}>
            Forgot Password?
          </button>
        </div>
        </div>
      )}

      {/* forgot pass modal */}
      {isForgotPassModalOpen && (
        <ForgotPassModal closeForgotPassModal={closeForgotPassModal} />
      )}

      {/* error popup */}
      {isErrorPopupOpen && (
        <ErrorPopup error={errorMess} closeErrorPopup={closeErrorPopup} />
      )}

      {/* login button
      {!auth.currentUser && 
      ()
      } */}
    </>
  );
}

function ForgotPassModal({ closeForgotPassModal }) {
    // references to modal and overlay
    const modalRef = useRef(null);
    const overlayRef = useRef(null);

    //modal visibility
    const [isPassModalOpen, setIsPassModalOpen] = useState(true);
    const [email, setEmail] = useState('');

    //error messages
    const [errorMess, setErrorMess] = useState('');
    const [isErrorPopupOpen, setIsErrorPopupOpen] = useState(false);


    //open/close forgot error popup
    const openErrorPopup = () => {
      setIsErrorPopupOpen(true); // open forgot pass modal
    };
    const closeErrorPopup = () => setIsErrorPopupOpen(false);

    // close modal if clicking outside the modal (on the overlay)
    useEffect(() => {
      const handleEscKey = (event) => {
        if (event.key === 'Escape') {
            closePassModal(); // close modal on Escape key press
        }
        };
        const handleClickOutside = (event) => {
        if (overlayRef.current && !modalRef.current.contains(event.target)) {
            closePassModal(); // close modal if the click is outside the modal content but inside the overlay
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



    //handling forgot password form submission
    const forgotPassHandler = (e) => {
        e.preventDefault(); // prevent default form submission behavior
        sendPasswordResetEmail(auth, email).then(() =>{
            closeForgotPassModal();
        }).catch((error) => {
            setErrorMess(error.code);
            openErrorPopup();
        });
    };

    const closePassModal = () => {
        setIsPassModalOpen(false);
        closeForgotPassModal(); // close forgot pass modal
    };
  
    return (
      <>
        {/* password reset modal*/}
        {isPassModalOpen && (
          <div className='popup-overlay' ref={overlayRef}>
          <div id="pass-modal" className="popup" style={{ zIndex: 1, display: 'block' }} ref={modalRef}>
            <br />
            <h3 style={{ textAlign: 'center' }}>Password Reset</h3>
            <span className="close" id="close-pass-button" onClick={closePassModal}>&times;</span>
            <form id="pass-form" style={{ padding: '20px', marginLeft: '5px' }}>
              <div className="input-field">
                <input
                  type="email"
                  id="pass-email"
                  placeholder="Email"
                  onChange={(e) => setEmail(e.target.value)} // email input
                  required
                />
              </div>
              <br />
              <button
                id="pass-submit"
                className="btn green darken-2 z-depth-0"
                style={{ margin: '0 auto', display: 'block' }}
                onClick={(e) => forgotPassHandler(e)}
              >
                Send
              </button>
            </form>
          </div>
          </div>
        )}
        {isErrorPopupOpen && (
          <ErrorPopup error={errorMess} closeErrorPopup={closeErrorPopup} />
        )}
      </>
    );
}

export default LoginModal;

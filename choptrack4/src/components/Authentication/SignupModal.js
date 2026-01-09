import React, { useState, useRef, useEffect } from 'react';
// css styling
import '../../styles/style.css';

//firebase imports
import { auth, db} from "../../firebase/firebaseConfig.js";
import { doc, collection, setDoc } from 'firebase/firestore';
import { updateProfile, sendEmailVerification, createUserWithEmailAndPassword, } from "firebase/auth"; 
import ErrorPopup from './ErrorPopup.js';
import PrivacyPopup from './PrivacyPopup.js';

function SignupModal({isOpen, closeModal}) {
    // references to modal and overlay
    const modalRef = useRef(null);
    const overlayRef = useRef(null);
    

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmedPass, setConfirmedPass] = useState('');
    const [phoneNumberr, setPhoneNumber] = useState('');
    const [namee, setName] = useState('');

    //error messages
    const [errorMess, setErrorMess] = useState('');
    const [isErrorPopupOpen, setIsErrorPopupOpen] = useState(false);

    //privacy popup 
    const [isPrivPopupOpen, setIsPrivPopupOpen] = useState(false);
     // Open the popup (trigger the fade-in effect)
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = "hidden"; // Disable scrolling when popup is open
      } else {
        document.body.style.overflow = "auto"; // Re-enable scrolling after popup closes
      }
    }, [isOpen]);



    //open/close error popup
    const openErrorPopup = () => {
      setIsErrorPopupOpen(true); // open forgot pass modal
    };
    const closeErrorPopup = () => setIsErrorPopupOpen(false);
    //open/close error popup
    const openPrivPopup = () => {
      setIsPrivPopupOpen(true); // open forgot pass modal
    };
    const closePrivPopup = () => setIsPrivPopupOpen(false);
    const privHandler = (event) =>{
      openPrivPopup();
    };



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
      if(isErrorPopupOpen || isPrivPopupOpen){
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
    }, [isOpen, isErrorPopupOpen, isPrivPopupOpen]);

    const signupHandler = (e) => {
        e.preventDefault();
        if (password===confirmedPass){
          createUserWithEmailAndPassword(auth, email, password).then(
            cred => {
                
                const user = cred.user;
                const usersCollection = collection(db, 'userProfile'); 
    
                const docRef = doc(usersCollection, user.uid); 
                const data = {
                    name: namee,
                    phoneNumber: "+1"+ phoneNumberr,
                }
                try {
                    //creating their userprofile doc
                    const docdoc = setDoc(docRef, data);
                    //setting their display name
                    updateProfile(auth.currentUser, {
                      displayName: namee
                    }).catch((error) => {
                      console.error(error)
                    });
                    sendEmailVerification(auth.currentUser)
                    .then(() => {            
                        setErrorMess("Check email " + email + " for verification!");
                        openErrorPopup();
                    });
                    closeModal();
                    setEmail('');
                    setPassword('');
                    setPhoneNumber('');
                    setName('');
                } catch (e) {
                    console.error("Error adding document: ", e);
                }
            }
        ).catch ((error) =>{
          setErrorMess(error.code);
          openErrorPopup();
        });
        } 
        else{
          setErrorMess("The passwords you entered are not the same.");
          openErrorPopup();
        }
    };

  
  return (
    <>
      {isOpen && (
        <div className="popup-overlay" ref={overlayRef}>
        <div id="signup-modal" className="popup" style={{ zIndex: 1, display: 'block' }} ref={modalRef}>
          <br />
          <h3 style={{ textAlign: 'center' }}>Sign up</h3>
          <span className="close" id="close-signup-button" onClick={closeModal}>&times;</span>
          <form id="signup-form" style={{ padding: '20px', marginLeft: '5px' }}>
            <div className="input-field">
              <input
                type="text"
                id="signup-name"
                placeholder="Name"
                onChange={(e) => setName(e.target.value)} 
                required
              />
            </div>
            <div className="input-field">
              <input
                type="tel"
                id="signup-number"
                placeholder="Phone Number"
                onChange={(e) => setPhoneNumber(e.target.value)} 
                required
              />
            </div>
            <div className="input-field">
              <input
                type="email"
                id="signup-email"
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)} 
                required
              />
            </div>
            <div className="input-field">
              <input
                type="password"
                id="signup-password"
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)} 
                required
              />
            </div>
            <div className="input-field">
              <input
                type="password"
                id="signup-confirm-password"
                placeholder="Retype Password"
                onChange={(e) => setConfirmedPass(e.target.value)} 
                required
              />
            </div>
            <br />
            <button
              className="btn green darken-2 z-depth-0"
              style={{ margin: '0 auto', display: 'block' }}
              onClick={(e) => signupHandler(e)} // Pass event to signupHandler
            >
              Sign up
            </button>
            <span onClick={(e) => privHandler(e)} >
              What do we do with your information?*
            </span>
          </form>
        </div>
        </div>
      )}
      {/* error popup */}
      {isErrorPopupOpen && (
        <ErrorPopup error={errorMess} closeErrorPopup={closeErrorPopup} />
      )}
       {/* priv popup */}
       {isPrivPopupOpen && (
        <PrivacyPopup closePrivPopup={closePrivPopup} />
      )}
    </>
  );
}

export default SignupModal;

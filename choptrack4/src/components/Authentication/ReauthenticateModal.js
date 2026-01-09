import React, { useState, useEffect, useRef } from 'react';
// css styling
import '../../styles/style.css';

import { auth, db} from "../../firebase/firebaseConfig.js";
import {  getDocs, doc, collection, deleteDoc, writeBatch} from 'firebase/firestore';
import {EmailAuthProvider, deleteUser, reauthenticateWithCredential} from "firebase/auth"; 
import { getStorage, ref, listAll, deleteObject } from "firebase/storage";
import ErrorPopup from './ErrorPopup.js';

//FOLLOWING IS FOR DELETION FROM FIRESTORE:
// delete documents in a specific subcollection
async function deleteSubcollection(collectionRef) {
  const snapshot = await getDocs(collectionRef);

  if (snapshot.empty) {
    return;
  }
  // delete all documents in this subcollection
  const batch = writeBatch(db);
  snapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  // commit the batch delete operation
  await batch.commit();
}

// main function to delete a document and its subcollections
async function deleteDocumentWithSubcollections(docPath) {
  const subcollections = ['clean-receipts', 'receipts', 'fridge'];

  try {
    const docRef = doc(db, docPath); // Create a reference to the document
    // delete known subcollections
    for (const subcollection of subcollections) {
      const subcollectionRef = collection(db, docPath, subcollection);
      await deleteSubcollection(subcollectionRef);
    }
    // delete the parent document after all subcollections are deleted
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error during deletion:', error);
  }
}
//FOLLOWING IS FOR DELETION FROM FIREBASE STORAGE:
// firebase storage
const storage = getStorage();

//  delete all receipts for a specific user
async function deleteAllReceiptsForUser(uid) {
  try {
    //reference to user receipts folder
    const receiptsFolderRef = ref(storage, `users/${uid}/receipts/`);

    //all items in receipts folder
    const listResult = await listAll(receiptsFolderRef);

    // iterate through each file in the receipts folder and delete it
    for (const item of listResult.items) {
      await deleteObject(item);  // Delete each receipt
    }
  } catch (error) {
    console.error('Error deleting receipts from Firebase Storage:', error);
  }
}


//FOLLOWING IS FOR COMBINING ABOVE:
// async function to delete userProfile and user documents, deletion from firebase storage
async function deleteProf(uid) {
    //single delete document from userProfile (not complex profile document)
    await deleteDoc(doc(db, "userProfile", uid));
    // path to the document in (the "users" collection and the document with the UID)
    const path = `users/${uid}`;
    // delete document and subcollections in firestore
    deleteDocumentWithSubcollections(path)
    .catch((error) => console.error('Error deleting document:', error));
    //delete receipts from firebase storage
    deleteAllReceiptsForUser(uid)
    .catch((error) => console.error('Error deleting receipts:', error));
    
  }
  
  function ReauthenticateForDeletionModal({ closeReauthModal }) {
    // references to modal and overlay
    const modalRef = useRef(null);
    const overlayRef = useRef(null);

    const [isOpen, setIsOpen] = useState(true);
    const [isErrorPopupOpen, setIsErrorPopupOpen] = useState(false);
    const [email, setEmail] = useState(auth.currentUser.email);
    const [password, setPassword] = useState('');
    const [errorMess, setErrorMess] = useState('');
  
    const openModal = () => setIsOpen(true);
    const closeModal = () => {
        setIsOpen(false);
        closeReauthModal();
    }
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
      if(isErrorPopupOpen){
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
    }, [isOpen, isErrorPopupOpen]);
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = "hidden"; // Disable scrolling when popup is open
      } else {
        document.body.style.overflow = "auto"; // Re-enable scrolling after popup closes
      }
    }, [isOpen]);
  
    // open/close error popup
    const openErrorPopup = () => setIsErrorPopupOpen(true);
    const closeErrorPopup = () => setIsErrorPopupOpen(false);
  
    // handling form submission
    const loginHandler = async (e) => {
      e.preventDefault(); // prevent default form submission behavior
      const user = auth.currentUser;
      if (!user) {
        setErrorMess('No user is currently logged in.');
        openErrorPopup();
        return;
      }
  
      const credential = EmailAuthProvider.credential(email, password);
  
      try {
        // reauthenticate the user
        await reauthenticateWithCredential(user, credential);
  
        // delete firestore prof
        const uid = user.uid;
        await deleteProf(uid);
  
        // delete user from fb
        await deleteUser(user);
        setErrorMess("Account deleted successfully.");
        openErrorPopup();
        closeReauthModal(); // close modal after successful deletion
      } catch (error) {
        console.error("Error during reauthentication or deletion:", error);
        setErrorMess(error.message || 'An error occurred');
        openErrorPopup();
      }
    };
  
    return (
      <>
        {isOpen && (
          <div className='popup-overlay' ref={overlayRef}>
          <div id="login-modal" className="popup" style={{ zIndex: 999, display: 'block' }} ref={modalRef}>
            <br />
            <h3 style={{ textAlign: 'center' }}>Reauthenticate your account...</h3>
            <span className="close" id="close-login-button" onClick={closeModal}>&times;</span>
            <form id="login-form" style={{ padding: '20px', marginLeft: '5px' }}>
              <div className="input-field">
                <input
                  type="email"
                  id="login-email"
                  defaultValue={auth.currentUser.email}
                  onChange={(e) => setEmail(e.target.value)} // email input
                  readOnly='read-only'
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
                onClick={loginHandler} // pass event to login handler
              >
                Login
              </button>
            </form>
          </div>
          </div>
        )}
        {/* error popup */}
        {isErrorPopupOpen && (
          <ErrorPopup error={errorMess} closeErrorPopup={closeErrorPopup} />
        )}
      </>
    );
  }
  
  export default ReauthenticateForDeletionModal;
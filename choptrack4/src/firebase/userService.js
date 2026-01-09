import { auth } from '../firebase/firebaseConfig';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';  // Import persistence functions

export const getUserData = async () => {
  try {
    // Ensure that the user persistence is set to local storage
    await setPersistence(auth, browserLocalPersistence); // Set persistence to localStorage

    // Get the currently logged-in user
    const user = auth.currentUser;

    if (!user) {
      throw new Error('No user is currently logged in.');
    }

    // Fetch user data from Firestore
    const { uid, displayName } = user;

    const userDocRef = doc(db, 'userProfile', uid); 
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error('User document does not exist in Firestore.');
    }

    const { phoneNumber } = userDoc.data();

    return {
      uid,
      name: displayName,
      phoneNumber,
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error; 
  }
};

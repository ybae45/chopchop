import { initializeApp } from 'firebase/app';
import { getDownloadURL, getStorage, ref} from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDP_5nrM0oNpYJlQ7EBFh9wGOT8HVRSarI",
  authDomain: "choptrack-801d8.firebaseapp.com",
  databaseURL: "https://choptrack-801d8-default-rtdb.firebaseio.com",
  projectId: "choptrack-801d8",
  storageBucket: "choptrack-801d8.appspot.com",
  messagingSenderId: "724720116664",
  appId: "1:724720116664:web:7ea82bb915f2cdc8cfe54d",
  measurementId: "G-JBXRZVJ8ZM"
};

export const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const auth = getAuth(app);


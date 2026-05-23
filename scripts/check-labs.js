import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkData() {
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`Users: ${usersSnap.size}`);
  
  const petsSnap = await getDocs(collection(db, 'pets'));
  console.log(`Pets: ${petsSnap.size}`);
  
  const labsSnap = await getDocs(collection(db, 'lab_orders'));
  console.log(`Lab Orders: ${labsSnap.size}`);
  
  labsSnap.forEach(doc => {
    const data = doc.data();
    console.log(`Lab ${doc.id}: petName=${data.petName}, ownerId='${data.ownerId}', ownerName='${data.ownerName}'`);
  });
  
  process.exit(0);
}

checkData();

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

async function check() {
  const encSnap = await getDocs(query(collection(db, 'encounters'), where('petName', '==', 'Buddy')));
  console.log('Buddy encounters:', encSnap.size);
  
  const invSnap = await getDocs(query(collection(db, 'invoices'), where('petName', '==', 'Buddy')));
  console.log('Buddy invoices:', invSnap.size);

  const allPets = ['Buddy', 'Whiskers', 'Max', 'Luna', 'Charlie', 'Rocky'];
  for (const pet of allPets) {
    const pEnc = await getDocs(query(collection(db, 'encounters'), where('petName', '==', pet)));
    const pInv = await getDocs(query(collection(db, 'invoices'), where('petName', '==', pet)));
    const pAppt = await getDocs(query(collection(db, 'appointments'), where('petName', '==', pet)));
    console.log(`${pet}: ${pEnc.size} encounters, ${pInv.size} invoices, ${pAppt.size} appointments`);
  }
}

check().catch(console.error);

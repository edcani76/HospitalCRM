import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

async function checkData() {
  const email = 'ecanicula@gmail.com';
  const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
  if (usersSnap.empty) {
    console.log('User not found');
    process.exit(1);
  }
  const user = usersSnap.docs[0];
  console.log(`User UID (${email}):`, user.id);

  const petsSnap = await getDocs(query(collection(db, 'pets'), where('ownerUid', '==', user.id)));
  console.log(`\nPets (${petsSnap.size}):`);
  petsSnap.forEach(d => console.log(` - [${d.id}] ${d.data().name}`));

  const aptSnap = await getDocs(query(collection(db, 'appointments'), where('clientUid', '==', user.id)));
  console.log(`\nAppointments (${aptSnap.size}):`);
  aptSnap.forEach(d => console.log(` - [${d.id}] Pet: ${d.data().petName}, Date: ${d.data().date}`));

  const invSnap = await getDocs(query(collection(db, 'invoices'), where('clientUid', '==', user.id)));
  console.log(`\nInvoices (${invSnap.size}):`);
  invSnap.forEach(d => console.log(` - [${d.id}] Pet: ${d.data().petName}, Desc: ${d.data().description}`));
}

checkData().catch(console.error);

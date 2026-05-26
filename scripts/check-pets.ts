import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

async function checkData() {
  const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', 'edcani@rocketmail.com')));
  if (usersSnap.empty) {
    console.log('User not found');
    process.exit(1);
  }
  const user = usersSnap.docs[0];
  console.log('User UID:', user.id);

  const petsSnap = await getDocs(query(collection(db, 'pets'), where('ownerUid', '==', user.id)));
  console.log(`\nPets (${petsSnap.size}):`);
  petsSnap.forEach(d => {
    console.log(` - [${d.id}] ${d.data().name}`);
  });
}

checkData().catch(console.error);

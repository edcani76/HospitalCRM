import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, collection, query, getDocs, where, updateDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

async function main() {
  try {
    await signInWithEmailAndPassword(auth, 'admin@medipaws.com', 'Password123!');
  } catch {}

  const petSnap = await getDocs(query(collection(db, 'pets'), where('name', '==', 'Rocky')));
  const rocky = petSnap.docs[0];
  const encSnap = await getDocs(query(collection(db, 'encounters'), where('petId', '==', rocky.id), where('status', '==', 'medical-completed')));
  const enc = encSnap.docs[0];
  const invSnap = await getDocs(query(collection(db, 'invoices'), where('encounterId', '==', enc.id)));

  for (const inv of invSnap.docs) {
    const dueDate = new Date(Date.now() + 30 * 86400000);
    await updateDoc(doc(db, 'invoices', inv.id), { dueDate });
    console.log(`Set dueDate: ${dueDate.toISOString().split('T')[0]} for ${inv.data().invoiceNo || inv.id}`);
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

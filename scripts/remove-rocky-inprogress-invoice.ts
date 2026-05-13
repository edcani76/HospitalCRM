import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, collection, query, getDocs, getDoc, where, deleteDoc, writeBatch } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

async function signIn() {
  try {
    await signInWithEmailAndPassword(auth, 'admin@medipaws.com', 'Password123!');
    console.log('Signed in as admin');
  } catch (err) {
    console.log('Continuing without auth...');
  }
}

async function main() {
  await signIn();

  // 1. Find Rocky's pet record
  const petSnap = await getDocs(query(collection(db, 'pets'), where('name', '==', 'Rocky')));
  if (petSnap.empty) {
    console.log('Rocky not found in pets');
    process.exit(0);
  }
  const rocky = petSnap.docs[0];
  console.log(`Found Rocky: ${rocky.id}`);

  // 2. Find Rocky's in-progress encounter
  const encSnap = await getDocs(query(collection(db, 'encounters'), where('petId', '==', rocky.id), where('status', '==', 'in-progress')));
  if (encSnap.empty) {
    console.log('No in-progress encounter found for Rocky');
    process.exit(0);
  }
  const enc = encSnap.docs[0];
  const encData = enc.data();
  console.log(`Found in-progress encounter: ${enc.id}, date: ${encData.date?.toDate?.()?.toISOString() || encData.date || 'unknown'}`);

  // 3. Find invoices linked to this encounter
  const invSnap = await getDocs(query(collection(db, 'invoices'), where('encounterId', '==', enc.id)));
  if (invSnap.empty) {
    console.log('No invoice found for this encounter — nothing to clean up.');
    process.exit(0);
  }

  const batch = writeBatch(db);

  for (const invDoc of invSnap.docs) {
    const invData = invDoc.data();
    console.log(`Removing invoice: ${invData.invoiceNo || invDoc.id} (status: ${invData.status})`);

    // Delete invoice_items for this invoice
    const itemsSnap = await getDocs(query(collection(db, 'invoice_items'), where('invoiceId', '==', invDoc.id)));
    for (const itemDoc of itemsSnap.docs) {
      batch.delete(doc(db, 'invoice_items', itemDoc.id));
      console.log(`  Deleted invoice_item: ${itemDoc.id}`);
    }

    // Delete payments for this invoice
    const paysSnap = await getDocs(query(collection(db, 'payments'), where('invoiceId', '==', invDoc.id)));
    for (const payDoc of paysSnap.docs) {
      batch.delete(doc(db, 'payments', payDoc.id));
      console.log(`  Deleted payment: ${payDoc.id}`);
    }

    // Delete the invoice itself
    batch.delete(doc(db, 'invoices', invDoc.id));
  }

  await batch.commit();
  console.log('✅ Rocky in-progress invoice and related data removed.');
  process.exit(0);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});

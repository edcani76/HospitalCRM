import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccountPath = path.resolve('firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({ credential: cert(serviceAccount) });
async function checkInvoice() {
  const db = getFirestore(app, 'medcrm');
  const qSnap = await db.collection('invoices').where('invoiceNo', '==', 'INV-003-MAX').get();
  if (qSnap.empty) {
    console.log('No invoice found with invoiceNo INV-003-MAX');
    return process.exit(0);
  }
  const docSnap = qSnap.docs[0];
  const invId = docSnap.id;
  console.log(`Found invoice ${invId}:`, docSnap.data());

  const itemsSnap = await db.collection('invoice_items').where('invoiceId', '==', invId).get();
  console.log(`Found ${itemsSnap.size} items in invoice_items:`);
  itemsSnap.forEach(d => console.log(d.id, d.data()));

  const subItemsSnap = await db.collection(`invoices/${invId}/items`).get();
  console.log(`Found ${subItemsSnap.size} items in subcollection invoices/${invId}/items`);
  subItemsSnap.forEach(d => console.log(d.id, d.data()));
  
  process.exit(0);
}

checkInvoice().catch(console.error);

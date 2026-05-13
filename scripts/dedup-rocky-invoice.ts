import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, collection, query, getDocs, where, deleteDoc, writeBatch } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

async function main() {
  await signInWithEmailAndPassword(auth, 'admin@medipaws.com', 'Password123!').catch(() => {});

  // Find Rocky
  const petSnap = await getDocs(query(collection(db, 'pets'), where('name', '==', 'Rocky')));
  const rocky = petSnap.docs[0];

  // Find medical-completed encounter
  const encSnap = await getDocs(query(collection(db, 'encounters'), where('petId', '==', rocky.id), where('status', '==', 'medical-completed')));
  const enc = encSnap.docs[0];

  // Find all invoices for this encounter
  const invSnap = await getDocs(query(collection(db, 'invoices'), where('encounterId', '==', enc.id)));
  const invoices = invSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Keep the most recent (highest total), remove others
  invoices.sort((a: any, b: any) => (b.grandTotal || 0) - (a.grandTotal || 0));
  const keep = invoices[0];
  const remove = invoices.slice(1);

  console.log(`Found ${invoices.length} invoices. Keeping: ${keep.invoiceNo || keep.id} (₱${keep.grandTotal})`);

  const batch = writeBatch(db);
  for (const r of remove) {
    // Delete invoice items
    const itemsSnap = await getDocs(query(collection(db, 'invoice_items'), where('invoiceId', '==', r.id)));
    for (const item of itemsSnap.docs) {
      batch.delete(doc(db, 'invoice_items', item.id));
    }
    // Delete payments
    const paysSnap = await getDocs(query(collection(db, 'payments'), where('invoiceId', '==', r.id)));
    for (const pay of paysSnap.docs) {
      batch.delete(doc(db, 'payments', pay.id));
    }
    // Delete the invoice
    batch.delete(doc(db, 'invoices', r.id));
    console.log(`  Removed: ${r.invoiceNo || r.id}`);
  }

  await batch.commit();
  console.log('✅ Duplicate invoices cleaned up.');
  process.exit(0);
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });

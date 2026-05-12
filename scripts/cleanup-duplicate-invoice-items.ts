import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, deleteDoc, writeBatch, doc } from 'firebase/firestore';
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
  } catch {}
}

async function main() {
  await signIn();

  // Fetch all invoice_items grouped by invoiceId
  const snap = await getDocs(collection(db, 'invoice_items'));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Total invoice_items: ${all.length}`);

  const grouped: Record<string, any[]> = {};
  for (const item of all) {
    const key = item.invoiceId || '__orphan__';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  let totalRemoved = 0;
  const batch = writeBatch(db);
  let batchSize = 0;

  for (const [invId, items] of Object.entries(grouped)) {
    // Group by (description, quantity, unitPrice)
    const nameGroups: Record<string, any[]> = {};
    for (const item of items) {
      const key = `${item.description || ''}|${item.quantity || 1}|${item.unitPrice || 0}`;
      if (!nameGroups[key]) nameGroups[key] = [];
      nameGroups[key].push(item);
    }

    for (const [key, dupes] of Object.entries(nameGroups)) {
      if (dupes.length <= 1) continue;

      // Keep the one WITH appointmentServiceId (linked to actual service)
      // If none has it, keep the first one
      const keep = dupes.find(d => d.appointmentServiceId) || dupes[0];
      const remove = dupes.filter(d => d.id !== keep.id);
      for (const r of remove) {
        batch.delete(doc(db, 'invoice_items', r.id));
        totalRemoved++;
        batchSize++;
        if (batchSize >= 500) {
          await batch.commit();
          batchSize = 0;
        }
      }
    }
  }

  if (batchSize > 0) await batch.commit();
  console.log(`\nRemoved ${totalRemoved} duplicate invoice_items`);

  // Recalculate invoice totals after cleanup
  const invoices = await getDocs(collection(db, 'invoices'));
  console.log('\nRecalculating invoice totals...');
  const totalBatch = writeBatch(db);
  let totalBatchSize = 0;
  let invoiceCount = 0;

  for (const invDoc of invoices.docs) {
    const invId = invDoc.id;
    const itemSnap = await getDocs(query(collection(db, 'invoice_items'), where('invoiceId', '==', invId)));
    const items = itemSnap.docs.map(d => d.data());
    const newSubTotal = items.reduce((s: number, i: any) => s + (i.lineTotal || i.unitPrice * i.quantity || 0), 0);
    const newDiscount = items.reduce((s: number, i: any) => s + (i.discountAmount || 0), 0);
    const newGrandTotal = newSubTotal - newDiscount;
    const newBalance = newGrandTotal - (invDoc.data().amountPaid || 0);

    totalBatch.update(doc(db, 'invoices', invId), {
      subTotal: newSubTotal,
      discountTotal: newDiscount,
      grandTotal: newGrandTotal,
      balanceDue: newBalance > 0 ? newBalance : 0,
      updatedAt: new Date()
    });
    totalBatchSize++;
    invoiceCount++;
    if (totalBatchSize >= 500) {
      await totalBatch.commit();
      totalBatchSize = 0;
    }
  }
  if (totalBatchSize > 0) await totalBatch.commit();
  console.log(`Recalculated totals for ${invoiceCount} invoices`);

  console.log('\nDone.');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

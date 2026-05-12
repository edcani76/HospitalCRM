import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, collection, query, getDocs, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
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

interface InvoiceItem {
  id: string;
  invoiceId: string;
  [key: string]: any;
}

async function main() {
  await signIn();

  // 1. Fetch all invoices
  const invSnapshot = await getDocs(collection(db, 'invoices'));
  const allInvoices = invSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`\nTotal invoices: ${allInvoices.length}`);

  // 2. Group by encounterId
  const grouped: Record<string, any[]> = {};
  for (const inv of allInvoices) {
    const key = inv.encounterId || '__no_encounter__';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(inv);
  }

  // 3. Find duplicates (encounters with >1 invoice)
  let totalRemoved = 0;
  const removedInvoiceIds: string[] = [];

  for (const [encId, invoices] of Object.entries(grouped)) {
    if (invoices.length <= 1) continue;

    console.log(`\nEncounter ${encId.slice(0, 8)}... has ${invoices.length} invoices:`);
    invoices.forEach((inv, i) => {
      console.log(`  [${i}] ${inv.invoiceNo || 'NO_NUMBER'} — status: ${inv.status}, subTotal: ${inv.subTotal}, grandTotal: ${inv.grandTotal}`);
    });

    // Keep the invoice with the most complete data.
    // Prefer: has invoiceNo length > 10 (seed format INV-004-ROC over UI's Date.now()),
    // then by most fields populated, then by highest total (most complete).
    const sorted = [...invoices].sort((a, b) => {
      const aScore = (a.invoiceNo && a.invoiceNo.length > 10 ? 2 : 0) + (a.subTotal ? 1 : 0) + (a.grandTotal ? 1 : 0) + (a.taxAmount ? 1 : 0);
      const bScore = (b.invoiceNo && b.invoiceNo.length > 10 ? 2 : 0) + (b.subTotal ? 1 : 0) + (b.grandTotal ? 1 : 0) + (b.taxAmount ? 1 : 0);
      return bScore - aScore;
    });

    const keep = sorted[0];
    const remove = sorted.slice(1);
    console.log(`  Keeping: ${keep.invoiceNo || keep.id} (id: ${keep.id})`);
    remove.forEach(r => console.log(`  Removing: ${r.invoiceNo || r.id} (id: ${r.id})`));

    // 4. Reassign invoice_items from removed invoices to the kept invoice
    const allItems: InvoiceItem[] = [];
    for (const r of remove) {
      const itemSnap = await getDocs(query(collection(db, 'invoice_items'), where('invoiceId', '==', r.id)));
      for (const itemDoc of itemSnap.docs) {
        allItems.push({ id: itemDoc.id, ...itemDoc.data() } as InvoiceItem);
      }
    }

    const batch = writeBatch(db);

    // Reassign items to kept invoice (only if they don't already have a matching item)
    const keepItemSnap = await getDocs(query(collection(db, 'invoice_items'), where('invoiceId', '==', keep.id)));
    const keepItemMap = new Map<string, any>();
    keepItemSnap.docs.forEach(d => {
      const data = d.data();
      // Dedup by appointmentServiceId or description
      if (data.appointmentServiceId) {
        keepItemMap.set(`svc:${data.appointmentServiceId}`, d);
      } else {
        keepItemMap.set(`desc:${data.description || ''}:${data.quantity || 1}:${data.unitPrice || 0}`, d);
      }
    });

    let reassigned = 0;
    for (const item of allItems) {
      const key = item.appointmentServiceId
        ? `svc:${item.appointmentServiceId}`
        : `desc:${item.description || ''}:${item.quantity || 1}:${item.unitPrice || 0}`;

      if (!keepItemMap.has(key)) {
        batch.update(doc(db, 'invoice_items', item.id), { invoiceId: keep.id });
        reassigned++;
      } else {
        // Duplicate item — delete it
        batch.delete(doc(db, 'invoice_items', item.id));
      }
    }
    console.log(`  Reassigned ${reassigned} items, deleted ${allItems.length - reassigned} duplicate items`);

    // 5. Delete the duplicate invoices
    for (const r of remove) {
      batch.delete(doc(db, 'invoices', r.id));
      removedInvoiceIds.push(r.id);
      totalRemoved++;
    }

    await batch.commit();
    console.log(`  Done.`);
  }

  // 6. Also cleanup orphaned invoice_items (items whose invoiceId doesn't match any invoice)
  console.log(`\n--- Cleaning orphaned invoice_items ---`);
  const allItemSnap = await getDocs(collection(db, 'invoice_items'));
  const allItemDocs = allItemSnap.docs;
  const validInvoiceIds = new Set(allInvoices.filter(i => !removedInvoiceIds.includes(i.id)).map(i => i.id));
  let orphanedDeleted = 0;
  const orphanBatch = writeBatch(db);
  let orphanBatchSize = 0;

  for (const itemDoc of allItemDocs) {
    const data = itemDoc.data();
    if (data.invoiceId && !validInvoiceIds.has(data.invoiceId) && !removedInvoiceIds.includes(data.invoiceId)) {
      orphanBatch.delete(doc(db, 'invoice_items', itemDoc.id));
      orphanedDeleted++;
      orphanBatchSize++;
      if (orphanBatchSize >= 500) {
        await orphanBatch.commit();
        orphanBatchSize = 0;
      }
    }
  }
  if (orphanBatchSize > 0) await orphanBatch.commit();
  console.log(`Deleted ${orphanedDeleted} orphaned invoice_items`);

  console.log(`\n✅ Cleanup complete. Removed ${totalRemoved} duplicate invoices.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});

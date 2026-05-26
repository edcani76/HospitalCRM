import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccountPath = path.resolve('firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app, 'medcrm');

async function migrate() {
  console.log('Fetching service catalog...');
  const catalogSnap = await db.collection('service_catalog').get();
  const catalog: any[] = [];
  catalogSnap.forEach(d => catalog.push({ id: d.id, ...d.data() }));

  // Helper to match text to catalog
  const findMatch = (text: string) => {
    const cleanText = text.replace(/\[.*?\]\s*/, '').toLowerCase(); // remove [CODE] if any
    
    // Exact match
    let match = catalog.find(c => c.service_name?.toLowerCase() === cleanText || c.name?.toLowerCase() === cleanText);
    if (match) return match;

    // Fuzzy match
    match = catalog.find(c => {
      const cName = (c.service_name || c.name || '').toLowerCase();
      return cleanText.includes(cName) || cName.includes(cleanText);
    });
    
    // Default fallback
    if (!match) {
      if (cleanText.includes('consult')) return catalog.find(c => c.service_name === 'General Consultation' || c.name === 'General Consultation' || c.service_name === 'Wellness Consultation');
      if (cleanText.includes('blood') || cleanText.includes('cbc') || cleanText.includes('panel')) return catalog.find(c => (c.service_name || c.name || '').includes('CBC') || (c.service_name || c.name || '').includes('Blood') || (c.service_name || c.name || '').includes('Chemistry'));
      if (cleanText.includes('x-ray') || cleanText.includes('xray')) return catalog.find(c => (c.service_name || c.name || '').includes('X-Ray'));
      if (cleanText.includes('vaccin') || cleanText.includes('dhpp') || cleanText.includes('rabies') || cleanText.includes('fvrcp')) return catalog.find(c => (c.service_name || c.name || '').includes('Vaccin') || (c.service_name || c.name || '').includes('Core'));
      if (cleanText.includes('fluid')) return catalog.find(c => (c.service_name || c.name || '').includes('Fluid'));
      if (cleanText.includes('fecal')) return catalog.find(c => (c.service_name || c.name || '').includes('Fecal'));
      if (cleanText.includes('urinalysis')) return catalog.find(c => (c.service_name || c.name || '').includes('Urinalysis'));
      if (cleanText.includes('dental')) return catalog.find(c => (c.service_name || c.name || '').includes('Dental'));
      if (cleanText.includes('surgery') || cleanText.includes('tplo')) return catalog.find(c => (c.service_name || c.name || '').includes('Surgery'));
    }
    
    return match || catalog[0]; // fallback to first item
  };

  console.log(`Found ${catalog.length} catalog items.`);

  console.log('Fetching invoice items...');
  const itemsSnap = await db.collection('invoice_items').get();
  const invoicesToRecalculate = new Set<string>();
  
  let batch = db.batch();
  let count = 0;

  for (const itemDoc of itemsSnap.docs) {
    const data = itemDoc.data();
    const oldDesc = data.description || data.serviceName || '';
    const match = findMatch(oldDesc);
    
    if (match) {
      const code = match.service_code || match.code || 'SVC-001';
      const name = match.invoice_label || match.service_name || match.name || 'Service';
      const newDesc = `[${code}] ${name}`;
      const price = match.base_price || match.defaultPrice || data.unitPrice || 0;
      const taxRate = match.tax_type === 'VAT' ? 0.12 : (match.taxable ? 0.12 : 0);

      const quantity = data.quantity || 1;
      const discountAmount = data.discountAmount || 0;
      const lineTotal = (price * quantity) - discountAmount;
      
      console.log(`Updating item: "${oldDesc}" -> "${newDesc}" (₱${price})`);
      
      batch.update(db.collection('invoice_items').doc(itemDoc.id), {
        description: newDesc,
        unitPrice: price,
        lineTotal,
        taxRate
      });
      
      if (data.invoiceId) invoicesToRecalculate.add(data.invoiceId);
      
      count++;
      if (count % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
  }

  await batch.commit();
  console.log(`Updated ${count} root invoice items.`);
  
  // Now let's handle old items embedded in subcollections
  console.log('Scanning for legacy subcollection items...');
  const invoicesSnap = await db.collection('invoices').get();
  
  batch = db.batch();
  count = 0;

  for (const invDoc of invoicesSnap.docs) {
    const invData = invDoc.data();
    let hasSubItems = false;
    
    // Check embedded items array first
    if (invData.items && Array.isArray(invData.items) && invData.items.length > 0) {
      const newItemsArray = invData.items.map((data: any) => {
        const oldDesc = data.description || data.serviceName || '';
        const match = findMatch(oldDesc);
        if (match) {
          const code = match.service_code || match.code || 'SVC-001';
          const name = match.invoice_label || match.service_name || match.name || 'Service';
          const newDesc = `[${code}] ${name}`;
          const price = match.base_price || match.defaultPrice || data.unitPrice || 0;
          const taxRate = match.tax_type === 'VAT' ? 0.12 : (match.taxable ? 0.12 : 0);
          const quantity = data.quantity || 1;
          const discountAmount = data.discountAmount || 0;
          return {
            ...data,
            description: newDesc,
            unitPrice: price,
            lineTotal: (price * quantity) - discountAmount,
            taxRate
          };
        }
        return data;
      });
      
      // Move them to root collection
      for (const item of newItemsArray) {
         batch.set(db.collection('invoice_items').doc(), {
           ...item,
           invoiceId: invDoc.id
         });
         count++;
      }
      
      // Remove embedded items
      batch.update(invDoc.ref, { items: FieldValue.delete() });
      invoicesToRecalculate.add(invDoc.id);
      
      if (count % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    
    // Check subcollection
    const subItemsSnap = await db.collection(`invoices/${invDoc.id}/items`).get();
    for (const subItemDoc of subItemsSnap.docs) {
      hasSubItems = true;
      const data = subItemDoc.data();
      const oldDesc = data.description || data.serviceName || '';
      const match = findMatch(oldDesc);
      
      let price = data.unitPrice;
      let newDesc = oldDesc;
      let taxRate = data.taxRate || 0;
      
      if (match) {
        const code = match.service_code || match.code || 'SVC-001';
        const name = match.invoice_label || match.service_name || match.name || 'Service';
        newDesc = `[${code}] ${name}`;
        price = match.base_price || match.defaultPrice || data.unitPrice || 0;
        taxRate = match.tax_type === 'VAT' ? 0.12 : (match.taxable ? 0.12 : 0);
      }
      
      const quantity = data.quantity || 1;
      const discountAmount = data.discountAmount || 0;
      const lineTotal = (price * quantity) - discountAmount;
      
      console.log(`Migrating sub-item: "${oldDesc}" -> "${newDesc}" (₱${price})`);
      
      // Move to root
      batch.set(db.collection('invoice_items').doc(subItemDoc.id), {
        ...data,
        invoiceId: invDoc.id,
        description: newDesc,
        unitPrice: price,
        lineTotal,
        taxRate
      });
      
      // Delete old
      batch.delete(subItemDoc.ref);
      
      invoicesToRecalculate.add(invDoc.id);
      count++;
      if (count % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
  }

  await batch.commit();
  console.log(`Migrated ${count} legacy items to root collection.`);
  
  // Now recalculate all affected invoices
  console.log(`Recalculating ${invoicesToRecalculate.size} invoices...`);
  
  batch = db.batch();
  count = 0;

  for (const invId of Array.from(invoicesToRecalculate)) {
    // Fetch newly updated items
    const invItemsSnap = await db.collection('invoice_items').where('invoiceId', '==', invId).get();
    
    let subTotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    for (const itemDoc of invItemsSnap.docs) {
      const item = itemDoc.data();
      // Skip taxes that might have been added manually as items in older seeds
      if (item.itemType === 'tax') continue;
      
      const lineTotal = item.lineTotal || 0;
      subTotal += lineTotal + (item.discountAmount || 0); // subtotal is before discount
      discountTotal += (item.discountAmount || 0);
      taxTotal += lineTotal * (item.taxRate || 0);
    }
    
    const grandTotal = subTotal - discountTotal + taxTotal;
    const invDocSnap = await db.collection('invoices').doc(invId).get();
    if (!invDocSnap.exists) continue;
    
    const data = invDocSnap.data();
    const balanceDue = grandTotal - (data?.amountPaid || 0);

    batch.update(db.collection('invoices').doc(invId), {
      subTotal,
      taxAmount: taxTotal,
      discountTotal,
      grandTotal,
      balanceDue,
      amount: grandTotal // legacy fallback
    });
    
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  
  await batch.commit();
  console.log(`Recalculated ${count} invoices.`);
  console.log('Migration completed successfully.');
  process.exit(0);
}

migrate().catch(console.error);

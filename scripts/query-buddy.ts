import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import * as fs from 'fs';

// Initialize Admin SDK
const serviceAccount = JSON.parse(fs.readFileSync('firebase-service-account.json', 'utf8'));

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'vetcrm-b3742'
  });
}

// Note: The Admin SDK in Node might not fully support named databases natively 
// in exactly the same way without explicit initialization, but we will try.
let db;
try {
  db = getFirestore('medcrm');
} catch (e) {
  // Fallback to default if the admin sdk doesn't support named databases or it's the default
  db = getFirestore();
}

async function run() {
  console.log("Querying pets named 'Buddy'...");
  const petsSnap = await db.collection('pets').where('name', '==', 'Buddy').get();
  
  if (petsSnap.empty) {
    console.log("No pets named Buddy found.");
    return;
  }

  for (const petDoc of petsSnap.docs) {
    const pet = petDoc.data();
    console.log(`\n--- Pet: ${pet.name} (ID: ${petDoc.id}) ---`);
    console.log(`Owner UID: ${pet.ownerUid}`);
    
    // Check Invoices
    const invoicesSnap = await db.collection('invoices').where('petId', '==', petDoc.id).get();
    console.log(`Invoices count: ${invoicesSnap.size}`);
    invoicesSnap.docs.forEach(d => console.log(`  - Invoice ${d.id}: ${d.data().amount} - ${d.data().status}`));
    
    // Check Appointments
    const apptsSnap = await db.collection('appointments').where('petId', '==', petDoc.id).get();
    console.log(`Appointments count: ${apptsSnap.size}`);
    apptsSnap.docs.forEach(d => console.log(`  - Appt ${d.id}: ${d.data().date} - ${d.data().status} - clientUid: ${d.data().clientUid}`));

    
    // Check Encounters/Visits (if there is an encounters collection)
    try {
      const encountersSnap = await db.collection('encounters').where('petId', '==', petDoc.id).get();
      console.log(`Encounters count (by petId): ${encountersSnap.size}`);
      encountersSnap.docs.forEach(d => console.log(`  - Encounter ${d.id} fields: ${Object.keys(d.data()).join(', ')}`));
    } catch (e) {
      console.log(`Encounters collection error: ${(e as any).message}`);
    }
  }
}

run().catch(console.error);

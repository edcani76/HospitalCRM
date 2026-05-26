import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, writeBatch, query, where, getDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

async function wipeSeededPets() {
  console.log('\n🧹 Starting cleanup of seeded pet records...\n');

  const seededPetNames = ['Buddy', 'Whiskers', 'Max', 'Luna', 'Charlie', 'Rocky'];
  const batch = writeBatch(db);
  let deleteCount = 0;

  async function deleteQuery(q: any) {
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      batch.delete(d.ref);
      deleteCount++;
      if (deleteCount % 400 === 0) {
        await batch.commit();
        console.log(`...committed ${deleteCount} deletes`);
      }
    }
  }

  // 1. Find the seeded pets
  const petsSnap = await getDocs(collection(db, 'pets'));
  const targetPetIds: string[] = [];
  petsSnap.forEach(doc => {
    if (seededPetNames.includes(doc.data().name)) {
      targetPetIds.push(doc.id);
    }
  });

  if (targetPetIds.length === 0) {
    console.log('No seeded pets found. Aborting.');
    return;
  }
  
  console.log(`Found ${targetPetIds.length} seeded pets. Finding all related records...`);

  // We have to chunk the IN queries because Firestore only supports 10 items in an 'in' array
  const chunks = [];
  for (let i = 0; i < targetPetIds.length; i += 10) {
    chunks.push(targetPetIds.slice(i, i + 10));
  }

  const allEncounterIds: string[] = [];
  const allInvoiceIds: string[] = [];

  for (const chunk of chunks) {
    // 2. Appointments
    await deleteQuery(query(collection(db, 'appointments'), where('petId', 'in', chunk)));
    
    // 3. Encounters (and gather IDs)
    const encSnap = await getDocs(query(collection(db, 'encounters'), where('petId', 'in', chunk)));
    for (const e of encSnap.docs) {
      allEncounterIds.push(e.id);
      batch.delete(e.ref);
      deleteCount++;
    }

    // 4. Invoices (and gather IDs)
    const invSnap = await getDocs(query(collection(db, 'invoices'), where('petId', 'in', chunk)));
    for (const i of invSnap.docs) {
      allInvoiceIds.push(i.id);
      batch.delete(i.ref);
      deleteCount++;
    }

    // Other pet-related
    await deleteQuery(query(collection(db, 'admissions'), where('petId', 'in', chunk)));
  }

  // 5. Delete Encounter-related records
  if (allEncounterIds.length > 0) {
    const encChunks = [];
    for (let i = 0; i < allEncounterIds.length; i += 10) {
      encChunks.push(allEncounterIds.slice(i, i + 10));
    }
    
    const encCollections = [
      'triage_vitals', 'clinical_notes', 'appointment_services', 
      'lab_orders', 'attachments', 'prescriptions', 'dispensing_records'
    ];

    for (const chunk of encChunks) {
      for (const col of encCollections) {
        await deleteQuery(query(collection(db, col), where('encounterId', 'in', chunk)));
      }
    }
  }

  // 6. Delete Invoice-related records
  if (allInvoiceIds.length > 0) {
    const invChunks = [];
    for (let i = 0; i < allInvoiceIds.length; i += 10) {
      invChunks.push(allInvoiceIds.slice(i, i + 10));
    }

    for (const chunk of invChunks) {
      await deleteQuery(query(collection(db, 'invoice_items'), where('invoiceId', 'in', chunk)));
      await deleteQuery(query(collection(db, 'payments'), where('invoiceId', 'in', chunk)));
    }
  }

  if (deleteCount > 0 && deleteCount % 400 !== 0) {
    await batch.commit();
  }

  console.log(`\n✅ Successfully wiped ${deleteCount} duplicate/seeded records for those pets!`);
  console.log(`You can now re-run 'npx ts-node scripts/seed-e2e.ts' to generate a perfectly clean set of 1x data.\n`);
}

wipeSeededPets().catch(console.error);

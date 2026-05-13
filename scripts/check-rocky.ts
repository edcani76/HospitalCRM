import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, collection, query, getDocs, where } from 'firebase/firestore';
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

  // 1. Find Rocky
  const petSnap = await getDocs(query(collection(db, 'pets'), where('name', '==', 'Rocky')));
  if (petSnap.empty) { console.log('Rocky not found'); process.exit(0); }
  const rocky = petSnap.docs[0];
  console.log(`Rocky: ${rocky.id}`);

  // 2. Find Rocky's encounters
  const encSnap = await getDocs(query(collection(db, 'encounters'), where('petId', '==', rocky.id)));
  const encs = encSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`\nEncounters:`);
  for (const e of encs) {
    console.log(`  ${e.id.slice(0, 8)}... status: ${e.status}, appointmentId: ${e.appointmentId || '—'}, date: ${e.date || e.startedAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '—'}`);
  }

  // 3. Find the medical-completed encounter
  const mcEnc = encs.find((e: any) => e.status === 'medical-completed');
  if (!mcEnc) {
    console.log('\nNo medical-completed encounter found. Check if Medical Complete was clicked.');
    process.exit(0);
  }
  console.log(`\nMedical-completed encounter: ${mcEnc.id}`);

  // 4. Find any invoice for this encounter
  const invSnap = await getDocs(query(collection(db, 'invoices'), where('encounterId', '==', mcEnc.id)));
  if (invSnap.empty) {
    console.log('No invoice found for this encounter. Need to generate one.');
    console.log('Use the appointment details page to click Medical Complete (appointmentId is now linked).');
  } else {
    for (const inv of invSnap.docs) {
      const d = inv.data();
      console.log(`\nInvoice: ${d.invoiceNo || inv.id} — status: ${d.status}, grandTotal: ${d.grandTotal}`);
    }
  }

  // 5. Find the appointment linked to this encounter
  if (mcEnc.appointmentId) {
    const aptDoc = await getDocs(query(collection(db, 'appointments'), where('__name__', '==', mcEnc.appointmentId)));
    if (!aptDoc.empty) {
      const apt = aptDoc.docs[0].data();
      console.log(`\nAppointment: ${mcEnc.appointmentId} — status: ${apt.status}`);
    }
  }

  // 6. Find appointment_services for this encounter
  const svcSnap = await getDocs(query(collection(db, 'appointment_services'), where('encounterId', '==', mcEnc.id)));
  console.log(`\nServices (${svcSnap.docs.length}):`);
  for (const svc of svcSnap.docs) {
    const d = svc.data();
    console.log(`  ${d.serviceName || '—'} — status: ${d.status}, price: ${d.unitPrice} x ${d.quantity}`);
  }

  process.exit(0);
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });

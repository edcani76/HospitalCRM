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

  // 1. Fetch all encounters that have no appointmentId (or empty appointmentId)
  const encSnap = await getDocs(collection(db, 'encounters'));
  const encounters = encSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const unlinked = encounters.filter((e: any) => !e.appointmentId);

  if (unlinked.length === 0) {
    console.log('All encounters already have appointmentId. Nothing to do.');
    process.exit(0);
  }

  console.log(`Found ${unlinked.length} encounters without appointmentId`);

  // 2. Fetch all appointments
  const aptSnap = await getDocs(collection(db, 'appointments'));
  const appointments = aptSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  let linked = 0;
  let skipped = 0;

  for (const enc of unlinked) {
    const encData = enc as any;

    // Try to match by petId + date (the seed creates appointment same day as encounter)
    const encDate = encData.date || (encData.startedAt?.toDate ? encData.startedAt.toDate().toISOString().split('T')[0] : '');
    
    if (!encDate || !encData.petId) {
      console.log(`  Skipping encounter ${enc.id} — missing date or petId`);
      skipped++;
      continue;
    }

    const match = appointments.find((a: any) => {
      const aDate = a.date || '';
      return a.petId === encData.petId && aDate === encDate;
    });

    if (match) {
      await updateDoc(doc(db, 'encounters', enc.id), { appointmentId: match.id });
      console.log(`  Linked encounter ${enc.id.slice(0, 8)}... → appointment ${match.id.slice(0, 8)}... (petId: ${encData.petId}, date: ${encDate})`);
      linked++;
    } else {
      console.log(`  No matching appointment for encounter ${enc.id.slice(0, 8)}... (petId: ${encData.petId}, date: ${encDate})`);
      skipped++;
    }
  }

  console.log(`\n✅ Done. Linked ${linked} encounters, skipped ${skipped}.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});

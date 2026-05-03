import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId || '(default)');

async function migrate() {
  console.log('Starting migration: pending/Pending → unconfirmed');

  // Query for both "pending" and "Pending" status
  const q1 = query(collection(db, 'appointments'), where('status', '==', 'pending'));
  const q2 = query(collection(db, 'appointments'), where('status', '==', 'Pending'));

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  const allDocs = [...snap1.docs, ...snap2.docs];
  console.log(`Found ${snap1.size} with "pending", ${snap2.size} with "Pending" = ${allDocs.length} total`);

  if (allDocs.length === 0) {
    console.log('No appointments to migrate.');
    return;
  }

  let updated = 0;
  for (const d of allDocs) {
    await updateDoc(doc(db, 'appointments', d.id), {
      status: 'unconfirmed',
      updatedAt: new Date().toISOString()
    });
    updated++;
    console.log(`Updated: ${d.id} - ${d.data().petName || 'unknown'} (was: ${d.data().status})`);
  }

  console.log(`\nMigration complete: ${updated} appointments updated to "unconfirmed"`);
}

migrate().catch(console.error);

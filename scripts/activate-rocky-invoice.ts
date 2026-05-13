import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, collection, query, getDocs, where, updateDoc, serverTimestamp } from 'firebase/firestore';
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

  // Find invoices for this encounter
  const invSnap = await getDocs(query(collection(db, 'invoices'), where('encounterId', '==', enc.id)));
  console.log(`Found ${invSnap.docs.length} invoice(s) for encounter ${enc.id.slice(0, 8)}...`);

  for (const inv of invSnap.docs) {
    const d = inv.data();
    console.log(`  ${d.invoiceNo || inv.id} — status: ${d.status} → active`);
    await updateDoc(doc(db, 'invoices', inv.id), {
      status: 'active',
      updatedAt: serverTimestamp()
    });
  }

  console.log('✅ Invoice moved from draft → active (shows under Unpaid/All Invoices tabs)');
  process.exit(0);
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });

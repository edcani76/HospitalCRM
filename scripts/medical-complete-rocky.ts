import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, collection, query, getDocs, where, getDoc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
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

  // 2. Find the in-progress encounter
  const encSnap = await getDocs(query(collection(db, 'encounters'), where('petId', '==', rocky.id), where('status', '==', 'in-progress')));
  if (encSnap.empty) { console.log('No in-progress encounter'); process.exit(0); }
  const enc = encSnap.docs[0];
  const encounterId = enc.id;

  // 3. Check linked appointment status
  const encData = enc.data();
  const aptId = encData.appointmentId;
  if (!aptId) { console.log('Encounter has no appointmentId'); process.exit(0); }

  const aptDoc = await getDoc(doc(db, 'appointments', aptId));
  if (!aptDoc.exists()) { console.log('Appointment not found'); process.exit(0); }
  const aptData = aptDoc.data();
  console.log(`Appointment status: ${aptData.status}`);

  // 4. Update encounter to medical-completed
  await updateDoc(doc(db, 'encounters', encounterId), {
    status: 'medical-completed',
    updatedAt: serverTimestamp()
  });
  console.log(`Encounter ${encounterId.slice(0, 8)}... → medical-completed`);

  // 5. Generate draft invoice
  const svcSnap = await getDocs(query(collection(db, 'appointment_services'), where('encounterId', '==', encounterId)));
  const services = svcSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Found ${services.length} services`);

  if (services.length > 0) {
    let subTotal = 0;
    let taxTotal = 0;
    const invoiceItems = services.map((s: any) => {
      const lineTotal = (s.unitPrice || 0) * (s.quantity || 1);
      const taxRate = s.taxRate || 0;
      subTotal += lineTotal;
      taxTotal += lineTotal * taxRate;
      return {
        encounterId,
        appointmentServiceId: s.id,
        itemType: s.serviceType || 'service',
        description: s.serviceName,
        quantity: s.quantity || 1,
        unitPrice: s.unitPrice || 0,
        discountAmount: 0,
        taxRate,
        lineTotal,
        createdAt: serverTimestamp()
      };
    });

    const grandTotal = subTotal + taxTotal;
    const now = serverTimestamp();
    const invoiceNo = `INV-${Date.now()}`;

    const invoiceData = {
      invoiceNo,
      encounterId,
      petId: rocky.id,
      petName: 'Rocky',
      clientUid: rocky.data().ownerUid || '',
      ownerName: '',
      patientId: rocky.id,
      ownerId: rocky.data().ownerUid || '',
      subTotal,
      discountTotal: 0,
      taxAmount: taxTotal,
      grandTotal,
      amountPaid: 0,
      balanceDue: grandTotal,
      status: 'draft',
      createdAt: now,
      updatedAt: now
    };

    const invRef = await addDoc(collection(db, 'invoices'), invoiceData);
    const invoiceId = invRef.id;

    for (const item of invoiceItems) {
      item.invoiceId = invoiceId;
      await addDoc(collection(db, 'invoice_items'), item);
    }

    console.log(`Created draft invoice: ${invoiceNo} (${invoiceId}) — ₱${grandTotal}`);
  } else {
    console.log('No services — no invoice created');
  }

  console.log('✅ Done');
  process.exit(0);
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Load Firebase Config
const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

const MOCK_USERS = [
  { email: 'admin@medipaws.com', password: 'Password123!', role: 'admin', displayName: 'System Admin' },
  { email: 'doctor@medipaws.com', password: 'Password123!', role: 'doctor', displayName: 'Dr. Sarah Johnson' },
  { email: 'staff@medipaws.com', password: 'Password123!', role: 'staff', displayName: 'Staff Member' },
  { email: 'lab@medipaws.com', password: 'Password123!', role: 'lab', displayName: 'Lab Technician' },
  { email: 'pharmacist@medipaws.com', password: 'Password123!', role: 'pharmacist', displayName: 'Head Pharmacist' },
  { email: 'owner@medipaws.com', password: 'Password123!', role: 'client', displayName: 'John Doe' }
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding process...');

  let clientUid = '';

  for (const userData of MOCK_USERS) {
    try {
      console.log(`Creating/Signing in user: ${userData.email}`);
      let user;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        user = userCredential.user;
        console.log(`   Created new user ${user.uid}`);
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          const userCredential = await signInWithEmailAndPassword(auth, userData.email, userData.password);
          user = userCredential.user;
          console.log(`   Signed into existing user ${user.uid}`);
        } else {
          throw err;
        }
      }

      if (userData.role === 'client') {
        clientUid = user.uid;
      }

      // Update users collection
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: userData.displayName,
        role: userData.role,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName)}&background=10b981&color=fff`,
        createdAt: new Date().toISOString()
      }, { merge: true });

    } catch (error) {
      console.error(`Error processing user ${userData.email}:`, error);
    }
  }

  if (!clientUid) {
    console.error('Failed to capture Client UID. Cannot proceed with data seeding.');
    process.exit(1);
  }

  console.log(`\n📦 Seeding mock pets for client: ${clientUid}`);

  const petsRef = collection(db, 'pets');
  
  const pet1Doc = await addDoc(petsRef, {
    ownerUid: clientUid,
    name: 'Bella',
    species: 'Dog',
    breed: 'Golden Retriever',
    age: 3,
    imageUrl: `https://ui-avatars.com/api/?name=Bella&background=fcd34d&color=fff`
  });
  
  const pet2Doc = await addDoc(petsRef, {
    ownerUid: clientUid,
    name: 'Max',
    species: 'Cat',
    breed: 'Tabby',
    age: 5,
    imageUrl: `https://ui-avatars.com/api/?name=Max&background=93c5fd&color=fff`
  });

  console.log('   ✅ Pets seeded');

  console.log(`\n📦 Seeding medical records...`);

  // Seed Appointments
  const appointmentsRef = collection(db, 'appointments');
  const upcomingAppt = {
    clientUid,
    petId: pet1Doc.id,
    petName: 'Bella',
    doctorId: '1',
    doctorName: 'Dr. Sarah Johnson',
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days from now
    time: '10:00 AM',
    status: 'confirmed',
    notes: 'Routine checkup and vaccines',
    createdAt: new Date().toISOString()
  };
  
  const completedAppt = {
    clientUid,
    petId: pet2Doc.id,
    petName: 'Max',
    doctorId: '4',
    doctorName: 'Dr. James Wilson',
    date: new Date(Date.now() - 86400000 * 14).toISOString().split('T')[0], // 14 days ago
    time: '02:30 PM',
    status: 'completed',
    notes: 'Follow-up for minor scratch',
    createdAt: new Date().toISOString()
  };

  await addDoc(appointmentsRef, upcomingAppt);
  await addDoc(appointmentsRef, completedAppt);
  console.log('   ✅ Appointments seeded');

  // Seed Invoices
  const invoicesRef = collection(db, 'invoices');
  const activeInvoice = {
    clientUid,
    petId: pet1Doc.id,
    petName: 'Bella',
    amount: 150.00,
    status: 'active',
    date: new Date().toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    description: 'Annual Wellness Exam & Vaccinations'
  };

  const paidInvoice = {
    clientUid,
    petId: pet2Doc.id,
    petName: 'Max',
    amount: 75.50,
    status: 'paid',
    date: new Date(Date.now() - 86400000 * 14).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 16).toISOString(),
    description: 'Wound Treatment and Bandaging'
  };

  await addDoc(invoicesRef, activeInvoice);
  await addDoc(invoicesRef, paidInvoice);
  console.log('   ✅ Invoices seeded');

  // Seed Reports (Documents)
  const reportsRef = collection(db, 'reports');
  const doc1 = {
    clientUid,
    petId: pet1Doc.id,
    title: 'Bella - Vaccination Certificate',
    date: new Date().toISOString(),
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Rabies, DHPP, and Bordetella updated.'
  };

  const doc2 = {
    clientUid,
    petId: pet2Doc.id,
    title: 'Max - X-Ray Results',
    date: new Date(Date.now() - 86400000 * 14).toISOString(),
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'No fractures found in front right limb.'
  };

  await addDoc(reportsRef, doc1);
  await addDoc(reportsRef, doc2);
  console.log('   ✅ Documents (Reports) seeded');

  console.log('\n🎉 Seeding complete!');
  console.log('You can now log in with:');
  MOCK_USERS.forEach(u => console.log(`  - ${u.role.toUpperCase()}: ${u.email} / ${u.password}`));
  
  process.exit(0);
}

seedDatabase().catch(console.error);

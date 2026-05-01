import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
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
  { email: 'doctor.sarah@medipaws.com', password: 'Password123!', role: 'doctor', displayName: 'Dr. Sarah Johnson' },
  { email: 'doctor.michael@medipaws.com', password: 'Password123!', role: 'doctor', displayName: 'Dr. Michael Chen' },
  { email: 'doctor.emily@medipaws.com', password: 'Password123!', role: 'doctor', displayName: 'Dr. Emily Rodriguez' },
  { email: 'staff@medipaws.com', password: 'Password123!', role: 'staff', displayName: 'Staff Member' },
  { email: 'lab@medipaws.com', password: 'Password123!', role: 'lab', displayName: 'Lab Technician' },
  { email: 'pharmacist@medipaws.com', password: 'Password123!', role: 'pharmacist', displayName: 'Head Pharmacist' },
  { email: 'john@medipaws.com', password: 'Password123!', role: 'client', displayName: 'John Smith' },
  { email: 'jane@medipaws.com', password: 'Password123!', role: 'client', displayName: 'Jane Doe' },
  { email: 'robert@medipaws.com', password: 'Password123!', role: 'client', displayName: 'Robert Johnson' },
  { email: 'emily@medipaws.com', password: 'Password123!', role: 'client', displayName: 'Emily Wilson' },
  { email: 'michael@medipaws.com', password: 'Password123!', role: 'client', displayName: 'Michael Brown' },
  { email: 'sarah@medipaws.com', password: 'Password123!', role: 'client', displayName: 'Sarah Miller' },
];

const DOCTORS_DATA = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    specialization: 'Veterinary Cardiologist',
    department: 'Diagnostic Medicine',
    experience: 12,
    availability: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM'],
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
    bio: 'Specialized in cardiac care for pets with 12+ years of experience.'
  },
  {
    id: '2',
    name: 'Dr. Michael Chen',
    specialization: 'Emergency Veterinarian',
    department: 'After-Hours Emergency Care',
    experience: 15,
    availability: ['09:00 AM', '10:30 AM', '02:00 PM', '03:30 PM', '04:30 PM'],
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400',
    bio: 'Expert in emergency care and critical cases.'
  },
  {
    id: '3',
    name: 'Dr. Emily Rodriguez',
    specialization: 'Preventive Care Vet',
    department: 'Preventive Care',
    experience: 8,
    availability: ['09:30 AM', '11:00 AM', '02:00 PM', '04:00 PM'],
    image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=400',
    bio: 'Focused on preventive healthcare and nutrition.'
  },
  {
    id: '4',
    name: 'Dr. James Wilson',
    specialization: 'Veterinary Surgeon',
    department: 'Surgery',
    experience: 20,
    availability: ['09:00 AM', '10:00 AM', '11:30 AM', '02:30 PM'],
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
    bio: 'Senior surgeon specializing in orthopedic procedures.'
  },
  {
    id: '5',
    name: 'Dr. Lisa Park',
    specialization: 'Exotic Animal Vet',
    department: 'Avian and Exotic Pet Care',
    experience: 10,
    availability: ['10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'],
    image: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=400',
    bio: 'Specialist in exotic animals, birds, and reptiles.'
  },
  {
    id: '6',
    name: 'Dr. David Miller',
    specialization: 'Rehabilitation Specialist',
    department: 'Therapy and Rehabilitation',
    experience: 18,
    availability: ['09:00 AM', '10:30 AM', '02:00 PM', '03:30 PM'],
    image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400',
    bio: 'Expert in physical therapy and rehabilitation for pets.'
  }
];

const PETS_DATA = [
  { ownerEmail: 'john@medipaws.com', name: 'Buddy', species: 'Dog', breed: 'Golden Retriever', age: 4, weight: 32, type: 'Large' },
  { ownerEmail: 'john@medipaws.com', name: 'Lucy', species: 'Dog', breed: 'Labrador', age: 2, weight: 28, type: 'Large' },
  { ownerEmail: 'jane@medipaws.com', name: 'Whiskers', species: 'Cat', breed: 'Siamese', age: 3, weight: 4.5, type: 'Small' },
  { ownerEmail: 'robert@medipaws.com', name: 'Max', species: 'Dog', breed: 'German Shepherd', age: 5, weight: 34, type: 'Large' },
  { ownerEmail: 'robert@medipaws.com', name: 'Rocky', species: 'Dog', breed: 'Bulldog', age: 3, weight: 25, type: 'Medium' },
  { ownerEmail: 'emily@medipaws.com', name: 'Luna', species: 'Cat', breed: 'Persian', age: 2, weight: 3.8, type: 'Small' },
  { ownerEmail: 'michael@medipaws.com', name: 'Charlie', species: 'Dog', breed: 'Labrador Retriever', age: 4, weight: 30, type: 'Large' },
  { ownerEmail: 'michael@medipaws.com', name: 'Bella', species: 'Dog', breed: 'Beagle', age: 3, weight: 11, type: 'Medium' },
  { ownerEmail: 'sarah@medipaws.com', name: 'Oliver', species: 'Cat', breed: 'Tabby', age: 1, weight: 4.2, type: 'Small' },
  { ownerEmail: 'sarah@medipaws.com', name: 'Milo', species: 'Dog', breed: 'Poodle', age: 2, weight: 8, type: 'Small' },
];

// Store created data
const createdUsers: { [email: string]: string } = {};
const createdPets: { [name: string]: string } = {};

async function clearCollection(collectionName: string) {
  const snapshot = await getDocs(collection(db, collectionName));
  const deletes = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletes);
  console.log(`   Cleared ${collectionName} collection`);
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding process...\n');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await clearCollection('users');
  await clearCollection('doctors');
  await clearCollection('pets');
  await clearCollection('appointments');
  await clearCollection('invoices');
  await clearCollection('reports');
  console.log('');

  // Create users
  console.log('👤 Creating users...');
  for (const userData of MOCK_USERS) {
    try {
      console.log(`   Creating user: ${userData.email}`);
      let user;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        user = userCredential.user;
        console.log(`      Created new user ${user.uid}`);
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          const userCredential = await signInWithEmailAndPassword(auth, userData.email, userData.password);
          user = userCredential.user;
          console.log(`      Signed into existing user ${user.uid}`);
        } else {
          throw err;
        }
      }

      createdUsers[userData.email] = user.uid;

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: userData.displayName,
        role: userData.role,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName)}&background=10b981&color=fff`,
        createdAt: new Date().toISOString()
      }, { merge: true });

    } catch (error) {
      console.error(`   Error processing user ${userData.email}:`, error);
    }
  }
  console.log('   ✅ Users created\n');

  // Create doctors with specific IDs
  console.log('👨‍⚕️ Creating doctors...');
  for (const doctorData of DOCTORS_DATA) {
    try {
      await setDoc(doc(db, 'doctors', doctorData.id), {
        ...doctorData,
        createdAt: new Date().toISOString()
      });
      console.log(`   Created doctor: ${doctorData.name} (ID: ${doctorData.id})`);
    } catch (error) {
      console.error(`   Error creating doctor ${doctorData.name}:`, error);
    }
  }
  console.log('   ✅ Doctors created\n');

  // Create pets
  console.log('🐾 Creating pets...');
  for (const petData of PETS_DATA) {
    try {
      const ownerUid = createdUsers[petData.ownerEmail];
      if (!ownerUid) {
        console.error(`   Owner not found for ${petData.ownerEmail}`);
        continue;
      }

      const petRef = await addDoc(collection(db, 'pets'), {
        ownerUid,
        name: petData.name,
        species: petData.species,
        breed: petData.breed,
        age: petData.age,
        weight: petData.weight,
        type: petData.type,
        imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(petData.name)}&background=fcd34d&color=fff`,
        currentStatus: 'discharged',
        createdAt: new Date().toISOString()
      });

      createdPets[petData.name] = petRef.id;
      console.log(`   Created pet: ${petData.name} (${petRef.id}) for ${petData.ownerEmail}`);
    } catch (error) {
      console.error(`   Error creating pet ${petData.name}:`, error);
    }
  }
  console.log('   ✅ Pets created\n');

  // Create appointments
  console.log('📅 Creating appointments...');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const appointments = [
    // Past appointments (completed)
    { clientEmail: 'john@medipaws.com', petName: 'Buddy', doctorId: '1', date: offsetDate(today, -30), time: '09:00 AM', status: 'completed', notes: 'Annual checkup and vaccinations' },
    { clientEmail: 'john@medipaws.com', petName: 'Lucy', doctorId: '2', date: offsetDate(today, -25), time: '10:30 AM', status: 'completed', notes: 'Ear infection treatment' },
    { clientEmail: 'jane@medipaws.com', petName: 'Whiskers', doctorId: '3', date: offsetDate(today, -20), time: '02:00 PM', status: 'completed', notes: 'Dental cleaning' },
    { clientEmail: 'robert@medipaws.com', petName: 'Max', doctorId: '1', date: offsetDate(today, -18), time: '11:00 AM', status: 'completed', notes: 'Allergy consultation' },
    { clientEmail: 'robert@medipaws.com', petName: 'Rocky', doctorId: '4', date: offsetDate(today, -15), time: '09:00 AM', status: 'completed', notes: 'Post-surgery checkup' },
    { clientEmail: 'emily@medipaws.com', petName: 'Luna', doctorId: '3', date: offsetDate(today, -12), time: '03:00 PM', status: 'completed', notes: 'Routine wellness exam' },
    { clientEmail: 'michael@medipaws.com', petName: 'Charlie', doctorId: '3', date: offsetDate(today, -10), time: '02:00 PM', status: 'completed', notes: 'Obesity management follow-up' },
    { clientEmail: 'michael@medipaws.com', petName: 'Bella', doctorId: '1', date: offsetDate(today, -8), time: '11:00 AM', status: 'completed', notes: 'Annual vaccination' },
    { clientEmail: 'sarah@medipaws.com', petName: 'Oliver', doctorId: '2', date: offsetDate(today, -6), time: '04:00 PM', status: 'completed', notes: 'Ear infection treatment' },
    { clientEmail: 'sarah@medipaws.com', petName: 'Milo', doctorId: '5', date: offsetDate(today, -5), time: '10:00 AM', status: 'completed', notes: 'Vaccination and checkup' },

    // Past appointments (cancelled)
    { clientEmail: 'john@medipaws.com', petName: 'Buddy', doctorId: '6', date: offsetDate(today, -14), time: '02:30 PM', status: 'cancelled', notes: 'Owner cancelled - scheduling conflict' },
    { clientEmail: 'jane@medipaws.com', petName: 'Whiskers', doctorId: '1', date: offsetDate(today, -7), time: '09:30 AM', status: 'cancelled', notes: 'Pet was sick, rescheduled' },

    // Today's appointments (confirmed)
    { clientEmail: 'john@medipaws.com', petName: 'Buddy', doctorId: '1', date: todayStr, time: '09:00 AM', status: 'confirmed', notes: 'Follow-up on hip dysplasia' },
    { clientEmail: 'robert@medipaws.com', petName: 'Max', doctorId: '1', date: todayStr, time: '10:30 AM', status: 'confirmed', notes: 'Allergy consultation follow-up' },
    { clientEmail: 'michael@medipaws.com', petName: 'Charlie', doctorId: '3', date: todayStr, time: '02:00 PM', status: 'confirmed', notes: 'Weight check - progress monitoring' },
    { clientEmail: 'sarah@medipaws.com', petName: 'Oliver', doctorId: '2', date: todayStr, time: '03:30 PM', status: 'pending', notes: 'Vaccination due' },

    // Today's appointments (pending)
    { clientEmail: 'jane@medipaws.com', petName: 'Whiskers', doctorId: '3', date: todayStr, time: '11:00 AM', status: 'pending', notes: 'Dental follow-up' },
    { clientEmail: 'emily@medipaws.com', petName: 'Luna', doctorId: '5', date: todayStr, time: '04:30 PM', status: 'pending', notes: 'Wellness check' },

    // Future appointments (confirmed)
    { clientEmail: 'john@medipaws.com', petName: 'Lucy', doctorId: '2', date: offsetDate(today, 2), time: '10:00 AM', status: 'confirmed', notes: 'Regular checkup' },
    { clientEmail: 'robert@medipaws.com', petName: 'Rocky', doctorId: '4', date: offsetDate(today, 3), time: '09:00 AM', status: 'confirmed', notes: 'Physical therapy session' },
    { clientEmail: 'michael@medipaws.com', petName: 'Bella', doctorId: '1', date: offsetDate(today, 4), time: '11:00 AM', status: 'confirmed', notes: 'Vaccination booster' },
    { clientEmail: 'sarah@medipaws.com', petName: 'Milo', doctorId: '6', date: offsetDate(today, 5), time: '02:30 PM', status: 'confirmed', notes: 'Rehabilitation assessment' },

    // Future appointments (pending)
    { clientEmail: 'jane@medipaws.com', petName: 'Whiskers', doctorId: '3', date: offsetDate(today, 2), time: '02:00 PM', status: 'pending', notes: 'Teeth cleaning' },
    { clientEmail: 'emily@medipaws.com', petName: 'Luna', doctorId: '3', date: offsetDate(today, 3), time: '03:00 PM', status: 'pending', notes: 'Nutrition consultation' },
    { clientEmail: 'robert@medipaws.com', petName: 'Max', doctorId: '6', date: offsetDate(today, 6), time: '10:30 AM', status: 'pending', notes: 'Mobility assessment' },
    { clientEmail: 'john@medipaws.com', petName: 'Buddy', doctorId: '5', date: offsetDate(today, 7), time: '04:00 PM', status: 'pending', notes: 'Exotic treat consultation' },
    { clientEmail: 'sarah@medipaws.com', petName: 'Oliver', doctorId: '2', date: offsetDate(today, 8), time: '09:30 AM', status: 'pending', notes: 'Follow-up visit' },
  ];

  for (const apt of appointments) {
    try {
      const clientUid = createdUsers[apt.clientEmail];
      const petId = createdPets[apt.petName];
      const doctorData = DOCTORS_DATA.find(d => d.id === apt.doctorId);

      if (!clientUid || !petId || !doctorData) {
        console.error(`   Missing data for appointment: ${apt.petName} with ${apt.doctorId}`);
        continue;
      }

      await addDoc(collection(db, 'appointments'), {
        clientUid,
        petId,
        petName: apt.petName,
        doctorId: apt.doctorId,
        doctorName: doctorData.name,
        date: apt.date,
        time: apt.time,
        status: apt.status,
        notes: apt.notes,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`   Error creating appointment:`, error);
    }
  }
  console.log(`   ✅ Created ${appointments.length} appointments\n`);

  // Create invoices
  console.log('💰 Creating invoices...');
  const invoices = [
    // Paid invoices (past)
    { clientEmail: 'john@medipaws.com', petName: 'Buddy', amount: 150.00, status: 'paid', date: offsetDate(today, -30), dueDate: offsetDate(today, -15), description: 'Annual Wellness Exam & Vaccinations' },
    { clientEmail: 'john@medipaws.com', petName: 'Lucy', amount: 85.50, status: 'paid', date: offsetDate(today, -25), dueDate: offsetDate(today, -10), description: 'Ear Infection Treatment' },
    { clientEmail: 'jane@medipaws.com', petName: 'Whiskers', amount: 200.00, status: 'paid', date: offsetDate(today, -20), dueDate: offsetDate(today, -5), description: 'Dental Cleaning Procedure' },
    { clientEmail: 'robert@medipaws.com', petName: 'Max', amount: 120.00, status: 'paid', date: offsetDate(today, -18), dueDate: offsetDate(today, -3), description: 'Allergy Consultation & Medications' },
    { clientEmail: 'robert@medipaws.com', petName: 'Rocky', amount: 350.00, status: 'paid', date: offsetDate(today, -15), dueDate: offsetDate(today, 0), description: 'Post-Surgery Checkup & X-Rays' },
    { clientEmail: 'emily@medipaws.com', petName: 'Luna', amount: 75.00, status: 'paid', date: offsetDate(today, -12), dueDate: offsetDate(today, 3), description: 'Routine Wellness Exam' },
    { clientEmail: 'michael@medipaws.com', petName: 'Charlie', amount: 210.00, status: 'paid', date: offsetDate(today, -10), dueDate: offsetDate(today, 5), description: 'Obesity Management Program' },
    { clientEmail: 'michael@medipaws.com', petName: 'Bella', amount: 150.00, status: 'paid', date: offsetDate(today, -8), dueDate: offsetDate(today, 7), description: 'Annual Vaccination' },
    { clientEmail: 'sarah@medipaws.com', petName: 'Oliver', amount: 85.50, status: 'paid', date: offsetDate(today, -6), dueDate: offsetDate(today, 9), description: 'Ear Infection Treatment' },
    { clientEmail: 'sarah@medipaws.com', petName: 'Milo', amount: 125.00, status: 'paid', date: offsetDate(today, -5), dueDate: offsetDate(today, 10), description: 'Vaccination & Health Check' },

    // Outstanding invoices (past due)
    { clientEmail: 'john@medipaws.com', petName: 'Buddy', amount: 300.00, status: 'active', date: offsetDate(today, -45), dueDate: offsetDate(today, -30), description: 'Surgery - Hip Dysplasia (OVERDUE)' },
    { clientEmail: 'jane@medipaws.com', petName: 'Whiskers', amount: 150.00, status: 'active', date: offsetDate(today, -20), dueDate: offsetDate(today, -5), description: 'Dental Follow-up Treatment (OVERDUE)' },
    { clientEmail: 'robert@medipaws.com', petName: 'Max', amount: 180.00, status: 'active', date: offsetDate(today, -14), dueDate: offsetDate(today, -1), description: 'Allergy Testing & Medication (OVERDUE)' },

    // Outstanding invoices (not yet due)
    { clientEmail: 'john@medipaws.com', petName: 'Buddy', amount: 250.00, status: 'active', date: todayStr, dueDate: offsetDate(today, 30), description: 'Follow-up Consultation & Medications' },
    { clientEmail: 'robert@medipaws.com', petName: 'Max', amount: 175.00, status: 'active', date: offsetDate(today, 2), dueDate: offsetDate(today, 32), description: 'Allergy Follow-up & New Prescription' },
    { clientEmail: 'michael@medipaws.com', petName: 'Charlie', amount: 200.00, status: 'active', date: offsetDate(today, 3), dueDate: offsetDate(today, 33), description: 'Weight Management - Month 2' },
    { clientEmail: 'sarah@medipaws.com', petName: 'Oliver', amount: 90.00, status: 'active', date: offsetDate(today, 4), dueDate: offsetDate(today, 34), description: 'Vaccination Booster' },

    // Partial payment invoices
    { clientEmail: 'emily@medipaws.com', petName: 'Luna', amount: 300.00, status: 'active', date: offsetDate(today, -10), dueDate: offsetDate(today, 20), description: 'Comprehensive Health Check & Lab Work (PARTIAL - $150 paid)' },
    { clientEmail: 'michael@medipaws.com', petName: 'Bella', amount: 180.00, status: 'active', date: offsetDate(today, -5), dueDate: offsetDate(today, 25), description: 'Surgery Follow-up & Medications (PARTIAL - $100 paid)' },
    { clientEmail: 'sarah@medipaws.com', petName: 'Milo', amount: 220.00, status: 'active', date: offsetDate(today, -3), dueDate: offsetDate(today, 27), description: 'Physical Therapy Sessions (PARTIAL - $110 paid)' },

    // Future invoices (to be generated)
    { clientEmail: 'john@medipaws.com', petName: 'Lucy', amount: 100.00, status: 'active', date: offsetDate(today, 5), dueDate: offsetDate(today, 35), description: 'Regular Checkup (UPCOMING)' },
    { clientEmail: 'robert@medipaws.com', petName: 'Rocky', amount: 150.00, status: 'active', date: offsetDate(today, 6), dueDate: offsetDate(today, 36), description: 'Physical Therapy Session (UPCOMING)' },
  ];

  for (const inv of invoices) {
    try {
      const clientUid = createdUsers[inv.clientEmail];
      const petId = createdPets[inv.petName];

      if (!clientUid || !petId) {
        console.error(`   Missing data for invoice: ${inv.petName}`);
        continue;
      }

      await addDoc(collection(db, 'invoices'), {
        clientUid,
        petId,
        petName: inv.petName,
        amount: inv.amount,
        status: inv.status,
        date: inv.date,
        dueDate: inv.dueDate,
        description: inv.description,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`   Error creating invoice:`, error);
    }
  }
  console.log(`   ✅ Created ${invoices.length} invoices\n`);

  console.log('🎉 Seeding complete!\n');
  console.log('📋 Summary:');
  console.log(`   - ${MOCK_USERS.length} users created`);
  console.log(`   - ${DOCTORS_DATA.length} doctors created with IDs 1-6`);
  console.log(`   - ${PETS_DATA.length} pets created`);
  console.log(`   - ${appointments.length} appointments created (past, today, future)`);
  console.log(`   - ${invoices.length} invoices created (paid, partial, outstanding)\n`);

  console.log('🔐 Login credentials:');
  MOCK_USERS.forEach(u => console.log(`   ${u.role.toUpperCase()}: ${u.email} / ${u.password}`));

  process.exit(0);
}

function offsetDate(date: Date, days: number): string {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate.toISOString().split('T')[0];
}

seedDatabase().catch(console.error);

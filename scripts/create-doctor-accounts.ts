/**
 * Script to create Firebase Auth accounts for doctors who don't have them
 * 
 * Creates accounts for:
 * - Dr. James Wilson
 * - Dr. Lisa Park
 * - Dr. David Miller
 * 
 * Run with: npx tsx scripts/create-doctor-accounts.ts
 */

import { auth, db } from '../src/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';

const doctorsToCreate = [
  {
    name: 'Dr. James Wilson',
    email: 'doctor.james@medipaws.com',
    password: 'MediPaws2024!',
  },
  {
    name: 'Dr. Lisa Park',
    email: 'doctor.lisa@medipaws.com',
    password: 'MediPaws2024!',
  },
  {
    name: 'Dr. David Miller',
    email: 'doctor.david@medipaws.com',
    password: 'MediPaws2024!',
  },
];

async function createDoctorAccounts() {
  try {
    console.log('Creating Firebase Auth accounts for doctors...\n');

    for (const doctor of doctorsToCreate) {
      try {
        console.log(`Creating account for ${doctor.name}...`);
        
        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          doctor.email,
          doctor.password
        );
        
        const uid = userCredential.user.uid;
        console.log(`  Auth account created. UID: ${uid}`);

        // Update display name
        await updateProfile(userCredential.user, {
          displayName: doctor.name,
        });

        // Create user document in Firestore
        await setDoc(doc(db, 'users', uid), {
          email: doctor.email,
          displayName: doctor.name,
          role: 'doctor',
          createdAt: new Date().toISOString(),
        });
        console.log(`  User document created in Firestore`);
        console.log(`  Email: ${doctor.email}`);
        console.log(`  Password: ${doctor.password}\n`);

      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`  Email ${doctor.email} is already in use. Skipping...\n`);
        } else {
          console.error(`  Error creating account for ${doctor.name}:`, error.message || error);
        }
      }
    }

    console.log('Account creation complete!');
    console.log('\nNext step: Run the migration script to link these accounts to doctor records:');
    console.log('  npx tsx scripts/migrate-doctor-uids.ts');
    
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

createDoctorAccounts();

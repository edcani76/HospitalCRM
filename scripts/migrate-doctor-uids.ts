/**
 * Migration script to link doctor records with Firebase Auth user IDs
 *
 * This script:
 * 1. Fetches all users from Firestore with role 'doctor'
 * 2. Fetches all doctor records from the 'doctors' collection
 * 3. Links them by matching displayName (user displayName -> doctor name)
 * 4. Updates doctor records with the uid field
 *
 * Run with: npx tsx scripts/migrate-doctor-uids.ts
 */

import { db } from '../src/firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

async function migrateDoctorUids() {
  try {
    console.log('Starting doctor UID migration...');

    // Get all users with role 'doctor'
    const usersSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'doctor')));
    const doctorUsers = usersSnapshot.docs.map(doc => ({
      uid: doc.id,
      email: doc.data().email?.toLowerCase() || '',
      displayName: doc.data().displayName || ''
    }));

    console.log(`Found ${doctorUsers.length} doctor users:`, doctorUsers);

    // Get all doctor records
    const doctorsSnapshot = await getDocs(collection(db, 'doctors'));
    const doctorRecords = doctorsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || '',
      uid: doc.data().uid || null
    }));

    console.log(`Found ${doctorRecords.length} doctor records:`, doctorRecords);

    // Link and update
    let updatedCount = 0;
    let skippedCount = 0;

    for (const doctorRecord of doctorRecords) {
      // Skip if already has uid
      if (doctorRecord.uid) {
        console.log(`Doctor ${doctorRecord.name} already has uid: ${doctorRecord.uid}`);
        skippedCount++;
        continue;
      }

      // Try to find matching user by name (case-insensitive)
      const matchingUser = doctorUsers.find(u => {
        // Match by name (case-insensitive, trimmed)
        const userName = u.displayName.toLowerCase().trim();
        const doctorName = doctorRecord.name.toLowerCase().trim();
        return userName === doctorName;
      });

      if (matchingUser) {
        // Update doctor record with uid
        await updateDoc(doc(db, 'doctors', doctorRecord.id), {
          uid: matchingUser.uid
        });
        console.log(`Updated doctor ${doctorRecord.name} with uid: ${matchingUser.uid}`);
        updatedCount++;
      } else {
        console.log(`No matching user found for doctor: ${doctorRecord.name}`);
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`Updated: ${updatedCount} doctor records`);
    console.log(`Skipped (already has uid): ${skippedCount} doctor records`);
    console.log(`Remaining unmatched: ${doctorRecords.length - updatedCount - skippedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateDoctorUids();

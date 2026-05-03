import { db, collection, getDocs, query, where, updateDoc, doc } from '../src/firebase';
import { serverTimestamp } from 'firebase/firestore';

/**
 * Migration script: Copy createdAt to startedAt for old encounters
 * Run with: npx tsx scripts/migrate-encounters-startedAt.ts
 */
async function migrateEncounters() {
  console.log('Starting migration: Copy createdAt → startedAt for old encounters...\n');  
  try {
    // Fetch all encounters
    const snapshot = await getDocs(collection(db, 'encounters'));
    const encounters = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      startedAt: (doc.data() as any).startedAt,
      createdAt: (doc.data() as any).createdAt,
      ...doc.data() 
    }));
    
    console.log(`Found ${encounters.length} total encounters\n`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const encounter of encounters) {
      try {
        // Check if encounter has no startedAt but has createdAt
        if (!encounter.startedAt && encounter.createdAt) {
          console.log(`Migrating encounter ${encounter.id}...`);
          
          const encounterRef = doc(db, 'encounters', encounter.id);
          await updateDoc(encounterRef, {
            startedAt: encounter.createdAt, // Copy createdAt to startedAt
            updatedAt: serverTimestamp()
          });
          
          console.log(`✓ Migrated: ${encounter.id}`);
          migrated++;
        } else if (encounter.startedAt) {
          // Already has startedAt
          skipped++;
        } else {
          // No createdAt either - set to now
          console.log(`Setting startedAt to now for encounter ${encounter.id} (no createdAt found)...`);
          
          const encounterRef = doc(db, 'encounters', encounter.id);
          await updateDoc(encounterRef, {
            startedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          console.log(`✓ Set startedAt to now: ${encounter.id}`);
          migrated++;
        }
      } catch (error) {
        console.error(`✗ Error migrating encounter ${encounter.id}:`, error);
        errors++;
      }
    }
    
    console.log('\n========================================');
    console.log('Migration Complete!');
    console.log('========================================');
    console.log(`✓ Migrated: ${migrated} encounters`);
    console.log(`⚡ Skipped: ${skipped} encounters (already have startedAt)`);
    console.log(`✗ Errors: ${errors}`);
    console.log('========================================\n');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateEncounters();

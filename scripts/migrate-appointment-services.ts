import { db, collection, getDocs, updateDoc, doc } from '../src/firebase';

/**
 * Migration: Convert old "Type: X" format to "Services: X" format
 * Run with: npx tsx scripts/migrate-appointment-services.ts
 */
async function migrateAppointmentServices() {
  console.log('Starting migration: Convert Type: to Services: format...\n');
  
  try {
    // Fetch all appointments
    const snapshot = await getDocs(collection(db, 'appointments'));
    const appointments = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      originalNotes: doc.data().notes || ''
    }));
    
    console.log(`Found ${appointments.length} total appointments\n`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const apt of appointments) {
      try {
        const notes = apt.originalNotes;
        
        // Check if already has Services: format
        if (notes.includes('Services:')) {
          console.log(`Skipping ${apt.id} - already has Services: format`);
          skipped++;
          continue;
        }
        
        // Check if has Type: format
        const typeMatch = notes.match(/Type:\s*(\w+)/i);
        if (!typeMatch) {
          console.log(`Skipping ${apt.id} - no Type: found`);
          skipped++;
          continue;
        }
        
        const type = typeMatch[1].toLowerCase();
        
        // Build new notes with Services: line
        let newNotes = notes
          .replace(/Type:\s*\w+/gi, '')  // Remove old Type: lines
          .replace(/Mode:\s*\w+/i, '')  // Remove Mode: lines
          .trim();
        
        // Add Services: line at the beginning
        newNotes = `Services: ${type}${newNotes ? '\n' + newNotes : ''}`;
        
        // Update the appointment
        const aptRef = doc(db, 'appointments', apt.id);
        await updateDoc(aptRef, { notes: newNotes });
        
        console.log(`✓ Migrated ${apt.id}: Type: ${type} → Services: ${type}`);
        migrated++;
        
      } catch (error) {
        console.error(`✗ Error migrating ${apt.id}:`, error);
        errors++;
      }
    }
    
    console.log('\n========================================');
    console.log('Migration Complete!');
    console.log('========================================');
    console.log(`✓ Migrated: ${migrated} appointments`);
    console.log(`⚡ Skipped: ${skipped} appointments (no Type: or already has Services:)`);
    console.log(`✗ Errors: ${errors}`);
    console.log('========================================\n');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateAppointmentServices();

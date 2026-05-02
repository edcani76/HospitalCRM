/**
 * Seed Script: Doctor Availability
 * 
 * This script seeds doctor availability for each day of the week.
 * Availability is stored as: { "0": ["09:00 AM", ...], "1": [...], ... }
 * where 0=Sunday, 1=Monday, etc.
 *
 * HOW TO USE:
 * 
 * Option 1: Browser Console (Recommended)
 * 1. Open your app in the browser
 * 2. Open DevTools Console
 * 3. Copy and paste the entire content of this file (minus the export/import lines)
 * 4. Run: seedAllDoctors()
 *
 * Option 2: Import in your app
 * import { seedAllDoctors } from './lib/seed-doctor-availability';
 * seedAllDoctors();
 */

// Configuration
const WORK_HOUR_START = 9; // 9:00 AM
const WORK_HOUR_END = 17; // 5:00 PM
const SLOT_INTERVAL_MINUTES = 30;

// Days doctors work (0=Sun, 1=Mon, ..., 6=Sat)
// Default: Monday (1) to Friday (5)
const WORK_DAYS = [1, 2, 3, 4, 5];

// Generate time slots for a day
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = WORK_HOUR_START; hour < WORK_HOUR_END; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MINUTES) {
      const hour12 = hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const timeStr = `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;
      slots.push(timeStr);
    }
  }
  return slots;
}

// Generate weekly availability
function generateWeeklyAvailability(): { [key: string]: string[] } {
  const availability: { [key: string]: string[] } = {};
  const slots = generateTimeSlots();
  
  for (let day = 0; day < 7; day++) {
    availability[day.toString()] = WORK_DAYS.includes(day) ? [...slots] : [];
  }
  
  return availability;
}

// Seed all doctors with availability
async function seedAllDoctors() {
  try {
    // Dynamic import to avoid build issues
    const { db } = await import('../firebase');
    const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');

    console.log('🔍 Fetching doctors...');
    const snapshot = await getDocs(collection(db, 'doctors'));
    
    if (snapshot.docs.length === 0) {
      console.warn('⚠️ No doctors found. Please add doctors first.');
      return;
    }

    const weeklyAvailability = generateWeeklyAvailability();
    let updatedCount = 0;
    let skippedCount = 0;

    for (const document of snapshot.docs) {
      const doctorData = document.data();
      const doctorId = document.id;
      const doctorName = doctorData.name || 'Unknown';

      // Check if already has availability
      if (doctorData.availability && 
          typeof doctorData.availability === 'object' &&
          !Array.isArray(doctorData.availability) &&
          Object.keys(doctorData.availability).length > 0) {
        console.log(`⏭ Skipping Dr. ${doctorName} - already has availability`);
        skippedCount++;
        continue;
      }

      await updateDoc(doc(db, 'doctors', doctorId), {
        availability: weeklyAvailability
      });

      updatedCount++;
      console.log(`✅ Updated availability for Dr. ${doctorName}`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✓ Updated: ${updatedCount} doctor(s)`);
    console.log(`   ⏭ Skipped: ${skippedCount} doctor(s)`);
    console.log(`   📅 Work days: ${WORK_DAYS.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}`);
    console.log(`   ⏰ Work hours: ${WORK_HOUR_START}:00 AM - ${WORK_HOUR_END}:00 PM`);
    console.log(`   🕐 Slot interval: ${SLOT_INTERVAL_MINUTES} minutes`);
    console.log('\n✅ Done! Availability structure:');
    console.log(JSON.stringify(weeklyAvailability, null, 2));

  } catch (error) {
    console.error('❌ Error seeding doctor availability:', error);
  }
}

// Seed a single doctor
async function seedSingleDoctor(doctorId: string) {
  try {
    const { db } = await import('../firebase');
    const { doc, updateDoc } = await import('firebase/firestore');

    const weeklyAvailability = generateWeeklyAvailability();
    await updateDoc(doc(db, 'doctors', doctorId), {
      availability: weeklyAvailability
    });

    console.log(`✅ Updated availability for doctor ${doctorId}`);
  } catch (error) {
    console.error('❌ Error seeding doctor availability:', error);
  }
}

// Get time slots for a specific day
function getSlotsForDay(availability: any, dayOfWeek: number): string[] {
  if (!availability) return generateTimeSlots();
  return availability[dayOfWeek.toString()] || [];
}

// Export for module use
export { seedAllDoctors, seedSingleDoctor, generateWeeklyAvailability, getSlotsForDay };

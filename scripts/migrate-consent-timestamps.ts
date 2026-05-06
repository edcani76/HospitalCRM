import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

// Generate random dates within the past 30 days
function randomPastDate(): string {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30) + 1;
  const hoursAgo = Math.floor(Math.random() * 24);
  const date = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000));
  return date.toISOString();
}

async function migrateUserConsents() {
  console.log('\n📋 Migrating user consents...\n');
  
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const clientUsers = usersSnapshot.docs.filter(d => d.data().role === 'client');
  
  console.log(`Found ${clientUsers.length} client users\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const userDoc of clientUsers) {
    const userData = userDoc.data();
    const uid = userDoc.id;
    
    // Skip if already has consent timestamps
    if (userData.consentPrivacyTimestamp || userData.consentTermsTimestamp) {
      console.log(`⏭️  ${userData.displayName || userData.email} (${uid}) - Already has timestamps`);
      skipped++;
      continue;
    }
    
    const privacyTimestamp = randomPastDate();
    const termsTimestamp = randomPastDate();
    
    await updateDoc(doc(db, 'users', uid), {
      consentPrivacy: true,
      consentTerms: true,
      consentPrivacyTimestamp: privacyTimestamp,
      consentTermsTimestamp: termsTimestamp,
    });
    
    const privacyDate = new Date(privacyTimestamp).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
    const termsDate = new Date(termsTimestamp).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
    
    console.log(`✅ ${userData.displayName || userData.email} (${uid})`);
    console.log(`   Privacy: ${privacyDate} | Terms: ${termsDate}`);
    
    updated++;
  }
  
  console.log(`\n📊 Users updated: ${updated}`);
  console.log(`📊 Users skipped: ${skipped}`);
}

async function migratePetConsents() {
  console.log('\n🐾 Migrating pet consents...\n');
  
  const petsSnapshot = await getDocs(collection(db, 'pets'));
  
  console.log(`Found ${petsSnapshot.size} pets\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const petDoc of petsSnapshot.docs) {
    const petData = petDoc.data();
    const petId = petDoc.id;
    
    // Skip if already has consent timestamps
    if (petData.consentPrivacyTimestamp || petData.consentTermsTimestamp) {
      console.log(`⏭️  ${petData.name} (${petId}) - Already has timestamps`);
      skipped++;
      continue;
    }
    
    const privacyTimestamp = randomPastDate();
    const termsTimestamp = randomPastDate();
    
    await updateDoc(doc(db, 'pets', petId), {
      consentPrivacy: true,
      consentTerms: true,
      consentPrivacyTimestamp: privacyTimestamp,
      consentTermsTimestamp: termsTimestamp,
    });
    
    console.log(`✅ ${petData.name} (${petData.species}) - Consent timestamps added`);
    
    updated++;
  }
  
  console.log(`\n📊 Pets updated: ${updated}`);
  console.log(`📊 Pets skipped: ${skipped}`);
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  CONSENT TIMESTAMP MIGRATION');
  console.log('═══════════════════════════════════════════════\n');
  
  try {
    await migrateUserConsents();
    await migratePetConsents();
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ Migration complete!');
    console.log('═══════════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();

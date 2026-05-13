import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
    console.log('   Signed in as admin');
  } catch (err) {
    console.log('   Admin not found, trying to seed without auth...');
  }
}

async function clearCollection(collectionName: string) {
  const snapshot = await getDocs(collection(db, collectionName));
  const deletes = snapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletes);
  console.log(`   Cleared ${collectionName} (${deletes.length} docs)`);
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function seedPharmacyData() {
  console.log('\n🌱 Seeding Pharmacy Data...\n');

  await signIn();

  console.log('🧹 Clearing pharmacy collections...');
  await clearCollection('medications').catch(() => {});
  await clearCollection('inventory_batches').catch(() => {});
  await clearCollection('stock_movements').catch(() => {});
  await clearCollection('prescriptions').catch(() => {});
  console.log('');

  const usersSnap = await getDocs(collection(db, 'users'));
  const users: Record<string, any> = {};
  usersSnap.forEach(d => { users[d.id] = { id: d.id, ...d.data() }; });

  const petsSnap = await getDocs(collection(db, 'pets'));
  const pets: Record<string, any> = {};
  petsSnap.forEach(d => { pets[d.id] = { id: d.id, ...d.data() }; });
  const petsByName: Record<string, any> = {};
  Object.values(pets).forEach(p => { petsByName[p.name] = p; });

  const doctorsSnap = await getDocs(collection(db, 'doctors'));
  const doctors: any[] = [];
  doctorsSnap.forEach(d => { doctors.push({ id: d.id, ...d.data() }); });

  const encountersSnap = await getDocs(collection(db, 'encounters'));
  const encounters: any[] = [];
  encountersSnap.forEach(d => { encounters.push({ id: d.id, ...d.data() }); });

  console.log(`   Found ${Object.keys(users).length} users, ${Object.keys(pets).length} pets, ${doctors.length} doctors, ${encounters.length} encounters\n`);

  const adminUser = Object.values(users).find((u: any) => u.email === 'admin@medipaws.com' || u.role === 'admin');
  const firstDoctor = doctors[0];
  const userName = adminUser?.displayName || firstDoctor?.name || 'Dr. Admin';

  const medications = [
    { name: 'Amoxicillin 500mg', category: 'Antibiotic', unit: 'capsules', price: 25, costPrice: 12, minStock: 50, reorderPoint: 100, description: 'Broad-spectrum antibiotic for bacterial infections' },
    { name: 'Metronidazole 250mg', category: 'Antibiotic', unit: 'tablets', price: 18, costPrice: 8, minStock: 30, reorderPoint: 60, description: 'Antibiotic and antiprotozoal for GI infections' },
    { name: 'Carprofen 100mg', category: 'Anti-inflammatory', unit: 'tablets', price: 35, costPrice: 16, minStock: 20, reorderPoint: 40, description: 'NSAID for pain and inflammation' },
    { name: 'Tramadol 50mg', category: 'Pain Relief', unit: 'capsules', price: 15, costPrice: 6, minStock: 40, reorderPoint: 80, description: 'Moderate to severe pain management' },
    { name: 'Meloxicam 1.5mg/ml', category: 'Anti-inflammatory', unit: 'ml', price: 450, costPrice: 200, minStock: 3, reorderPoint: 6, description: 'Oral suspension NSAID (150ml bottle)' },
    { name: 'Drontal Plus', category: 'Dewormer', unit: 'tablets', price: 60, costPrice: 28, minStock: 15, reorderPoint: 30, description: 'Broad-spectrum dewormer for dogs' },
    { name: 'Revolution 6-pack', category: 'Flea/Tick', unit: 'vial', price: 850, costPrice: 420, minStock: 5, reorderPoint: 10, description: 'Spot-on flea, tick, and heartworm prevention' },
    { name: 'NexGard Chewables', category: 'Flea/Tick', unit: 'pieces', price: 320, costPrice: 150, minStock: 10, reorderPoint: 20, description: 'Oral flea and tick chewable for dogs' },
    { name: 'Rabies Vaccine', category: 'Vaccine', unit: 'vial', price: 250, costPrice: 110, minStock: 10, reorderPoint: 20, description: '1-dose rabies vaccine' },
    { name: 'DHPPi Vaccine', category: 'Vaccine', unit: 'vial', price: 350, costPrice: 160, minStock: 8, reorderPoint: 16, description: 'Distemper/Hepatitis/Parainfluenza/Parvo combo' },
    { name: 'Enrofloxacin 50mg', category: 'Antibiotic', unit: 'tablets', price: 22, costPrice: 10, minStock: 25, reorderPoint: 50, description: 'Fluoroquinolone antibiotic' },
    { name: 'Prednisone 20mg', category: 'Anti-inflammatory', unit: 'tablets', price: 12, costPrice: 5, minStock: 40, reorderPoint: 80, description: 'Corticosteroid for inflammation and allergies' },
    { name: 'Cerenia 16mg', category: 'Other', unit: 'tablets', price: 95, costPrice: 45, minStock: 10, reorderPoint: 20, description: 'Antiemetic for vomiting in dogs' },
    { name: 'Ketoconazole 200mg', category: 'Antifungal', unit: 'tablets', price: 28, costPrice: 13, minStock: 15, reorderPoint: 30, description: 'Antifungal for skin and systemic infections' },
    { name: 'Omega-3 Fish Oil', category: 'Supplement', unit: 'capsules', price: 45, costPrice: 20, minStock: 20, reorderPoint: 40, description: 'Essential fatty acid supplement for skin and coat' },
  ];

  interface MedResult { id: string; name: string; };
  const createdMeds: MedResult[] = [];

  console.log('📦 Creating medications...');
  for (const med of medications) {
    const ref = await addDoc(collection(db, 'medications'), {
      ...med,
      stock: 0,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    createdMeds.push({ id: ref.id, name: med.name });
    console.log(`   + ${med.name} (${med.category})`);
  }
  console.log(`   ${createdMeds.length} medications created\n`);

  console.log('📋 Creating inventory batches...');
  const batches: Array<{ id: string; medicationId: string; medicationName: string; batchNo: string; quantity: number; expiryDate: string; costPrice: number; sellingPrice: number }> = [];

  const expiryScenarios = [
    { label: 'expiring in 10 days', days: -10 },
    { label: 'expiring in 20 days', days: -20 },
    { label: 'expired', days: -45 },
    { label: 'fresh', days: 180 },
    { label: 'fresh', days: 270 },
  ];

  for (const med of createdMeds) {
    const numBatches = Math.floor(Math.random() * 3) + 1;
    for (let b = 0; b < numBatches; b++) {
      const scenario = expiryScenarios[(createdMeds.indexOf(med) * 2 + b) % expiryScenarios.length];
      const qty = Math.floor(Math.random() * 80) + 20;
      const batchNo = `BATCH-${med.name.substring(0, 4).toUpperCase()}-${String(b + 1).padStart(3, '0')}`;
      const expiryDate = daysFromNow(scenario.days);
      const costPrice = medications[createdMeds.indexOf(med)].costPrice;
      const sellingPrice = medications[createdMeds.indexOf(med)].price;

      const ref = await addDoc(collection(db, 'inventory_batches'), {
        medicationId: med.id,
        batchNo,
        quantity: qty,
        originalQuantity: qty,
        expiryDate,
        manufacturingDate: daysAgo(90),
        costPrice,
        sellingPrice,
        receivedDate: daysAgo(30),
        status: scenario.days < 0 ? (scenario.days < -30 ? 'expired' : 'active') : 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batches.push({ id: ref.id, medicationId: med.id, medicationName: med.name, batchNo, quantity: qty, expiryDate, costPrice, sellingPrice });
      console.log(`   + ${batchNo}: ${med.name} (qty: ${qty}, expires: ${expiryDate})`);
    }
  }
  console.log(`   ${batches.length} batches created\n`);

  console.log('📊 Creating stock movements...');
  for (const batch of batches) {
    const med = medications.find(m => m.name === batch.medicationName)!;
    await addDoc(collection(db, 'stock_movements'), {
      medicationId: batch.medicationId,
      medicationName: batch.medicationName,
      batchId: batch.id,
      batchNo: batch.batchNo,
      type: 'receiving',
      quantity: batch.quantity,
      runningBalance: batch.quantity,
      reference: `REC-${batch.batchNo}`,
      notes: 'Initial stock receiving',
      userId: adminUser?.id || 'system',
      userName: userName,
      createdAt: serverTimestamp(),
    });

    // Update medication stock
    try {
      const medSnap = await getDocs(query(collection(db, 'medications'), where('__name__', '==', batch.medicationId)));
      if (!medSnap.empty) {
        const currentStock = medSnap.docs[0].data().stock || 0;
        await updateDoc(doc(db, 'medications', batch.medicationId), { stock: currentStock + batch.quantity, updatedAt: serverTimestamp() });
      }
    } catch (e) {
      console.log(`   ⚠ Could not update stock for ${batch.medicationName}`);
    }
  }

  // Also create a few adjustment/dispensing movements
  if (batches.length > 3) {
    for (let i = 0; i < 3; i++) {
      const batch = batches[i];
      const dispenseQty = -Math.floor(Math.random() * 10) - 1;
      await addDoc(collection(db, 'stock_movements'), {
        medicationId: batch.medicationId,
        medicationName: batch.medicationName,
        batchId: batch.id,
        batchNo: batch.batchNo,
        type: i === 2 ? 'adjustment' : 'dispensing',
        quantity: dispenseQty,
        runningBalance: batch.quantity + dispenseQty,
        reference: i === 2 ? 'ADJ-inventory-count' : `DISP-${batch.batchNo}`,
        notes: i === 2 ? 'Inventory count adjustment' : `Dispensed for treatment`,
        userId: adminUser?.id || 'system',
        userName: userName,
        createdAt: serverTimestamp(),
      });
    }
  }
  console.log(`   Stock movements created\n`);

  console.log('📝 Creating prescriptions...');
  const createdPrescriptions: string[] = [];

  if (encounters.length > 0 && Object.keys(petsByName).length > 0) {
    const prescriptionData = [
      { medIdx: 0, petName: 'Buddy', dosage: '1 capsule', frequency: 'Every 12 hours', qty: 14, instructions: 'Give with food' },
      { medIdx: 2, petName: 'Max', dosage: '1 tablet', frequency: 'Every 24 hours', qty: 7, instructions: 'Give after meals' },
      { medIdx: 4, petName: 'Luna', dosage: '1 ml', frequency: 'Every 24 hours', qty: 1, instructions: 'Oral suspension, shake well' },
      { medIdx: 6, petName: 'Whiskers', dosage: '1 vial', frequency: 'Monthly', qty: 1, instructions: 'Topical spot-on, monthly application' },
      { medIdx: 12, petName: 'Charlie', dosage: '1 tablet', frequency: 'Every 24 hours', qty: 4, instructions: 'Give on empty stomach for nausea' },
    ];

    for (const rx of prescriptionData) {
      const pet = petsByName[rx.petName];
      const enc = encounters.find((e: any) => e.patientId === pet?.id || e.petId === pet?.id);
      if (!pet || !enc) {
        console.log(`   ⚠ Skipping prescription for ${rx.petName}: no encounter found`);
        continue;
      }
      const med = createdMeds[rx.medIdx];
      if (!med) continue;

      const ref = await addDoc(collection(db, 'prescriptions'), {
        encounterId: enc.id,
        petId: pet.id,
        petName: pet.name || rx.petName,
        doctorId: firstDoctor?.id || '',
        doctorName: firstDoctor?.name || firstDoctor?.displayName || 'Dr. Smith',
        date: daysAgo(5),
        status: rx.medIdx === 0 ? 'dispensed' : 'pending',
        items: [{
          medicationId: med.id,
          medicationName: med.name,
          dosage: rx.dosage,
          frequency: rx.frequency,
          quantity: rx.qty,
          instructions: rx.instructions || '',
        }],
        notes: rx.medIdx === 0 ? 'Dispensed during visit' : 'Pending dispensing',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      createdPrescriptions.push(ref.id);
      console.log(`   + ${rx.petName}: ${med.name} - ${rx.dosage} ${rx.frequency} (${rx.medIdx === 0 ? 'Dispensed' : 'Pending'})`);
    }
  } else {
    console.log('   ⚠ No encounters or pets found, creating standalone prescriptions...');
    if (createdMeds.length > 0) {
      const ref = await addDoc(collection(db, 'prescriptions'), {
        encounterId: 'standalone',
        petId: 'standalone',
        petName: 'Sample Patient',
        doctorId: firstDoctor?.id || '',
        doctorName: firstDoctor?.name || firstDoctor?.displayName || 'Dr. Smith',
        date: daysAgo(1),
        status: 'pending',
        items: [{
          medicationId: createdMeds[0].id,
          medicationName: createdMeds[0].name,
          dosage: '1 tablet',
          frequency: 'Every 12 hours',
          quantity: 10,
          instructions: 'Sample prescription',
        }],
        notes: 'Standalone prescription for testing',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      createdPrescriptions.push(ref.id);
      console.log(`   + Sample: ${createdMeds[0].name} (Pending)`);
    }
  }
  console.log(`   ${createdPrescriptions.length} prescriptions created\n`);

  console.log('\n✅ Pharmacy seed complete!');
  console.log(`   - ${createdMeds.length} medications`);
  console.log(`   - ${batches.length} inventory batches`);
  console.log(`   - ${createdPrescriptions.length} prescriptions`);
  console.log('');
}

seedPharmacyData().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

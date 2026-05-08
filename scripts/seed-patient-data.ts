import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

// ─── Helpers ───────────────────────────────────────────────────────────
async function signInAsAdmin() {
  try {
    await signInWithEmailAndPassword(auth, 'admin@medipaws.com', 'Password123!');
    console.log('   ✅ Signed in as admin');
  } catch {
    console.log('   ⚠️  Admin sign-in failed, continuing without auth...');
  }
}

function randomDate(minDaysAgo: number, maxDaysAgo: number): Date {
  const days = Math.floor(Math.random() * (maxDaysAgo - minDaysAgo + 1)) + minDaysAgo;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Medical Visit Scenarios ──────────────────────────────────────────
const MEDICAL_SCENARIOS = [
  {
    species: ['Dog', 'Canine (Dog)'],
    complaints: [
      {
        chief: 'Vomiting and diarrhea for 2 days, decreased appetite',
        diagnosis: 'Acute Gastroenteritis',
        subjective: 'Owner reports pet has been vomiting 3-4 times daily with loose stools. Still drinking water but eating less.',
        objective: 'Mild dehydration (5%). Abdomen soft, non-painful. Temp 39.2°C. Mucous membranes slightly tacky.',
        assessment: 'Acute gastroenteritis, likely dietary indiscretion. Mild dehydration.',
        plan: 'Fluid therapy, anti-emetics, bland diet for 5 days. Recheck if symptoms persist beyond 48 hours.',
        services: [
          { name: 'General Consultation', type: 'consultation', price: 500, qty: 1 },
          { name: 'IV Fluid Therapy', type: 'procedure', price: 800, qty: 1 },
          { name: 'CBC + Chemistry Panel', type: 'lab', price: 1500, qty: 1 }
        ],
        labs: [
          { name: 'Complete Blood Count', code: 'CBC001', status: 'completed', result: 'Mild leukocytosis, otherwise normal' },
          { name: 'Serum Chemistry', code: 'CHEM001', status: 'completed', result: 'Electrolytes slightly imbalanced, BUN/Creat normal' }
        ],
        prescriptions: [
          { name: 'Maropitant (Cerenia)', dosage: '2mg/kg', frequency: 'Once daily', duration: '3 days', qty: 3, price: 180 },
          { name: 'Metronidazole 250mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '5 days', qty: 10, price: 22 },
          { name: 'Probiotic (FortiFlora)', dosage: '1 sachet', frequency: 'Once daily', duration: '7 days', qty: 7, price: 65 }
        ]
      },
      {
        chief: 'Limping on right front leg after playing in the yard',
        diagnosis: 'Soft Tissue Injury - Right Forelimb',
        subjective: 'Owner noticed limping after outdoor play. No known trauma or bite wounds. Still bearing some weight.',
        objective: 'Mild swelling on right carpus. Pain on flexion. No crepitus. X-rays show no fracture.',
        assessment: 'Soft tissue sprain, right carpus. Rule out fracture via X-ray.',
        plan: 'Rest for 7-10 days, NSAIDs, cold compress. Re-evaluate if no improvement.',
        services: [
          { name: 'General Consultation', type: 'consultation', price: 500, qty: 1 },
          { name: 'X-Ray (Right Forelimb)', type: 'diagnostic', price: 1800, qty: 1 }
        ],
        labs: [{ name: 'X-Ray Report', code: 'XRY002', status: 'completed', result: 'No fracture. Soft tissue swelling noted.' }],
        prescriptions: [
          { name: 'Meloxicam 5mg', dosage: '1 tablet', frequency: 'Once daily with food', duration: '5 days', qty: 5, price: 55 }
        ]
      },
      {
        chief: 'Coughing for 5 days, especially at night and after exercise',
        diagnosis: 'Kennel Cough (Infectious Tracheobronchitis)',
        subjective: 'Owner reports hacking cough, sounds like choking. Pet is eating normally but tired after coughing fits.',
        objective: 'Tracheal sensitivity elicited on palpation. Lungs clear on auscultation. Temp 39.0°C.',
        assessment: 'Infectious tracheobronchitis (kennel cough). Likely Bordetella/parainfluenza.',
        plan: 'Antibiotics, cough suppressant, rest. Avoid walks with collar (use harness). Follow-up in 7 days.',
        services: [
          { name: 'Respiratory Consultation', type: 'consultation', price: 550, qty: 1 },
          { name: 'Thoracic X-Ray', type: 'diagnostic', price: 2000, qty: 1 },
          { name: 'PCR Respiratory Panel', type: 'lab', price: 2200, qty: 1 }
        ],
        labs: [
          { name: 'PCR Respiratory Panel', code: 'RSP001', status: 'completed', result: 'Bordetella bronchiseptica detected' },
          { name: 'Thoracic X-Ray', code: 'XRY003', status: 'completed', result: 'No pneumonia. Tracheal narrowing consistent with cough.' }
        ],
        prescriptions: [
          { name: 'Doxycycline 100mg', dosage: '1 tablet', frequency: 'Once daily', duration: '10 days', qty: 10, price: 40 },
          { name: 'Hydrocodone-Homatropine', dosage: '1ml', frequency: 'Every 8 hours', duration: '5 days', qty: 5, price: 95 }
        ]
      }
    ]
  },
  {
    species: ['Cat', 'Feline (Cat)'],
    complaints: [
      {
        chief: 'Straining to urinate, frequent trips to litter box with little output',
        diagnosis: 'Feline Lower Urinary Tract Disease (FLUTD)',
        subjective: 'Owner notes cat going to litter box 8-10 times daily, only producing small amounts. Vocalizing in litter box.',
        objective: 'Firm, distended bladder on palpation. Unable to express easily. Temp 38.6°C. Dehydrated.',
        assessment: 'FLUTD, possible urethral obstruction. Emergency catheterization required.',
        plan: 'Emergency catheter placement, IV fluids, urinalysis. Hospitalize 24-48 hours.',
        services: [
          { name: 'Emergency Consultation', type: 'consultation', price: 800, qty: 1 },
          { name: 'Urinary Catheterization', type: 'procedure', price: 2500, qty: 1 },
          { name: 'IV Fluid Therapy (24hr)', type: 'procedure', price: 1500, qty: 1 },
          { name: 'Urinalysis + Culture', type: 'lab', price: 950, qty: 1 }
        ],
        labs: [
          { name: 'Urinalysis', code: 'UA001', status: 'completed', result: 'Crystals present (struvite), pH 7.8, trace blood' },
          { name: 'Urine Culture', code: 'CUL001', status: 'completed', result: 'No bacterial growth' }
        ],
        prescriptions: [
          { name: 'Prazosin 1mg', dosage: '1 capsule', frequency: 'Once daily', duration: '7 days', qty: 7, price: 45 },
          { name: 'Buprenorphine', dosage: '0.1ml', frequency: 'Every 12 hours', duration: '3 days', qty: 3, price: 120 },
          { name: 'Hill\'s c/d Multicare', dosage: '1 can daily', frequency: 'Wet food only', duration: 'Ongoing', qty: 12, price: 85 }
        ]
      },
      {
        chief: 'Sneezing, nasal discharge, and eye discharge for 1 week',
        diagnosis: 'Feline Upper Respiratory Infection',
        subjective: 'Cat is sneezing frequently, has green nasal discharge, and both eyes are weeping. Still eating but less active.',
        objective: 'Bilateral serous ocular discharge, conjunctival hyperemia. Mucopurulent nasal discharge. Temp 39.4°C.',
        assessment: 'Upper respiratory infection, likely FHV-1 (feline herpesvirus) or FCV.',
        plan: 'Antibiotics, eye drops, L-lysine. Supportive care and isolation from other cats.',
        services: [
          { name: 'General Consultation', type: 'consultation', price: 500, qty: 1 },
          { name: 'PCR URI Panel', type: 'lab', price: 1800, qty: 1 }
        ],
        labs: [{ name: 'PCR URI Panel', code: 'URI001', status: 'completed', result: 'Feline Herpesvirus-1 detected' }],
        prescriptions: [
          { name: 'Amoxicillin-Clavulanate', dosage: '62.5mg', frequency: 'Twice daily', duration: '10 days', qty: 20, price: 35 },
          { name: 'Terramycin Ophthalmic Ointment', dosage: 'Apply to both eyes', frequency: '4x daily', duration: '7 days', qty: 1, price: 280 },
          { name: 'L-Lysine Gel', dosage: '500mg', frequency: 'Twice daily', duration: '30 days', qty: 1, price: 350 }
        ]
      },
      {
        chief: 'Annual checkup and vaccination update',
        diagnosis: 'Healthy - Annual Wellness',
        subjective: 'Cat is healthy, eating well, active. Indoor-only. Last vaccination was over 12 months ago.',
        objective: 'BCS 5/9. Teeth clean, ears clear, coat good. No abnormalities. Weight stable.',
        assessment: 'Healthy adult cat. Due for FVRCP and FeLV/FIV screening.',
        plan: 'Administer FVRCP vaccine, FeLV/FIV test, fecal exam. Continue annual wellness schedule.',
        services: [
          { name: 'Wellness Consultation', type: 'consultation', price: 400, qty: 1 },
          { name: 'FVRCP Vaccine', type: 'vaccination', price: 350, qty: 1 },
          { name: 'FeLV/FIV Snap Test', type: 'lab', price: 650, qty: 1 },
          { name: 'Fecal Examination', type: 'lab', price: 300, qty: 1 }
        ],
        labs: [
          { name: 'FeLV/FIV Snap Test', code: 'FEL001', status: 'completed', result: 'Negative for both' },
          { name: 'Fecal Exam', code: 'FEC001', status: 'completed', result: 'No parasites detected' }
        ],
        prescriptions: []
      }
    ]
  },
  {
    species: ['Bird', 'Avian (Bird)'],
    complaints: [
      {
        chief: 'Fluffed feathers, decreased singing, sitting on cage floor',
        diagnosis: 'Avian Nutritional Deficiency / Hypovitaminosis A',
        subjective: 'Owner reports bird has been less active, not singing as much, and feathers look dull. Diet primarily seed-based.',
        objective: 'Choanal papillae blunted (vit A deficiency). Feathers dull, mild dermatitis around beak. Weight slightly below ideal.',
        assessment: 'Hypovitaminosis A due to seed-only diet. Need dietary transition.',
        plan: 'Vitamin A injection, dietary counseling, gradual pellet transition. Follow-up in 2 weeks.',
        services: [
          { name: 'Avian Consultation', type: 'consultation', price: 700, qty: 1 },
          { name: 'Blood Panel (Avian)', type: 'lab', price: 1200, qty: 1 },
          { name: 'Vitamin A Injection', type: 'procedure', price: 250, qty: 1 }
        ],
        labs: [{ name: 'Avian Blood Panel', code: 'AVB001', status: 'completed', result: 'Vitamin A levels low, other parameters normal' }],
        prescriptions: [
          { name: 'Vitamin A Supplement', dosage: '1 drop', frequency: 'Daily in food', duration: '30 days', qty: 1, price: 180 },
          { name: 'Avian Pellet Diet (Premium)', dosage: 'Free feed', frequency: 'Replace seed gradually', duration: 'Ongoing', qty: 1, price: 450 }
        ]
      }
    ]
  },
  {
    species: ['Reptile'],
    complaints: [
      {
        chief: 'Lethargic, not eating for 2 weeks, eyes appear sunken',
        diagnosis: 'Dehydration / Metabolic Bone Disease (early stage)',
        subjective: 'Owner reports reptile has not eaten in 2 weeks and seems very lethargic. UVB bulb last replaced 8 months ago.',
        objective: 'Sunken eyes, dry skin, poor muscle tone. Jaw slightly soft on palpation. Weight 15% below species average.',
        assessment: 'Dehydration with early signs of MBD due to inadequate UVB exposure.',
        plan: 'Fluid therapy (subcutaneous), calcium supplementation, UVB bulb replacement, dietary assessment.',
        services: [
          { name: 'Exotic Consultation', type: 'consultation', price: 800, qty: 1 },
          { name: 'Subcutaneous Fluids', type: 'procedure', price: 500, qty: 1 },
          { name: 'Calcium/Blood Panel', type: 'lab', price: 1100, qty: 1 }
        ],
        labs: [{ name: 'Calcium/Phosphorus Panel', code: 'REP001', status: 'completed', result: 'Ca:P ratio inverted (0.6:1), confirms MBD risk' }],
        prescriptions: [
          { name: 'Calcium Gluconate', dosage: '100mg/kg', frequency: 'SubQ every 3 days', duration: '2 weeks', qty: 4, price: 150 },
          { name: 'Reptile Multivitamin', dosage: 'Sprinkle on food', frequency: 'Daily', duration: 'Ongoing', qty: 1, price: 280 },
          { name: 'UVB Bulb (10.0)', dosage: 'N/A', frequency: '12hrs/day', duration: 'Replace every 6 months', qty: 1, price: 650 }
        ]
      }
    ]
  }
];

const GROOMING_SERVICES = [
  { name: 'Full Grooming (Bath + Haircut)', price: 1200 },
  { name: 'Bath & Brush Only', price: 600 },
  { name: 'Nail Trim', price: 200 },
  { name: 'Ear Cleaning', price: 150 },
  { name: 'Anal Gland Expression', price: 350 },
  { name: 'De-shedding Treatment', price: 800 },
  { name: 'Flea & Tick Treatment', price: 500 },
  { name: 'Teeth Cleaning (Basic)', price: 400 }
];

const DOCTORS: string[] = ['1', '2', '3', '4'];
const DOCTOR_NAMES: Record<string, string> = {
  '1': 'Dr. Sarah Johnson',
  '2': 'Dr. Michael Chen',
  '3': 'Dr. Emily Rodriguez',
  '4': 'Dr. James Wilson'
};

// ─── Main ─────────────────────────────────────────────────────────────
async function seedPatientData() {
  console.log('🏥 Seeding billing & medical records for all patients...\n');

  await signInAsAdmin();

  // Fetch all pets
  const petsSnap = await getDocs(collection(db, 'pets'));
  const pets: any[] = [];
  petsSnap.forEach(d => pets.push({ id: d.id, ...d.data() }));

  console.log(`   Found ${pets.length} patients\n`);

  if (pets.length === 0) {
    console.log('   No pets found. Exiting.');
    process.exit(0);
  }

  let totalVisits = 0;
  let totalInvoices = 0;

  for (const pet of pets) {
    const species = pet.species || '';
    const isDog = species.includes('Dog') || species.includes('Canine');
    const isCat = species.includes('Cat') || species.includes('Feline');
    const isBird = species.includes('Bird') || species.includes('Avian');
    const isReptile = species.includes('Reptile');

    // Pick matching scenarios
    let scenarios: any[] = [];
    if (isDog || isCat) {
      scenarios = MEDICAL_SCENARIOS.find(s => s.species.some(sp => species.includes(sp)))?.complaints || [];
    } else if (isBird) {
      scenarios = MEDICAL_SCENARIOS.find(s => s.species.some(sp => species.includes(sp)))?.complaints || [];
    } else if (isReptile) {
      scenarios = MEDICAL_SCENARIOS.find(s => s.species.some(sp => species.includes(sp)))?.complaints || [];
    }

    // Fallback: use dog scenarios for any unclassified species
    if (scenarios.length === 0) {
      scenarios = MEDICAL_SCENARIOS[0].complaints;
    }

    // Generate 1-3 visits per pet
    const numVisits = Math.min(scenarios.length, Math.floor(Math.random() * 3) + 1);
    const selectedScenarios = scenarios.slice(0, numVisits);

    console.log(`🐾 ${pet.name} (${species}) — ${numVisits} visit(s)`);

    for (const scenario of selectedScenarios) {
      const visitDate = randomDate(5, 90);
      const doctorId = pickRandom(DOCTORS);
      const doctorName = DOCTOR_NAMES[doctorId] || 'Dr. Unknown';
      const status = 'completed' as const;

      // Calculate totals
      let subTotal = 0;
      for (const svc of scenario.services) {
        subTotal += svc.price * svc.qty;
      }
      // Add prescription costs
      for (const rx of scenario.prescriptions) {
        subTotal += rx.price * rx.qty;
      }
      // Maybe add a grooming service randomly
      let groomingAdded = false;
      if (isDog && Math.random() > 0.5) {
        const grooming = pickRandom(GROOMING_SERVICES);
        scenario.services.push({ name: grooming.name, type: 'grooming', price: grooming.price, qty: 1 });
        subTotal += grooming.price;
        groomingAdded = true;
      }

      const taxAmount = subTotal * 0.12;
      const grandTotal = subTotal + taxAmount;
      const amountPaid = Math.random() > 0.2 ? grandTotal : grandTotal * 0.5;
      const balanceDue = grandTotal - amountPaid;
      const invoiceStatus = balanceDue <= 0 ? 'paid' : 'active';

      // 1. Create encounter
      const encounterData = {
        petId: pet.id,
        petName: pet.name,
        clientUid: pet.ownerUid,
        doctorId,
        doctorName,
        startedAt: visitDate,
        status,
        vitals: {
          weightKg: pet.weight || 10,
          temperatureC: isCat ? parseFloat((38.5 + Math.random() * 0.5).toFixed(1)) : parseFloat((38.2 + Math.random() * 0.8).toFixed(1)),
          heartRateBpm: isCat ? 180 + Math.floor(Math.random() * 30) : 100 + Math.floor(Math.random() * 40),
          respiratoryRateRpm: isCat ? 28 + Math.floor(Math.random() * 8) : 22 + Math.floor(Math.random() * 10),
          mmColor: 'Pink',
          crtSeconds: 1.5
        },
        clinicalNotes: {
          subjective: scenario.subjective,
          objective: scenario.objective,
          assessment: scenario.assessment,
          plan: scenario.plan,
          diagnosis: scenario.diagnosis,
          doctorNotes: '',
          followUpInstructions: scenario.plan
        },
        createdBy: 'seed-patient-data',
        createdAt: visitDate,
        updatedAt: visitDate
      };

      const encRef = await addDoc(collection(db, 'encounters'), encounterData);
      const encounterId = encRef.id;

      // 2. Create triage vitals
      await addDoc(collection(db, 'triage_vitals'), {
        encounterId,
        patientId: pet.id,
        appointmentId: '',
        weightKg: encounterData.vitals.weightKg,
        temperatureC: encounterData.vitals.temperatureC,
        heartRateBpm: encounterData.vitals.heartRateBpm,
        respiratoryRateRpm: encounterData.vitals.respiratoryRateRpm,
        mmColor: encounterData.vitals.mmColor,
        crtSeconds: encounterData.vitals.crtSeconds,
        notes: '',
        createdBy: 'seed-patient-data',
        createdAt: visitDate
      });

      // 3. Create clinical notes
      await addDoc(collection(db, 'clinical_notes'), {
        encounterId,
        patientId: pet.id,
        subjective: scenario.subjective,
        objective: scenario.objective,
        assessment: scenario.assessment,
        plan: scenario.plan,
        diagnosis: scenario.diagnosis,
        doctorNotes: '',
        followUpInstructions: scenario.plan,
        createdBy: 'seed-patient-data',
        createdAt: visitDate,
        updatedAt: visitDate
      });

      // 4. Create appointment services
      for (const svc of scenario.services) {
        await addDoc(collection(db, 'appointment_services'), {
          encounterId,
          petId: pet.id,
          ownerId: pet.ownerUid,
          serviceCatalogId: '',
          serviceCode: svc.type.substring(0, 3).toUpperCase(),
          serviceName: svc.name,
          serviceType: svc.type,
          status: 'completed',
          source: 'doctor-added',
          billable: true,
          quantity: svc.qty,
          unitPrice: svc.price,
          discountAmount: 0,
          taxRate: 0.12,
          performedBy: doctorId,
          completedAt: visitDate,
          createdBy: 'seed-patient-data',
          createdAt: visitDate,
          updatedAt: visitDate
        });
      }

      // 5. Create lab orders
      for (const lab of scenario.labs) {
        await addDoc(collection(db, 'lab_orders'), {
          encounterId,
          patientId: pet.id,
          testName: lab.name,
          testCode: lab.code,
          status: lab.status,
          resultSummary: lab.result || '',
          orderedBy: doctorId,
          completedBy: lab.status === 'completed' ? 'lab-tech' : '',
          orderedAt: visitDate,
          completedAt: lab.status === 'completed' ? visitDate : null,
          createdAt: visitDate
        });
      }

      // 6. Create prescriptions
      for (const rx of scenario.prescriptions) {
        const rxRef = await addDoc(collection(db, 'prescriptions'), {
          encounterId,
          patientId: pet.id,
          medicationName: rx.name,
          medicationCatalogId: '',
          dosage: rx.dosage,
          frequency: rx.frequency,
          duration: rx.duration,
          quantityPrescribed: rx.qty,
          instructions: '',
          status: 'dispensed',
          prescribedBy: doctorId,
          prescribedAt: visitDate,
          createdAt: visitDate
        });

        // 7. Create dispensing record
        await addDoc(collection(db, 'dispensing_records'), {
          prescriptionId: rxRef.id,
          encounterId,
          patientId: pet.id,
          medicationName: rx.name,
          quantityDispensed: rx.qty,
          unitPrice: rx.price,
          totalPrice: rx.price * rx.qty,
          dispensedBy: 'pharmacy',
          dispensedAt: visitDate
        });
      }

      // 8. Create invoice
      const dueDate = new Date(visitDate);
      dueDate.setDate(dueDate.getDate() + 30);
      const invoiceRef = await addDoc(collection(db, 'invoices'), {
        encounterId,
        petId: pet.id,
        petName: pet.name,
        clientUid: pet.ownerUid,
        invoiceNo: `INV-${Math.floor(Math.random() * 90000) + 10000}`,
        status: invoiceStatus,
        subTotal,
        taxAmount,
        discountTotal: 0,
        grandTotal,
        amountPaid,
        balanceDue,
        issueDate: visitDate,
        dueDate,
        notes: scenario.diagnosis,
        createdAt: visitDate,
        updatedAt: visitDate
      });

      const invoiceId = invoiceRef.id;

      // 9. Create invoice items
      for (const svc of scenario.services) {
        await addDoc(collection(db, 'invoice_items'), {
          invoiceId,
          encounterId,
          petId: pet.id,
          description: svc.name,
          itemType: svc.type,
          quantity: svc.qty,
          unitPrice: svc.price,
          lineTotal: svc.price * svc.qty,
          createdAt: visitDate
        });
      }
      // Prescription items
      for (const rx of scenario.prescriptions) {
        await addDoc(collection(db, 'invoice_items'), {
          invoiceId,
          encounterId,
          petId: pet.id,
          description: `${rx.name} (${rx.qty} units)`,
          itemType: 'medication',
          quantity: rx.qty,
          unitPrice: rx.price,
          lineTotal: rx.price * rx.qty,
          createdAt: visitDate
        });
      }

      // 10. Create payment if paid or partially paid
      if (amountPaid > 0) {
        await addDoc(collection(db, 'payments'), {
          invoiceId,
          encounterId,
          petId: pet.id,
          amount: amountPaid,
          paymentMethod: pickRandom(['cash', 'gcash', 'card']),
          referenceNo: `PAY-${Math.floor(Math.random() * 90000) + 10000}`,
          receivedBy: 'cashier',
          paidAt: visitDate,
          createdAt: visitDate
        });
      }

      // 11. Create audit log
      await addDoc(collection(db, 'audit_logs'), {
        encounterId,
        patientId: pet.id,
        action: 'encounter_created',
        details: `Visit: ${scenario.diagnosis}`,
        userId: doctorId,
        timestamp: visitDate,
        createdAt: visitDate
      });

      totalVisits++;
      totalInvoices++;

      const paidLabel = balanceDue <= 0 ? 'PAID' : `BALANCE ₱${balanceDue.toFixed(0)}`;
      const groomingTag = groomingAdded ? ' + grooming' : '';
      console.log(`   📋 ${scenario.diagnosis} | ${visitDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} | ${doctorName} | ₱${grandTotal.toFixed(0)} ${paidLabel}${groomingTag}`);
    }

    console.log('');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log(`  ✅ Seed complete!`);
  console.log(`  📊 ${totalVisits} visits created`);
  console.log(`  📊 ${totalInvoices} invoices generated`);
  console.log('═══════════════════════════════════════════════════\n');

  process.exit(0);
}

seedPatientData().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});

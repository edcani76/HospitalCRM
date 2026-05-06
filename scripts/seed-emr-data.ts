import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc, query, where, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

// Sign in as admin first
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

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function timestamp(dateStr: string) {
  return new Date(dateStr);
}

async function seedEndToEndData() {
  console.log('🌱 Starting end-to-end seed data...\n');

  await signIn();

  // Clear EMR-related collections
  console.log('🧹 Clearing EMR collections...');
  await clearCollection('encounters');
  await clearCollection('triage_vitals');
  await clearCollection('clinical_notes');
  await clearCollection('appointment_services');
  await clearCollection('lab_orders');
  await clearCollection('prescriptions');
  await clearCollection('dispensing_records');
  await clearCollection('invoices');
  await clearCollection('invoice_items');
  await clearCollection('payments');
  await clearCollection('attachments');
  await clearCollection('audit_logs');
  console.log('');

  // Fetch existing users and pets
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

  console.log(`   Found ${Object.keys(users).length} users, ${Object.keys(pets).length} pets, ${doctors.length} doctors\n`);

  // Define visit scenarios for each pet
  const visitScenarios: Array<{
    petName: string;
    visits: Array<{
      daysAgo: number;
      doctorId: string;
      status: 'completed' | 'in-progress';
      chiefComplaint: string;
      vitals: { weightKg: number; temperatureC: number; heartRateBpm: number; respiratoryRateRpm: number; mmColor: string; crtSeconds: number };
      soap: { subjective: string; objective: string; assessment: string; plan: string };
      services: Array<{ name: string; type: string; price: number; qty: number }>;
      labs?: Array<{ name: string; code: string; status: string; result?: string }>;
      prescriptions?: Array<{ name: string; dosage: string; frequency: string; duration: string; qty: number; price: number; dispensed?: boolean }>;
      diagnosis?: string;
    }>;
  }> = [
    {
      petName: 'Buddy',
      visits: [
        {
          daysAgo: 30,
          doctorId: '1',
          status: 'completed',
          chiefComplaint: 'Limping on left hind leg, decreased activity level',
          vitals: { weightKg: 32.5, temperatureC: 38.6, heartRateBpm: 110, respiratoryRateRpm: 24, mmColor: 'Pink', crtSeconds: 1.5 },
          soap: {
            subjective: 'Owner reports Buddy has been reluctant to jump into the car and stairs for the past 2 weeks. Appetite normal.',
            objective: 'Mild crepitus in left hip joint. Reduced range of motion on extension. X-rays show mild hip dysplasia.',
            assessment: 'Mild hip dysplasia, early degenerative joint disease',
            plan: 'NSAID therapy, joint supplements, weight management, restricted exercise for 4 weeks'
          },
          services: [
            { name: 'General Consultation', type: 'consultation', price: 500, qty: 1 },
            { name: 'X-Ray (Hip)', type: 'diagnostic', price: 2500, qty: 1 },
            { name: 'Joint Supplement (1 month)', type: 'medication', price: 850, qty: 1 }
          ],
          labs: [
            { name: 'Complete Blood Count', code: 'CBC001', status: 'completed', result: 'All values within normal range' },
            { name: 'Hip Dysplasia Panel', code: 'HIP001', status: 'completed', result: 'Mild bilateral hip dysplasia, OFA Grade 1' }
          ],
          prescriptions: [
            { name: 'Carprofen 75mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '14 days', qty: 28, price: 45, dispensed: true },
            { name: 'Glucosamine Complex', dosage: '1 chewable', frequency: 'Once daily', duration: '30 days', qty: 30, price: 28, dispensed: true }
          ],
          diagnosis: 'Hip Dysplasia - Grade 1'
        },
        {
          daysAgo: 7,
          doctorId: '1',
          status: 'completed',
          chiefComplaint: 'Follow-up on hip dysplasia, improvement in mobility',
          vitals: { weightKg: 31.8, temperatureC: 38.4, heartRateBpm: 105, respiratoryRateRpm: 22, mmColor: 'Pink', crtSeconds: 1.5 },
          soap: {
            subjective: 'Owner reports significant improvement. Buddy is more active and can climb stairs with less difficulty.',
            objective: 'Improved range of motion in left hip. Reduced pain on manipulation. Weight decreased by 0.7kg.',
            assessment: 'Responding well to conservative management. Continue current protocol.',
            plan: 'Continue NSAIDs and supplements. Recheck in 4 weeks. Consider physical therapy.'
          },
          services: [
            { name: 'Follow-up Consultation', type: 'consultation', price: 350, qty: 1 },
            { name: 'Weight Assessment', type: 'consultation', price: 150, qty: 1 }
          ],
          prescriptions: [
            { name: 'Carprofen 75mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '30 days', qty: 60, price: 45, dispensed: true }
          ],
          diagnosis: 'Hip Dysplasia - Follow-up'
        }
      ]
    },
    {
      petName: 'Whiskers',
      visits: [
        {
          daysAgo: 20,
          doctorId: '3',
          status: 'completed',
          chiefComplaint: 'Bad breath, difficulty eating dry food, drooling',
          vitals: { weightKg: 4.5, temperatureC: 38.8, heartRateBpm: 180, respiratoryRateRpm: 30, mmColor: 'Pink', crtSeconds: 1.0 },
          soap: {
            subjective: 'Owner noticed bad breath for 2 weeks. Whiskers has been preferring wet food and dropping kibble.',
            objective: 'Severe tartar buildup on premolars and molars. Gingival inflammation and bleeding on probing. Grade 3 periodontal disease.',
            assessment: 'Severe periodontal disease, tooth resorption on right premolar',
            plan: 'Full dental cleaning under anesthesia, extract right premolar, start post-op antibiotics'
          },
          services: [
            { name: 'Dental Consultation', type: 'consultation', price: 500, qty: 1 },
            { name: 'Dental Cleaning (Full)', type: 'procedure', price: 3500, qty: 1 },
            { name: 'Tooth Extraction', type: 'procedure', price: 1500, qty: 1 },
            { name: 'Dental X-Ray', type: 'diagnostic', price: 1200, qty: 1 }
          ],
          labs: [
            { name: 'Pre-Anesthetic Blood Panel', code: 'PAB001', status: 'completed', result: 'Normal - cleared for anesthesia' },
            { name: 'Dental Panel', code: 'DNT001', status: 'completed', result: 'Grade 3 periodontal disease confirmed' }
          ],
          prescriptions: [
            { name: 'Amoxicillin-Clavulanate', dosage: '62.5mg', frequency: 'Twice daily', duration: '7 days', qty: 14, price: 35, dispensed: true },
            { name: 'Meloxicam Oral Suspension', dosage: '0.1ml', frequency: 'Once daily', duration: '3 days', qty: 3, price: 85, dispensed: true }
          ],
          diagnosis: 'Periodontal Disease Grade 3, Tooth Resorption'
        }
      ]
    },
    {
      petName: 'Max',
      visits: [
        {
          daysAgo: 18,
          doctorId: '1',
          status: 'completed',
          chiefComplaint: 'Persistent scratching, red patches on skin, hair loss',
          vitals: { weightKg: 34.0, temperatureC: 38.7, heartRateBpm: 120, respiratoryRateRpm: 26, mmColor: 'Pink', crtSeconds: 1.5 },
          soap: {
            subjective: 'Owner reports Max has been scratching constantly for 3 weeks. Started after spring began. Has tried over-the-counter antihistamines with minimal effect.',
            objective: 'Erythema and alopecia on ventral abdomen, medial thighs, and paws. Hot spots on lateral shoulders. Ear canal mildly erythematous with minimal discharge.',
            assessment: 'Atopic dermatitis (environmental allergies), secondary bacterial skin infection',
            plan: 'Allergy testing, Apoquel for itch relief, antibiotic course for hot spots, medicated shampoo baths'
          },
          services: [
            { name: 'Allergy Consultation', type: 'consultation', price: 600, qty: 1 },
            { name: 'Skin Scraping', type: 'diagnostic', price: 350, qty: 1 },
            { name: 'Allergy Test Panel', type: 'lab', price: 2800, qty: 1 },
            { name: 'Medicated Shampoo', type: 'supply', price: 450, qty: 1 }
          ],
          labs: [
            { name: 'Allergy Test Panel', code: 'ALG001', status: 'completed', result: 'Positive for: dust mites, grass pollen, mold spores' },
            { name: 'Skin Cytology', code: 'SKN001', status: 'completed', result: 'Cocci bacteria present - confirms secondary infection' }
          ],
          prescriptions: [
            { name: 'Apoquel 16mg', dosage: '1 tablet', frequency: 'Once daily for 14 days, then every other day', duration: '30 days', qty: 30, price: 95, dispensed: true },
            { name: 'Cephalexin 500mg', dosage: '1 capsule', frequency: 'Twice daily', duration: '14 days', qty: 28, price: 25, dispensed: true },
            { name: 'Chlorhexidine Shampoo', dosage: 'Apply to affected areas', frequency: 'Twice weekly', duration: '4 weeks', qty: 1, price: 450, dispensed: true }
          ],
          diagnosis: 'Atopic Dermatitis, Pyoderma (Secondary)'
        }
      ]
    },
    {
      petName: 'Luna',
      visits: [
        {
          daysAgo: 12,
          doctorId: '3',
          status: 'completed',
          chiefComplaint: 'Annual wellness check, due for vaccinations',
          vitals: { weightKg: 3.8, temperatureC: 38.5, heartRateBpm: 190, respiratoryRateRpm: 28, mmColor: 'Pink', crtSeconds: 1.0 },
          soap: {
            subjective: 'Luna is eating well, active, no complaints. Litter box habits normal. Indoor-only cat.',
            objective: 'BCS 5/9 (ideal weight). Teeth clean, ears clear, coat glossy. No abnormalities on physical exam.',
            assessment: 'Healthy, due for annual FVRCP booster and FeLV test',
            plan: 'Administer FVRCP vaccine, FeLV/FIV snap test, continue current diet and care'
          },
          services: [
            { name: 'Wellness Consultation', type: 'consultation', price: 400, qty: 1 },
            { name: 'FVRCP Vaccine', type: 'vaccination', price: 350, qty: 1 },
            { name: 'FeLV/FIV Test', type: 'lab', price: 650, qty: 1 }
          ],
          labs: [
            { name: 'FeLV/FIV Snap Test', code: 'FEL001', status: 'completed', result: 'Negative for both FeLV and FIV' }
          ],
          diagnosis: 'Healthy - Annual Wellness'
        }
      ]
    },
    {
      petName: 'Charlie',
      visits: [
        {
          daysAgo: 10,
          doctorId: '3',
          status: 'completed',
          chiefComplaint: 'Weight gain, decreased energy, owner concerned about obesity',
          vitals: { weightKg: 33.5, temperatureC: 38.6, heartRateBpm: 115, respiratoryRateRpm: 24, mmColor: 'Pink', crtSeconds: 1.5 },
          soap: {
            subjective: 'Charlie has gained 3kg over the past 6 months. Owner admits to increased treats and table scraps. Less willing to exercise.',
            objective: 'BCS 8/9 (obese). Prominent fat pads on abdomen, flanks, and neck. Difficulty palpating ribs. Thyroid palpation normal.',
            assessment: 'Obesity (BCS 8/9), possible hypothyroidism ruled out by blood work',
            plan: 'Prescription weight management diet, controlled portions (measured meals), daily exercise program, recheck weight in 4 weeks'
          },
          services: [
            { name: 'Nutrition Consultation', type: 'consultation', price: 500, qty: 1 },
            { name: 'Thyroid Panel', type: 'lab', price: 1100, qty: 1 },
            { name: 'Weight Management Diet (1 month)', type: 'supply', price: 1200, qty: 1 }
          ],
          labs: [
            { name: 'Thyroid Function Test', code: 'THR001', status: 'completed', result: 'T4 within normal range - hypothyroidism ruled out' },
            { name: 'Complete Blood Count', code: 'CBC002', status: 'completed', result: 'Normal' }
          ],
          prescriptions: [
            { name: 'Hill\'s Metabolic Diet', dosage: '2 cups/day (measured)', frequency: 'Split into 2 meals', duration: 'Ongoing', qty: 1, price: 1200, dispensed: true }
          ],
          diagnosis: 'Obesity (BCS 8/9), Weight Management Program'
        }
      ]
    },
    {
      petName: 'Rocky',
      visits: [
        {
          daysAgo: 15,
          doctorId: '4',
          status: 'completed',
          chiefComplaint: 'Post-surgery checkup after ACL repair',
          vitals: { weightKg: 25.2, temperatureC: 38.5, heartRateBpm: 130, respiratoryRateRpm: 28, mmColor: 'Pink', crtSeconds: 1.5 },
          soap: {
            subjective: 'Owner reports Rocky is bearing some weight on left hind leg. Incision looks clean. No licking or chewing at site.',
            objective: 'Incision well-healed, no discharge or dehiscence. Mild muscle atrophy in left thigh. Good stifle stability on manipulation. No pain on flexion.',
            assessment: 'Post-ACL repair healing well, 2 weeks post-op',
            plan: 'Continue restricted activity, start passive range of motion exercises, recheck in 2 weeks, consider physical therapy referral'
          },
          services: [
            { name: 'Post-Surgical Consultation', type: 'consultation', price: 400, qty: 1 },
            { name: 'X-Ray (Stifle)', type: 'diagnostic', price: 1800, qty: 1 }
          ],
          labs: [
            { name: 'Post-Surgery X-Ray', code: 'XRY001', status: 'completed', result: 'Implant in good position, no complications' }
          ],
          prescriptions: [
            { name: 'Tramadol 50mg', dosage: '1 tablet', frequency: 'Every 8-12 hours as needed', duration: '14 days', qty: 42, price: 30, dispensed: true },
            { name: 'Carprofen 75mg', dosage: '1 tablet', frequency: 'Once daily', duration: '14 days', qty: 14, price: 45, dispensed: true }
          ],
          diagnosis: 'Post-ACL Repair (2 weeks), Healing Well'
        }
      ]
    }
  ];

  const createdEncounters: Record<string, any[]> = {};
  const createdInvoices: Record<string, any[]> = {};

  // Generate encounters for each pet
  for (const scenario of visitScenarios) {
    const pet = petsByName[scenario.petName];
    if (!pet) {
      console.log(`   Skipping ${scenario.petName} - pet not found`);
      continue;
    }

    createdEncounters[scenario.petName] = [];

    for (const visit of scenario.visits) {
      const doctor = doctors.find(d => d.id === visit.doctorId);
      if (!doctor) continue;

      const dateStr = daysAgo(visit.daysAgo);
      const visitDate = timestamp(dateStr);

      // 1. Create encounter
      const encounterData = {
        petId: pet.id,
        petName: pet.name,
        clientUid: pet.ownerUid,
        doctorId: visit.doctorId,
        doctorName: doctor.name,
        startedAt: visitDate,
        status: visit.status,
        vitals: visit.vitals,
        clinicalNotes: {
          subjective: visit.soap.subjective,
          objective: visit.soap.objective,
          assessment: visit.soap.assessment,
          plan: visit.soap.plan,
          diagnosis: visit.diagnosis || '',
          doctorNotes: '',
          followUpInstructions: visit.soap.plan
        },
        createdBy: 'seed-script',
        createdAt: visitDate,
        updatedAt: visitDate
      };

      const encRef = await addDoc(collection(db, 'encounters'), encounterData);
      const encounterId = encRef.id;

      // 2. Create triage vitals record
      await addDoc(collection(db, 'triage_vitals'), {
        encounterId,
        patientId: pet.id,
        appointmentId: '',
        weightKg: visit.vitals.weightKg,
        temperatureC: visit.vitals.temperatureC,
        heartRateBpm: visit.vitals.heartRateBpm,
        respiratoryRateRpm: visit.vitals.respiratoryRateRpm,
        mmColor: visit.vitals.mmColor,
        crtSeconds: visit.vitals.crtSeconds,
        notes: '',
        createdBy: 'seed-script',
        createdAt: visitDate
      });

      // 3. Create clinical notes record
      await addDoc(collection(db, 'clinical_notes'), {
        encounterId,
        patientId: pet.id,
        subjective: visit.soap.subjective,
        objective: visit.soap.objective,
        assessment: visit.soap.assessment,
        plan: visit.soap.plan,
        diagnosis: visit.diagnosis || '',
        doctorNotes: '',
        followUpInstructions: visit.soap.plan,
        createdBy: 'seed-script',
        createdAt: visitDate,
        updatedAt: visitDate
      });

      // 4. Create appointment services
      let subTotal = 0;
      const servicesCreated: any[] = [];

      for (const svc of visit.services) {
        const lineTotal = svc.price * svc.qty;
        subTotal += lineTotal;

        const serviceRef = await addDoc(collection(db, 'appointment_services'), {
          encounterId,
          petId: pet.id,
          ownerId: pet.ownerUid,
          serviceCatalogId: '',
          serviceCode: svc.type.substring(0, 3).toUpperCase(),
          serviceName: svc.name,
          serviceType: svc.type,
          status: visit.status === 'completed' ? 'completed' : 'in-progress',
          source: 'doctor-added',
          billable: true,
          quantity: svc.qty,
          unitPrice: svc.price,
          discountAmount: 0,
          taxRate: 0.12,
          performedBy: visit.doctorId,
          completedAt: visit.status === 'completed' ? visitDate : null,
          createdBy: 'seed-script',
          createdAt: visitDate,
          updatedAt: visitDate
        });

        servicesCreated.push({
          id: serviceRef.id,
          name: svc.name,
          type: svc.type,
          lineTotal
        });
      }

      // 5. Create lab orders
      if (visit.labs) {
        for (const lab of visit.labs) {
          await addDoc(collection(db, 'lab_orders'), {
            encounterId,
            patientId: pet.id,
            testName: lab.name,
            testCode: lab.code,
            status: lab.status,
            resultSummary: lab.result || '',
            orderedBy: visit.doctorId,
            completedBy: lab.status === 'completed' ? 'lab-tech' : '',
            orderedAt: visitDate,
            completedAt: lab.status === 'completed' ? visitDate : null,
            createdAt: visitDate
          });
        }
      }

      // 6. Create prescriptions and dispensing records
      if (visit.prescriptions) {
        for (const rx of visit.prescriptions) {
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
            status: rx.dispensed ? 'dispensed' : 'prescribed',
            prescribedBy: visit.doctorId,
            prescribedAt: visitDate,
            createdAt: visitDate
          });

          if (rx.dispensed) {
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
        }
      }

      // 7. Create invoice
      const taxAmount = subTotal * 0.12;
      const grandTotal = subTotal + taxAmount;
      const isPaid = visit.status === 'completed';
      const dueDate = new Date(visitDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const invoiceRef = await addDoc(collection(db, 'invoices'), {
        encounterId,
        petId: pet.id,
        petName: pet.name,
        clientUid: pet.ownerUid,
        invoiceNo: `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        status: isPaid ? 'paid' : 'draft',
        subTotal,
        taxAmount,
        discountTotal: 0,
        grandTotal,
        amountPaid: isPaid ? grandTotal : 0,
        balanceDue: isPaid ? 0 : grandTotal,
        issueDate: visitDate,
        dueDate: dueDate,
        notes: visit.diagnosis || '',
        createdAt: visitDate,
        updatedAt: visitDate
      });

      const invoiceId = invoiceRef.id;

      // 8. Create invoice items
      for (const svc of visit.services) {
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

      // Add tax line
      await addDoc(collection(db, 'invoice_items'), {
        invoiceId,
        encounterId,
        petId: pet.id,
        description: 'VAT (12%)',
        itemType: 'tax',
        quantity: 1,
        unitPrice: taxAmount,
        lineTotal: taxAmount,
        createdAt: visitDate
      });

      // 9. Create payment record if paid
      if (isPaid) {
        await addDoc(collection(db, 'payments'), {
          invoiceId,
          encounterId,
          petId: pet.id,
          amount: grandTotal,
          paymentMethod: 'cash',
          referenceNo: `PAY-${Date.now()}`,
          receivedBy: 'cashier',
          paidAt: visitDate,
          createdAt: visitDate
        });
      }

      // 10. Create audit logs
      await addDoc(collection(db, 'audit_logs'), {
        encounterId,
        patientId: pet.id,
        action: 'encounter_created',
        details: `Visit: ${visit.chiefComplaint.substring(0, 50)}...`,
        userId: visit.doctorId,
        timestamp: visitDate,
        createdAt: visitDate
      });

      createdEncounters[scenario.petName].push({
        id: encounterId,
        date: dateStr,
        doctor: doctor.name,
        status: visit.status,
        diagnosis: visit.diagnosis,
        invoiceId,
        grandTotal
      });

      console.log(`   Created encounter for ${pet.name}: ${dateStr} - ${visit.diagnosis || 'Consultation'}`);
    }
  }

  // Create CRM-style invoices for the client dashboard (simplified invoices)
  console.log('\n   Creating client dashboard invoices...');
  for (const petName of Object.keys(createdEncounters)) {
    const encounters = createdEncounters[petName];
    const pet = petsByName[petName];
    if (!pet) continue;

    for (const enc of encounters) {
      // Skip if already created (we already created CRM invoices above)
      // These are the simplified invoices for the client dashboard
      // Already handled by the invoices collection above
    }
  }

  // Create some attachments (medical records) for a few encounters
  console.log('\n   Creating sample attachments...');
  for (const petName of ['Buddy', 'Whiskers', 'Max']) {
    const encounters = createdEncounters[petName];
    if (!encounters || encounters.length === 0) continue;

    const firstEnc = encounters[0];

    await addDoc(collection(db, 'attachments'), {
      encounterId: firstEnc.id,
      patientId: petsByName[petName].id,
      fileName: `${petName}_XRay_Report.pdf`,
      fileType: 'pdf',
      fileUrl: 'https://example.com/sample-xray-report.pdf',
      storagePath: `sample/${petName.toLowerCase()}/xray-report.pdf`,
      uploadedBy: 'seed-script',
      uploadedAt: timestamp(daysAgo(firstEnc.daysAgo || 10))
    });

    await addDoc(collection(db, 'attachments'), {
      encounterId: firstEnc.id,
      patientId: petsByName[petName].id,
      fileName: `${petName}_Lab_Results.pdf`,
      fileType: 'pdf',
      fileUrl: 'https://example.com/sample-lab-results.pdf',
      storagePath: `sample/${petName.toLowerCase()}/lab-results.pdf`,
      uploadedBy: 'seed-script',
      uploadedAt: timestamp(daysAgo(firstEnc.daysAgo || 10))
    });

    console.log(`   Created attachments for ${petName}`);
  }

  console.log('\n🎉 End-to-end seed data complete!\n');
  console.log('📋 Summary:');
  for (const petName of Object.keys(createdEncounters)) {
    const visits = createdEncounters[petName];
    console.log(`   ${petName}: ${visits.length} visit(s)`);
    for (const v of visits) {
      console.log(`     - ${v.date}: ${v.diagnosis} (${v.status}) - ₱${v.grandTotal.toFixed(2)}`);
    }
  }

  process.exit(0);
}

seedEndToEndData().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});

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
  await clearCollection('appointments');
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
          daysAgo: 90,
          doctorId: '1',
          status: 'completed',
          chiefComplaint: 'Annual wellness check, routine bloodwork',
          vitals: { weightKg: 33.0, temperatureC: 38.5, heartRateBpm: 108, respiratoryRateRpm: 22, mmColor: 'Pink', crtSeconds: 1.5 },
          soap: {
            subjective: 'Owner reports Buddy is healthy, eating well, normal activity level.',
            objective: 'Physical exam unremarkable. BCS 6/9. Heart and lungs clear. Teeth have mild tartar.',
            assessment: 'Healthy, overweight tendency noted',
            plan: 'Annual bloodwork, dental scaling recommended, weight monitoring'
          },
          services: [
            { name: 'Wellness Consultation', type: 'consultation', price: 500, qty: 1 },
            { name: 'Complete Blood Count', type: 'lab', price: 800, qty: 1 },
            { name: 'Chemistry Panel', type: 'lab', price: 1200, qty: 1 }
          ],
          labs: [
            { name: 'Complete Blood Count', code: 'CBC001', status: 'completed', result: 'All values within normal range' },
            { name: 'Serum Chemistry', code: 'CHE001', status: 'completed', result: 'ALT mildly elevated, monitor' }
          ],
          diagnosis: 'Healthy - Annual Wellness'
        },
        {
          daysAgo: 60,
          doctorId: '1',
          status: 'completed',
          chiefComplaint: 'Vomiting and diarrhea for 2 days',
          vitals: { weightKg: 32.8, temperatureC: 39.2, heartRateBpm: 130, respiratoryRateRpm: 30, mmColor: 'Pale Pink', crtSeconds: 2.0 },
          soap: {
            subjective: 'Owner reports Buddy vomited 4 times and had loose stool. Ate grass yesterday.',
            objective: 'Mild dehydration. Abdomen slightly tender on palpation. Temp elevated at 39.2C.',
            assessment: 'Acute gastroenteritis, likely dietary indiscretion',
            plan: 'SubQ fluids, anti-emetics, bland diet for 3 days, recheck if no improvement'
          },
          services: [
            { name: 'Emergency Consultation', type: 'consultation', price: 700, qty: 1 },
            { name: 'Subcutaneous Fluids', type: 'procedure', price: 650, qty: 1 },
            { name: 'Fecal Exam', type: 'lab', price: 350, qty: 1 }
          ],
          labs: [
            { name: 'Fecal Floatation', code: 'FEC001', status: 'completed', result: 'No parasites detected' }
          ],
          prescriptions: [
            { name: 'Metoclopramide 10mg', dosage: '1 tablet', frequency: 'Every 8 hours', duration: '3 days', qty: 9, price: 15, dispensed: true },
            { name: 'Metronidazole 250mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '5 days', qty: 10, price: 20, dispensed: true }
          ],
          diagnosis: 'Acute Gastroenteritis'
        },
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
            { name: 'Complete Blood Count', code: 'CBC002', status: 'completed', result: 'All values within normal range' },
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
          daysAgo: 45,
          doctorId: '3',
          status: 'completed',
          chiefComplaint: 'Not eating, hiding more than usual',
          vitals: { weightKg: 4.2, temperatureC: 39.0, heartRateBpm: 200, respiratoryRateRpm: 35, mmColor: 'Pale', crtSeconds: 2.0 },
          soap: {
            subjective: 'Owner reports Whiskers has been hiding under the bed and refusing food for 2 days.',
            objective: 'Temp elevated. Mild dehydration. Abdominal palpation reveals enlarged left kidney.',
            assessment: 'Possible upper urinary tract infection, early kidney disease suspected',
            plan: 'Urinalysis, blood panel, ultrasound referral, start antibiotics pending results'
          },
          services: [
            { name: 'General Consultation', type: 'consultation', price: 500, qty: 1 },
            { name: 'Urinalysis', type: 'lab', price: 450, qty: 1 },
            { name: 'Complete Blood Panel', type: 'lab', price: 1500, qty: 1 }
          ],
          labs: [
            { name: 'Urinalysis', code: 'URIN001', status: 'completed', result: 'WBC elevated, bacteria present' },
            { name: 'CBC + Chemistry', code: 'CBC003', status: 'completed', result: 'BUN/Creatinine mildly elevated' }
          ],
          prescriptions: [
            { name: 'Amoxicillin-Clavulanate', dosage: '62.5mg', frequency: 'Twice daily', duration: '14 days', qty: 28, price: 35, dispensed: true },
            { name: 'Fluid Therapy (SubQ)', dosage: '100ml', frequency: 'Once daily x 3 days', duration: '3 days', qty: 3, price: 200, dispensed: true }
          ],
          diagnosis: 'Pyelonephritis, Early CKD Stage 1'
        },
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
        },
        {
          daysAgo: 5,
          doctorId: '3',
          status: 'completed',
          chiefComplaint: 'CKD recheck, bloodwork follow-up',
          vitals: { weightKg: 4.3, temperatureC: 38.6, heartRateBpm: 175, respiratoryRateRpm: 28, mmColor: 'Pink', crtSeconds: 1.0 },
          soap: {
            subjective: 'Whiskers eating better, more active. Owner giving renal diet food as recommended.',
            objective: 'Weight stable. Kidneys still mildly enlarged but less painful. Coat improved.',
            assessment: 'Responding well to renal diet and supportive care',
            plan: 'Continue renal diet, recheck bloodwork in 3 months, consider renal supplement'
          },
          services: [
            { name: 'Follow-up Consultation', type: 'consultation', price: 350, qty: 1 },
            { name: 'Kidney Panel', type: 'lab', price: 900, qty: 1 }
          ],
          labs: [
            { name: 'SDMA + Creatinine', code: 'KID001', status: 'completed', result: 'BUN improved, creatinine stable, SDMA within acceptable range' }
          ],
          diagnosis: 'CKD Stage 1 - Stable'
        }
      ]
    },
    {
      petName: 'Max',
      visits: [
        {
          daysAgo: 60,
          doctorId: '1',
          status: 'completed',
          chiefComplaint: 'Routine vaccination due',
          vitals: { weightKg: 34.5, temperatureC: 38.4, heartRateBpm: 112, respiratoryRateRpm: 24, mmColor: 'Pink', crtSeconds: 1.5 },
          soap: {
            subjective: 'Max is healthy, active, no complaints. Ready for annual vaccines.',
            objective: 'Physical exam normal. BCS 5/9. All vitals within normal limits.',
            assessment: 'Healthy, due for DHPP and rabies booster',
            plan: 'Administer DHPP and rabies vaccines'
          },
          services: [
            { name: 'Wellness Consultation', type: 'consultation', price: 400, qty: 1 },
            { name: 'DHPP Vaccine', type: 'vaccination', price: 400, qty: 1 },
            { name: 'Rabies Vaccine', type: 'vaccination', price: 250, qty: 1 }
          ],
          diagnosis: 'Healthy - Annual Vaccination'
        },
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
            { name: 'Allergy Test Panel', type: 'lab', price: 2500, qty: 1 },
            { name: 'Skin Cytology', type: 'lab', price: 400, qty: 1 },
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
        },
        {
          daysAgo: 2,
          doctorId: '1',
          status: 'completed',
          chiefComplaint: 'Allergy follow-up, skin condition improving',
          vitals: { weightKg: 33.5, temperatureC: 38.5, heartRateBpm: 108, respiratoryRateRpm: 22, mmColor: 'Pink', crtSeconds: 1.5 },
          soap: {
            subjective: 'Owner reports 70% improvement in scratching. Skin redness significantly reduced.',
            objective: 'Hot spots healing well. Coat regrowth visible on thighs. Ears clear.',
            assessment: 'Excellent response to Apoquel and antibiotics',
            plan: 'Taper Apoquel to every other day, continue shampoo, recheck in 2 months'
          },
          services: [
            { name: 'Follow-up Consultation', type: 'consultation', price: 350, qty: 1 },
            { name: 'Skin Scraping', type: 'lab', price: 250, qty: 1 }
          ],
          labs: [
            { name: 'Skin Scraping', code: 'SKN002', status: 'completed', result: 'No mites detected, minimal bacteria' }
          ],
          diagnosis: 'Atopic Dermatitis - Improving'
        }
      ]
    },
    {
      petName: 'Luna',
      visits: [
        {
          daysAgo: 50,
          doctorId: '3',
          status: 'completed',
          chiefComplaint: 'Urinating outside litter box, straining to urinate',
          vitals: { weightKg: 3.6, temperatureC: 38.7, heartRateBpm: 195, respiratoryRateRpm: 32, mmColor: 'Pink', crtSeconds: 1.0 },
          soap: {
            subjective: 'Luna has been urinating on the bathroom rug. Owner noticed she strains and produces only small amounts.',
            objective: 'Bladder palpable but small. No crystals on urine dipstick. Mild discomfort on abdominal palpation.',
            assessment: 'Feline idiopathic cystitis (FIC), stress-related',
            plan: 'Anti-inflammatory, stress reduction, increased water intake, monitor for blockage'
          },
          services: [
            { name: 'General Consultation', type: 'consultation', price: 500, qty: 1 },
            { name: 'Urinalysis', type: 'lab', price: 450, qty: 1 },
            { name: 'Bladder Ultrasound', type: 'diagnostic', price: 1800, qty: 1 }
          ],
          labs: [
            { name: 'Urinalysis', code: 'URIN002', status: 'completed', result: 'No crystals or bacteria, RBC present - consistent with FIC' },
            { name: 'Bladder Ultrasound', code: 'US001', status: 'completed', result: 'Bladder wall mildly thickened, no stones detected' }
          ],
          prescriptions: [
            { name: 'Meloxicam Oral Suspension', dosage: '0.05ml', frequency: 'Once daily', duration: '5 days', qty: 5, price: 85, dispensed: true },
            { name: 'Feliway Diffuser', dosage: '1 unit', frequency: 'Continuous', duration: '30 days', qty: 1, price: 950, dispensed: true }
          ],
          diagnosis: 'Feline Idiopathic Cystitis'
        },
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
          daysAgo: 40,
          doctorId: '3',
          status: 'completed',
          chiefComplaint: 'Coughing, especially at night',
          vitals: { weightKg: 32.0, temperatureC: 39.1, heartRateBpm: 140, respiratoryRateRpm: 36, mmColor: 'Pale Pink', crtSeconds: 2.0 },
          soap: {
            subjective: 'Charlie has been coughing for 5 days, worse at night. Sounds like honking goose. No nasal discharge.',
            objective: 'Tracheal sensitivity on palpation triggers cough. Lungs clear on auscultation. Mild tonsillitis.',
            assessment: 'Kennel cough (tracheobronchitis), likely Bordetella',
            plan: 'Antibiotics, cough suppressant, rest for 7-10 days, isolate from other dogs'
          },
          services: [
            { name: 'General Consultation', type: 'consultation', price: 500, qty: 1 },
            { name: 'Thoracic X-Ray', type: 'diagnostic', price: 2000, qty: 1 },
            { name: 'Tracheal Wash', type: 'lab', price: 800, qty: 1 }
          ],
          labs: [
            { name: 'Thoracic X-Ray', code: 'XRY002', status: 'completed', result: 'Mild peribronchial pattern, no pneumonia' },
            { name: 'Tracheal Wash Culture', code: 'TWC001', status: 'completed', result: 'Bordetella bronchiseptica isolated' }
          ],
          prescriptions: [
            { name: 'Doxycycline 100mg', dosage: '1 tablet', frequency: 'Once daily', duration: '10 days', qty: 10, price: 40, dispensed: true },
            { name: 'Hydrocodone-Homatropine', dosage: '2.5ml', frequency: 'Every 8 hours', duration: '5 days', qty: 75, price: 55, dispensed: true }
          ],
          diagnosis: 'Kennel Cough (Bordetella)'
        },
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
            { name: 'Complete Blood Count', code: 'CBC004', status: 'completed', result: 'Normal' }
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
          daysAgo: 45,
          doctorId: '4',
          status: 'completed',
          chiefComplaint: 'Non-weight bearing lameness on left hind leg after playing fetch',
          vitals: { weightKg: 26.0, temperatureC: 38.5, heartRateBpm: 140, respiratoryRateRpm: 30, mmColor: 'Pink', crtSeconds: 1.5 },
          soap: {
            subjective: 'Rocky yelped while playing and has not put weight on left hind leg since.',
            objective: 'Left stifle swollen. Positive cranial drawer test. Pain on manipulation.',
            assessment: 'Cranial cruciate ligament (CCL) rupture, left stifle',
            plan: 'X-rays for surgical planning, TPLO surgery recommended, pain management'
          },
          services: [
            { name: 'Orthopedic Consultation', type: 'consultation', price: 700, qty: 1 },
            { name: 'X-Ray (Stifle)', type: 'diagnostic', price: 1800, qty: 1 },
            { name: 'Pre-Surgical Blood Panel', type: 'lab', price: 900, qty: 1 }
          ],
          labs: [
            { name: 'Pre-Surgical Panel', code: 'PSP001', status: 'completed', result: 'All values normal - cleared for surgery' },
            { name: 'Stifle X-Ray', code: 'XRY003', status: 'completed', result: 'CCL rupture confirmed, no concurrent meniscal tear' }
          ],
          prescriptions: [
            { name: 'Carprofen 75mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '7 days', qty: 14, price: 45, dispensed: true },
            { name: 'Tramadol 50mg', dosage: '1 tablet', frequency: 'Every 8 hours', duration: '7 days', qty: 21, price: 30, dispensed: true }
          ],
          diagnosis: 'CCL Rupture - Left Stifle'
        },
        {
          daysAgo: 30,
          doctorId: '4',
          status: 'completed',
          chiefComplaint: 'ACL repair surgery',
          vitals: { weightKg: 25.5, temperatureC: 38.3, heartRateBpm: 125, respiratoryRateRpm: 26, mmColor: 'Pink', crtSeconds: 1.5 },
          soap: {
            subjective: 'Rocky prepped for TPLO surgery. Fasting confirmed. Pre-op bloodwork normal.',
            objective: 'Patient under general anesthesia. Surgical site prepped. TPLO procedure completed successfully.',
            assessment: 'Post-TPLO, surgery uncomplicated, stable in recovery',
            plan: 'Post-op pain management, strict cage rest, antibiotics, recheck in 2 weeks'
          },
          services: [
            { name: 'Surgical Consultation', type: 'consultation', price: 500, qty: 1 },
            { name: 'TPLO Surgery', type: 'procedure', price: 15000, qty: 1 },
            { name: 'General Anesthesia', type: 'procedure', price: 3000, qty: 1 },
            { name: 'Post-Op Monitoring (4hr)', type: 'procedure', price: 800, qty: 1 },
            { name: 'Post-Op X-Ray', type: 'diagnostic', price: 1500, qty: 1 }
          ],
          labs: [
            { name: 'Post-Op X-Ray', code: 'XRY004', status: 'completed', result: 'TPLO plate and screws in good position, tibial plateau angle corrected' }
          ],
          prescriptions: [
            { name: 'Carprofen 75mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '14 days', qty: 28, price: 45, dispensed: true },
            { name: 'Tramadol 50mg', dosage: '1 tablet', frequency: 'Every 8 hours', duration: '14 days', qty: 42, price: 30, dispensed: true },
            { name: 'Amoxicillin-Clavulanate', dosage: '250mg', frequency: 'Twice daily', duration: '10 days', qty: 20, price: 35, dispensed: true }
          ],
          diagnosis: 'Post-TPLO Surgery, Stable'
        },
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
            { name: 'Post-Surgery X-Ray', code: 'XRY005', status: 'completed', result: 'Implant in good position, no complications' }
          ],
          prescriptions: [
            { name: 'Tramadol 50mg', dosage: '1 tablet', frequency: 'Every 8-12 hours as needed', duration: '14 days', qty: 42, price: 30, dispensed: true },
            { name: 'Carprofen 75mg', dosage: '1 tablet', frequency: 'Once daily', duration: '14 days', qty: 14, price: 45, dispensed: true }
          ],
          diagnosis: 'Post-ACL Repair (2 weeks), Healing Well'
        },
        {
          daysAgo: 1,
          doctorId: '4',
          status: 'in-progress',
          chiefComplaint: '4-week post-op recheck, physical therapy evaluation',
          vitals: { weightKg: 24.8, temperatureC: 38.4, heartRateBpm: 120, respiratoryRateRpm: 24, mmColor: 'Pink', crtSeconds: 1.5 },
          soap: {
            subjective: 'Rocky walking better on left leg but still favors it slightly. Owner has been doing passive range of motion exercises.',
            objective: 'Incision fully healed. Muscle atrophy still present but improving. Stifle range of motion 90% of normal. Good weight bearing.',
            assessment: 'Excellent post-op progress at 4 weeks',
            plan: 'Gradually increase exercise, begin hydrotherapy, recheck in 4 weeks, continue joint supplements'
          },
          services: [
            { name: 'Post-Surgical Consultation', type: 'consultation', price: 400, qty: 1 },
            { name: 'Physical Therapy Evaluation', type: 'procedure', price: 600, qty: 1 },
            { name: 'Joint Supplement', type: 'medication', price: 850, qty: 1 }
          ],
          prescriptions: [
            { name: 'Glucosamine Complex', dosage: '1 chewable', frequency: 'Once daily', duration: '90 days', qty: 90, price: 28, dispensed: true }
          ],
          diagnosis: 'Post-TPLO (4 weeks), Excellent Recovery'
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
      const encounterData: Record<string, any> = {
        appointmentId: '',
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

      // 1b. Create corresponding appointment
      const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
      const aptStatus = visit.status === 'in-progress' ? 'in-progress' : 'completed';
      const aptRef = await addDoc(collection(db, 'appointments'), {
        clientUid: pet.ownerUid,
        petId: pet.id,
        petName: pet.name,
        doctorId: visit.doctorId,
        doctorName: doctor.name || doctor.doctorName || '',
        date: dateStr,
        time: timeSlots[Math.floor(Math.random() * timeSlots.length)],
        status: aptStatus,
        notes: visit.chiefComplaint,
        services: visit.services.map(s => s.name),
        createdAt: visitDate,
        mode: 'scheduled',
      });

      // Link encounter back to the appointment
      await updateDoc(doc(db, 'encounters', encounterId), { appointmentId: aptRef.id });

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

      // 7. Create invoice (only for completed/visited encounters, not in-progress)
      let invoiceId = '';
      let billingStatus: string = 'unbilled';
      let grandTotal = 0;

      if (visit.status !== 'in-progress') {
        const taxAmount = subTotal * 0.12;
        grandTotal = subTotal + taxAmount;

        // Billing scenarios: paid, partial, unpaid
        let amountPaid = grandTotal;
        let balanceDue = 0;

        const petVisitIndex = (createdEncounters[scenario.petName] || []).length;
        const petName = scenario.petName;

        if (petName === 'Buddy' && petVisitIndex === 1) {
          billingStatus = 'partial';
          amountPaid = grandTotal * 0.4;
          balanceDue = grandTotal - amountPaid;
        } else if (petName === 'Whiskers' && petVisitIndex === 0) {
          billingStatus = 'partial';
          amountPaid = grandTotal * 0.5;
          balanceDue = grandTotal - amountPaid;
        } else if (petName === 'Charlie' && petVisitIndex === 0) {
          billingStatus = 'unpaid';
          amountPaid = 0;
          balanceDue = grandTotal;
        } else if (petName === 'Charlie' && petVisitIndex === 1) {
          billingStatus = 'partial';
          amountPaid = grandTotal * 0.3;
          balanceDue = grandTotal - amountPaid;
        } else if (petName === 'Rocky' && petVisitIndex === 0) {
          billingStatus = 'partial';
          amountPaid = grandTotal * 0.5;
          balanceDue = grandTotal - amountPaid;
        } else if (petName === 'Max' && petVisitIndex === 2) {
          billingStatus = 'partial';
          amountPaid = grandTotal * 0.6;
          balanceDue = grandTotal - amountPaid;
        } else if (petName === 'Luna' && petVisitIndex === 0) {
          billingStatus = 'unpaid';
          amountPaid = 0;
          balanceDue = grandTotal;
        } else {
          billingStatus = 'paid';
          amountPaid = grandTotal;
          balanceDue = 0;
        }

        const invoiceStatus = billingStatus === 'paid' ? 'paid' : billingStatus === 'partial' ? 'partially_paid' : 'active';
        const dueDate = new Date(visitDate);
        dueDate.setDate(dueDate.getDate() + 30);

        const invoiceRef = await addDoc(collection(db, 'invoices'), {
          encounterId,
          petId: pet.id,
          petName: pet.name,
          clientUid: pet.ownerUid,
          invoiceNo: `INV-${String(createdEncounters[scenario.petName].length + 1).padStart(3, '0')}-${pet.name.toUpperCase().slice(0, 3)}`,
          status: invoiceStatus,
          subTotal,
          taxAmount,
          discountTotal: 0,
          grandTotal,
          amountPaid: Math.round(amountPaid * 100) / 100,
          balanceDue: Math.round(balanceDue * 100) / 100,
          issueDate: visitDate,
          dueDate: dueDate,
          notes: visit.diagnosis || '',
          createdAt: visitDate,
          updatedAt: visitDate
        });

        invoiceId = invoiceRef.id;

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

        // 9. Create payment record(s)
        if (billingStatus === 'paid') {
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
        } else if (billingStatus === 'partial' && amountPaid > 0) {
          await addDoc(collection(db, 'payments'), {
            invoiceId,
            encounterId,
            petId: pet.id,
            amount: Math.round(amountPaid * 100) / 100,
            paymentMethod: Math.random() > 0.5 ? 'cash' : 'gcash',
            referenceNo: `PAY-${Date.now()}`,
            receivedBy: 'cashier',
            paidAt: visitDate,
            createdAt: visitDate
          });
        }
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
        grandTotal,
        billingStatus
      });

      console.log(`   Created encounter for ${pet.name}: ${dateStr} - ${visit.diagnosis || 'Consultation'} [${billingStatus === 'unbilled' ? 'NO INVOICE' : billingStatus.toUpperCase()}]`);
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
      uploadedAt: timestamp(firstEnc.date)
    });

    await addDoc(collection(db, 'attachments'), {
      encounterId: firstEnc.id,
      patientId: petsByName[petName].id,
      fileName: `${petName}_Lab_Results.pdf`,
      fileType: 'pdf',
      fileUrl: 'https://example.com/sample-lab-results.pdf',
      storagePath: `sample/${petName.toLowerCase()}/lab-results.pdf`,
      uploadedBy: 'seed-script',
      uploadedAt: timestamp(firstEnc.date)
    });

    console.log(`   Created attachments for ${petName}`);
  }

  console.log('\n🎉 End-to-end seed data complete!\n');
  console.log('📋 Summary:');
  for (const petName of Object.keys(createdEncounters)) {
    const visits = createdEncounters[petName];
    console.log(`   ${petName}: ${visits.length} visit(s)`);
    for (const v of visits) {
      const billingTag = v.billingStatus === 'paid' ? '✓ Paid' : v.billingStatus === 'partial' ? '◐ Partial' : '○ Unpaid';
      console.log(`     - ${v.date}: ${v.diagnosis} (${v.status}) - ₱${v.grandTotal.toFixed(2)} [${billingTag}]`);
    }
  }

  process.exit(0);
}

seedEndToEndData().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});

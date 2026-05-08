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

const billingScenarios: Record<string, Record<number, { status: 'paid' | 'partial' | 'unpaid'; paidPct?: number }>> = {
  Buddy: {
    180: { status: 'paid' },
    150: { status: 'paid' },
    120: { status: 'paid' },
    90: { status: 'paid' },
    60: { status: 'partial', paidPct: 0.4 },
    45: { status: 'paid' },
    30: { status: 'paid' },
    14: { status: 'paid' },
    7: { status: 'paid' },
    1: { status: 'partial', paidPct: 0.3 },
  },
  Whiskers: {
    160: { status: 'paid' },
    120: { status: 'paid' },
    90: { status: 'paid' },
    45: { status: 'partial', paidPct: 0.5 },
    30: { status: 'paid' },
    20: { status: 'paid' },
    5: { status: 'paid' },
  },
  Max: {
    180: { status: 'paid' },
    140: { status: 'paid' },
    90: { status: 'paid' },
    60: { status: 'paid' },
    40: { status: 'paid' },
    18: { status: 'paid' },
    2: { status: 'partial', paidPct: 0.6 },
  },
  Luna: {
    150: { status: 'unpaid' },
    120: { status: 'paid' },
    90: { status: 'paid' },
    70: { status: 'paid' },
    50: { status: 'unpaid' },
    30: { status: 'paid' },
    12: { status: 'paid' },
  },
  Charlie: {
    180: { status: 'paid' },
    140: { status: 'paid' },
    100: { status: 'paid' },
    80: { status: 'paid' },
    60: { status: 'partial', paidPct: 0.5 },
    40: { status: 'unpaid' },
    10: { status: 'partial', paidPct: 0.3 },
    3: { status: 'paid' },
  },
  Rocky: {
    150: { status: 'paid' },
    120: { status: 'paid' },
    90: { status: 'paid' },
    70: { status: 'partial', paidPct: 0.3 },
    55: { status: 'paid' },
    45: { status: 'partial', paidPct: 0.5 },
    30: { status: 'paid' },
    15: { status: 'paid' },
    1: { status: 'unpaid' },
  },
};

const visitScenarios: any[] = [
  {
    petName: 'Buddy',
    visits: [
      {
        daysAgo: 180, doctorId: '1', status: 'completed',
        chiefComplaint: 'New patient, initial health check',
        vitals: { weightKg: 28.0, temperatureC: 38.3, heartRateBpm: 100, respiratoryRateRpm: 20, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Owner just adopted Buddy, 2 years old. No known medical history.',
          objective: 'Healthy young male Golden Retriever. BCS 5/9. All vitals normal. Heart murmur grade I/VI detected.',
          assessment: 'Healthy overall, mild heart murmur warrants monitoring',
          plan: 'Start vaccination series, heart murmur recheck in 6 months'
        },
        services: [
          { name: 'New Patient Consultation', type: 'consultation', price: 600, qty: 1 },
          { name: 'DHPP Vaccine', type: 'vaccination', price: 400, qty: 1 },
          { name: 'Rabies Vaccine', type: 'vaccination', price: 250, qty: 1 },
          { name: 'Heartworm Test', type: 'lab', price: 500, qty: 1 }
        ],
        labs: [{ name: 'Heartworm Antigen Test', code: 'HW001', status: 'completed', result: 'Negative' }],
        prescriptions: [{ name: 'NexGard Chewables', dosage: '1 tablet', frequency: 'Once monthly', duration: 'Ongoing', qty: 6, price: 180, dispensed: true }],
        diagnosis: 'Healthy - New Patient, Heart Murmur Grade I/VI'
      },
      {
        daysAgo: 150, doctorId: '2', status: 'completed',
        chiefComplaint: 'Routine grooming and ear cleaning',
        vitals: { weightKg: 28.5, temperatureC: 38.4, heartRateBpm: 105, respiratoryRateRpm: 21, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Owner brought in for regular grooming session.',
          objective: 'Coat in good condition. Ears mildly waxy, cleaned. Nails trimmed.',
          assessment: 'Normal grooming visit',
          plan: 'Continue regular grooming every 6 weeks'
        },
        services: [
          { name: 'Full Grooming', type: 'grooming', price: 1200, qty: 1 },
          { name: 'Ear Cleaning', type: 'grooming', price: 200, qty: 1 },
          { name: 'Nail Trimming', type: 'grooming', price: 150, qty: 1 }
        ],
        diagnosis: 'Routine Grooming'
      },
      {
        daysAgo: 120, doctorId: '1', status: 'completed',
        chiefComplaint: 'Ear scratching and head shaking for 1 week',
        vitals: { weightKg: 29.2, temperatureC: 38.6, heartRateBpm: 110, respiratoryRateRpm: 22, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Buddy has been shaking his head and scratching ears. Owner noticed brown discharge.',
          objective: 'Both ear canals erythematous with moderate brown discharge. Cytology shows Malassezia yeast.',
          assessment: 'Bilateral otitis externa - yeast (Malassezia)',
          plan: 'Ear cleaning and topical antifungal, recheck in 2 weeks'
        },
        services: [
          { name: 'General Consultation', type: 'consultation', price: 500, qty: 1 },
          { name: 'Ear Cytology', type: 'lab', price: 300, qty: 1 },
          { name: 'Therapeutic Ear Cleaning', type: 'procedure', price: 350, qty: 1 }
        ],
        labs: [{ name: 'Ear Cytology', code: 'EAR001', status: 'completed', result: 'Malassezia pachydermatis confirmed, no bacteria' }],
        prescriptions: [{ name: 'Miconazole Ear Drops', dosage: '3 drops', frequency: 'Twice daily', duration: '14 days', qty: 1, price: 320, dispensed: true }],
        diagnosis: 'Bilateral Otitis Externa - Malassezia'
      },
      {
        daysAgo: 90, doctorId: '1', status: 'completed',
        chiefComplaint: 'Annual wellness check, routine bloodwork',
        vitals: { weightKg: 33.0, temperatureC: 38.5, heartRateBpm: 108, respiratoryRateRpm: 22, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Owner reports Buddy is healthy, eating well, normal activity level. Ear issue resolved.',
          objective: 'Physical exam unremarkable. BCS 6/9. Heart and lungs clear. Ears clean. Mild tartar buildup on lower incisors.',
          assessment: 'Healthy, overweight tendency noted. Dental prophylaxis recommended.',
          plan: 'Annual bloodwork, dental scaling recommended, weight monitoring'
        },
        services: [
          { name: 'Wellness Consultation', type: 'consultation', price: 500, qty: 1 },
          { name: 'Complete Blood Count', type: 'lab', price: 800, qty: 1 },
          { name: 'Chemistry Panel', type: 'lab', price: 1200, qty: 1 }
        ],
        labs: [
          { name: 'Complete Blood Count', code: 'CBC001', status: 'completed', result: 'All values within normal range' },
          { name: 'Serum Chemistry', code: 'CHE001', status: 'completed', result: 'ALT mildly elevated at 120 U/L, monitor' }
        ],
        diagnosis: 'Healthy - Annual Wellness, Mild ALT Elevation'
      },
      {
        daysAgo: 60, doctorId: '1', status: 'completed',
        chiefComplaint: 'Vomiting and diarrhea for 2 days',
        vitals: { weightKg: 32.8, temperatureC: 39.2, heartRateBpm: 130, respiratoryRateRpm: 30, mmColor: 'Pale Pink', crtSeconds: 2.0 },
        soap: {
          subjective: 'Owner reports Buddy vomited 4 times and had loose stool. Ate grass yesterday. No foreign body ingestion known.',
          objective: 'Mild dehydration (5%). Abdomen slightly tender on palpation. Temp elevated at 39.2C. Gut sounds hyperactive.',
          assessment: 'Acute gastroenteritis, likely dietary indiscretion',
          plan: 'SubQ fluids, anti-emetics, bland diet for 3 days, recheck if no improvement'
        },
        services: [
          { name: 'Emergency Consultation', type: 'consultation', price: 700, qty: 1 },
          { name: 'Subcutaneous Fluids', type: 'procedure', price: 650, qty: 1 },
          { name: 'Fecal Exam', type: 'lab', price: 350, qty: 1 }
        ],
        labs: [{ name: 'Fecal Floatation', code: 'FEC001', status: 'completed', result: 'No parasites detected, no blood' }],
        prescriptions: [
          { name: 'Metoclopramide 10mg', dosage: '1 tablet', frequency: 'Every 8 hours', duration: '3 days', qty: 9, price: 15, dispensed: true },
          { name: 'Metronidazole 250mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '5 days', qty: 10, price: 20, dispensed: true },
          { name: 'Probiotic Supplement', dosage: '1 packet', frequency: 'Once daily', duration: '10 days', qty: 10, price: 45, dispensed: true }
        ],
        diagnosis: 'Acute Gastroenteritis'
      },
      {
        daysAgo: 45, doctorId: '1', status: 'completed',
        chiefComplaint: 'Follow-up for gastroenteritis and ALT elevation',
        vitals: { weightKg: 32.5, temperatureC: 38.5, heartRateBpm: 105, respiratoryRateRpm: 22, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Buddy recovered well from gastroenteritis. No more vomiting. Stool normal for 2 weeks.',
          objective: 'Hydration normal. Abdomen non-painful. GI sounds normal.',
          assessment: 'Resolved gastroenteritis, stable ALT elevation',
          plan: 'Continue monitoring ALT at next checkup, no further GI medication needed'
        },
        services: [
          { name: 'Follow-up Consultation', type: 'consultation', price: 350, qty: 1 },
          { name: 'ALT Recheck', type: 'lab', price: 600, qty: 1 }
        ],
        labs: [{ name: 'ALT Recheck', code: 'ALT002', status: 'completed', result: 'ALT decreased to 95 U/L - trending toward normal' }],
        diagnosis: 'Gastroenteritis Resolved, ALT Improving'
      },
      {
        daysAgo: 30, doctorId: '1', status: 'completed',
        chiefComplaint: 'Limping on left hind leg, decreased activity level',
        vitals: { weightKg: 32.5, temperatureC: 38.6, heartRateBpm: 110, respiratoryRateRpm: 24, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Owner reports Buddy has been reluctant to jump into the car and stairs for the past 2 weeks. Appetite normal.',
          objective: 'Mild crepitus in left hip joint. Reduced range of motion on extension. X-rays show mild hip dysplasia with early DJD changes.',
          assessment: 'Mild hip dysplasia, early degenerative joint disease',
          plan: 'NSAID therapy, joint supplements, weight management, restricted exercise for 4 weeks'
        },
        services: [
          { name: 'Orthopedic Consultation', type: 'consultation', price: 600, qty: 1 },
          { name: 'X-Ray (Hip - 2 views)', type: 'diagnostic', price: 2500, qty: 1 },
          { name: 'Joint Supplement (1 month)', type: 'medication', price: 850, qty: 1 }
        ],
        labs: [{ name: 'Hip Dysplasia Panel', code: 'HIP001', status: 'completed', result: 'Mild bilateral hip dysplasia, OFA Grade 1' }],
        prescriptions: [
          { name: 'Carprofen 75mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '14 days', qty: 28, price: 45, dispensed: true },
          { name: 'Glucosamine Complex', dosage: '1 chewable', frequency: 'Once daily', duration: '90 days', qty: 90, price: 28, dispensed: true }
        ],
        diagnosis: 'Hip Dysplasia - Grade 1'
      },
      {
        daysAgo: 14, doctorId: '2', status: 'completed',
        chiefComplaint: 'Skin infection on lower abdomen',
        vitals: { weightKg: 32.0, temperatureC: 38.8, heartRateBpm: 115, respiratoryRateRpm: 24, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Owner noticed red bumps on Buddy belly. He has been licking the area frequently.',
          objective: 'Multiple erythematous papules on ventral abdomen. Superficial pyoderma with crusting. Cytology shows cocci bacteria.',
          assessment: 'Superficial pyoderma',
          plan: 'Antibiotics, medicated shampoo, recheck in 3 weeks'
        },
        services: [
          { name: 'Dermatology Consultation', type: 'consultation', price: 550, qty: 1 },
          { name: 'Skin Cytology', type: 'lab', price: 300, qty: 1 },
          { name: 'Medicated Shampoo', type: 'supply', price: 450, qty: 1 }
        ],
        labs: [{ name: 'Skin Cytology', code: 'SKN003', status: 'completed', result: 'Staphylococcus pseudintermedius confirmed' }],
        prescriptions: [
          { name: 'Cephalexin 500mg', dosage: '1 capsule', frequency: 'Twice daily', duration: '21 days', qty: 42, price: 25, dispensed: true },
          { name: 'Chlorhexidine Shampoo', dosage: 'Apply to affected areas', frequency: 'Twice weekly', duration: '4 weeks', qty: 1, price: 450, dispensed: true }
        ],
        diagnosis: 'Superficial Pyoderma'
      },
      {
        daysAgo: 7, doctorId: '1', status: 'completed',
        chiefComplaint: 'Follow-up on hip dysplasia, improvement in mobility',
        vitals: { weightKg: 31.8, temperatureC: 38.4, heartRateBpm: 105, respiratoryRateRpm: 22, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Owner reports significant improvement. Buddy is more active and can climb stairs with less difficulty. Skin bumps clearing up.',
          objective: 'Improved range of motion in left hip. Reduced pain on manipulation. Weight decreased by 0.7kg. Skin lesions improving.',
          assessment: 'Hip dysplasia responding well to conservative management. Pyoderma resolving.',
          plan: 'Continue NSAIDs and supplements. Skin infection - finish antibiotics. Recheck hip in 4 weeks.'
        },
        services: [
          { name: 'Follow-up Consultation', type: 'consultation', price: 350, qty: 1 },
          { name: 'Weight Assessment', type: 'consultation', price: 150, qty: 1 }
        ],
        prescriptions: [
          { name: 'Carprofen 75mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '30 days', qty: 60, price: 45, dispensed: true }
        ],
        diagnosis: 'Hip Dysplasia - Follow-up, Pyoderma Resolving'
      },
      {
        daysAgo: 1, doctorId: '1', status: 'in-progress',
        chiefComplaint: 'Hip dysplasia 4-week recheck, skin clear',
        vitals: { weightKg: 31.5, temperatureC: 38.4, heartRateBpm: 102, respiratoryRateRpm: 20, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Buddy doing well. Can jump into car now. Skin completely healed. Owner happy with progress.',
          objective: 'Hip ROM improved 30%. Weight loss of 1.5kg from initial. Skin clear. Heart murmur unchanged.',
          assessment: 'Hip dysplasia - excellent response. Weight management progressing well.',
          plan: 'Transition to as-needed NSAID, continue supplements, hydrotherapy twice weekly, recheck in 2 months'
        },
        services: [
          { name: 'Orthopedic Recheck', type: 'consultation', price: 400, qty: 1 },
          { name: 'Weight Assessment', type: 'consultation', price: 150, qty: 1 },
          { name: 'Hydrotherapy Session', type: 'procedure', price: 800, qty: 1 }
        ],
        prescriptions: [
          { name: 'Glucosamine Complex', dosage: '1 chewable', frequency: 'Once daily', duration: '180 days', qty: 180, price: 25, dispensed: true },
          { name: 'Carprofen 75mg', dosage: '1 tablet', frequency: 'As needed', duration: 'PRN', qty: 30, price: 45, dispensed: true }
        ],
        diagnosis: 'Hip Dysplasia - Excellent Response, Weight Management'
      }
    ]
  },
  {
    petName: 'Whiskers',
    visits: [
      {
        daysAgo: 160, doctorId: '3', status: 'completed',
        chiefComplaint: 'Annual checkup, indoor cat wellness exam',
        vitals: { weightKg: 4.0, temperatureC: 38.4, heartRateBpm: 185, respiratoryRateRpm: 26, mmColor: 'Pink', crtSeconds: 1.0 },
        soap: {
          subjective: 'Whiskers is 3 years old, indoor-only cat. Eating well, playful, no complaints.',
          objective: 'Physical exam normal. BCS 5/9. Coat glossy. Teeth clean. No abnormalities detected.',
          assessment: 'Healthy indoor cat, due for FVRCP booster',
          plan: 'FVRCP vaccine, FeLV/FIV test (annual), discuss indoor enrichment'
        },
        services: [
          { name: 'Wellness Consultation', type: 'consultation', price: 400, qty: 1 },
          { name: 'FVRCP Vaccine', type: 'vaccination', price: 350, qty: 1 },
          { name: 'FeLV/FIV Test', type: 'lab', price: 650, qty: 1 }
        ],
        labs: [{ name: 'FeLV/FIV Snap Test', code: 'FEL001', status: 'completed', result: 'Negative for both' }],
        diagnosis: 'Healthy - Annual Wellness'
      },
      {
        daysAgo: 120, doctorId: '3', status: 'completed',
        chiefComplaint: 'Hairballs and occasional vomiting',
        vitals: { weightKg: 4.1, temperatureC: 38.5, heartRateBpm: 190, respiratoryRateRpm: 28, mmColor: 'Pink', crtSeconds: 1.0 },
        soap: {
          subjective: 'Owner reports Whiskers has been vomiting hairballs 2-3x per week.',
          objective: 'Abdomen palpable, no masses. Coat shows signs of overgrooming.',
          assessment: 'Hairball syndrome, possible mild inflammatory bowel disease',
          plan: 'Hairball remedy, increase brushing frequency, monitor'
        },
        services: [
          { name: 'General Consultation', type: 'consultation', price: 500, qty: 1 },
          { name: 'Abdominal Palpation', type: 'consultation', price: 200, qty: 1 }
        ],
        prescriptions: [{ name: 'Laxatone Hairball Remedy', dosage: '1 inch', frequency: 'Twice weekly', duration: '30 days', qty: 1, price: 350, dispensed: true }],
        diagnosis: 'Hairball Syndrome'
      },
      {
        daysAgo: 90, doctorId: '3', status: 'completed',
        chiefComplaint: 'Overgrooming and skin irritation on flanks',
        vitals: { weightKg: 4.0, temperatureC: 38.6, heartRateBpm: 180, respiratoryRateRpm: 28, mmColor: 'Pink', crtSeconds: 1.0 },
        soap: {
          subjective: 'Whiskers has been licking belly and flanks excessively. Bald patches appearing.',
          objective: 'Bilateral flank alopecia, self-inflicted. Skin appears normal. No fleas found.',
          assessment: 'Feline psychogenic alopecia (stress-related)',
          plan: 'Feliway diffuser, reduce environmental stressors, consider fluoxetine if no improvement'
        },
        services: [
          { name: 'Behavioral Consultation', type: 'consultation', price: 550, qty: 1 },
          { name: 'Skin Scraping', type: 'lab', price: 250, qty: 1 }
        ],
        labs: [{ name: 'Skin Scraping', code: 'SKN004', status: 'completed', result: 'No mites, no fungi - consistent with self-trauma' }],
        prescriptions: [{ name: 'Feliway Classic Diffuser', dosage: '1 unit', frequency: 'Continuous', duration: '30 days', qty: 1, price: 950, dispensed: true }],
        diagnosis: 'Feline Psychogenic Alopecia'
      },
      {
        daysAgo: 45, doctorId: '3', status: 'completed',
        chiefComplaint: 'Not eating, hiding more than usual',
        vitals: { weightKg: 4.2, temperatureC: 39.0, heartRateBpm: 200, respiratoryRateRpm: 35, mmColor: 'Pale', crtSeconds: 2.0 },
        soap: {
          subjective: 'Owner reports Whiskers has been hiding under the bed and refusing food for 2 days. Drinking water normally.',
          objective: 'Temp elevated. Mild dehydration. Abdominal palpation reveals enlarged left kidney. Right kidney normal.',
          assessment: 'Possible upper urinary tract infection (pyelonephritis), early kidney disease suspected',
          plan: 'Urinalysis, blood panel, start antibiotics pending results, SubQ fluids'
        },
        services: [
          { name: 'General Consultation', type: 'consultation', price: 500, qty: 1 },
          { name: 'Urinalysis', type: 'lab', price: 450, qty: 1 },
          { name: 'Complete Blood Panel', type: 'lab', price: 1500, qty: 1 },
          { name: 'Subcutaneous Fluids', type: 'procedure', price: 600, qty: 1 }
        ],
        labs: [
          { name: 'Urinalysis', code: 'URIN001', status: 'completed', result: 'WBC 50/HPF, bacteria ++, specific gravity 1.025' },
          { name: 'CBC + Chemistry', code: 'CBC003', status: 'completed', result: 'WBC elevated, BUN 35, Creatinine 2.1' }
        ],
        prescriptions: [
          { name: 'Amoxicillin-Clavulanate', dosage: '62.5mg', frequency: 'Twice daily', duration: '14 days', qty: 28, price: 35, dispensed: true },
          { name: 'Fluid Therapy (SubQ)', dosage: '100ml', frequency: 'Once daily x 3 days', duration: '3 days', qty: 3, price: 200, dispensed: true }
        ],
        diagnosis: 'Pyelonephritis, Early CKD Stage 1'
      },
      {
        daysAgo: 30, doctorId: '3', status: 'completed',
        chiefComplaint: 'Pyelonephritis recheck, appetite improving',
        vitals: { weightKg: 4.1, temperatureC: 38.6, heartRateBpm: 185, respiratoryRateRpm: 28, mmColor: 'Pink', crtSeconds: 1.0 },
        soap: {
          subjective: 'Whiskers eating better, more active. Still hiding occasionally. Drinking normally.',
          objective: 'Kidney palpation less painful. Hydration improved.',
          assessment: 'Responding to antibiotics, early CKD monitoring continues',
          plan: 'Continue antibiotics, recheck urine culture in 2 weeks'
        },
        services: [
          { name: 'Follow-up Consultation', type: 'consultation', price: 350, qty: 1 },
          { name: 'Urine Culture', type: 'lab', price: 700, qty: 1 }
        ],
        labs: [{ name: 'Urine Culture & Sensitivity', code: 'UCS001', status: 'completed', result: 'E. coli, sensitive to amoxicillin-clavulanate' }],
        diagnosis: 'Pyelonephritis - Improving, E. coli confirmed'
      },
      {
        daysAgo: 20, doctorId: '3', status: 'completed',
        chiefComplaint: 'Bad breath, difficulty eating dry food, drooling',
        vitals: { weightKg: 4.5, temperatureC: 38.8, heartRateBpm: 180, respiratoryRateRpm: 30, mmColor: 'Pink', crtSeconds: 1.0 },
        soap: {
          subjective: 'Owner noticed bad breath for 2 weeks. Whiskers has been preferring wet food and dropping kibble.',
          objective: 'Severe tartar buildup on premolars and molars. Gingival inflammation and bleeding on probing. Grade 3 periodontal disease. Tooth resorption on right premolar.',
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
        daysAgo: 5, doctorId: '3', status: 'completed',
        chiefComplaint: 'CKD recheck, bloodwork follow-up',
        vitals: { weightKg: 4.3, temperatureC: 38.6, heartRateBpm: 175, respiratoryRateRpm: 28, mmColor: 'Pink', crtSeconds: 1.0 },
        soap: {
          subjective: 'Whiskers eating better, more active. Owner giving renal diet food as recommended.',
          objective: 'Weight stable at 4.3kg. Kidneys still mildly enlarged but less painful. Coat improved. Dental healing well.',
          assessment: 'Responding well to renal diet and supportive care. CKD Stage 1 stable.',
          plan: 'Continue renal diet, recheck bloodwork in 3 months, consider renal supplement'
        },
        services: [
          { name: 'Follow-up Consultation', type: 'consultation', price: 350, qty: 1 },
          { name: 'Kidney Panel', type: 'lab', price: 900, qty: 1 },
          { name: 'Renal Diet (1 month)', type: 'supply', price: 800, qty: 1 }
        ],
        labs: [{ name: 'SDMA + Creatinine', code: 'KID001', status: 'completed', result: 'BUN improved to 28, creatinine stable at 2.0, SDMA 16' }],
        prescriptions: [{ name: 'Renal Supplement (Epakitin)', dosage: '1 scoop', frequency: 'Twice daily', duration: '90 days', qty: 1, price: 650, dispensed: true }],
        diagnosis: 'CKD Stage 1 - Stable'
      }
    ]
  },
  {
    petName: 'Max',
    visits: [
      {
        daysAgo: 180, doctorId: '1', status: 'completed',
        chiefComplaint: 'First visit, new patient registration',
        vitals: { weightKg: 35.0, temperatureC: 38.3, heartRateBpm: 112, respiratoryRateRpm: 22, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Max is a 4-year-old German Shepherd. Recently adopted. No medical records available.',
          objective: 'Large breed male, well-built. BCS 5/9. Heart/lungs clear. No abnormalities.',
          assessment: 'Healthy, needs complete vaccination series',
          plan: 'DHPP, rabies, bordetella vaccines, bloodwork, microchip'
        },
        services: [
          { name: 'New Patient Consultation', type: 'consultation', price: 600, qty: 1 },
          { name: 'DHPP Vaccine', type: 'vaccination', price: 400, qty: 1 },
          { name: 'Rabies Vaccine', type: 'vaccination', price: 250, qty: 1 },
          { name: 'Bordetella Vaccine', type: 'vaccination', price: 300, qty: 1 },
          { name: 'Microchip Implantation', type: 'procedure', price: 500, qty: 1 }
        ],
        labs: [{ name: 'Heartworm/Lyme/Ehrlichia Snap', code: '4DX001', status: 'completed', result: 'All negative' }],
        prescriptions: [{ name: 'NexGard Spectra', dosage: '1 chewable', frequency: 'Once monthly', duration: 'Ongoing', qty: 6, price: 220, dispensed: true }],
        diagnosis: 'Healthy - New Patient, Vaccinations Complete'
      },
      {
        daysAgo: 140, doctorId: '2', status: 'completed',
        chiefComplaint: 'Routine grooming session',
        vitals: { weightKg: 34.8, temperatureC: 38.4, heartRateBpm: 108, respiratoryRateRpm: 20, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Regular grooming visit.',
          objective: 'Coat in good condition. Minor matting behind ears. Nails overgrown.',
          assessment: 'Normal grooming',
          plan: 'Regular grooming every 4 weeks'
        },
        services: [
          { name: 'Full Grooming', type: 'grooming', price: 1400, qty: 1 },
          { name: 'Nail Trimming', type: 'grooming', price: 150, qty: 1 }
        ],
        diagnosis: 'Routine Grooming'
      },
      {
        daysAgo: 90, doctorId: '1', status: 'completed',
        chiefComplaint: 'Loose stool and increased appetite for 1 week',
        vitals: { weightKg: 34.5, temperatureC: 38.5, heartRateBpm: 115, respiratoryRateRpm: 24, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Max has had soft stools but is eating everything in sight. No vomiting.',
          objective: 'Abdomen palpable, no masses. Mild weight gain. Gut sounds normal.',
          assessment: 'Mild dietary indiscretion, possible intestinal parasites',
          plan: 'Fecal exam, probiotics, deworming as precaution'
        },
        services: [
          { name: 'General Consultation', type: 'consultation', price: 500, qty: 1 },
          { name: 'Fecal Floatation', type: 'lab', price: 350, qty: 1 }
        ],
        labs: [{ name: 'Fecal Floatation', code: 'FEC002', status: 'completed', result: 'Mild roundworm eggs detected' }],
        prescriptions: [
          { name: 'Fenbendazole (Panacur)', dosage: '2ml', frequency: 'Once daily', duration: '5 days', qty: 5, price: 65, dispensed: true },
          { name: 'Probiotic Powder', dosage: '1 scoop', frequency: 'Once daily', duration: '14 days', qty: 14, price: 35, dispensed: true }
        ],
        diagnosis: 'Intestinal Roundworms'
      },
      {
        daysAgo: 60, doctorId: '1', status: 'completed',
        chiefComplaint: 'Routine vaccination due',
        vitals: { weightKg: 34.5, temperatureC: 38.4, heartRateBpm: 112, respiratoryRateRpm: 24, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Max is healthy, active, no complaints. Ready for annual vaccines.',
          objective: 'Physical exam normal. BCS 5/9. All vitals within normal limits. Weight stable.',
          assessment: 'Healthy, due for DHPP booster',
          plan: 'Administer DHPP booster, discuss flea/tick prevention'
        },
        services: [
          { name: 'Wellness Consultation', type: 'consultation', price: 400, qty: 1 },
          { name: 'DHPP Vaccine', type: 'vaccination', price: 400, qty: 1 },
          { name: 'Leptospirosis Vaccine', type: 'vaccination', price: 350, qty: 1 }
        ],
        diagnosis: 'Healthy - Annual Vaccination'
      },
      {
        daysAgo: 40, doctorId: '1', status: 'completed',
        chiefComplaint: 'Limping after running in the park',
        vitals: { weightKg: 34.2, temperatureC: 38.6, heartRateBpm: 118, respiratoryRateRpm: 26, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Max came home limping on right front leg after playing fetch. No known trauma.',
          objective: 'Mild swelling on right carpus. Pain on flexion. X-ray shows no fracture.',
          assessment: 'Right carpal sprain, soft tissue injury',
          plan: 'Rest for 7-10 days, NSAID, cold compress'
        },
        services: [
          { name: 'General Consultation', type: 'consultation', price: 500, qty: 1 },
          { name: 'X-Ray (Right Carpus)', type: 'diagnostic', price: 1500, qty: 1 }
        ],
        labs: [{ name: 'Right Carpus X-Ray', code: 'XRY006', status: 'completed', result: 'No fracture, mild soft tissue swelling' }],
        prescriptions: [{ name: 'Carprofen 100mg', dosage: '1 tablet', frequency: 'Once daily', duration: '7 days', qty: 7, price: 55, dispensed: true }],
        diagnosis: 'Right Carpal Sprain'
      },
      {
        daysAgo: 18, doctorId: '1', status: 'completed',
        chiefComplaint: 'Persistent scratching, red patches on skin, hair loss',
        vitals: { weightKg: 34.0, temperatureC: 38.7, heartRateBpm: 120, respiratoryRateRpm: 26, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Owner reports Max has been scratching constantly for 3 weeks. Started after spring began.',
          objective: 'Erythema and alopecia on ventral abdomen, medial thighs, and paws. Hot spots on lateral shoulders.',
          assessment: 'Atopic dermatitis (environmental allergies), secondary bacterial skin infection',
          plan: 'Allergy testing, Apoquel for itch relief, antibiotic course for hot spots'
        },
        services: [
          { name: 'Allergy Consultation', type: 'consultation', price: 600, qty: 1 },
          { name: 'Allergy Test Panel', type: 'lab', price: 2500, qty: 1 },
          { name: 'Skin Cytology', type: 'lab', price: 400, qty: 1 },
          { name: 'Medicated Shampoo', type: 'supply', price: 450, qty: 1 }
        ],
        labs: [
          { name: 'Allergy Test Panel', code: 'ALG001', status: 'completed', result: 'Positive for: dust mites, grass pollen, mold spores' },
          { name: 'Skin Cytology', code: 'SKN001', status: 'completed', result: 'Cocci bacteria present' }
        ],
        prescriptions: [
          { name: 'Apoquel 16mg', dosage: '1 tablet', frequency: 'Once daily for 14 days, then every other day', duration: '30 days', qty: 30, price: 95, dispensed: true },
          { name: 'Cephalexin 500mg', dosage: '1 capsule', frequency: 'Twice daily', duration: '14 days', qty: 28, price: 25, dispensed: true },
          { name: 'Chlorhexidine Shampoo', dosage: 'Apply to affected areas', frequency: 'Twice weekly', duration: '4 weeks', qty: 1, price: 450, dispensed: true }
        ],
        diagnosis: 'Atopic Dermatitis, Pyoderma (Secondary)'
      },
      {
        daysAgo: 2, doctorId: '1', status: 'completed',
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
        labs: [{ name: 'Skin Scraping', code: 'SKN002', status: 'completed', result: 'No mites detected, minimal bacteria' }],
        diagnosis: 'Atopic Dermatitis - Improving'
      }
    ]
  },
  {
    petName: 'Luna',
    visits: [
      {
        daysAgo: 150, doctorId: '3', status: 'completed',
        chiefComplaint: 'Kitten vaccination series, first visit',
        vitals: { weightKg: 2.5, temperatureC: 38.6, heartRateBpm: 210, respiratoryRateRpm: 30, mmColor: 'Pink', crtSeconds: 1.0 },
        soap: {
          subjective: 'Luna is a 6-month-old kitten. Recently adopted from shelter. No known medical history.',
          objective: 'Small female domestic shorthair. BCS 5/9. Mild upper respiratory symptoms.',
          assessment: 'Healthy kitten, mild URI symptoms',
          plan: 'First FVRCP vaccine, deworming, flea treatment'
        },
        services: [
          { name: 'Kitten Consultation', type: 'consultation', price: 450, qty: 1 },
          { name: 'FVRCP Vaccine (1st)', type: 'vaccination', price: 350, qty: 1 },
          { name: 'Deworming', type: 'medication', price: 200, qty: 1 }
        ],
        prescriptions: [{ name: 'Fenbendazole', dosage: '1ml', frequency: 'Once daily', duration: '3 days', qty: 3, price: 55, dispensed: true }],
        diagnosis: 'Healthy Kitten - First Vaccination'
      },
      {
        daysAgo: 120, doctorId: '3', status: 'completed',
        chiefComplaint: 'FVRCP booster, spay consultation',
        vitals: { weightKg: 2.8, temperatureC: 38.5, heartRateBpm: 200, respiratoryRateRpm: 28, mmColor: 'Pink', crtSeconds: 1.0 },
        soap: {
          subjective: 'Luna doing well, playful, eating normally. Owner wants to discuss spaying.',
          objective: 'Growing well. Coat healthy. All vitals normal.',
          assessment: 'Healthy, ready for FVRCP booster and spay surgery',
          plan: 'FVRCP booster, schedule spay for next month'
        },
        services: [
          { name: 'Wellness Consultation', type: 'consultation', price: 400, qty: 1 },
          { name: 'FVRCP Vaccine (2nd)', type: 'vaccination', price: 350, qty: 1 }
        ],
        diagnosis: 'Healthy - Vaccination Booster'
      },
      {
        daysAgo: 90, doctorId: '3', status: 'completed',
        chiefComplaint: 'Spay surgery (ovariohysterectomy)',
        vitals: { weightKg: 3.0, temperatureC: 38.4, heartRateBpm: 195, respiratoryRateRpm: 26, mmColor: 'Pink', crtSeconds: 1.0 },
        soap: {
          subjective: 'Luna prepped for routine spay. Fasting confirmed.',
          objective: 'Pre-anesthetic bloodwork normal. Surgery completed successfully. Recovery smooth.',
          assessment: 'Post-spay, stable',
          plan: 'Post-op care, e-collar for 7 days, pain management'
        },
        services: [
          { name: 'Pre-Surgical Exam', type: 'consultation', price: 350, qty: 1 },
          { name: 'Spay Surgery', type: 'procedure', price: 4500, qty: 1 },
          { name: 'General Anesthesia', type: 'procedure', price: 2000, qty: 1 },
          { name: 'Post-Op Monitoring', type: 'procedure', price: 500, qty: 1 }
        ],
        labs: [{ name: 'Pre-Anesthetic Panel', code: 'PAB002', status: 'completed', result: 'All values normal - cleared for surgery' }],
        prescriptions: [{ name: 'Meloxicam Oral Suspension', dosage: '0.05ml', frequency: 'Once daily', duration: '3 days', qty: 3, price: 85, dispensed: true }],
        diagnosis: 'Post-Ovariohysterectomy, Stable'
      },
      {
        daysAgo: 70, doctorId: '3', status: 'completed',
        chiefComplaint: 'Post-spay recheck, incision healing well',
        vitals: { weightKg: 3.1, temperatureC: 38.5, heartRateBpm: 190, respiratoryRateRpm: 26, mmColor: 'Pink', crtSeconds: 1.0 },
        soap: {
          subjective: 'Luna recovering well. Eating normally. Very playful.',
          objective: 'Incision well-healed. No swelling or discharge. Sutures intact.',
          assessment: 'Post-spay healing excellently',
          plan: 'Remove e-collar, resume normal activity'
        },
        services: [{ name: 'Post-Surgical Recheck', type: 'consultation', price: 250, qty: 1 }],
        diagnosis: 'Post-Spay Recheck - Excellent Healing'
      },
      {
        daysAgo: 50, doctorId: '3', status: 'completed',
        chiefComplaint: 'Urinating outside litter box, straining to urinate',
        vitals: { weightKg: 3.6, temperatureC: 38.7, heartRateBpm: 195, respiratoryRateRpm: 32, mmColor: 'Pink', crtSeconds: 1.0 },
        soap: {
          subjective: 'Luna has been urinating on the bathroom rug. Owner noticed she strains and produces only small amounts.',
          objective: 'Bladder palpable but small. No crystals on urine dipstick. Mild discomfort on abdominal palpation.',
          assessment: 'Feline idiopathic cystitis (FIC), stress-related',
          plan: 'Anti-inflammatory, stress reduction, increased water intake'
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
        daysAgo: 30, doctorId: '3', status: 'completed',
        chiefComplaint: 'FIC follow-up, normal urination resumed',
        vitals: { weightKg: 3.7, temperatureC: 38.5, heartRateBpm: 185, respiratoryRateRpm: 26, mmColor: 'Pink', crtSeconds: 1.0 },
        soap: {
          subjective: 'Luna using litter box normally. No straining. Drinking more water with fountain.',
          objective: 'Bladder non-painful. Hydration good.',
          assessment: 'FIC resolved',
          plan: 'Continue water fountain, Feliway, recheck if symptoms return'
        },
        services: [
          { name: 'Follow-up Consultation', type: 'consultation', price: 300, qty: 1 },
          { name: 'Urinalysis (Recheck)', type: 'lab', price: 350, qty: 1 }
        ],
        labs: [{ name: 'Urinalysis', code: 'URIN003', status: 'completed', result: 'Normal - no RBC, WBC, or crystals' }],
        diagnosis: 'Feline Idiopathic Cystitis - Resolved'
      },
      {
        daysAgo: 12, doctorId: '3', status: 'completed',
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
          { name: 'FVRCP Vaccine (Annual)', type: 'vaccination', price: 350, qty: 1 },
          { name: 'FeLV/FIV Test', type: 'lab', price: 650, qty: 1 }
        ],
        labs: [{ name: 'FeLV/FIV Snap Test', code: 'FEL002', status: 'completed', result: 'Negative for both FeLV and FIV' }],
        diagnosis: 'Healthy - Annual Wellness'
      }
    ]
  },
  {
    petName: 'Charlie',
    visits: [
      {
        daysAgo: 180, doctorId: '3', status: 'completed',
        chiefComplaint: 'New patient, initial health check',
        vitals: { weightKg: 28.0, temperatureC: 38.5, heartRateBpm: 120, respiratoryRateRpm: 24, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Charlie is a 5-year-old Labrador. Recently moved to the area.',
          objective: 'Overweight BCS 7/9. Coat fair. Teeth moderate tartar. Heart/lungs clear.',
          assessment: 'Overweight, dental prophylaxis recommended',
          plan: 'Bloodwork, weight management program, dental cleaning'
        },
        services: [
          { name: 'New Patient Consultation', type: 'consultation', price: 600, qty: 1 },
          { name: 'Complete Blood Panel', type: 'lab', price: 1500, qty: 1 },
          { name: 'Heartworm Test', type: 'lab', price: 500, qty: 1 }
        ],
        labs: [
          { name: 'CBC + Chemistry', code: 'CBC005', status: 'completed', result: 'All normal, cholesterol mildly elevated' },
          { name: 'Heartworm Test', code: 'HW002', status: 'completed', result: 'Negative' }
        ],
        prescriptions: [{ name: 'Heartgard Plus', dosage: '1 chewable', frequency: 'Once monthly', duration: 'Ongoing', qty: 6, price: 150, dispensed: true }],
        diagnosis: 'Healthy - New Patient, Overweight'
      },
      {
        daysAgo: 140, doctorId: '2', status: 'completed',
        chiefComplaint: 'Dental cleaning and scaling',
        vitals: { weightKg: 28.2, temperatureC: 38.5, heartRateBpm: 118, respiratoryRateRpm: 22, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Charlie scheduled for dental cleaning. Fasting confirmed.',
          objective: 'Moderate to severe tartar on all teeth. 2 teeth require extraction.',
          assessment: 'Periodontal disease Grade 2',
          plan: 'Dental cleaning under anesthesia, extract 2 premolars'
        },
        services: [
          { name: 'Dental Cleaning', type: 'procedure', price: 3000, qty: 1 },
          { name: 'Tooth Extraction (2)', type: 'procedure', price: 2500, qty: 2 },
          { name: 'Dental X-Ray', type: 'diagnostic', price: 1000, qty: 1 },
          { name: 'General Anesthesia', type: 'procedure', price: 2000, qty: 1 }
        ],
        labs: [{ name: 'Pre-Anesthetic Panel', code: 'PAB003', status: 'completed', result: 'Cleared for anesthesia' }],
        prescriptions: [
          { name: 'Clindamycin', dosage: '1 capsule', frequency: 'Twice daily', duration: '7 days', qty: 14, price: 40, dispensed: true },
          { name: 'Meloxicam', dosage: '1 tablet', frequency: 'Once daily', duration: '3 days', qty: 3, price: 35, dispensed: true }
        ],
        diagnosis: 'Periodontal Disease Grade 2, Post-Dental'
      },
      {
        daysAgo: 100, doctorId: '3', status: 'completed',
        chiefComplaint: 'Eye discharge and redness in left eye',
        vitals: { weightKg: 28.5, temperatureC: 38.6, heartRateBpm: 122, respiratoryRateRpm: 24, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Charlie has had watery discharge from left eye for 3 days. Squinting occasionally.',
          objective: 'Left eye conjunctival hyperemia. Fluorescein stain negative (no ulcer). Clear mucoid discharge.',
          assessment: 'Conjunctivitis, left eye',
          plan: 'Topical antibiotic ophthalmic drops, recheck in 5 days'
        },
        services: [
          { name: 'Ophthalmic Consultation', type: 'consultation', price: 550, qty: 1 },
          { name: 'Fluorescein Stain Test', type: 'lab', price: 200, qty: 1 }
        ],
        prescriptions: [{ name: 'Terramycin Ophthalmic Ointment', dosage: 'Apply thin strip', frequency: '4 times daily', duration: '7 days', qty: 1, price: 280, dispensed: true }],
        diagnosis: 'Conjunctivitis - Left Eye'
      },
      {
        daysAgo: 80, doctorId: '2', status: 'completed',
        chiefComplaint: 'Hot spot on right hip after swimming',
        vitals: { weightKg: 29.0, temperatureC: 38.5, heartRateBpm: 115, respiratoryRateRpm: 22, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Charlie developed a wet, itchy patch on his hip after swimming at the lake.',
          objective: '2x3cm moist, erythematous lesion on right hip. Hair matted with exudate.',
          assessment: 'Acute moist dermatitis (hot spot)',
          plan: 'Clip and clean area, topical antibiotic/steroid, e-collar'
        },
        services: [
          { name: 'General Consultation', type: 'consultation', price: 500, qty: 1 },
          { name: 'Wound Cleaning & Clipping', type: 'procedure', price: 300, qty: 1 }
        ],
        prescriptions: [
          { name: 'Gentamicin-Betamethasone Spray', dosage: 'Spray to affected area', frequency: 'Twice daily', duration: '7 days', qty: 1, price: 380, dispensed: true },
          { name: 'E-Collar (Medium)', dosage: '1 unit', frequency: 'Continuous', duration: '7 days', qty: 1, price: 250, dispensed: true }
        ],
        diagnosis: 'Acute Moist Dermatitis (Hot Spot)'
      },
      {
        daysAgo: 60, doctorId: '3', status: 'completed',
        chiefComplaint: 'Ear infection, head shaking and odor',
        vitals: { weightKg: 29.5, temperatureC: 38.6, heartRateBpm: 118, respiratoryRateRpm: 24, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Charlie has been shaking his head and there is a foul odor from his ears.',
          objective: 'Both ears with dark discharge. Cytology shows mixed bacterial and yeast infection.',
          assessment: 'Bilateral otitis externa - mixed infection',
          plan: 'Ear cleaning, topical antibiotic/antifungal combination'
        },
        services: [
          { name: 'General Consultation', type: 'consultation', price: 500, qty: 1 },
          { name: 'Ear Cytology (Bilateral)', type: 'lab', price: 500, qty: 1 },
          { name: 'Therapeutic Ear Cleaning', type: 'procedure', price: 350, qty: 1 }
        ],
        labs: [{ name: 'Ear Cytology', code: 'EAR002', status: 'completed', result: 'Mixed bacteria (cocci + rods) and Malassezia' }],
        prescriptions: [{ name: 'Posatex Otic Suspension', dosage: '4 drops', frequency: 'Once daily', duration: '7 days', qty: 1, price: 520, dispensed: true }],
        diagnosis: 'Bilateral Otitis Externa - Mixed Infection'
      },
      {
        daysAgo: 40, doctorId: '3', status: 'completed',
        chiefComplaint: 'Coughing, especially at night',
        vitals: { weightKg: 32.0, temperatureC: 39.1, heartRateBpm: 140, respiratoryRateRpm: 36, mmColor: 'Pale Pink', crtSeconds: 2.0 },
        soap: {
          subjective: 'Charlie has been coughing for 5 days, worse at night. Sounds like honking goose.',
          objective: 'Tracheal sensitivity on palpation triggers cough. Lungs clear. Mild tonsillitis.',
          assessment: 'Kennel cough (tracheobronchitis), likely Bordetella',
          plan: 'Antibiotics, cough suppressant, rest for 7-10 days'
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
        daysAgo: 10, doctorId: '3', status: 'completed',
        chiefComplaint: 'Weight gain, decreased energy, owner concerned about obesity',
        vitals: { weightKg: 33.5, temperatureC: 38.6, heartRateBpm: 115, respiratoryRateRpm: 24, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Charlie has gained 3kg over the past 6 months. Owner admits to increased treats and table scraps.',
          objective: 'BCS 8/9 (obese). Prominent fat pads on abdomen, flanks, and neck. Difficulty palpating ribs.',
          assessment: 'Obesity (BCS 8/9), hypothyroidism ruled out by blood work',
          plan: 'Prescription weight management diet, controlled portions, daily exercise program'
        },
        services: [
          { name: 'Nutrition Consultation', type: 'consultation', price: 500, qty: 1 },
          { name: 'Thyroid Panel', type: 'lab', price: 1100, qty: 1 },
          { name: 'Weight Management Diet (1 month)', type: 'supply', price: 1200, qty: 1 }
        ],
        labs: [
          { name: 'Thyroid Function Test', code: 'THR001', status: 'completed', result: 'T4 within normal range' },
          { name: 'Complete Blood Count', code: 'CBC004', status: 'completed', result: 'Normal' }
        ],
        prescriptions: [{ name: "Hill's Metabolic Diet", dosage: '2 cups/day (measured)', frequency: 'Split into 2 meals', duration: 'Ongoing', qty: 1, price: 1200, dispensed: true }],
        diagnosis: 'Obesity (BCS 8/9), Weight Management Program'
      },
      {
        daysAgo: 3, doctorId: '3', status: 'completed',
        chiefComplaint: 'Obesity follow-up, minimal weight loss',
        vitals: { weightKg: 33.2, temperatureC: 38.5, heartRateBpm: 112, respiratoryRateRpm: 22, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Owner has been trying to follow diet but Charlie is begging constantly. Only lost 0.3kg.',
          objective: 'Weight 33.2kg (down 0.3kg). BCS still 8/9. Owner needs more support with portion control.',
          assessment: 'Obesity - minimal progress, needs stricter diet enforcement',
          plan: 'Reduce portions further, eliminate all treats, increase walking to 30 min daily'
        },
        services: [
          { name: 'Follow-up Consultation', type: 'consultation', price: 350, qty: 1 },
          { name: 'Weight Assessment', type: 'consultation', price: 150, qty: 1 }
        ],
        diagnosis: 'Obesity - Recheck, Slow Progress'
      }
    ]
  },
  {
    petName: 'Rocky',
    visits: [
      {
        daysAgo: 150, doctorId: '4', status: 'completed',
        chiefComplaint: 'New patient, pre-adoption health screening',
        vitals: { weightKg: 22.0, temperatureC: 38.3, heartRateBpm: 125, respiratoryRateRpm: 24, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Rocky is a 2-year-old Pit Bull mix. Being considered for adoption from rescue.',
          objective: 'Healthy young male. BCS 5/9. Heart/lungs clear. Minor skin scarring on right shoulder.',
          assessment: 'Healthy overall, old scar tissue on shoulder',
          plan: 'Vaccinations, heartworm test, microchip, deworming'
        },
        services: [
          { name: 'Pre-Adoption Exam', type: 'consultation', price: 500, qty: 1 },
          { name: 'DHPP Vaccine', type: 'vaccination', price: 400, qty: 1 },
          { name: 'Rabies Vaccine', type: 'vaccination', price: 250, qty: 1 },
          { name: 'Heartworm Test', type: 'lab', price: 500, qty: 1 },
          { name: 'Microchip Implantation', type: 'procedure', price: 500, qty: 1 }
        ],
        labs: [{ name: 'Heartworm + 4DX', code: 'HW003', status: 'completed', result: 'All negative' }],
        prescriptions: [{ name: 'NexGard Chewables', dosage: '1 tablet', frequency: 'Once monthly', duration: 'Ongoing', qty: 6, price: 180, dispensed: true }],
        diagnosis: 'Healthy - Pre-Adoption Screening'
      },
      {
        daysAgo: 120, doctorId: '4', status: 'completed',
        chiefComplaint: 'Minor bite wound from dog park altercation',
        vitals: { weightKg: 23.0, temperatureC: 38.8, heartRateBpm: 135, respiratoryRateRpm: 28, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Rocky got into a fight at the dog park. Owner noticed a puncture wound on left shoulder.',
          objective: '2cm puncture wound on left shoulder. Surrounding tissue swollen. No active bleeding.',
          assessment: 'Bite wound - left shoulder, risk of abscess',
          plan: 'Clean and flush wound, antibiotics, e-collar'
        },
        services: [
          { name: 'Emergency Consultation', type: 'consultation', price: 700, qty: 1 },
          { name: 'Wound Flushing & Cleaning', type: 'procedure', price: 500, qty: 1 }
        ],
        prescriptions: [
          { name: 'Amoxicillin-Clavulanate', dosage: '250mg', frequency: 'Twice daily', duration: '10 days', qty: 20, price: 35, dispensed: true },
          { name: 'Meloxicam', dosage: '1 tablet', frequency: 'Once daily', duration: '5 days', qty: 5, price: 35, dispensed: true }
        ],
        diagnosis: 'Bite Wound - Left Shoulder'
      },
      {
        daysAgo: 90, doctorId: '2', status: 'completed',
        chiefComplaint: 'Routine grooming',
        vitals: { weightKg: 23.5, temperatureC: 38.4, heartRateBpm: 120, respiratoryRateRpm: 22, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Regular grooming visit. Bite wound healed well.',
          objective: 'Coat in good condition. Bite scar well-healed. Nails trimmed.',
          assessment: 'Normal grooming',
          plan: 'Regular grooming every 6 weeks'
        },
        services: [
          { name: 'Bath & Brush', type: 'grooming', price: 800, qty: 1 },
          { name: 'Nail Trimming', type: 'grooming', price: 150, qty: 1 }
        ],
        diagnosis: 'Routine Grooming'
      },
      {
        daysAgo: 70, doctorId: '4', status: 'completed',
        chiefComplaint: 'Diarrhea and lethargy for 2 days',
        vitals: { weightKg: 24.0, temperatureC: 39.3, heartRateBpm: 145, respiratoryRateRpm: 32, mmColor: 'Pale Pink', crtSeconds: 2.5 },
        soap: {
          subjective: 'Rocky has had bloody diarrhea for 2 days. Very lethargic, not eating.',
          objective: 'Dehydrated (7%). Temp elevated. Abdomen painful on palpation. Rectal exam shows fresh blood.',
          assessment: 'Hemorrhagic gastroenteritis (HGE), possible parvovirus',
          plan: 'Hospitalize for IV fluids, parvo snap test, broad-spectrum antibiotics'
        },
        services: [
          { name: 'Emergency Consultation', type: 'consultation', price: 800, qty: 1 },
          { name: 'IV Fluid Therapy (4hr)', type: 'procedure', price: 1500, qty: 1 },
          { name: 'Parvo SNAP Test', type: 'lab', price: 600, qty: 1 },
          { name: 'CBC + Chemistry', type: 'lab', price: 1500, qty: 1 }
        ],
        labs: [
          { name: 'Canine Parvovirus SNAP', code: 'PV001', status: 'completed', result: 'Negative' },
          { name: 'CBC + Chemistry', code: 'CBC006', status: 'completed', result: 'Hematocrit 55% (hemoconcentrated), WBC normal' }
        ],
        prescriptions: [
          { name: 'Metronidazole 250mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '7 days', qty: 14, price: 20, dispensed: true },
          { name: 'Maropitant (Cerenia)', dosage: '1 tablet', frequency: 'Once daily', duration: '3 days', qty: 3, price: 120, dispensed: true }
        ],
        diagnosis: 'Hemorrhagic Gastroenteritis (HGE)'
      },
      {
        daysAgo: 55, doctorId: '4', status: 'completed',
        chiefComplaint: 'HGE follow-up, fully recovered',
        vitals: { weightKg: 24.5, temperatureC: 38.4, heartRateBpm: 120, respiratoryRateRpm: 22, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Rocky fully recovered. Eating normally, stool normal, energy back to normal.',
          objective: 'Hydration normal. Abdomen non-painful. Weight stable.',
          assessment: 'HGE resolved, fully recovered',
          plan: 'No further medication needed, continue regular diet'
        },
        services: [{ name: 'Follow-up Consultation', type: 'consultation', price: 350, qty: 1 }],
        diagnosis: 'HGE - Resolved'
      },
      {
        daysAgo: 45, doctorId: '4', status: 'completed',
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
        daysAgo: 30, doctorId: '4', status: 'completed',
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
        labs: [{ name: 'Post-Op X-Ray', code: 'XRY004', status: 'completed', result: 'TPLO plate and screws in good position' }],
        prescriptions: [
          { name: 'Carprofen 75mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '14 days', qty: 28, price: 45, dispensed: true },
          { name: 'Tramadol 50mg', dosage: '1 tablet', frequency: 'Every 8 hours', duration: '14 days', qty: 42, price: 30, dispensed: true },
          { name: 'Amoxicillin-Clavulanate', dosage: '250mg', frequency: 'Twice daily', duration: '10 days', qty: 20, price: 35, dispensed: true }
        ],
        diagnosis: 'Post-TPLO Surgery, Stable'
      },
      {
        daysAgo: 15, doctorId: '4', status: 'completed',
        chiefComplaint: 'Post-surgery checkup after ACL repair',
        vitals: { weightKg: 25.2, temperatureC: 38.5, heartRateBpm: 130, respiratoryRateRpm: 28, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Owner reports Rocky is bearing some weight on left hind leg. Incision looks clean.',
          objective: 'Incision well-healed, no discharge or dehiscence. Mild muscle atrophy in left thigh. Good stifle stability.',
          assessment: 'Post-ACL repair healing well, 2 weeks post-op',
          plan: 'Continue restricted activity, start passive range of motion exercises, recheck in 2 weeks'
        },
        services: [
          { name: 'Post-Surgical Consultation', type: 'consultation', price: 400, qty: 1 },
          { name: 'X-Ray (Stifle)', type: 'diagnostic', price: 1800, qty: 1 }
        ],
        labs: [{ name: 'Post-Surgery X-Ray', code: 'XRY005', status: 'completed', result: 'Implant in good position, no complications' }],
        prescriptions: [
          { name: 'Tramadol 50mg', dosage: '1 tablet', frequency: 'Every 8-12 hours as needed', duration: '14 days', qty: 42, price: 30, dispensed: true },
          { name: 'Carprofen 75mg', dosage: '1 tablet', frequency: 'Once daily', duration: '14 days', qty: 14, price: 45, dispensed: true }
        ],
        diagnosis: 'Post-ACL Repair (2 weeks), Healing Well'
      },
      {
        daysAgo: 1, doctorId: '4', status: 'in-progress',
        chiefComplaint: '4-week post-op recheck, physical therapy evaluation',
        vitals: { weightKg: 24.8, temperatureC: 38.4, heartRateBpm: 120, respiratoryRateRpm: 24, mmColor: 'Pink', crtSeconds: 1.5 },
        soap: {
          subjective: 'Rocky walking better on left leg but still favors it slightly. Owner has been doing passive ROM exercises.',
          objective: 'Incision fully healed. Muscle atrophy still present but improving. Stifle ROM 90% of normal. Good weight bearing.',
          assessment: 'Excellent post-op progress at 4 weeks',
          plan: 'Gradually increase exercise, begin hydrotherapy, recheck in 4 weeks, continue joint supplements'
        },
        services: [
          { name: 'Post-Surgical Consultation', type: 'consultation', price: 400, qty: 1 },
          { name: 'Physical Therapy Evaluation', type: 'procedure', price: 600, qty: 1 },
          { name: 'Hydrotherapy Session', type: 'procedure', price: 800, qty: 1 },
          { name: 'Joint Supplement', type: 'medication', price: 850, qty: 1 }
        ],
        prescriptions: [{ name: 'Glucosamine Complex', dosage: '1 chewable', frequency: 'Once daily', duration: '90 days', qty: 90, price: 28, dispensed: true }],
        diagnosis: 'Post-TPLO (4 weeks), Excellent Recovery'
      }
    ]
  }
];

async function seedEndToEndData() {
  console.log('Starting expanded seed data...\n');
  await signIn();

  console.log('Clearing EMR collections...');
  for (const col of ['encounters', 'triage_vitals', 'clinical_notes', 'appointment_services', 'lab_orders', 'prescriptions', 'dispensing_records', 'invoices', 'invoice_items', 'payments', 'attachments', 'audit_logs']) {
    await clearCollection(col);
  }
  console.log('');

  const petsSnap = await getDocs(collection(db, 'pets'));
  const petsByName: Record<string, any> = {};
  petsSnap.forEach(d => { const p = { id: d.id, ...d.data() } as any; petsByName[p.name] = p; });

  const doctorsSnap = await getDocs(collection(db, 'doctors'));
  const doctors: any[] = [];
  doctorsSnap.forEach(d => { doctors.push({ id: d.id, ...d.data() }); });

  console.log(`Found ${Object.keys(petsByName).length} pets, ${doctors.length} doctors\n`);

  const createdEncounters: Record<string, any[]> = {};

  for (const scenario of visitScenarios) {
    const pet = petsByName[scenario.petName];
    if (!pet) { console.log(`Skipping ${scenario.petName} - not found`); continue; }
    createdEncounters[scenario.petName] = [];
    const petBilling = billingScenarios[scenario.petName] || {};

    let visitIndex = 0;
    for (const visit of scenario.visits) {
      const doctor = doctors.find(d => d.id === visit.doctorId);
      if (!doctor) continue;

      const dateStr = daysAgo(visit.daysAgo);
      const visitDate = timestamp(dateStr);

      // 1. Create encounter
      const encounterData = {
        petId: pet.id, petName: pet.name, clientUid: pet.ownerUid,
        doctorId: visit.doctorId, doctorName: doctor.name,
        startedAt: visitDate, status: visit.status, vitals: visit.vitals,
        clinicalNotes: {
          subjective: visit.soap.subjective, objective: visit.soap.objective,
          assessment: visit.soap.assessment, plan: visit.soap.plan,
          diagnosis: visit.diagnosis || '', doctorNotes: '', followUpInstructions: visit.soap.plan
        },
        createdBy: 'seed-script', createdAt: visitDate, updatedAt: visitDate
      };
      const encRef = await addDoc(collection(db, 'encounters'), encounterData);
      const encounterId = encRef.id;

      // 2. Triage vitals
      await addDoc(collection(db, 'triage_vitals'), {
        encounterId, patientId: pet.id, appointmentId: '',
        weightKg: visit.vitals.weightKg, temperatureC: visit.vitals.temperatureC,
        heartRateBpm: visit.vitals.heartRateBpm, respiratoryRateRpm: visit.vitals.respiratoryRateRpm,
        mmColor: visit.vitals.mmColor, crtSeconds: visit.vitals.crtSeconds,
        notes: '', createdBy: 'seed-script', createdAt: visitDate
      });

      // 3. Clinical notes
      await addDoc(collection(db, 'clinical_notes'), {
        encounterId, patientId: pet.id,
        subjective: visit.soap.subjective, objective: visit.soap.objective,
        assessment: visit.soap.assessment, plan: visit.soap.plan,
        diagnosis: visit.diagnosis || '', doctorNotes: '', followUpInstructions: visit.soap.plan,
        createdBy: 'seed-script', createdAt: visitDate, updatedAt: visitDate
      });

      // 4. Services
      let subTotal = 0;
      for (const svc of visit.services) {
        const lineTotal = svc.price * svc.qty;
        subTotal += lineTotal;
        await addDoc(collection(db, 'appointment_services'), {
          encounterId, petId: pet.id, ownerId: pet.ownerUid,
          serviceCatalogId: '', serviceCode: svc.type.substring(0, 3).toUpperCase(),
          serviceName: svc.name, serviceType: svc.type,
          status: visit.status === 'completed' ? 'completed' : 'in-progress',
          source: 'doctor-added', billable: true, quantity: svc.qty, unitPrice: svc.price,
          discountAmount: 0, taxRate: 0.12, performedBy: visit.doctorId,
          completedAt: visit.status === 'completed' ? visitDate : null,
          createdBy: 'seed-script', createdAt: visitDate, updatedAt: visitDate
        });
      }

      // 5. Lab orders
      if (visit.labs) {
        for (const lab of visit.labs) {
          await addDoc(collection(db, 'lab_orders'), {
            encounterId, patientId: pet.id, testName: lab.name, testCode: lab.code,
            status: lab.status, resultSummary: lab.result || '',
            orderedBy: visit.doctorId, completedBy: lab.status === 'completed' ? 'lab-tech' : '',
            orderedAt: visitDate, completedAt: lab.status === 'completed' ? visitDate : null,
            createdAt: visitDate
          });
        }
      }

      // 6. Prescriptions + dispensing
      if (visit.prescriptions) {
        for (const rx of visit.prescriptions) {
          const rxRef = await addDoc(collection(db, 'prescriptions'), {
            encounterId, patientId: pet.id, medicationName: rx.name, medicationCatalogId: '',
            dosage: rx.dosage, frequency: rx.frequency, duration: rx.duration,
            quantityPrescribed: rx.qty, instructions: '',
            status: rx.dispensed ? 'dispensed' : 'prescribed',
            prescribedBy: visit.doctorId, prescribedAt: visitDate, createdAt: visitDate
          });
          if (rx.dispensed) {
            await addDoc(collection(db, 'dispensing_records'), {
              prescriptionId: rxRef.id, encounterId, patientId: pet.id,
              medicationName: rx.name, quantityDispensed: rx.qty,
              unitPrice: rx.price, totalPrice: rx.price * rx.qty,
              dispensedBy: 'pharmacy', dispensedAt: visitDate
            });
          }
        }
      }

      // 7. Invoice with billing scenario
      const taxAmount = subTotal * 0.12;
      const grandTotal = subTotal + taxAmount;
      const bs = petBilling[visit.daysAgo] || { status: 'paid' as const };
      let billingStatus = bs.status;
      let amountPaid = grandTotal;
      let balanceDue = 0;
      if (billingStatus === 'partial' && bs.paidPct) {
        amountPaid = Math.round(grandTotal * bs.paidPct * 100) / 100;
        balanceDue = Math.round((grandTotal - amountPaid) * 100) / 100;
      } else if (billingStatus === 'unpaid') {
        amountPaid = 0;
        balanceDue = grandTotal;
      }

      const invoiceStatus = billingStatus === 'paid' ? 'paid' : billingStatus === 'partial' ? 'partially_paid' : 'active';
      const dueDate = new Date(visitDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const invoiceRef = await addDoc(collection(db, 'invoices'), {
        encounterId, petId: pet.id, petName: pet.name, clientUid: pet.ownerUid,
        invoiceNo: `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        status: invoiceStatus, subTotal, taxAmount, discountTotal: 0, grandTotal,
        amountPaid, balanceDue, issueDate: visitDate, dueDate,
        notes: visit.diagnosis || '', createdAt: visitDate, updatedAt: visitDate
      });
      const invoiceId = invoiceRef.id;

      // 8. Invoice items
      for (const svc of visit.services) {
        await addDoc(collection(db, 'invoice_items'), {
          invoiceId, encounterId, petId: pet.id, description: svc.name,
          itemType: svc.type, quantity: svc.qty, unitPrice: svc.price,
          lineTotal: svc.price * svc.qty, createdAt: visitDate
        });
      }

      // 9. Payments
      if (billingStatus === 'paid') {
        await addDoc(collection(db, 'payments'), {
          invoiceId, encounterId, petId: pet.id, amount: grandTotal,
          paymentMethod: 'cash', referenceNo: `PAY-${Date.now()}`,
          receivedBy: 'cashier', paidAt: visitDate, createdAt: visitDate
        });
      } else if (billingStatus === 'partial' && amountPaid > 0) {
        await addDoc(collection(db, 'payments'), {
          invoiceId, encounterId, petId: pet.id, amount: amountPaid,
          paymentMethod: visitIndex % 2 === 0 ? 'cash' : 'gcash',
          referenceNo: `PAY-${Date.now()}`, receivedBy: 'cashier',
          paidAt: visitDate, createdAt: visitDate
        });
      }

      // 10. Audit log
      await addDoc(collection(db, 'audit_logs'), {
        encounterId, patientId: pet.id, action: 'encounter_created',
        details: `Visit: ${visit.chiefComplaint.substring(0, 50)}...`,
        userId: visit.doctorId, timestamp: visitDate, createdAt: visitDate
      });

      createdEncounters[scenario.petName].push({
        id: encounterId, date: dateStr, doctor: doctor.name,
        status: visit.status, diagnosis: visit.diagnosis,
        invoiceId, grandTotal, billingStatus
      });

      const tag = billingStatus === 'paid' ? 'PAID' : billingStatus === 'partial' ? 'PARTIAL' : 'UNPAID';
      console.log(`   ${pet.name}: ${dateStr} - ${visit.diagnosis} [${tag}]`);
      visitIndex++;
    }
  }

  // Attachments
  console.log('\nCreating sample attachments...');
  for (const petName of ['Buddy', 'Whiskers', 'Max']) {
    const encounters = createdEncounters[petName];
    if (!encounters || encounters.length === 0) continue;
    const firstEnc = encounters[0];
    await addDoc(collection(db, 'attachments'), {
      encounterId: firstEnc.id, patientId: petsByName[petName].id,
      fileName: `${petName}_XRay_Report.pdf`, fileType: 'pdf',
      fileUrl: 'https://example.com/sample-xray-report.pdf',
      storagePath: `sample/${petName.toLowerCase()}/xray-report.pdf`,
      uploadedBy: 'seed-script', uploadedAt: timestamp(firstEnc.date)
    });
    await addDoc(collection(db, 'attachments'), {
      encounterId: firstEnc.id, patientId: petsByName[petName].id,
      fileName: `${petName}_Lab_Results.pdf`, fileType: 'pdf',
      fileUrl: 'https://example.com/sample-lab-results.pdf',
      storagePath: `sample/${petName.toLowerCase()}/lab-results.pdf`,
      uploadedBy: 'seed-script', uploadedAt: timestamp(firstEnc.date)
    });
    console.log(`   Attachments for ${petName}`);
  }

  console.log('\nSeed data complete!\n');
  for (const petName of Object.keys(createdEncounters)) {
    const visits = createdEncounters[petName];
    const paid = visits.filter(v => v.billingStatus === 'paid').length;
    const partial = visits.filter(v => v.billingStatus === 'partial').length;
    const unpaid = visits.filter(v => v.billingStatus === 'unpaid').length;
    console.log(`   ${petName}: ${visits.length} visits (${paid} paid, ${partial} partial, ${unpaid} unpaid)`);
  }

  process.exit(0);
}

seedEndToEndData().catch(err => { console.error('Seed error:', err); process.exit(1); });

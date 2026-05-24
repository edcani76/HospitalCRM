// scripts/generate-demo-data.ts

/**
 * Demo data generator for HospitalCRM.
 * Generates:
 *  - Pets for a target user (or the first user in the DB)
 *  - Appointments (mixed statuses)
 *  - Clinical reports for completed appointments
 *  - Invoices (paid & active) with due dates
 *  - Uses the seeded Service Catalog for service pricing
 */

import admin from 'firebase-admin';
import { addDays, subDays, formatISO } from 'date-fns';
import { ServiceCatalogItem, Pet, Appointment, Report, Invoice } from '../src/types';
import serviceAccount from '../firebase-service-account.json' assert { type: 'json' };

// ---------- Firebase Init ----------
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
    projectId: serviceAccount.project_id,
  });
}
const db = admin.firestore();

// ---------- Configuration ----------
const TARGET_USER_UID = process.env.DEMO_USER_UID || null; // set env var to target specific user
const PET_COUNT = Number(process.env.DEMO_PET_COUNT) || 5;
const APPT_PER_PET = Number(process.env.DEMO_APPT_PER_PET) || 8;
const DUE_OFFSET_DAYS = Number(process.env.DEMO_DUE_OFFSET) || 30; // invoice due after X days
const DATE_RANGE_PAST_DAYS = 180; // generate data from 6 months ago
const DATE_RANGE_FUTURE_DAYS = 60; // generate future appointments up to 2 months

// ---------- Helper Functions ----------
function randomDate(start: Date, end: Date): Date {
  const diff = end.getTime() - start.getTime();
  const offset = Math.random() * diff;
  return new Date(start.getTime() + offset);
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function getTargetUserUid(): Promise<string> {
  if (TARGET_USER_UID) return TARGET_USER_UID;
  const usersSnap = await db.collection('users').limit(1).get();
  if (usersSnap.empty) throw new Error('No users found in Firestore');
  return usersSnap.docs[0].id;
}

async function fetchServiceCatalog(): Promise<ServiceCatalogItem[]> {
  const snap = await db.collection('serviceCatalog').get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as ServiceCatalogItem) }));
}

function generatePetData(index: number, ownerUid: string): Pet {
  const speciesOptions = ['Dog', 'Cat', 'Rabbit', 'Bird'];
  const breedMap: Record<string, string[]> = {
    Dog: ['Labrador', 'Beagle', 'Poodle'],
    Cat: ['Siamese', 'Persian', 'Maine Coon'],
    Rabbit: ['Netherland Dwarf', 'Lionhead'],
    Bird: ['Parakeet', 'Cockatiel'],
  };
  const species = randomChoice(speciesOptions);
  const breed = randomChoice(breedMap[species]);
  const name = `${species}-${index + 1}`;
  const dob = subDays(new Date(), Math.floor(Math.random() * 3650)); // up to 10 years old
  return {
    id: '',
    ownerUid,
    name,
    species,
    breed,
    dateOfBirth: formatISO(dob, { representation: 'date' }),
    gender: randomChoice(['Male', 'Female']),
    color: 'Brown',
    weight: Math.round(Math.random() * 30 + 5), // 5‑35 kg
    medicalHistory: '',
    consentPrivacy: true,
    consentTerms: true,
    consentPrivacyTimestamp: new Date().toISOString(),
    consentTermsTimestamp: new Date().toISOString(),
  } as Pet;
}

function generateAppointment(pet: Pet, index: number, services: ServiceCatalogItem[]): Appointment {
  const now = new Date();
  const start = subDays(now, DATE_RANGE_PAST_DAYS);
  const end = addDays(now, DATE_RANGE_FUTURE_DAYS);
  const apptDate = randomDate(start, end);
  const statusChoices: Appointment['status'][] = ['confirmed', 'unconfirmed', 'completed', 'cancelled'];
  const status = randomChoice(statusChoices);

  const chosenServices = [randomChoice(services)];
  if (Math.random() > 0.6) chosenServices.push(randomChoice(services));

  const notes = `Services: ${chosenServices.map((s) => s.name).join(', ')}`;

  return {
    id: '',
    clientUid: pet.ownerUid,
    petId: pet.id,
    petName: pet.name,
    doctorId: 'doc123',
    doctorName: 'Dr. Smith',
    date: formatISO(apptDate, { representation: 'date' }),
    time: formatISO(apptDate, { representation: 'time' }).slice(0, 5),
    status,
    notes,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    services: chosenServices.map((s) => s.name),
    mode: 'scheduled',
  } as Appointment;
}

async function createDemoData() {
  const userUid = await getTargetUserUid();
  const services = await fetchServiceCatalog();
  const petRefs: FirebaseFirestore.DocumentReference[] = [];

  // ---- Pets ----
  for (let i = 0; i < PET_COUNT; i++) {
    const pet = generatePetData(i, userUid);
    const petRef = await db.collection('pets').add(pet);
    await petRef.update({ id: petRef.id });
    pet.id = petRef.id;
    petRefs.push(petRef);
  }

  // ---- Appointments, Reports, Invoices ----
  for (const petRef of petRefs) {
    const petSnap = await petRef.get();
    const pet = petSnap.data() as Pet;
    for (let a = 0; a < APPT_PER_PET; a++) {
      const appointment = generateAppointment(pet, a, services);
      const apptRef = await db.collection('appointments').add(appointment);
      await apptRef.update({ id: apptRef.id });

      if (appointment.status === 'completed') {
        // ---- Report ----
        const report: Report = {
          id: '',
          clientUid: userUid,
          petId: pet.id,
          title: `${appointment.doctorName} - Visit Summary`,
          date: appointment.date,
          fileUrl: 'https://example.com/placeholder-report.pdf',
          description: `Clinical notes for ${pet.name}'s visit on ${appointment.date}.`,
          type: 'medical',
        } as Report;
        const reportRef = await db.collection('reports').add(report);
        await reportRef.update({ id: reportRef.id });

        // ---- Invoice ----
        const totalAmount = appointment.services?.reduce((sum, svcName) => {
          const svc = services.find((s) => s.name === svcName);
          return sum + (svc?.defaultPrice ?? 0);
        }, 0) ?? 0;
        const invoiceStatus = Math.random() > 0.5 ? 'paid' : 'active';
        const invoice: Invoice = {
          id: '',
          clientUid: userUid,
          petId: pet.id,
          petName: pet.name,
          amount: totalAmount,
          status: invoiceStatus as any,
          date: appointment.date,
          dueDate:
            invoiceStatus === 'active'
              ? formatISO(addDays(new Date(appointment.date), DUE_OFFSET_DAYS), { representation: 'date' })
              : appointment.date,
          description: `Invoice for ${appointment.services?.join(', ') || 'services'}`,
        } as Invoice;
        const invRef = await db.collection('invoices').add(invoice);
        await invRef.update({ id: invRef.id });
      }
    }
  }

  console.log('✅ Demo data generation complete.');
}

createDemoData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error generating demo data:', err);
    process.exit(1);
  });

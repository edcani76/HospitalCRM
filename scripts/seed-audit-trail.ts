import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function signIn() {
  try {
    await signInWithEmailAndPassword(auth, 'admin@medipaws.com', 'Password123!');
    console.log('   Signed in as admin');
  } catch {
    console.log('   Continuing without auth...');
  }
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - Math.floor(Math.random() * 8));
  d.setMinutes(Math.floor(Math.random() * 60));
  return d;
}

function randomTime(): string {
  const hours = [8, 9, 10, 11, 13, 14, 15, 16, 17];
  const h = hours[Math.floor(Math.random() * hours.length)];
  const m = Math.random() > 0.5 ? '00' : '30';
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

interface AuditEntry {
  id: string;
  action: string;
  event: string;
  staff: string;
  userId: string;
  timestamp: Date;
  reason?: string;
}

const staffNames = [
  'Dr. Sarah Johnson',
  'Dr. Michael Chen',
  'Dr. Emily Rodriguez',
  'Dr. James Wilson',
  'Nurse Maria Santos',
  'Receptionist Ana Garcia',
  'Technician John Doe',
  'Admin Staff'
];

const actionTemplates: Record<string, string[]> = {
  'created': [
    'Patient record created',
    'New patient registered',
    'Pet profile added to system',
    'Initial registration completed'
  ],
  'appointment_scheduled': [
    'Appointment scheduled',
    'Visit appointment booked',
    'Scheduled wellness checkup',
    'Annual checkup appointment made'
  ],
  'appointment_completed': [
    'Appointment completed',
    'Visit finished',
    'Consultation completed',
    'Checkup concluded'
  ],
  'appointment_cancelled': [
    'Appointment cancelled',
    'Scheduled visit cancelled',
    'Booking cancelled'
  ],
  'appointment_rescheduled': [
    'Appointment rescheduled',
    'Visit date changed',
    'Appointment date updated'
  ],
  'emr_created': [
    'EMR record created',
    'Medical record started',
    'New encounter initiated'
  ],
  'emr_updated': [
    'EMR updated',
    'Medical record modified',
    'Clinical notes added',
    'Visit notes updated'
  ],
  'vitals_recorded': [
    'Vitals recorded',
    'Triage vitals taken',
    'Weight and vitals measured',
    'Vital signs documented'
  ],
  'lab_ordered': [
    'Lab tests ordered',
    'Laboratory work ordered',
    'Bloodwork requested',
    'Diagnostic tests ordered'
  ],
  'lab_completed': [
    'Lab results received',
    'Test results available',
    'Laboratory analysis complete'
  ],
  'prescription_created': [
    'Prescription written',
    'Medication prescribed',
    'Rx issued'
  ],
  'prescription_dispensed': [
    'Medication dispensed',
    'Prescription filled',
    'Medications given to owner'
  ],
  'invoice_created': [
    'Invoice generated',
    'Bill created',
    'Statement prepared'
  ],
  'payment_received': [
    'Payment received',
    'Cash payment processed',
    'Payment recorded',
    'GCash payment received'
  ],
  'payment_partial': [
    'Partial payment received',
    'Deposit payment made',
    'Initial payment processed'
  ],
  'profile_updated': [
    'Profile information updated',
    'Patient details modified',
    'Contact info changed'
  ],
  'photo_updated': [
    'Profile photo updated',
    'Pet photo changed',
    'New image uploaded'
  ],
  'vaccination_given': [
    'Vaccination administered',
    'Vaccine given',
    'Immunization completed'
  ],
  'surgery_completed': [
    'Surgery performed',
    'Procedure completed',
    'Surgical intervention done'
  ],
  'followup_scheduled': [
    'Follow-up scheduled',
    'Recheck appointment booked',
    'Return visit arranged'
  ]
};

async function seedAuditTrail() {
  console.log('🌱 Seeding Activity Logs for all patients...\n');

  await signIn();

  // Fetch all pets
  const petsSnap = await getDocs(collection(db, 'pets'));
  const pets: any[] = [];
  petsSnap.forEach(d => pets.push({ id: d.id, ...d.data() }));

  // Fetch all appointments
  const appointmentsSnap = await getDocs(collection(db, 'appointments'));
  const appointments: any[] = [];
  appointmentsSnap.forEach(d => appointments.push({ id: d.id, ...d.data() }));

  // Fetch all encounters
  const encountersSnap = await getDocs(collection(db, 'encounters'));
  const encounters: any[] = [];
  encountersSnap.forEach(d => encounters.push({ id: d.id, ...d.data() }));

  // Fetch all invoices
  const invoicesSnap = await getDocs(collection(db, 'invoices'));
  const invoices: any[] = [];
  invoicesSnap.forEach(d => invoices.push({ id: d.id, ...d.data() }));

  // Fetch all payments
  const paymentsSnap = await getDocs(collection(db, 'payments'));
  const payments: any[] = [];
  paymentsSnap.forEach(d => payments.push({ id: d.id, ...d.data() }));

  // Fetch all lab orders
  const labOrdersSnap = await getDocs(collection(db, 'lab_orders'));
  const labOrders: any[] = [];
  labOrdersSnap.forEach(d => labOrders.push({ id: d.id, ...d.data() }));

  // Fetch all prescriptions
  const prescriptionsSnap = await getDocs(collection(db, 'prescriptions'));
  const prescriptions: any[] = [];
  prescriptionsSnap.forEach(d => prescriptions.push({ id: d.id, ...d.data() }));

  console.log(`   Found ${pets.length} pets`);
  console.log(`   Found ${appointments.length} appointments`);
  console.log(`   Found ${encounters.length} encounters`);
  console.log(`   Found ${invoices.length} invoices`);
  console.log(`   Found ${payments.length} payments`);
  console.log(`   Found ${labOrders.length} lab orders`);
  console.log(`   Found ${prescriptions.length} prescriptions`);
  console.log('');

  // Process each pet
  for (const pet of pets) {
    console.log(`   Processing ${pet.name}...`);

    const petAppointments = appointments.filter(a => a.petId === pet.id).sort((a, b) => {
      const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
      const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
      return dateA.getTime() - dateB.getTime();
    });

    const petEncounters = encounters.filter(e => e.petId === pet.id).sort((a, b) => {
      const dateA = a.startedAt?.toDate?.() || new Date(a.createdAt || Date.now());
      const dateB = b.startedAt?.toDate?.() || new Date(b.createdAt || Date.now());
      return dateA.getTime() - dateB.getTime();
    });

    const petInvoices = invoices.filter(i => i.petId === pet.id);
    const petPayments = payments.filter(p => {
      const inv = petInvoices.find(i => i.id === p.invoiceId);
      return !!inv;
    });

    const petLabOrders = labOrders.filter(l => l.patientId === pet.id);
    const petPrescriptions = prescriptions.filter(p => p.patientId === pet.id);

    const auditTrail: AuditEntry[] = [];

    // 1. Patient creation entry (oldest)
    const creationDate = pet.createdAt?.toDate?.() || daysAgo(180);
    auditTrail.push({
      id: `audit-${pet.id}-created`,
      action: 'created',
      event: 'Patient record created',
      staff: staffNames[Math.floor(Math.random() * staffNames.length)],
      userId: 'admin',
      timestamp: creationDate
    });

    // 2. Profile update after creation
    auditTrail.push({
      id: `audit-${pet.id}-profile-init`,
      action: 'profile_updated',
      event: 'Initial profile details added',
      staff: staffNames[0],
      userId: 'admin',
      timestamp: new Date(creationDate.getTime() + 1000 * 60 * 5)
    });

    // 3. Add appointment-related entries
    let encounterIndex = 0;
    for (let i = 0; i < petAppointments.length; i++) {
      const apt = petAppointments[i];
      const aptDate = new Date(apt.date + 'T' + (apt.time || '12:00'));
      const staffMember = staffNames[Math.floor(Math.random() * staffNames.length)];

      // Appointment scheduled
      auditTrail.push({
        id: `audit-${apt.id}-scheduled`,
        action: 'appointment_scheduled',
        event: actionTemplates.appointment_scheduled[Math.floor(Math.random() * actionTemplates.appointment_scheduled.length)],
        staff: staffNames[Math.floor(Math.random() * staffNames.length)],
        userId: 'receptionist',
        timestamp: new Date(aptDate.getTime() - 1000 * 60 * 60 * 24 * Math.floor(Math.random() * 7 + 1))
      });

      if (apt.status === 'cancelled') {
        // Appointment cancelled
        auditTrail.push({
          id: `audit-${apt.id}-cancelled`,
          action: 'appointment_cancelled',
          event: actionTemplates.appointment_cancelled[0],
          staff: staffNames[Math.floor(Math.random() * staffNames.length)],
          userId: 'receptionist',
          timestamp: new Date(aptDate.getTime() - 1000 * 60 * 60),
          reason: 'Owner requested cancellation'
        });
        continue;
      }

      if (apt.status === 'rescheduled') {
        // Appointment rescheduled
        auditTrail.push({
          id: `audit-${apt.id}-rescheduled`,
          action: 'appointment_rescheduled',
          event: actionTemplates.appointment_rescheduled[0],
          staff: staffNames[Math.floor(Math.random() * staffNames.length)],
          userId: 'receptionist',
          timestamp: new Date(aptDate.getTime() - 1000 * 60 * 60 * 12)
        });
      }

      // Check if there's a matching encounter
      const matchingEncounter = petEncounters.find(e => e.appointmentId === apt.id);

      if (apt.status === 'confirmed' || apt.status === 'completed' || matchingEncounter) {
        const visitStartTime = new Date(aptDate.getTime() + 1000 * 60 * 30);
        const doctor = staffNames[Math.floor(Math.random() * 4)];

        // EMR created
        auditTrail.push({
          id: `audit-${apt.id}-emr-start`,
          action: 'emr_created',
          event: actionTemplates.emr_created[0],
          staff: doctor,
          userId: apt.doctorId || 'doctor',
          timestamp: visitStartTime
        });

        // Vitals recorded
        auditTrail.push({
          id: `audit-${apt.id}-vitals`,
          action: 'vitals_recorded',
          event: actionTemplates.vitals_recorded[Math.floor(Math.random() * actionTemplates.vitals_recorded.length)],
          staff: 'Nurse ' + staffNames[Math.floor(4 + Math.random() * 2)].replace('Dr. ', ''),
          userId: 'nurse',
          timestamp: new Date(visitStartTime.getTime() + 1000 * 60 * 5)
        });

        // Lab orders for this appointment
        const aptLabOrders = petLabOrders.filter(l => l.encounterId === matchingEncounter?.id);
        if (aptLabOrders.length > 0) {
          auditTrail.push({
            id: `audit-${apt.id}-labs-ordered`,
            action: 'lab_ordered',
            event: `Ordered ${aptLabOrders.length} laboratory test(s)`,
            staff: doctor,
            userId: apt.doctorId || 'doctor',
            timestamp: new Date(visitStartTime.getTime() + 1000 * 60 * 15)
          });

          // Completed labs
          const completedLabs = aptLabOrders.filter(l => l.status === 'completed');
          if (completedLabs.length > 0) {
            auditTrail.push({
              id: `audit-${apt.id}-labs-done`,
              action: 'lab_completed',
              event: actionTemplates.lab_completed[0],
              staff: 'Technician',
              userId: 'lab-tech',
              timestamp: new Date(visitStartTime.getTime() + 1000 * 60 * 60)
            });
          }
        }

        // Prescriptions for this appointment
        const aptPrescriptions = petPrescriptions.filter(p => p.encounterId === matchingEncounter?.id);
        if (aptPrescriptions.length > 0) {
          auditTrail.push({
            id: `audit-${apt.id}-rx`,
            action: 'prescription_created',
            event: `Prescribed ${aptPrescriptions.length} medication(s)`,
            staff: doctor,
            userId: apt.doctorId || 'doctor',
            timestamp: new Date(visitStartTime.getTime() + 1000 * 60 * 25)
          });

          const dispensedRxs = aptPrescriptions.filter(p => p.status === 'dispensed');
          if (dispensedRxs.length > 0) {
            auditTrail.push({
              id: `audit-${apt.id}-dispensed`,
              action: 'prescription_dispensed',
              event: actionTemplates.prescription_dispensed[0],
              staff: 'Pharmacy',
              userId: 'pharmacy',
              timestamp: new Date(visitStartTime.getTime() + 1000 * 60 * 35)
            });
          }
        }

        // EMR updated with clinical notes
        auditTrail.push({
          id: `audit-${apt.id}-emr-update`,
          action: 'emr_updated',
          event: actionTemplates.emr_updated[Math.floor(Math.random() * actionTemplates.emr_updated.length)],
          staff: doctor,
          userId: apt.doctorId || 'doctor',
          timestamp: new Date(visitStartTime.getTime() + 1000 * 60 * 30)
        });

        // Appointment completed
        auditTrail.push({
          id: `audit-${apt.id}-completed`,
          action: 'appointment_completed',
          event: actionTemplates.appointment_completed[Math.floor(Math.random() * actionTemplates.appointment_completed.length)],
          staff: doctor,
          userId: apt.doctorId || 'doctor',
          timestamp: new Date(visitStartTime.getTime() + 1000 * 60 * 45)
        });

        // Invoice created
        const aptInvoice = petInvoices.find(inv => inv.encounterId === matchingEncounter?.id);
        if (aptInvoice) {
          auditTrail.push({
            id: `audit-${apt.id}-invoice`,
            action: 'invoice_created',
            event: `Invoice generated: ₱${aptInvoice.grandTotal?.toFixed(2) || '0.00'}`,
            staff: 'Receptionist',
            userId: 'receptionist',
            timestamp: new Date(visitStartTime.getTime() + 1000 * 60 * 50)
          });

          // Payments
          const aptPayments = petPayments.filter(p => p.invoiceId === aptInvoice.id);
          if (aptPayments.length > 0) {
            for (const payment of aptPayments) {
              const isFullPayment = aptInvoice.status === 'paid';
              auditTrail.push({
                id: `audit-${payment.id}`,
                action: isFullPayment ? 'payment_received' : 'payment_partial',
                event: isFullPayment
                  ? `${actionTemplates.payment_received[Math.floor(Math.random() * actionTemplates.payment_received.length)]}: ₱${payment.amount?.toFixed(2)}`
                  : `Partial payment: ₱${payment.amount?.toFixed(2)} (₱${aptInvoice.balanceDue?.toFixed(2)} remaining)`,
                staff: 'Cashier',
                userId: 'cashier',
                timestamp: new Date(new Date(payment.paidAt?.toDate?.() || payment.createdAt?.toDate() || visitStartTime).getTime() + 1000 * 60 * 55)
              });
            }
          }
        }

        encounterIndex++;
      }
    }

    // Sort audit trail by timestamp
    auditTrail.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Update the pet document with the audit trail
    await updateDoc(doc(db, 'pets', pet.id), {
      auditTrail: auditTrail.map(entry => ({
        id: entry.id,
        action: entry.action,
        event: entry.event,
        staff: entry.staff,
        userId: entry.userId,
        timestamp: entry.timestamp.toISOString(),
        reason: entry.reason || null
      }))
    });

    console.log(`      Added ${auditTrail.length} audit trail entries`);
  }

  console.log('\n✅ Audit trail seeding complete!');
}

seedAuditTrail().catch(console.error);
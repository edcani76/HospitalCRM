// scripts/seed-service-catalog.cjs

const admin = require('firebase-admin');

const serviceAccount = require('../firebase-service-account.json');

const { getFirestore } = require('firebase-admin/firestore');
const firebaseConfig = require('../firebase-applet-config.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}
const db = getFirestore(firebaseConfig.firestoreDatabaseId || '(default)');

const serviceCatalog = [
  {
    service_code: 'CONS-001',
    name: 'General Consultation',
    category: 'consultation',
    description: 'Standard veterinary consultation covering basic health check.',
    defaultPrice: 500,
    taxable: true,
    active: true,
    requiresClinicalRecord: true,
    durationMin: 30,
  },
  {
    service_code: 'GROO-001',
    name: 'Full Grooming Package',
    category: 'grooming',
    description: 'Bath, haircut, nail trim, and ear cleaning.',
    defaultPrice: 800,
    taxable: true,
    active: true,
    requiresClinicalRecord: false,
    durationMin: 60,
  },
  {
    service_code: 'LAB-001',
    name: 'Complete Blood Count (CBC)',
    category: 'lab',
    description: 'Comprehensive blood analysis for diagnostic purposes.',
    defaultPrice: 700,
    taxable: true,
    active: true,
    requiresClinicalRecord: true,
    inventoryItemId: 'med_lab_cbc',
    durationMin: 15,
  },
  {
    service_code: 'IMG-001',
    name: 'Radiology X-Ray',
    category: 'diagnostic',
    description: 'Standard X-Ray imaging for bone and organ assessment.',
    defaultPrice: 1200,
    taxable: true,
    active: true,
    requiresClinicalRecord: true,
    inventoryItemId: 'med_radiology',
    durationMin: 20,
  },
  {
    service_code: 'MED-001',
    name: 'Antibiotic Course - Amoxicillin',
    category: 'medication',
    description: '7-day oral antibiotic course.',
    defaultPrice: 450,
    taxable: true,
    active: true,
    requiresClinicalRecord: true,
    inventoryItemId: 'med_amoxicillin',
    durationMin: 0,
  },
];

async function seedServiceCatalog() {
  console.log('Seeding Service Catalog...');
  const batch = db.batch();
  const collRef = db.collection('serviceCatalog');
  serviceCatalog.forEach(item => {
    const docRef = collRef.doc();
    batch.set(docRef, { ...item, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  await batch.commit();
  console.log(`✅ Added ${serviceCatalog.length} service catalog items.`);
}

seedServiceCatalog()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error seeding service catalog:', err);
    process.exit(1);
  });

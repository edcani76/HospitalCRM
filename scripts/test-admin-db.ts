import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccountPath = path.resolve('firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

// Try to initialize firestore with medcrm
try {
  const db = getFirestore(app, 'medcrm');
  console.log('Successfully initialized named DB!');
} catch (e) {
  console.log('Failed:', e.message);
}

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();
const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

async function check() {
  const snap = await getDocs(collection(db, 'services_catalog'));
  snap.forEach(d => console.log(d.id, d.data().service_code, d.data().service_name, d.data().base_price));
  process.exit(0);
}
check();

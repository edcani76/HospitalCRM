import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

function countFields(obj: any): number {
  if (!obj || typeof obj !== 'object') return 0;
  let count = 0;
  for (const key of Object.keys(obj)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
    const val = obj[key];
    if (val === null || val === undefined || val === '' || val === 0) continue;
    if (typeof val === 'object') count += countFields(val);
    else count++;
  }
  return count;
}

async function removeDuplicateEncounters() {
  console.log('\n🔍 Scanning for duplicate encounters...\n');

  const encSnap = await getDocs(collection(db, 'encounters'));
  console.log(`Total encounters found: ${encSnap.size}\n`);

  const groups = new Map<string, { id: string; data: any }[]>();

  for (const docSnap of encSnap.docs) {
    const data = docSnap.data();
    const aptId = data.appointmentId;
    if (!aptId) continue;
    if (!groups.has(aptId)) groups.set(aptId, []);
    groups.get(aptId)!.push({ id: docSnap.id, data });
  }

  let totalDuplicates = 0;
  const batch = writeBatch(db);

  const groupEntries = Array.from(groups.entries());
  for (const [aptId, encs] of groupEntries) {
    if (encs.length <= 1) continue;
    totalDuplicates++;

    console.log(`\n⚠️  Duplicate: appointment ${aptId} has ${encs.length} encounters`);

    const sorted = encs.sort((a, b) => {
      const aFields = countFields(a.data);
      const bFields = countFields(b.data);
      return bFields - aFields; // keep the one with MORE data
    });

    const keep = sorted[0];
    const remove = sorted.slice(1);

    console.log(`   Keeping: ${keep.id} (${countFields(keep.data)} fields)`);
    for (const enc of remove) {
      console.log(`   Removing: ${enc.id} (${countFields(enc.data)} fields)`);
      console.log(`     Pet: ${enc.data.petName || enc.data.petId || 'N/A'}, Status: ${enc.data.status || 'N/A'}`);

      // Rehome related records to the kept encounter
      const relatedCollections = [
        { name: 'appointment_services', field: 'encounterId' },
        { name: 'lab_orders', field: 'encounterId' },
        { name: 'triage_vitals', field: 'encounterId' },
        { name: 'clinical_notes', field: 'encounterId' },
        { name: 'prescriptions', field: 'encounterId' },
        { name: 'dispensing_records', field: 'encounterId' },
        { name: 'attachments', field: 'encounterId' },
        { name: 'invoices', field: 'encounterId' },
        { name: 'auditLogs', field: 'encounterId' },
      ];

      for (const { name: colName, field: idField } of relatedCollections) {
        try {
          const q = query(collection(db, colName), where(idField, '==', enc.id));
          const snap = await getDocs(q);
          for (const relDoc of snap.docs) {
            batch.update(doc(db, colName, relDoc.id), { [idField]: keep.id });
            console.log(`   → Rehomed ${colName}/${relDoc.id} to ${keep.id}`);
          }
        } catch (e) {
          console.error(`   Error rehoming ${colName} for ${enc.id}:`, e);
        }
      }

      // Delete the duplicate encounter
      batch.delete(doc(db, 'encounters', enc.id));
    }
  }

  if (totalDuplicates > 0) {
    await batch.commit();
    console.log(`\n✅ Removed ${totalDuplicates} duplicate encounter group(s).\n`);
  } else {
    console.log('\n✅ No duplicate encounters found.\n');
  }
}

removeDuplicateEncounters().catch(console.error);

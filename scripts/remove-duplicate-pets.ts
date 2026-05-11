import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

async function removeDuplicatePets() {
  console.log('\n🔍 Scanning for duplicate pets...\n');

  const petsSnap = await getDocs(collection(db, 'pets'));
  console.log(`Total pets found: ${petsSnap.size}\n`);

  const groups = new Map<string, { id: string; data: any }[]>();

  for (const petDoc of petsSnap.docs) {
    const data = petDoc.data();
    const key = `${(data.ownerUid || 'no-owner')}|${(data.name || '').toLowerCase().trim()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ id: petDoc.id, data });
  }

  let totalDuplicates = 0;
  const batch = writeBatch(db);

  for (const [key, pets] of groups.entries()) {
    if (pets.length <= 1) continue;
    totalDuplicates++;

    const [ownerUid, name] = key.split('|');
    console.log(`\n⚠️  Duplicate found: "${name}" (owner: ${ownerUid || 'none'}) — ${pets.length} records`);

    const sorted = pets.sort((a, b) => {
      const aDate = a.data.createdAt?.toDate?.() || new Date(0);
      const bDate = b.data.createdAt?.toDate?.() || new Date(0);
      return aDate.getTime() - bDate.getTime();
    });

    const keep = sorted[0];
    const remove = sorted.slice(1);

    console.log(`   Keeping: ${keep.id} (created: ${keep.data.createdAt?.toDate?.()?.toISOString() || 'unknown'})`);
    
    const collectionsToRehome = ['encounters', 'appointments', 'invoices', 'appointment_services'];
    for (const colName of collectionsToRehome) {
      const idField = colName === 'encounters' ? 'patientId' : colName === 'appointments' ? 'petId' : colName === 'invoices' ? 'petId' : 'petId';
      for (const pet of remove) {
        try {
          const q = query(collection(db, colName), where(idField, '==', pet.id));
          const snap = await getDocs(q);
          for (const docSnap of snap.docs) {
            batch.update(doc(db, colName, docSnap.id), { [idField]: keep.id });
            console.log(`   → Rehomed ${colName}/${docSnap.id} to ${keep.id}`);
          }
        } catch (e) {
          console.error(`   Error rehoming ${colName} for ${pet.id}:`, e);
        }
      }
    }

    for (const pet of remove) {
      batch.delete(doc(db, 'pets', pet.id));
      console.log(`   ✗ Deleted duplicate: ${pet.id}`);
    }
  }

  if (totalDuplicates > 0) {
    await batch.commit();
    console.log(`\n✅ Removed ${totalDuplicates} duplicate pet group(s) and rehomed their data.\n`);
  } else {
    console.log('\n✅ No duplicate pets found.\n');
  }
}

removeDuplicatePets().catch(console.error);

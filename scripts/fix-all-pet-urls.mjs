import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

// Use ui-avatars.com - always works!
const AVATAR_URLS = {
  'Buddy': 'https://ui-avatars.com/api/?name=Buddy&background=ffd700&color=fff&size=400',
  'Lucy': 'https://ui-avatars.com/api/?name=Lucy&background=ff6b6b&color=fff&size=400',
  'Whiskers': 'https://ui-avatars.com/api/?name=Whiskers&background=4ecdc4&color=fff&size=400',
  'Max': 'https://ui-avatars.com/api/?name=Max&background=45b7fe&color=fff&size=400',
  'Rocky': 'https://ui-avatars.com/api/?name=Rocky&background=96ceb4&color=fff&size=400',
  'Luna': 'https://ui-avatars.com/api/?name=Luna&background=ffd93d&color=fff&size=400',
  'Simba': 'https://ui-avatars.com/api/?name=Simba&background=ff8a5c&color=fff&size=400',
  'Kiwi': 'https://ui-avatars.com/api/?name=Kiwi&background=88d8b0&color=fff&size=400',
  'Charlie': 'https://ui-avatars.com/api/?name=Charlie&background=6c5ce7&color=fff&size=400',
  'Bella': 'https://ui-avatars.com/api/?name=Bella&background=ff9ff3&color=fff&size=400',
  'Oliver': 'https://ui-avatars.com/api/?name=Oliver&background=54a0ff&color=fff&size=400',
  'Milo': 'https://ui-avatars.com/api/?name=Milo&background=00b894&color=fff&size=400',
};

async function fixAll() {
  const snapshot = await getDocs(collection(db, 'pets'));
  
  for (const document of snapshot.docs) {
    const data = document.data();
    if (AVATAR_URLS[data.name]) {
      await updateDoc(doc(db, 'pets', document.id), {
        imageUrl: AVATAR_URLS[data.name]
      });
      console.log(`✅ Updated ${data.name}`);
    }
  }
  
  console.log('\nDone! All pets now have working avatar URLs.');
  process.exit(0);
}

fixAll();

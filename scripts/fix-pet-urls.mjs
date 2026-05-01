import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

// Correct Unsplash URLs
const CORRECT_URLS = {
  'Kiwi': 'https://images.unsplash.com/photo-1551085254-e7c4f12feb3a?auto=format&fit=crop&q=80&w=400',
  'Charlie': 'https://images.unsplash.com/photo-1537151625747-088f5dd5eb3a?auto=format&fit=crop&q=80&w=400',
  'Milo': 'https://images.unsplash.com/photo-1517849845537-4d557ef76a8f?auto=format&fit=crop&q=80&w=400',
  'Simba': 'https://images.unsplash.com/photo-1573865526739-10659fecf129?auto=format&fit=crop&q=80&w=400',
  'Max': 'https://images.unsplash.com/photo-1589941013453-ec214d290a5b?auto=format&fit=crop&q=80&w=400',
};

async function fixUrls() {
  const snapshot = await getDocs(collection(db, 'pets'));
  
  for (const document of snapshot.docs) {
    const data = document.data();
    if (CORRECT_URLS[data.name]) {
      await updateDoc(doc(db, 'pets', document.id), {
        imageUrl: CORRECT_URLS[data.name]
      });
      console.log(`✅ Fixed ${data.name}`);
    }
  }
  
  console.log('Done!');
  process.exit(0);
}

fixUrls();

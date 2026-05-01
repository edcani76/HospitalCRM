import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

// Valid Unsplash URLs for pets
const VALID_URLS = {
  'Buddy': 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400',
  'Lucy': 'https://images.unsplash.com/photo-1518717758536-085ae29035b6?w=400',
  'Whiskers': 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
  'Max': 'https://images.unsplash.com/photo-1589941013453-ec214d290a5b?w=400',
  'Rocky': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
  'Luna': 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=400',
  'Simba': 'https://images.unsplash.com/photo-1573865526739-10659fecf129?w=400',
  'Kiwi': 'https://images.unsplash.com/photo-1551085254-e7c4f12feb3a?w=400',
  'Charlie': 'https://images.unsplash.com/photo-1537151625747-088f5dd5eb3a?w=400',
  'Bella': 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400',
  'Oliver': 'https://images.unsplash.com/photo-1495360010541-f004c7d7ab3a?w=400',
  'Milo': 'https://images.unsplash.com/photo-1517849845543-1087a5610d5b?w=400',
};

async function updateUrls() {
  const snapshot = await getDocs(collection(db, 'pets'));
  
  for (const document of snapshot.docs) {
    const data = document.data();
    if (VALID_URLS[data.name]) {
      await updateDoc(doc(db, 'pets', document.id), {
        imageUrl: VALID_URLS[data.name]
      });
      console.log(`✅ Updated ${data.name}`);
    }
  }
  
  console.log('\nDone! All pet photos updated with valid URLs.');
  process.exit(0);
}

updateUrls();

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

// Use loremflickr.com with animal tags
const PET_PHOTOS = {
  'Buddy': 'https://loremflickr.com/400/300/dog',      // Dog
  'Lucy': 'https://loremflickr.com/400/300/dog',      // Dog  
  'Whiskers': 'https://loremflickr.com/400/300/cat',     // Cat
  'Max': 'https://loremflickr.com/400/300/dog',       // Dog
  'Rocky': 'https://loremflickr.com/400/300/dog',      // Dog
  'Luna': 'https://loremflickr.com/400/300/cat',      // Cat
  'Simba': 'https://loremflickr.com/400/300/cat',      // Cat
  'Kiwi': 'https://loremflickr.com/400/300/bird',     // Bird
  'Charlie': 'https://loremflickr.com/400/300/dog',    // Dog
  'Bella': 'https://loremflickr.com/400/300/dog',     // Dog
  'Oliver': 'https://loremflickr.com/400/300/cat',     // Cat
  'Milo': 'https://loremflickr.com/400/300/dog',      // Dog
};

async function updatePhotos() {
  try {
    const snapshot = await getDocs(collection(db, 'pets'));
    
    for (const document of snapshot.docs) {
      const data = document.data();
      if (PET_PHOTOS[data.name]) {
        await updateDoc(doc(db, 'pets', document.id), {
          imageUrl: PET_PHOTOS[data.name]
        });
        console.log(`✅ Updated ${data.name}`);
      }
    }
    
    console.log('\n✅ All pet photos updated with loremflickr.com!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updatePhotos();

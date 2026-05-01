import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

// Use picsum.photos - always works with just ID numbers
const PET_PHOTOS = {
  'Buddy': 'https://picsum.photos/id/237/400/300',     // Dog photo
  'Lucy': 'https://picsum.photos/id/238/400/300',     // Dog photo
  'Whiskers': 'https://picsum.photos/id/40/400/300',      // Cat photo
  'Max': 'https://picsum.photos/id/239/400/300',       // Dog photo
  'Rocky': 'https://picsum.photos/id/240/400/300',      // Dog photo
  'Luna': 'https://picsum.photos/id/41/400/300',       // Cat photo
  'Simba': 'https://picsum.photos/id/42/400/300',      // Cat photo
  'Kiwi': 'https://picsum.photos/id/65/400/300',       // Bird photo
  'Charlie': 'https://picsum.photos/id/241/400/300',    // Dog photo
  'Bella': 'https://picsum.photos/id/242/400/300',     // Dog photo
  'Oliver': 'https://picsum.photos/id/43/400/300',     // Cat photo
  'Milo': 'https://picsum.photos/id/243/400/300',      // Dog photo
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
    
    console.log('\n✅ All pet photos updated with picsum.photos!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updatePhotos();

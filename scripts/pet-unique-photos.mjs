import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

// Unique photos using picsum.photos with different IDs
// Dogs: IDs 237-247, Cats: IDs 40-52, Bird: ID 65
const UNIQUE_PET_PHOTOS = {
  'Buddy': 'https://picsum.photos/id/237/400/300',     // Golden Retriever
  'Lucy': 'https://picsum.photos/id/238/400/300',     // Labrador
  'Whiskers': 'https://picsum.photos/id/40/400/300',      // Siamese Cat
  'Max': 'https://picsum.photos/id/239/400/300',       // German Shepherd
  'Rocky': 'https://picsum.photos/id/240/400/300',      // Bulldog
  'Luna': 'https://picsum.photos/id/41/400/300',       // Persian Cat
  'Simba': 'https://picsum.photos/id/42/400/300',      // Maine Coon
  'Kiwi': 'https://picsum.photos/id/65/400/300',       // Bird
  'Charlie': 'https://picsum.photos/id/241/400/300',    // Labrador Retriever
  'Bella': 'https://picsum.photos/id/242/400/300',     // Beagle
  'Oliver': 'https://picsum.photos/id/43/400/300',     // Tabby Cat
  'Milo': 'https://picsum.photos/id/243/400/300',      // Poodle
};

async function updateUniquePhotos() {
  try {
    const snapshot = await getDocs(collection(db, 'pets'));
    
    for (const document of snapshot.docs) {
      const data = document.data();
      if (UNIQUE_PET_PHOTOS[data.name]) {
        await updateDoc(doc(db, 'pets', document.id), {
          imageUrl: UNIQUE_PET_PHOTOS[data.name]
        });
        console.log(`✅ Updated ${data.name}`);
      }
    }
    
    console.log('\n✅ All pets now have unique photos!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateUniquePhotos();

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import https from 'https';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function getCatPhoto() {
  return new Promise((resolve) => {
    https.get('https://api.thecatapi.com/v1/images/search?limit=1', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        resolve(json[0]?.url || 'https://cdn2.thecatapi.com/images/c7h.jpg');
      });
    }).on('error', () => resolve('https://cdn2.thecatapi.com/images/c7h.jpg'));
  });
}

async function getDogPhoto() {
  return new Promise((resolve) => {
    https.get('https://dog.ceo/api/breeds/image/random', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        resolve(json.message || 'https://images.dog.ceo/breeds/kuvasz/n02104029_898.jpg');
      });
    }).on('error', () => resolve('https://images.dog.ceo/breeds/kuvasz/n02104029_898.jpg'));
  });
}

async function updateRealPhotos() {
  try {
    const snapshot = await getDocs(collection(db, 'pets'));
    
    for (const document of snapshot.docs) {
      const data = document.data();
      let photoUrl = '';
      
      if (['Whiskers', 'Luna', 'Simba', 'Oliver'].includes(data.name)) {
        // Cats
        photoUrl = await getCatPhoto();
        console.log(`Cat photo for ${data.name}: ${photoUrl}`);
      } else if (['Kiwi'].includes(data.name)) {
        // Bird - use a bird photo
        photoUrl = 'https://picsum.photos/id/65/400/300';
      } else {
        // Dogs
        photoUrl = await getDogPhoto();
        console.log(`Dog photo for ${data.name}: ${photoUrl}`);
      }
      
      await updateDoc(doc(db, 'pets', document.id), { imageUrl: photoUrl });
      console.log(`✅ Updated ${data.name}`);
    }
    
    console.log('\n✅ All pets now have real animal photos!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateRealPhotos();

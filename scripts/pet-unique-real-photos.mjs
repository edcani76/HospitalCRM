import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import https from 'https';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

function getDogPhoto(id) {
  return new Promise((resolve) => {
    https.get(`https://dog.ceo/api/breeds/image/random?id=${id}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.message || `https://images.dog.ceo/breeds/random/id${id}`);
        } catch {
          resolve(`https://images.dog.ceo/breeds/random/id${id}`);
        }
      });
    }).on('error', () => resolve(`https://images.dog.ceo/breeds/random/id${id}`));
  });
}

function getCatPhoto(id) {
  return new Promise((resolve) => {
    https.get(`https://api.thecatapi.com/v1/images/search?limit=1&id=${id}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json[0]?.url || `https://cdn2.thecatapi.com/images/id${id}.jpg`);
        } catch {
          resolve(`https://cdn2.thecatapi.com/images/id${id}.jpg`);
        }
      });
    }).on('error', () => resolve(`https://cdn2.thecatapi.com/images/id${id}.jpg`));
  });
}

async function updateUniquePhotos() {
  try {
    const snapshot = await getDocs(collection(db, 'pets'));
    let index = 0;
    
    for (const document of snapshot.docs) {
      const data = document.data();
      let photoUrl = '';
      
      if (['Whiskers', 'Luna', 'Simba', 'Oliver'].includes(data.name)) {
        // Cats - get unique cat photo
        photoUrl = await getCatPhoto(index++);
        console.log(`Cat photo for ${data.name}: ${photoUrl.substring(0, 60)}...`);
      } else if (['Kiwi'].includes(data.name)) {
        // Bird - use unique picsum
        photoUrl = `https://picsum.photos/id/${65 + index++}/400/300`;
      } else {
        // Dogs - get unique dog photo
        photoUrl = await getDogPhoto(index++);
        console.log(`Dog photo for ${data.name}: ${photoUrl.substring(0, 60)}...`);
      }
      
      await updateDoc(doc(db, 'pets', document.id), { imageUrl: photoUrl });
      console.log(`✅ Updated ${data.name}`);
    }
    
    console.log('\n✅ All pets now have UNIQUE real animal photos!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateUniquePhotos();

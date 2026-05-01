/**
 * Check and fix pet imageUrl fields in Firestore
 * Run with: node scripts/check-pet-photos.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Load Firebase config
const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Pet image URLs from seed data
const PET_IMAGE_URLS = {
  'Buddy': 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400',
  'Lucy': 'https://images.unsplash.com/photo-1518717758536-085ae29035b6d?auto=format&fit=crop&q=80&w=400',
  'Whiskers': 'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&q=80&w=400',
  'Max': 'https://images.unsplash.com/photo-1589941013453-10659fecf129?auto=format&fit=crop&q=80&w=400',
  'Rocky': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&q=80&w=400',
  'Luna': 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?auto=format&fit=crop&q=80&w=400',
  'Simba': 'https://images.unsplash.com/photo-1573865526739-10659fecf129?auto=format&fit=crop&q=80&w=400',
  'Kiwi': 'https://images.unsplash.com/photo-1551085254-e7c4f12feb3a?auto=format&fit=crop&q=80&w=400',
  'Charlie': 'https://images.unsplash.com/photo-1537151625747-10659fecf129?auto=format&fit=crop&q=80&w=400',
  'Bella': 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400',
  'Oliver': 'https://images.unsplash.com/photo-1495360010541-f004c7d7ab3a?auto=format&fit=crop&q=80&w=400',
  'Milo': 'https://images.unsplash.com/photo-1517849845543-1087a5610d5b?auto=format&fit=crop&q=80&w=400',
};

async function checkAndFixPetPhotos() {
  try {
    console.log('Fetching pets from Firestore...\n');
    const snapshot = await getDocs(collection(db, 'pets'));
    
    let needsFix = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const name = data.name;
      const hasImageUrl = data.imageUrl && data.imageUrl.startsWith('http');
      
      console.log(`${name}: ${hasImageUrl ? '✅' : '❌'} ${data.imageUrl || '(no imageUrl)'}`);
      
      if (!hasImageUrl && PET_IMAGE_URLS[name]) {
        needsFix.push({ id: doc.id, name, url: PET_IMAGE_URLS[name] });
      }
    });
    
    if (needsFix.length > 0) {
      console.log(`\nFixing ${needsFix.length} pets without valid imageUrl...`);
      
      for (const pet of needsFix) {
        await updateDoc(doc(db, 'pets', pet.id), {
          imageUrl: pet.url
        });
        console.log(`✅ Updated ${pet.name} with photo URL`);
      }
    } else {
      console.log('\n✅ All pets have valid imageUrl!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAndFixPetPhotos();

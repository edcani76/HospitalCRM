import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '..', 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const SERVER_URL = 'http://localhost:3000';

interface PetDoc {
  id: string;
  imageUrl?: string;
  photo?: string;
  name: string;
  ownerUid?: string;
  ownerName?: string;
}

function isDriveUrl(url: string): boolean {
  return url.includes('drive.google.com') || url.includes('lh3.googleusercontent.com');
}

function isBase64Url(url: string): boolean {
  return url.startsWith('data:');
}

function isFirebaseStorageUrl(url: string): boolean {
  return url.includes('firebasestorage') || url.includes('storage.googleapis.com');
}

async function downloadFromFirebase(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch Firebase image: ${response.status} ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function decodeBase64(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error('Invalid base64 data URL');
  return Buffer.from(match[2], 'base64');
}

function getMimeType(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  return 'image/jpeg';
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif' };
  return map[mimeType] || '.jpg';
}

async function uploadToDrive(buffer: Buffer, ownerName: string, petName: string, ext: string): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  const fileName = `${petName.replace(/\s+/g, '_')}${ext}`;
  formData.append('file', blob, fileName);
  formData.append('ownerName', ownerName);
  formData.append('petName', petName);
  formData.append('fileType', 'photos');

  const response = await fetch(`${SERVER_URL}/api/upload-to-drive`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Upload failed: ${response.status} - ${error.message || response.statusText}`);
  }

  const result = await response.json();
  return result.data?.downloadUrl || result.data?.webViewLink;
}

async function migratePetImages() {
  console.log('========================================');
  console.log('Pet Image Migration: Firestore → Google Drive');
  console.log('========================================\n');

  try {
    const snapshot = await getDocs(collection(db, 'pets'));
    const pets = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PetDoc));
    console.log(`Found ${pets.length} total pets\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    let noImage = 0;

    for (let i = 0; i < pets.length; i++) {
      const pet = pets[i];
      const imageUrl = pet.imageUrl || pet.photo;

      if (!imageUrl) {
        console.log(`[${i + 1}/${pets.length}] Skip (no image): ${pet.name} (${pet.id})`);
        noImage++;
        continue;
      }

      if (isDriveUrl(imageUrl)) {
        console.log(`[${i + 1}/${pets.length}] Skip (already Drive): ${pet.name} (${pet.id})`);
        skipped++;
        continue;
      }

      let buffer: Buffer;
      let mimeType = 'image/jpeg';

      try {
        if (isBase64Url(imageUrl)) {
          console.log(`[${i + 1}/${pets.length}] Decoding base64: ${pet.name} (${pet.id})`);
          buffer = decodeBase64(imageUrl);
          mimeType = getMimeType(buffer);
        } else if (isFirebaseStorageUrl(imageUrl)) {
          console.log(`[${i + 1}/${pets.length}] Downloading from Firebase Storage: ${pet.name} (${pet.id})`);
          buffer = await downloadFromFirebase(imageUrl);
          mimeType = getMimeType(buffer);
        } else {
          console.log(`[${i + 1}/${pets.length}] Skip (unknown format): ${pet.name} - ${imageUrl.slice(0, 60)}...`);
          skipped++;
          continue;
        }
      } catch (err: any) {
        console.error(`[${i + 1}/${pets.length}] ✗ Failed to download image: ${pet.name} - ${err.message}`);
        errors++;
        continue;
      }

      const ext = getExtension(mimeType);
      const ownerName = pet.ownerName || pet.ownerUid || 'Unknown';
      const petName = pet.name || 'Unknown';

      try {
        console.log(`[${i + 1}/${pets.length}] Uploading to Drive: ${petName} (${(buffer.length / 1024).toFixed(1)} KB)`);
        const driveUrl = await uploadToDrive(buffer, ownerName, petName, ext);

        await updateDoc(doc(db, 'pets', pet.id), { imageUrl: driveUrl });

        console.log(`  ✓ Migrated: ${pet.name} → ${driveUrl.slice(0, 80)}...`);
        migrated++;
      } catch (err: any) {
        console.error(`  ✗ Upload failed for ${pet.name}: ${err.message}`);
        errors++;
      }

      if (i < pets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n========================================');
    console.log('Migration Complete!');
    console.log('========================================');
    console.log(`✓ Migrated: ${migrated} pets`);
    console.log(`⚡ Skipped: ${skipped} pets (already Drive or unknown format)`);
    console.log(`- No image: ${noImage} pets`);
    console.log(`✗ Errors: ${errors} pets`);
    console.log('========================================\n');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migratePetImages();

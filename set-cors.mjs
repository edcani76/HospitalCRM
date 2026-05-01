/**
 * Set CORS configuration for Firebase Storage bucket
 * Run with: node set-cors.mjs
 */

import { Storage } from '@google-cloud/storage';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const serviceAccountPath = resolve('firebase-service-account.json');
if (!existsSync(serviceAccountPath)) {
  console.error('Error: firebase-service-account.json not found!');
  console.log('\nPlease ensure the service account key is saved as:');
  console.log('  firebase-service-account.json');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

const storage = new Storage({
  projectId: serviceAccount.project_id,
  credentials: serviceAccount
});

const corsConfiguration = [
  {
    origin: ['http://localhost:3000', 'https://localhost:3000'],
    method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-*'],
    maxAgeSeconds: 3600
  }
];

async function setCors() {
  try {
    const bucket = storage.bucket('vetcrm-b3742.firebasestorage.app');
    await bucket.setCorsConfiguration(corsConfiguration);
    console.log('✅ CORS configuration set successfully!');
    console.log('Configuration:', JSON.stringify(corsConfiguration, null, 2));
    console.log('\nWait ~1 minute for changes to propagate, then try uploading again.');
  } catch (error) {
    console.error('Error setting CORS:', error.message);
  }
}

setCors();

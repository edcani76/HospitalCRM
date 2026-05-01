/**
 * Set CORS configuration for Firebase Storage bucket
 * Run with: node scripts/set-cors.js
 * 
 * You need to:
 * 1. Go to Firebase Console > Project Settings > Service Accounts
 * 2. Generate new private key (JSON)
 * 3. Save as firebase-service-account.json in project root
 * 4. Run: node scripts/set-cors.js
 */

const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

// Load service account key
const serviceAccountPath = path.resolve('firebase-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Error: firebase-service-account.json not found!');
  console.log('\nTo fix:');
  console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.log('2. Click "Generate new private key"');
  console.log('3. Save the JSON file as "firebase-service-account.json" in project root');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Initialize storage
const storage = new Storage({
  projectId: serviceAccount.project_id,
  credentials: serviceAccount
});

// CORS configuration
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
    console.log('CORS configuration set successfully!');
    console.log('Configuration:', JSON.stringify(corsConfiguration, null, 2));
  } catch (error) {
    console.error('Error setting CORS:', error.message);
  }
}

setCors();

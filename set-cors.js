const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.resolve('firebase-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Error: firebase-service-account.json not found!');
  console.log('\nPlease download the service account key from:');
  console.log('https://console.firebase.google.com/project/vetcrm-b3742/settings/serviceaccounts/adminsdk');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
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
  } catch (error) {
    console.error('Error setting CORS:', error.message);
  }
}

setCors();

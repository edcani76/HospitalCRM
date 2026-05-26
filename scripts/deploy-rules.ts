import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

async function deployRules() {
  try {
    const serviceAccountPath = path.resolve('firebase-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // Try to get projectId from service account or env
    const projectId = serviceAccount.project_id;
    
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
      });
    }

    console.log(`Deploying Firestore rules for project: ${projectId}...`);
    const rulesPath = path.resolve('firestore.rules');
    const rulesSource = fs.readFileSync(rulesPath, 'utf8');

    // Create a ruleset
    const ruleset = await admin.securityRules().createRuleset({
      source: {
        files: [{
          name: 'firestore.rules',
          content: rulesSource
        }]
      }
    });

    console.log(`Ruleset created: ${ruleset.name}`);

    // Release the ruleset
    await admin.securityRules().releaseFirestoreRuleset(ruleset.name);
    console.log('✅ Firestore rules deployed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to deploy rules:', error);
  }
}

deployRules();

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs';

// Load the service account key used by other admin scripts
const serviceAccountPath = path.resolve('firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const adminApp = initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth(adminApp);

async function ensureAuthUser(email: string, password: string, displayName: string) {
  try {
    const user = await auth.getUserByEmail(email);
    // If the user exists, update password and display name to match our seed expectations
    await auth.updateUser(user.uid, { password, displayName });
    console.log(`✅ Updated existing auth user: ${email}`);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      await auth.createUser({ email, password, displayName });
      console.log(`✅ Created new auth user: ${email}`);
    } else {
      console.error(`⚠️ Failed for ${email}:`, err);
    }
  }
}

async function main() {
  await ensureAuthUser('ecanicula@gmail.com', 'Password123!', 'Ecanicula User');
  await ensureAuthUser('edcani@rocketmail.com', 'Password123!', 'Edcani User');
  process.exit(0);
}

main().catch(console.error);

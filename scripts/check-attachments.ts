import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

async function checkData() {
  const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', 'edcani@rocketmail.com')));
  if (usersSnap.empty) {
    console.log('User not found');
    process.exit(1);
  }
  const user = usersSnap.docs[0];
  console.log('User UID:', user.id);

  const attSnap = await getDocs(collection(db, 'attachments'));
  console.log(`\nAttachments (${attSnap.size}):`);
  attSnap.forEach(d => {
    const data = d.data();
    if (data.ownerUid === user.id || data.clientUid === user.id) {
        console.log(` - Title: ${data.title}, Owner: ${data.ownerUid}, Client: ${data.clientUid}`);
    }
  });

  const allAtt = await getDocs(collection(db, 'attachments'));
  console.log(`\nTotal Attachments in DB: ${allAtt.size}`);
  allAtt.forEach(d => {
      const data = d.data();
      console.log(` - [${d.id}] ${JSON.stringify(data)}`);
  });
}

checkData().catch(console.error);

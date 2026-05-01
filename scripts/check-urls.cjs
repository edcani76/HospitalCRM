const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('../firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const snap = await getDocs(collection(db, 'pets'));
  snap.docs.forEach(doc => {
    const d = doc.data();
    if (['Kiwi', 'Charlie', 'Milo', 'Simba', 'Max'].includes(d.name)) {
      console.log(d.name + ': ' + (d.imageUrl || 'NO URL'));
    }
  });
  process.exit(0);
}
check();

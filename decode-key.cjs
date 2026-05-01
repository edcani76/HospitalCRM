const fs = require('fs');
const path = require('path');

const filePath = path.resolve('firebase-service-account.json');
const content = fs.readFileSync(filePath, 'utf8');
const json = JSON.parse(content);

// Fix private key - replace literal \n with actual newlines
json.private_key = json.private_key.replace(/\n/g, '\n');

// Write back with proper formatting
fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
console.log('✅ Fixed private key');
console.log('Key starts with:', json.private_key.substring(0, 50));

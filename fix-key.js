const fs = require('fs');
const path = require('path');

const filePath = path.resolve('firebase-service-account.json');
const content = fs.readFileSync(filePath, 'utf8');

// Fix the private key - replace literal \n with actual newlines
const fixed = content.replace(/\n/g, '\n');

fs.writeFileSync(filePath, fixed);
console.log('✅ Fixed private key - replaced literal \n with actual newlines');

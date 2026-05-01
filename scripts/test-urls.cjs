const https = require('https');
const pets = {
  'Charlie': 'https://images.unsplash.com/photo-1537151625747-088f5dd5eb3a?w=400',
  'Milo': 'https://images.unsplash.com/photo-1517849845543-1087a5610d5b?w=400',
  'Simba': 'https://images.unsplash.com/photo-1573865526739-10659fecf129?w=400',
  'Max': 'https://images.unsplash.com/photo-1589941013453-ec214d290a5b?w=400',
  'Kiwi': 'https://images.unsplash.com/photo-1551085254-e7c4f12feb3a?w=400'
};

for (const [name, url] of Object.entries(pets)) {
  https.get(url, (res) => {
    console.log(name + ': ' + res.statusCode);
  }).on('error', (e) => {
    console.log(name + ': ERROR - ' + e.message);
  });
}

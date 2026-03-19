const https = require('https');

https.get('https://api.github.com/repos/arianrhodsandlot/retroarch-emscripten-build/contents/retroarch?ref=v1.21.0', {
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const files = JSON.parse(data).map(f => f.name);
    const targets = ['mupen', 'stella', 'pcsx', 'gambatte', 'vba'];
    files.forEach(f => {
      if (targets.some(t => f.includes(t))) {
        console.log(f);
      }
    });
  });
});

const https = require('https');
https.get('https://archive.org/download/n64-romset-ultra-us/Super%20Mario%2064%20%28USA%29.zip', { headers: { Origin: 'https://example.com', 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  console.log(res.statusCode);
  res.on('data', d => process.stdout.write(d));
});

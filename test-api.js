const http = require('http');

const data = JSON.stringify({
  name: "Euro",
  code: "EUR",
  isBaseCurrency: false,
  isActive: true
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/v1/master-data/currencies',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    // Need authorization token... but maybe it's protected by JwtAuthGuard?
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(`STATUS: ${res.statusCode} BODY: ${body}`));
});

req.on('error', e => console.error(`Error: ${e.message}`));
req.write(data);
req.end();

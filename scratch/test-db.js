const net = require('net');

const client = new net.Socket();
client.setTimeout(5000);

console.log('Connecting to 18.141.41.180:5432...');

client.connect(5432, '18.141.41.180', () => {
  console.log('Successfully connected!');
  client.destroy();
});

client.on('error', (err) => {
  console.error('Connection error:', err.message);
});

client.on('timeout', () => {
  console.error('Connection timeout');
  client.destroy();
});

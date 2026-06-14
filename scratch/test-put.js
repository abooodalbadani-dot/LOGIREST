const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  try {
    console.log('Logging in as admin...');
    const loginRes = await request({
      hostname: 'localhost',
      port: 80,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'admin@logirest.local',
      password: 'Password123!'
    });

    console.log('Login status:', loginRes.statusCode);
    if (loginRes.statusCode !== 200) {
      console.error('Login failed:', loginRes.body);
      return;
    }

    const { accessToken } = JSON.parse(loginRes.body);
    console.log('Access token retrieved.');

    console.log('Sending PUT request to restaurant-profile with large logo...');
    const largeLogo = 'A'.repeat(200 * 1024); // 200 KB
    const putRes = await request({
      hostname: 'localhost',
      port: 80,
      path: '/api/v1/admin/restaurant-profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    }, {
      name: 'Test Restaurant',
      address: '123 Test St',
      phone: '1234567890',
      email: 'test@restaurant.com',
      logo: largeLogo
    });

    console.log('PUT status:', putRes.statusCode);
    console.log('PUT headers:', JSON.stringify(putRes.headers, null, 2));
    console.log('PUT body:', putRes.body);
  } catch (err) {
    console.error('Error occurred:', err);
  }
}

run();

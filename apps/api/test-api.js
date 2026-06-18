const fetch = require('node-fetch');

async function test() {
  const res = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@logirest.com', password: 'Password123!' })
  });
  const data = await res.json();
  const token = data.data?.accessToken || data.accessToken;
  
  if (!token) {
    console.log('Login failed:', data);
    return;
  }
  
  const prRes = await fetch('http://localhost:4000/api/v1/procurement/purchase-requests', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const prData = await prRes.json();
  console.log('PR Data:', JSON.stringify(prData, null, 2).substring(0, 1000));
}

test();

// Native fetch is used

async function test() {
  const BASE_URL = 'http://localhost:4000/api/v1';
  console.log('Authenticating...');
  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@otantikrestaurant.com', password: 'Password123!' })
    });
    
    if (!loginRes.ok) {
      const text = await loginRes.text();
      console.error('Login failed:', loginRes.status, text);
      return;
    }
    
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    console.log('Login success. Access Token obtained.');
    
    const endpoints = [
      '/settings/currency',
      '/suppliers',
      '/currencies',
      '/warehouses'
    ];
    
    for (const ep of endpoints) {
      console.log(`\nFetching endpoint: ${ep}...`);
      const res = await fetch(`${BASE_URL}${ep}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept-Language': 'ar',
          'x-branch-id': 'b1', // mock branch ID if needed
          'x-warehouse-id': 'wh1' // mock warehouse ID if needed
        }
      });
      
      console.log(`Response status: ${res.status}`);
      if (!res.ok) {
        const text = await res.text();
        console.error(`Error fetching ${ep}:`, text);
      } else {
        const data = await res.json();
        console.log(`Success! Data content:\n`, JSON.stringify(data, null, 2));
      }
    }
  } catch (err) {
    console.error('Execution failed:', err);
  }
}

test();

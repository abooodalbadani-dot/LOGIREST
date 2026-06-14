async function testCreate() {
  const BASE_URL = 'http://localhost:4000/api/v1';

  console.log('1. Attempting login as admin...');
  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@logirest.local',
        password: 'Password123!'
      })
    });

    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`Login failed with status ${loginRes.status}: ${errText}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login successful! Token acquired.');

    console.log('2. Attempting to create a new branch...');
    const createRes = await fetch(`${BASE_URL}/branches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Otantik Restaurant Test Branch',
        code: 'OT-001',
        isActive: true
      })
    });

    console.log('Create Branch response status:', createRes.status);
    const createData = await createRes.json();
    console.log('Create Branch response data:', JSON.stringify(createData, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCreate();

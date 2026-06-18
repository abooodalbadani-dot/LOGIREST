async function run() {
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@otantikrestaurant.com', password: 'Password123!' })
  });
  const loginData = await loginRes.json() as { accessToken: string };
  const token = loginData.accessToken;

  const res = await fetch('http://localhost:4000/api/v1/suppliers', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  console.log('Status:', res.status);
  console.log('Body:', await res.json());
}
run().catch(console.error);

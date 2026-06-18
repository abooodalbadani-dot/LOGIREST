async function run() {
  console.log('Logging in...');
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@otantikrestaurant.com', password: 'Password123!' })
  });
  const loginData = await loginRes.json() as { accessToken: string };
  const token = loginData.accessToken;

  // Retrieve user scopes to inject active scope headers
  const profileRes = await fetch('http://localhost:4000/api/v1/auth/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const profileData = await profileRes.json() as any;
  console.log('User role:', profileData.user?.role);
  
  // Use the branch ID from the user's first scope
  const targetBranchId = '00ddac3d-45ab-4d92-bb33-57da07188c55';
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-branch-id': targetBranchId,
  };
  console.log('Using headers:', headers);

  console.log('Fetching /suppliers...');
  const res = await fetch('http://localhost:4000/api/v1/suppliers', { headers });
  console.log('Status /suppliers:', res.status);
  console.log('Body /suppliers:', await res.json());
}
run().catch(console.error);

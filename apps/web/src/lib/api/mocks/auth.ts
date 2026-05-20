export const authMocks: Record<string, unknown> = {
 'POST /auth/login': {
 user: {
 id: 'user-1',
 name: 'بركات امين',
 email: 'admin@demo.com',
 role: 'ADMIN',
 scopes: [
 { branch_id: 'br-1', warehouse_id: null, department_id: null },
 ],
 locale: 'ar',
 status: 'ACTIVE',
 language: 'ar',
 },
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjogeyJpZCI6ICJ1c2VyLTEiLCAibmFtZSI6ICLYqNix2YPYp9iqINin2YXZitmGIiwgImVtYWlsIjogImFkbWluQGRlbW8uY29tIiwgInJvbGUiOiAiQURNSU4iLCAic2NvcGVzIjogW3siYnJhbmNoX2lkIjogImJyLTEiLCAid2FyZWhvdXNlX2lkIjogbnVsbCwgImRlcGFydG1lbnRfaWQiOiBudWxsfV0sICJsb2NhbGUiOiAiYXIiLCAic3RhdHVzIjogIkFDVElWRSIsICJsYW5ndWFnZSI6ICJhciJ9LCAiZXhwIjogMTc3NjkyNjQxNX0=.signature',
 },
 'POST /auth/forgot-password': {
 message: 'Reset link sent successfully',
 },
  'POST /auth/reset-password': {
    message: 'Password reset successfully',
  },
  'PUT /auth/profile': (body: unknown) => {
    return body;
  },
  'POST /auth/profile/avatar': () => {
    return { avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kitchen-store-user&backgroundColor=teal' };
  },
};

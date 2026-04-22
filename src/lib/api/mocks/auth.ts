export const authMocks: Record<string, unknown> = {
  'POST /auth/login': {
    user: {
      id: 'user-1',
      name: 'أحمد المنصور',
      email: 'admin@demo.com',
      role: 'ADMIN',
      scopes: [
        { branch_id: 'br-1', warehouse_id: null, department_id: null },
      ],
      locale: 'ar',
    },
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoidXNlci0xIiwibmFtZSI6Itij2K3ZhdivINin2YTZhdmG2LXZiNixIiwiZW1haWwiOiJhZG1pbkBkZW1vLmNvbSIsInJvbGUiOiJBRE1JTiIsInNjb3BlcyI6W3siYnJhbmNoX2lkIjoiYnItMSIsIndhcmVob3VzZV9pZCI6bnVsbCwiZGVwYXJ0bWVudF9pZCI6bnVsbH1dLCJsb2NhbGUiOiJhciJ9LCJleHAiOjE3NzY5MjY0MTV9.signature',
  },
};

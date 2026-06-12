SELECT "userId", action, "createdAt" FROM audit_logs WHERE action = 'PASSWORD_CHANGED' ORDER BY "createdAt" DESC LIMIT 5;

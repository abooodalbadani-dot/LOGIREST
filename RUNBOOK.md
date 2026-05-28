# LogiRest — Production Security Runbook

## Post-Seeding Security Checklist & Password Rotation

This runbook outlines mandatory security procedures for deployment operators bootstrapping a new production instance of LogiRest.

### 1. Seeding the First Administrator

Seeding reference data and creating the initial security administrator is controlled via environment variables.

1. Configure the following environment variables in your secure container configuration or deployment orchestrator:
   - `INITIAL_ADMIN_EMAIL`: The login identifier (e.g. `admin@yourcompany.com`).
   - `INITIAL_ADMIN_PASSWORD`: A temporary, high-entropy password.
   - `INITIAL_ADMIN_NAME`: The display name (e.g. `Lead Admin`).

2. Spin up the database container and trigger reference seeding:
   ```bash
   npx prisma db seed --schema=apps/api/prisma/schema.prisma
   ```

---

### 2. Mandatory Post-Seeding Password Rotation

> [!CAUTION]
> Under no circumstances should the seeded environment password remain in active use. You MUST perform password rotation immediately upon database bootstrap.

1. Open your browser and navigate to the LogiRest login portal.
2. Sign in using the initial seeded credentials.
3. Upon successful login, click your user profile avatar in the upper right header, or navigate directly to `/profile`.
4. Locate the **Change Password** security panel.
5. Configure a new secure password (minimum 12 characters, including uppercase, lowercase, numbers, and special symbols).
6. Click **Update Security Key** and verify the success toast alert.

---

### 3. Production Environment Sanitation

> [!IMPORTANT]
> To prevent password re-exposure risks, you must sanitize the active container environment:

1. Access your deployment orchestrator interface (e.g. AWS ECS Task definitions, Kubernetes deployment manifests, or Vercel env configs).
2. **Delete the `INITIAL_ADMIN_PASSWORD` environment variable completely**.
3. Redeploy or reload the container configuration. Since the admin user has already been seeded in the persistent database, subsequent container restarts will bypass the admin seed check safely without any credential exposure.

---

### 4. SMTP Encryption Key Rotation Procedure

To rotate the `ENCRYPTION_KEY` environment variable securely in production without losing the configured SMTP mail credentials:

1. **Stop Application Servers**: Temporarily stop the LogiRest API container instance(s) to guarantee no database updates occur during the key rotation.
2. **Execute the Migration Script**: Run the standalone rotation script using `npx ts-node` or inside your node container workspace. You must supply `OLD_ENCRYPTION_KEY` and `NEW_ENCRYPTION_KEY` as environment variables:
   ```bash
   # From root workspace directory:
   OLD_ENCRYPTION_KEY="your-old-key" NEW_ENCRYPTION_KEY="your-new-secure-key" npx ts-node -P apps/api/tsconfig.json apps/api/src/scripts/rotate-key.ts
   ```
3. **Update Server Settings**:
   - Update your deployment environment config (e.g. AWS Secrets Manager, Kubernetes secrets, `.env` file) by setting `ENCRYPTION_KEY` to the value of your new key.
   - Delete/clear the temporary `OLD_ENCRYPTION_KEY` and `NEW_ENCRYPTION_KEY` parameters.
4. **Restart Application Servers**: Spin up/re-deploy the LogiRest API containers. Verify normal system log starts and check outbox alerts to confirm SMTP operations decrypt successfully.


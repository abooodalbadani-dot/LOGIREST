# Quickstart Guide: Authentication & Security Setup

Follow this guide to set up the authentication and scope isolation environment in your local development workspace.

## 1. Environment Variables Configuration

Ensure the following variables are configured in your local `apps/api/.env` file:

```bash
# JWT Token Signing Secrets (Generate cryptographically secure keys for production)
JWT_ACCESS_SECRET="dev-jwt-access-secret-key-at-least-32-chars-long"
JWT_REFRESH_SECRET="dev-jwt-refresh-secret-key-at-least-32-chars-long"

# Frontend Application URL for CORS
FRONTEND_URL="http://localhost:3000"
```

---

## 2. Apply Database Migration

Since we added the `RefreshToken` model and linked it to the `User` model, you must apply the database schema changes to your database.

Run the following command from the workspace root:

```bash
npx turbo run prisma:migrate --filter=api
```

This will run `prisma migrate dev` inside `apps/api`, create the SQL migration script, apply it to the PostgreSQL database, and regenerate the Prisma Client.

---

## 3. Seed Users & Test Roles

The seed script should ensure there are test users with various roles and warehouse scopes.
To seed the database, run:

```bash
npx turbo run prisma:seed --filter=api
```

### Seeding Data Checklist
Make sure the seed script maps:
- `user1@logirest.com` -> Password: `password123` -> Role: `WH_KEEPER` -> Scopes: Warehouse A
- `admin@logirest.com` -> Password: `adminpassword` -> Role: `ADMIN` -> Scopes: All Warehouses

---

## 4. Run API Services Locally

Ensure the API service runs correctly and connects to the database:

```bash
npm run dev --filter=api
```

---

## 5. Verification Check

You can verify the setup by running the unit tests for authentication:

```bash
npx turbo run test --filter=api
```

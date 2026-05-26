# Quickstart Guide: Sprint 0 Readiness Hardening

This guide provides steps to configure, run, and verify the Sprint 0 fixes in your local development environment.

## 1. Environment & Container Secrets Setup
Copy the example environment file to your root directory:
```bash
cp docker-compose.env.example .env
```
Populate `.env` with actual development passwords and secrets. Launch containers:
```bash
docker compose up -d
```

## 2. Apply Database Constraints & Migrations
Ensure PostgreSQL check constraints and enum updates are applied:
```bash
npx prisma migrate dev --name add_voided_status_and_check_constraints
```

## 3. Verify SMTP Error Warnings
1. Temporarily clear SMTP settings in Admin settings or `.env`.
2. Trigger an action that initiates an outbox event (e.g., submit a workflow document).
3. Verify that:
   - The outbox worker fails.
   - An administrator notification alert appears in the database `NotificationLog`.

## 4. Test Role API Connection
Ensure the Admin Roles page shows live data:
1. Navigate to `/admin/roles` in the browser.
2. Verify the browser network inspector shows a request to `/api/v1/admin/roles` returning a JSON list rather than using a mock client array.

## 5. Verify Document Voiding Workflow
1. Navigate to a posted Goods Received Note or Issue.
2. Log in as an Administrator (`ADMIN`) or Inventory Manager (`INV_MGR`).
3. Click the "Void Document" button, enter a mandatory comment, and click confirm.
4. Verify the document status badge is `VOIDED`, and new negative adjustment rows appear in the Stock Ledger.

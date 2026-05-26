# Research: Sprint 0 Readiness Hardening

This document records architectural decisions, rationales, and investigated alternatives for critical pre-production blockers.

## Decisions & Rationales

### 1. Secrets Externalization in docker-compose
- **Decision**: Externalize all secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `POSTGRES_PASSWORD`, `DATABASE_URL`) to an environment variable configuration file (`.env`) that is ignored by Git, and reference them dynamically inside `docker-compose.yml`.
- **Rationale**: Alignment with the 12-Factor App methodology for configuration management. Commit history remains secure, and secrets are configured only at deploy-time.
- **Alternatives Considered**: 
  - *Hardcoded default passwords with runtime warning overrides*: High risk of developer oversight deploying defaults to production.
  - *Docker Secrets*: Required Docker Swarm or Kubernetes clusters, adding unnecessary infrastructure complexity.

### 2. Database-Level Stock Quantity Constraints
- **Decision**: Add custom PostgreSQL `CHECK` constraints on tables `warehouse_items` and `warehouse_item_lots` ensuring `qty_on_hand` and `qty_allocated` are strictly non-negative.
- **Rationale**: Serves as the ultimate fail-safe. If application validation fails, has race conditions, or if raw SQL queries bypass business logic, PostgreSQL natively rejects negative inventory states.
- **Alternatives Considered**: 
  - *Application-Only Validation*: Vulnerable to concurrency race conditions (e.g. double-spending/issuing the same lot concurrently).

### 3. SMTP Configuration Error Propagation
- **Decision**: Make `EmailService.sendEmail()` explicitly return a boolean status (`false`) or error when SMTP configurations are unconfigured, and have the outbox worker capture this, transition status to `FAILED` with error metadata, and write to the internal `NotificationLog` targeting system administrators.
- **Rationale**: Preserves outbox durability and alerts administrators immediately to unconfigured notification delivery pathways instead of silent drops.
- **Alternatives Considered**: 
  - *Throwing exception*: Could halt the background worker loop entirely or cause crash loops.
  - *Quiet logging*: Logs are easily ignored by business managers; in-system alerts ensure visibility.

### 4. Posted Document Void/Reversal Ledger Workflow
- **Decision**: Implement a database transaction-isolated ledger reversal engine that creates corresponding offsetting negative/positive entries in the `StockLedger` and `CostLedger`, recalculates Weighted Average Cost (WAC) history dynamically, and updates status to `VOIDED`.
- **Rationale**: Ledger integrity dictates that historical records cannot be deleted. Corrections must be recorded as new ledger entries that bring the cumulative sum back to the original balance.
- **Alternatives Considered**:
  - *Document Deletion*: Rejects auditing compliance, corrupts stock tracking history, and leaves ledger mismatches.
  - *State-Only Update*: If status is changed without ledger corrections, stock levels will remain incorrect.

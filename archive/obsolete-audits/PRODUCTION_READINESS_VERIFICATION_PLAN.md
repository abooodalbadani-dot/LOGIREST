# Production Readiness Verification Plan

> **System:** kitchen-store-inventory-system  
> **Context:** Multi-warehouse inventory management with procurement, operations, stocktake, and reporting  
> **Goal:** Prove the system works under production conditions  
> **Methodology:** Evidence-based verification — each criterion must produce a signed-off artifact  

---

## Table of Contents

1. [UAT Plan](#1-uat-plan)
2. [Load Testing Plan](#2-load-testing-plan)
3. [Concurrency Testing Plan](#3-concurrency-testing-plan)
4. [Inventory Integrity Verification](#4-inventory-integrity-verification)
5. [Backup & Restore Verification](#5-backup--restore-verification)
6. [Disaster Recovery Drill](#6-disaster-recovery-drill)
7. [Security Penetration Checklist](#7-security-penetration-checklist)
8. [Go-Live Checklist](#8-go-live-checklist)
9. [Rollback Checklist](#9-rollback-checklist)

---

## 1. UAT Plan

### 1.1 Objective
Confirm that each user role can complete their real-world workflows end-to-end on a production-like environment (staging) with actual business data.

### 1.2 Environment
- **Staging** — mirrors production infrastructure (DB size, network topology, auth provider)
- **Data** — anonymised production snapshot + synthetic edge-case records
- **Access** — test accounts for every role

### 1.3 Participant Matrix

| Role | Tested By | Workflows |
|------|-----------|-----------|
| **Warehouse Keeper** | WH team lead | Create issue, receive transfer, count stocktake, view inventory balance |
| **Procurement Officer** | Procurement lead | Create PR → Submit → Approve → Convert to PO → Submit PO → Approve PO → Receive GRN → Post GRN |
| **Inventory Manager** | Ops manager | Create adjustment → Submit → Approve → Post; Create transfer → Ship → Receive → Post |
| **Kitchen Manager** | Chef / KM | Create kitchen request → Submit → Fulfill |
| **Admin / GM** | System admin | Manage users, roles, settings; view audit logs; run reports |
| **Auditor** | Internal audit | View audit logs, run inventory reports, verify WAC history |

### 1.4 Test Scenarios (by domain)

#### 1.4.1 Procurement

| ID | Scenario | Steps | Pass Criteria |
|----|----------|-------|---------------|
| UAT-PR-01 | Full PR lifecycle | Create PR → add lines → submit → approve → convert to PO | PO created with all PR lines |
| UAT-PR-02 | PR rejection | Create PR → submit → reject | Status=REJECTED, reason logged |
| UAT-PR-03 | PR cancellation | Create PR (DRAFT) → cancel | Status=CANCELLED |
| UAT-PO-01 | Full PO lifecycle | Create PO → submit → approve → (receive via GRN) | PO status=FULFILLED after GRN post |
| UAT-PO-02 | PO cancellation (unapproved) | Create PO → cancel | Status=CANCELLED |
| UAT-GRN-01 | GRN receipt + post | Receive PO items as GRN → scan lots → post | Inventory + WAC updated; GRN status=POSTED |
| UAT-GRN-02 | GRN with partial receipt | Receive partial qty against PO | PO shows PARTIAL; GRN reflects partial |
| UAT-GRN-03 | GRN cancellation | Cancel GRN before posting | Status=CANCELLED |

#### 1.4.2 Operations

| ID | Scenario | Steps | Pass Criteria |
|----|----------|-------|---------------|
| UAT-ISS-01 | Full issue lifecycle | Create issue → add items → submit → post | Stock reduced; WAC recalculated; ledger entries created |
| UAT-TRF-01 | Full transfer lifecycle | Create transfer → ship → receive → post | Source wh stock ↓, dest wh stock ↑; WAC maintained |
| UAT-TRF-02 | Transfer dispute | Receive transfer with discrepancy → create dispute | Dispute record created; audit trail preserved |
| UAT-ADJ-01 | Full adjustment lifecycle | Create adjustment (IN) → submit → approve → post | Stock increased; reason code logged |
| UAT-ADJ-02 | Full adjustment lifecycle (OUT) | Create adjustment (OUT) → submit → approve → post | Stock decreased; WAC recalculated |
| UAT-ADJ-03 | Adjustment rejection | Create adjustment → submit → reject | Status=REJECTED; stock unchanged |
| UAT-KR-01 | Full kitchen request lifecycle | Create KR → submit → fulfill | Items issued from inventory; KR=FULFILLED |
| UAT-KR-02 | KR cancellation | Cancel KR before fulfillment | Status=CANCELLED; no inventory impact |

#### 1.4.3 Stocktake

| ID | Scenario | Steps | Pass Criteria |
|----|----------|-------|---------------|
| UAT-ST-01 | Full stocktake lifecycle | Create session → start → count → submit → approve → post | Discrepancies posted as adjustments; session=POSTED |
| UAT-ST-02 | Recount | After variance review → request recount → recount → re-submit | Variance resolved or re-flagged |
| UAT-ST-03 | Stocktake with zero variance | Count matches system → approve → post | No adjustments created; session=POSTED |

#### 1.4.4 Security & Admin

| ID | Scenario | Steps | Pass Criteria |
|----|----------|-------|---------------|
| UAT-SEC-01 | Role-based access | Login as WH_KEEPER → attempt PO approval | 403 Forbidden |
| UAT-SEC-02 | Warehouse scope isolation | Login with wh1 scope → verify cannot see wh2 data | Data scoped correctly |
| UAT-SEC-03 | Idempotency | Submit same request twice with same idempotency key | Second request returns 409; no duplicate |
| UAT-SEC-04 | Optimistic locking | Two users load same doc → both edit → second save | Second user gets 409 conflict |
| UAT-ADM-01 | User management | Admin creates user → assigns role → deactivate → reactivate | User state transitions work |

#### 1.4.5 Reporting

| ID | Scenario | Steps | Pass Criteria |
|----|----------|-------|---------------|
| UAT-RPT-01 | Dashboard KPIs | View dashboard | All widgets load; totals match underlying data |
| UAT-RPT-02 | WAC history report | View WAC history for a high-volume item | Entries match all post events chronologically |
| UAT-RPT-03 | Lot trace report | Trace a lot from GRN through to issue | Complete custody chain visible |
| UAT-RPT-04 | Export | Export movements report to XLSX | File downloads; data matches screen |

### 1.5 Sign-off Criteria
- 100% of UAT scenarios executed
- Zero P0/P1 defects open
- All P2/P3 defects triaged with documented workarounds
- Each role signs off their workflow section

### 1.6 Artifact
`sign-off/UAT_SIGN_OFF.pdf` — signed by each role representative.

---

## 2. Load Testing Plan

### 2.1 Objective
Determine if the system meets performance SLAs under expected peak load:  
- **Max concurrent users:** 200  
- **Peak transactions/minute:** 1,200  
- **P95 API response time:** < 2 seconds  
- **P99 API response time:** < 5 seconds  

### 2.2 Tooling
- **k6** (script-based, JS) for API load testing  
- **Artillery** for WebSocket/realtime and complex session simulation  
- **Grafana + Prometheus** (already deployed) for real-time server metrics  

### 2.3 Test Data

| Object | Volume | Notes |
|--------|--------|-------|
| Items | 50,000 | Mix of batched/unbatched |
| Warehouses | 20 | 10 active, 5 high-volume, 5 low-volume |
| Open POs | 500 | Distributed across warehouses |
| Inventory records | 500,000 | ~10 items/warehouse average |
| Users | 200 | Concurrent sessions |

### 2.4 Test Scenarios

#### 2.4.1 Read-Heavy (Dashboard & Reports)

| ID | Scenario | Rate | Duration | Metrics |
|----|----------|------|----------|---------|
| LD-DASH-01 | Dashboard KPI load | 50 req/s | 10 min | Response time, error rate |
| LD-DASH-02 | Inventory balance search | 30 req/s | 10 min | P95 < 3s (paginated) |
| LD-DASH-03 | Lot trace + WAC history | 20 req/s | 10 min | P95 < 5s (joins heavy) |
| LD-DASH-04 | Report exports (XLSX) | 5 req/s | 5 min | P95 < 30s (file generation) |

#### 2.4.2 Write-Heavy (Operations)

| ID | Scenario | Rate | Duration | Metrics |
|----|----------|------|----------|---------|
| LD-WR-01 | Concurrent PR creation | 20/s | 10 min | P95 < 2s; no 409 spike |
| LD-WR-02 | Concurrent GRN post | 10/s | 10 min | P95 < 3s; inventory + WAC consistency |
| LD-WR-03 | Concurrent issue post | 15/s | 10 min | P95 < 3s; stock decrement accuracy |
| LD-WR-04 | Concurrent transfer ship/receive | 10/s | 10 min | P95 < 3s; dual-warehouse consistency |
| LD-WR-05 | Stocktake count updates | 30/s | 10 min | P95 < 1s (lightweight updates) |

#### 2.4.3 Mixed Workload

| ID | Scenario | Rate | Duration | Metrics |
|----|----------|------|----------|---------|
| LD-MIX-01 | Typical morning peak (80% read, 20% write) | 40 req/s | 30 min | All SLA targets |
| LD-MIX-02 | Month-end close (50% read, 50% write + stocktake) | 60 req/s | 30 min | P95 < 4s; no cascade failures |
| LD-MIX-03 | Sustained peak (200 concurrent users) | 80 req/s | 60 min | No memory leak; CPU < 80% |

### 2.5 Expected Bottlenecks to Verify

| Bottleneck | Test | Mitigation |
|------------|------|------------|
| `SELECT ... FOR UPDATE` contention on `document_sequences` | High-concurrency PR/PO create | Verify row-level lock timeout handling |
| WAC recalculation lock on `warehouse_items` | Concurrent GRN post + issue post on same item | Verify `ledger-lock.service` prevents deadlock |
| Report DB queries (full table scans) | LD-DASH-03, LD-DASH-04 | Verify indexes; check query plans via EXPLAIN ANALYZE |
| Outbox + BullMQ queue backpressure | LD-WR-02, 03, 04 | Monitor queue depth in Grafana |
| Connection pool exhaustion | LD-MIX-03 | Verify pool size (default 10 → increase to 25) |

### 2.6 Accept/Reject Criteria
- **Accept:** All SLA targets met; no 5xx errors above 0.1%; no data corruption detected
- **Reject:** Any P95 > 3× SLA; any data integrity failure; any deadlock escalations

### 2.7 Artifact
`test-reports/load-test/report.html` — k6 HTML report + Grafana dashboard snapshot.

---

## 3. Concurrency Testing Plan

### 3.1 Objective
Prove that the optimistic locking, idempotency, and ledger-lock mechanisms prevent data corruption under concurrent access.

### 3.2 Threat Model

| Scenario | Risk | Mechanism |
|----------|------|-----------|
| Two users edit same PR | Lost update | `version` field → 409 Conflict |
| Two users post same GRN | Double-posting inventory | `@Idempotent` guard + unique key |
| Two GRNs post same PO line | Overallocated PO receipt | `grn-post.service` checks remaining qty |
| Issue + Transfer post same lot | Double-consumption | `ledger-lock.service` row-level `FOR UPDATE` |
| Stocktake count + Issue post same item | Count/actual mismatch | Warehouse lock prevents writes during stocktake |
| Two stocktakes on same warehouse | Dual-count collision | Warehouse lock (single session per wh) |
| Concurrent WAC recalculations | Incorrect weighted average | `ledger-lock.service` serialises per item |

### 3.3 Test Scenarios

#### 3.3.1 Optimistic Locking

| ID | Scenario | Execution | Pass Criteria |
|----|----------|-----------|---------------|
| CON-OL-01 | Version conflict on PR update | 5 parallel `PUT /pr/:id` with same version | Exactly 1 returns 200; 4 return 409 |
| CON-OL-02 | Version conflict on GRN edit | Same as above for GRN | Same |
| CON-OL-03 | Version conflict on adjustment | Same as above for adjustment | Same |

#### 3.3.2 Idempotency

| ID | Scenario | Execution | Pass Criteria |
|----|----------|-----------|---------------|
| CON-ID-01 | Same idempotency key, same payload | 5 parallel POST /pr with same key | 1× 201, 4× 409; 1 PR created |
| CON-ID-02 | Same idempotency key, different payload | 5 parallel POST /pr, same key, diff items | 1× 201, 4× 409; first payload wins |
| CON-ID-03 | No idempotency key | POST /pr without key header | 400 Bad Request |

#### 3.3.3 Ledger Lock Contention

| ID | Scenario | Execution | Pass Criteria |
|----|----------|-----------|---------------|
| CON-LL-01 | GRN post + Issue post on same item | Fire both simultaneously | Both succeed; final qty = received - issued |
| CON-LL-02 | Two transfers consuming same lot | Ship from same wh for same lot | One succeeds; second gets 409 or lot depleted |
| CON-LL-03 | Concurrent adjustment post + issue post | Same item, different warehouses | Both succeed (different wh locks) |

#### 3.3.4 Warehouse Lock / Stocktake

| ID | Scenario | Execution | Pass Criteria |
|----|----------|-----------|---------------|
| CON-WL-01 | Issue post during active stocktake | Start stocktake → try issue post | 423 LOCKED warehouse |
| CON-WL-02 | Stocktake count + GRN post on same warehouse | Simultaneous | GRN post blocked; stocktake proceeds |
| CON-WL-03 | Force-unlock by admin | 423 LOCKED → admin force-unlock | Unlock succeeds; subsequent writes OK |

#### 3.3.5 Document Sequencing

| ID | Scenario | Execution | Pass Criteria |
|----|----------|-----------|---------------|
| CON-SEQ-01 | Concurrent document number generation | 100 parallel PR creates | 100 unique sequential numbers; no gaps |
| CON-SEQ-02 | Cross-branch sequencing | 10 parallel creates per branch (3 branches) | 30 unique numbers; per-branch sequences correct |

### 3.4 Automation
Implement as parameterised k6 scripts that can run against staging  
Scripts: `test/concurrency/optimistic-locking.js`, `test/concurrency/idempotency.js`, etc.

### 3.5 Artifact
`test-reports/concurrency/report.md` — results table + Grafana lock-contention dashboard.

---

## 4. Inventory Integrity Verification

### 4.1 Objective
Prove that the inventory ledger is always accurate: `system_qty = sum(transactions)` and `WAC = (total_cost / total_qty)`.

### 4.2 Verification Methods

#### 4.2.1 Continuous Reconciliation Job
The existing `reconciliation.job` runs periodically. Verification proves it can detect all classes of drift.

| ID | Scenario | Injection | Detection |
|----|----------|-----------|-----------|
| INV-REC-01 | Positive drift | Manually increment `warehouse_items.quantity` by 10 | Job flags discrepancy in `reconciliation_runs` |
| INV-REC-02 | Negative drift | Manually decrement by 5 | Same |
| INV-REC-03 | WAC drift | Manually change `wac` field | Job detects cost/qty mismatch |
| INV-REC-04 | Lot-level drift | Change `lot_items.quantity` without matching movement | Job flags orphan lot balance |

#### 4.2.2 WAC Accuracy Tests

| ID | Scenario | Steps | Pass Criteria |
|----|----------|-------|---------------|
| INV-WAC-01 | Basic WAC after GRN | GRN 100 units @ $10 → WAC = $10 | Verified |
| INV-WAC-02 | WAC after multiple GRNs | GRN 100 @ $10 + GRN 200 @ $12 → WAC = $11.33 | Verified to 4 decimal places |
| INV-WAC-03 | WAC after issue (consumption) | After INV-WAC-02, issue 50 units → WAC unchanged | Remaining qty 250 @ $11.33 |
| INV-WAC-04 | WAC after positive adjustment | Adjustment IN 10 units @ $15 → WAC recalculated | WAC = ((250*11.33)+(10*15))/260 |
| INV-WAC-05 | WAC after negative adjustment | Adjustment OUT (waste) → WAC unchanged | Same WAC, reduced qty |
| INV-WAC-06 | WAC across currencies | GRN in USD + FX rate → convert to base currency | WAC in base currency correct |

#### 4.2.3 Transaction Chain Verification

| ID | Scenario | Verification |
|----|----------|-------------|
| INV-CHAIN-01 | Full PR → PO → GRN → Issue chain | Qty flows: PR qty = PO qty = GRN qty - Issue qty = final ledger |
| INV-CHAIN-02 | Transfer chain | Source wh outgoing = dest wh incoming; WAC transfers correctly |
| INV-CHAIN-03 | Adjustment chain | Adjustment (IN) adds to qty; Adjustment (OUT) subtracts; both logged |
| INV-CHAIN-04 | Void reversal | Post → Void → verify ledger returns to pre-post state |

### 4.3 Assertion Queries (run after each test)

```sql
-- Lot-level balance check
SELECT l.id, l.quantity, COALESCE(SUM(li.quantity), 0) as allocated
FROM lots l
LEFT JOIN lot_items li ON li.lot_id = l.id AND li.voided_at IS NULL
GROUP BY l.id
HAVING l.quantity != COALESCE(SUM(li.quantity), 0);
-- Expected: 0 rows

-- WAC consistency check
SELECT wi.item_id, wi.wac, wi.quantity,
       (SELECT SUM(m.quantity * m.unit_cost) / NULLIF(SUM(m.quantity), 0)
        FROM inventory_movements m
        WHERE m.item_id = wi.item_id AND m.type = 'IN') as computed_wac
FROM warehouse_items wi
WHERE ABS(wi.wac - computed_wac) > 0.01;
-- Expected: 0 rows

-- Document sequence gap check
SELECT doc_type, COUNT(*) as total,
       MAX(sequence_number) - MIN(sequence_number) + 1 as expected
FROM document_sequences
GROUP BY doc_type
HAVING COUNT(*) != MAX(sequence_number) - MIN(sequence_number) + 1;
-- Expected: 0 rows
```

### 4.4 Artifact
`test-reports/inventory-integrity/report.md` — results of all reconciliation + WAC + chain tests.

---

## 5. Backup & Restore Verification

### 5.1 Objective
Confirm that backups are restorable and RPO/RTO targets are achievable.

### 5.2 Targets
| Metric | Target |
|--------|--------|
| Recovery Point Objective (RPO) | ≤ 5 minutes |
| Recovery Time Objective (RTO) | ≤ 1 hour for DB; ≤ 4 hours full system |

### 5.3 Backup Regimen (existing)

| Type | Frequency | Retention | Size Estimate |
|------|-----------|-----------|---------------|
| WAL archiving | Continuous | 7 days | ~200 MB/day |
| Daily full DB dump | Daily at 03:00 | 30 days | ~5 GB compressed |
| Transaction logs (WAL) | Every 5 min | 24 hours | ~20 MB each |
| Application config | On change | 10 versions | < 10 MB |
| File uploads (S3/Blob) | Cross-region replication | N/A | S3 native durability |

### 5.4 Restore Drills

| ID | Drill | Steps | Pass Criteria | Duration Target |
|----|-------|-------|---------------|-----------------|
| BR-01 | Full DB restore | Restore nightly dump to staging | All tables present; row counts match | < 30 min |
| BR-02 | Point-in-time recovery (PITR) | Drop a table → restore to 1 minute before drop | Table restored; data after drop point absent | < 15 min |
| BR-03 | WAL replay | Restore base backup → replay all WALs to current | DB is consistent; no missing transactions | < 45 min |
| BR-04 | Cross-region restore | Restore from replica region | Application connects; all data available | < 60 min |
| BR-05 | Partial restore (single table) | Restore only `inventory_movements` | Table restored; no FK violations | < 10 min |

### 5.5 Verification Queries After Restore

```sql
-- Row count parity
SELECT schemaname, tablename, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Check for missing FK parents
SELECT COUNT(*) FROM inventory_movements im
WHERE NOT EXISTS (SELECT 1 FROM items i WHERE i.id = im.item_id);
-- Expected: 0

-- Transaction log continuity (check latest movement date)
SELECT MAX(created_at) FROM inventory_movements;
-- Verify this is within 5 min of current time (PITR target)
```

### 5.6 Artifact
`sign-off/BACKUP_RESTORE_CERTIFICATION.pdf` — restore drill logs + timestamps.

---

## 6. Disaster Recovery Drill

### 6.1 Objective
Prove that the system can survive catastrophic failure and resume service within RTO.

### 6.2 Failure Scenarios

| ID | Scenario | Simulated Failure | Expected Behaviour |
|----|----------|-------------------|--------------------|
| DR-01 | Primary DB failure | Stop Postgres primary | Replica auto-promotes; app reconnects within 30s |
| DR-02 | Entire region failure | Cut all network to primary region | DNS failover to replica region; read-only mode for 5 min, full RW within 15 min |
| DR-03 | Application server failure | Kill all app server processes | Auto-scaling group replaces within 2 min; load balancer routes to healthy instances |
| DR-04 | Redis cache failure | Stop Redis | App falls back to DB; degraded performance but no data loss |
| DR-05 | Queue (BullMQ / Redis) failure | Stop Redis (queues) | Pending jobs remain in Redis persistence; resume on restart; no job loss |
| DR-06 | Storage (S3/blob) failure | Revoke storage account keys | Reports/downloads fail; core operations continue; alert fires |
| DR-07 | Auth provider outage | Block Supabase auth endpoint | Existing sessions work (JWT); new logins fail; app shows degraded banner |
| DR-08 | Partial data corruption | Run UPDATE that sets all prices to 0 | Monitoring alert → PITR to 5 min before corruption → validate data |

### 6.3 Drill Execution

| Phase | Action | Owner | Max Duration |
|-------|--------|-------|-------------|
| **1. Detect** | Monitoring alert fires (PagerDuty/OpsGenie) | SRE | < 1 min |
| **2. Assess** | On-call acknowledges; determines severity | SRE | < 3 min |
| **3. Declare** | Incident declared; DR plan invoked | Incident Commander | < 1 min |
| **4. Failover** | Execute failover procedure | SRE + DBA | < 15 min |
| **5. Verify** | Smoke tests pass; UAT user confirms | QA | < 10 min |
| **6. Communicate** | Status page updated; stakeholders notified | IC | < 5 min |
| **7. Recover** | Fix root cause; fail back if needed | Engineering | < 60 min |
| **8. Post-mortem** | Root cause analysis; action items | All | < 48 hours |

### 6.4 Runbook Verification

For each DR scenario, verify:
- Runbook steps are correct (walk through, don't read)
- All required credentials/secrets are accessible (password manager, not slack)
- All team members have necessary cloud console access
- Communication template is ready (status page, email, Slack)

### 6.5 Schedule

| Drill | Frequency | First Run |
|-------|-----------|-----------|
| DR-01 (DB failover) | Monthly | T-minus 2 weeks |
| DR-02 (Region failover) | Quarterly | T-minus 1 month |
| DR-03 (App server) | Bi-weekly | T-minus 1 week |
| DR-04 (Cache) | Monthly | T-minus 2 weeks |
| DR-05 (Queue) | Monthly | T-minus 2 weeks |
| DR-06 (Storage) | Quarterly | T-minus 1 month |
| DR-07 (Auth) | Bi-weekly | T-minus 1 week |
| DR-08 (Corruption) | Quarterly | T-minus 1 month |

### 6.6 Artifact
`sign-off/DR_CERTIFICATION.pdf` — drill logs, timestamps, incident post-mortem from each drill.

---

## 7. Security Penetration Checklist

### 7.1 Objective
Verify that security controls (auth, RBAC, scoping, rate limiting, idempotency) hold against real attack patterns.

### 7.2 Scope
- **In-scope:** API endpoints, auth flows, RBAC, warehouse data scoping, idempotency bypass, optimistic locking bypass
- **Out-of-scope:** Network-level attacks (DDoS), physical security, social engineering

### 7.3 Test Cases

#### 7.3.1 Authentication

| ID | Attack | Expected | Verification |
|----|--------|----------|--------------|
| SEC-AUTH-01 | Replay stolen JWT after logout | Token rejected (blacklist or short expiry) | Attempt endpoint call with revoked token → 401 |
| SEC-AUTH-02 | JWT tampering (modify `sub` claim) | Signature verification fails | Tampered JWT → 401 |
| SEC-AUTH-03 | JWT with expired `exp` claim | Token rejected | Expired JWT → 401 |
| SEC-AUTH-04 | Brute-force login | Rate-limited after 5 attempts | 429 Too Many Requests |
| SEC-AUTH-05 | Refresh token replay attack | Old refresh token rejected | Refresh with rotated token → 401 |
| SEC-AUTH-06 | Session fixation | Pre-session cookie injection | Login creates new session; old session invalidated |

#### 7.3.2 Authorization

| ID | Attack | Expected | Verification |
|----|--------|----------|--------------|
| SEC-AUTHZ-01 | WH_KEEPER approves PO | 403 Forbidden | Call approve endpoint with WH_KEEPER role |
| SEC-AUTHZ-02 | VIEWER creates PR | 403 Forbidden | Call create endpoint with VIEWER role |
| SEC-AUTHZ-03 | PROC_OFFICER posts GRN for locked warehouse | 423 LOCKED | Post GRN during active stocktake |
| SEC-AUTHZ-04 | User reads data from another warehouse (scope bypass) | 403 Forbidden | Set scope=wh1, call wh2 endpoint |
| SEC-AUTHZ-05 | User modifies `scope` header to admin scope | Scope validation rejects | Inject scope header for unassigned wh |
| SEC-AUTHZ-06 | Deactivated user tries to login | 401 Unauthorized | Login with deactivated credentials |

#### 7.3.3 Data Manipulation

| ID | Attack | Expected | Verification |
|----|--------|----------|--------------|
| SEC-DATA-01 | Version conflict bypass (omit version) | 400 or 409 | Update document without version field |
| SEC-DATA-02 | Version conflict bypass (wrong version) | 409 Conflict | Update with stale version |
| SEC-DATA-03 | Idempotency key reuse with different data | 409 Conflict (first payload preserved) | Same key, different body |
| SEC-DATA-04 | Idempotency key injection (special chars) | 400 or sanitised | Key with SQL injection payload |
| SEC-DATA-05 | Mass assignment on create | Extra fields ignored | POST with `role=ADMIN` in PR create body |
| SEC-DATA-06 | Negative quantity injection | Rejected by validation | POST issue with `quantity=-100` |

#### 7.3.4 Rate Limiting & Abuse

| ID | Attack | Expected | Verification |
|----|--------|----------|--------------|
| SEC-RATE-01 | Login endpoint DDoS | 429 after 5 req/min | 100 rapid login attempts |
| SEC-RATE-02 | Scan barcode endpoint burst | 429 after 50 req/s | 200 rapid scan requests |
| SEC-RATE-03 | Report export spam | 429 or cooldown | 20 rapid export requests |
| SEC-RATE-04 | Large payload attack | 413 or validation error | POST 10MB body to create endpoint |

#### 7.3.5 Audit & Logging

| ID | Attack | Expected | Verification |
|----|--------|----------|--------------|
| SEC-AUDIT-01 | Unauthorised access attempt logged | Audit entry created | Check audit_logs after SEC-AUTHZ-01 |
| SEC-AUDIT-02 | State transition logged | Before/after state recorded | Audit log shows DRAFT→SUBMITTED→APPROVED chain |
| SEC-AUDIT-03 | Deleted document logged | Soft-delete or audit trail | Delete PR → audit entry preserved |

### 7.4 Tooling
- **Automated:** OWASP ZAP (baseline scan + active scan against staging)
- **Manual:** Burp Suite Community or Postman collection for authz bypass tests
- **Credential rotation:** Verify no hardcoded secrets (run `gitleaks` / `trufflehog`)

### 7.5 Accept/Reject Criteria
- **Accept:** All critical/high findings remediated; medium findings have documented mitigations
- **Reject:** Any finding that allows data exfiltration, privilege escalation, or denial of service

### 7.6 Artifact
`sign-off/PENTEST_REPORT.pdf` — OWASP ZAP report + manual test results + fix verification.

---

## 8. Go-Live Checklist

### 8.1 Pre-Flight Checks (T-72 hours)

| # | Item | Owner | Sign-off |
|---|------|-------|----------|
| 1 | All UAT scenarios signed off | QA Lead | ☐ |
| 2 | Load test report accepted | SRE Lead | ☐ |
| 3 | Concurrency test report accepted | SRE Lead | ☐ |
| 4 | Inventory integrity verification passed | QA Lead | ☐ |
| 5 | Security pentest report accepted | Security Lead | ☐ |
| 6 | Backup & restore drill passed | DBA | ☐ |
| 7 | DR drill executed within RTO | SRE Lead | ☐ |
| 8 | All P0/P1 bugs fixed | Engineering Lead | ☐ |
| 9 | All P2 bugs triaged (no blockers) | Product Manager | ☐ |

### 8.2 Infrastructure Checks (T-48 hours)

| # | Item | Verification | Sign-off |
|---|------|-------------|----------|
| 10 | Production environment provisioned | Ansible/Terraform apply dry-run | DevOps | ☐ |
| 11 | Database migration reviewed & applied | `prisma migrate deploy` tested on staging | DBA | ☐ |
| 12 | Environment variables audited | No secrets in code; all keys rotated | DevOps | ☐ |
| 13 | SSL/TLS certificates valid | `openssl s_client` check | DevOps | ☐ |
| 14 | DNS records correct | `dig` + `nslookup` all subdomains | DevOps | ☐ |
| 15 | CDN / caching layer configured | Cache rules verified | DevOps | ☐ |
| 16 | Monitoring dashboards deployed | Grafana: all panels populated | SRE | ☐ |
| 17 | Alert thresholds configured | PagerDuty test alert sent | SRE | ☐ |
| 18 | Log aggregation (Loki/ELK) working | Query test log entry | SRE | ☐ |
| 19 | Rate limiter configured per-environment | Production limits = 2× expected peak | SRE | ☐ |
| 20 | WAL archiving enabled | `pg_stat_archiver` confirms | DBA | ☐ |

### 8.3 Application Checks (T-24 hours)

| # | Item | Verification | Sign-off |
|---|------|-------------|----------|
| 21 | Build pipeline green on main branch | CI/CD all stages pass | Engineering | ☐ |
| 22 | Docker images pushed to registry | `docker pull` verification | DevOps | ☐ |
| 23 | Health check endpoint responds | GET /health → 200 | QA | ☐ |
| 24 | Auth login/logout works | End-to-end auth flow | QA | ☐ |
| 25 | All 10 screen domains load | Walk through PR, PO, GRN, ST, TRF, ISS, ADJ, KR, YIELD, MD | QA | ☐ |
| 26 | Search works | Search by item name, code, barcode | QA | ☐ |
| 27 | Reports generate | Top 5 reports render | QA | ☐ |
| 28 | Export downloads | XLSX download for movements | QA | ☐ |
| 29 | Email notifications deliverable | Test notification sent | QA | ☐ |
| 30 | Outbox worker running | BullMQ queue processes jobs | SRE | ☐ |
| 31 | File upload works | Upload item image | QA | ☐ |
| 32 | Session timeout works | Idle session → auto-logout after configured TTL | QA | ☐ |
| 33 | Idempotency works | Double-click create test | QA | ☐ |
| 34 | Optimistic locking works | Two-browser edit test | QA | ☐ |

### 8.4 Cut-Over Sequence

| # | Step | Duration | Owner |
|---|------|----------|-------|
| 35 | **FREEZE** — No merges to main | Until go-live completed | Engineering |
| 36 | Announce maintenance window (internal) | T-2 hours | IC |
| 37 | Set status page to MAINTENANCE | T-1 hour | SRE |
| 38 | Take final DB snapshot | T-30 min | DBA |
| 39 | Run pre-deployment DB migrations | T-15 min | DBA |
| 40 | Deploy application to production | T-10 min | DevOps |
| 41 | Run smoke tests (critical path) | T-0 | QA |
| 42 | Verify monitoring dashboard healthy | T+5 min | SRE |
| 43 | Set status page to OPERATIONAL | T+10 min | IC |
| 44 | Announce go-live success | T+15 min | IC |

### 8.5 Post-Deployment Verification (T+1 hour)

| # | Item | Sign-off |
|---|------|----------|
| 45 | All smoke tests pass (smoke suite) | QA |
| 46 | No 5xx errors in logs | SRE |
| 47 | DB connection pool stable | SRE |
| 48 | Worker/queue processing normally | SRE |
| 49 | Email outbox draining normally | SRE |
| 50 | Remove maintenance banner | IC |

### 8.6 Artifact
`sign-off/GO_LIVE_CHECKLIST.pdf` — signed by Engineering Lead, QA Lead, SRE Lead, DBA, Product Manager.

---

## 9. Rollback Checklist

### 9.1 Rollback Triggers

| Level | Criteria | Decision |
|-------|----------|----------|
| **Critical** | Data loss or corruption detected | Immediate rollback |
| **Critical** | All users cannot log in (auth broken) | Immediate rollback |
| **Critical** | P95 API latency > 10s for 5+ minutes | Rollback after root cause triage |
| **High** | A core workflow (PR/PO/GRN/ST) completely blocked | Rollback if fix > 1 hour |
| **High** | Inventory calculations produce wrong numbers | Immediate rollback |
| **Medium** | Non-critical workflow broken (reports, yield) | Decide at incident commander's discretion |
| **Low** | UI cosmetic issues, low-priority bugs | Continue; fix in next release |

### 9.2 Rollback Sequence

| # | Step | Duration | Owner |
|---|------|----------|-------|
| 1 | **DECLARE** — Incident Commander declares rollback | < 1 min | IC |
| 2 | **NOTIFY** — Update status page to DEGRADED/MAINTENANCE | < 2 min | IC |
| 3 | **BLOCK** — Stop all write traffic (read-only mode if supported) | < 1 min | SRE |
| 4 | **RESTORE DB** — If DB migration was destructive, restore from pre-deploy snapshot | < 30 min | DBA |
| 5 | **REVERT APP** — Deploy previous Docker image tag to production | < 10 min | DevOps |
| 6 | **REVERT MIGRATIONS** — If schema changed, run down migration | < 15 min | DBA |
| 7 | **SMOKE TEST** — Run smoke suite on rolled-back version | < 10 min | QA |
| 8 | **VERIFY DATA** — Check inventory balances, recent movements | < 10 min | QA |
| 9 | **RESUME** — Allow write traffic; set status to OPERATIONAL | < 2 min | SRE |
| 10 | **COMMUNICATE** — Post-mortem scheduled; stakeholders updated | < 15 min | IC |
| **Total RTO** | **Full rollback** | **< 60 min** | |

### 9.3 Rollback Scenarios

#### 9.3.1 Database Schema Migration Failed

| Situation | Action |
|-----------|--------|
| New column added → app crashes because old version expects old schema | Deploy app v1 (via rollback) which still works with new schema (forward-compatible) |
| Column removed → old app version expects column | Restore from pre-deploy snapshot + deploy app v1 |
| Data migration (e.g., backfill) → incorrect data written | Run compensating migration + restore affected rows from WAL |
| Index creation locks table → timeout | Kill migration; skip index; create online via `CONCURRENTLY` |

#### 9.3.2 Application Crash on Startup

| Situation | Action |
|-----------|--------|
| Missing env var | Inject env var and restart without full rollback |
| Dependency version mismatch | Roll back to previous image tag |
| JS heap OOM on startup | Increase memory limit; roll back to previous tag if fix takes > 10 min |

#### 9.3.3 Data Integrity Issue Detected

| Situation | Action |
|-----------|--------|
| WAC calculation incorrect | Restore affected items from WAL; apply fix in patch |
| Duplicate document numbers | Void duplicates; regenerate sequence; apply fix |
| Incorrect stock quantities | PITR to last known good state; replay valid transactions manually |

### 9.4 Rollback Verification

| ID | Verification | Command / Query |
|----|-------------|-----------------|
| RB-VER-01 | App version confirmed rolled back | `kubectl rollout history deploy/api` or image tag check |
| RB-VER-02 | DB schema = pre-deploy state | `prisma db execute` → check migration table |
| RB-VER-03 | Health endpoint OK | `curl /health` → 200 |
| RB-VER-04 | Auth working | `curl /auth/me` with valid token → 200 |
| RB-VER-05 | Recent transactions present | Query last hour's inventory_movements count |
| RB-VER-06 | No duplicate sequences | Query document_sequences for uniqueness violation |
| RB-VER-07 | Queue processing resumed | BullMQ dashboard shows active workers |

### 9.5 Rollback Kit

Maintain a `rollback-kit/` directory with:

| File | Contents |
|------|----------|
| `rollback.sh` | Single script: deploy previous tag, run down migration, smoke test |
| `previous-image-tag` | Last known-good Docker image tag |
| `pre-deploy-dump.sql.gz` | Database snapshot taken immediately before deploy |
| `down-migrations/` | Prisma down-migration SQL files for current release |
| `contact-list.txt` | Who to call: DBA, SRE Lead, Engineering Lead, IC |
| `notification-template.md` | Filled template for status page + Slack + email |

### 9.6 Artifact
`sign-off/ROLLBACK_CHECKLIST.pdf` — rollback drill log (dry-run monthly) + actual rollback incident report (if ever used).

---

## Appendix A: Sign-Off Register

| Plan | Owner | Target Date | Signed Off |
|------|-------|-------------|------------|
| UAT Plan | QA Lead | T-minus 3 weeks | ☐ |
| Load Testing Plan | SRE Lead | T-minus 3 weeks | ☐ |
| Concurrency Testing Plan | SRE Lead | T-minus 3 weeks | ☐ |
| Inventory Integrity Verification | QA Lead + DBA | T-minus 2 weeks | ☐ |
| Backup & Restore Verification | DBA | T-minus 2 weeks | ☐ |
| Disaster Recovery Drill | SRE Lead | T-minus 2 weeks | ☐ |
| Security Penetration Checklist | Security Lead | T-minus 2 weeks | ☐ |
| Go-Live Checklist | IC (Engineering Lead) | T-minus 72 hours | ☐ |
| Rollback Checklist | IC (SRE Lead) | T-minus 72 hours | ☐ |

## Appendix B: SLA Definitions

| Metric | Target | Measurement |
|--------|--------|------------|
| API P95 response time | < 2s | k6 + Grafana |
| API error rate (5xx) | < 0.1% | Grafana |
| Uptime (API) | 99.9% | Uptime check |
| Uptime (DB) | 99.95% | RDS SLA |
| RPO | ≤ 5 min | WAL archiving lag |
| RTO (full DR) | < 4 hours | Stopwatch |
| RTO (DB failover) | < 1 hour | Stopwatch |

## Appendix C: Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| DB connection pool exhaustion under load | Medium | High | Pool size = 25; connection timeout = 5s; monitoring alert at 80% |
| Deadlock between GRN post and Issue post on same item | Medium | High | Ledger-lock service serialises per item; retry logic |
| WAL disk fills up | Low | Critical | WAL archiving monitoring; disk alert at 80% |
| Redis (BullMQ) data loss on restart | Low | Medium | Redis persistence (RDB + AOF); job retry via DB outbox |
| JWT signing key compromise | Low | Critical | Key rotation procedure; short token TTL (15 min) |
| Dependency supply-chain attack | Low | High | Dependabot + lockfile audit; staging builds from locked deps |

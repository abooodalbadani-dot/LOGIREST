# Data Model: API Controllers (Phase 8)

**Feature**: API Controllers (Phase 8)  
**Date**: 2026-05-23

This document outlines the data model constraints, validation rules, and status transition mappings enforced by the Phase 8 API controllers.

## 1. Scope & Auth Context

The active authentication and scope data is extracted from the JWT payload and HTTP headers:

* **JWT Payload**:
  * `sub` (User ID)
  * `role` (Role enum: `ADMIN`, `MANAGER`, `PROC_OFFICER`, `WH_KEEPER`, `KITCHEN_STAFF`)
* **HTTP Headers**:
  * `x-warehouse-id` (Target Warehouse ID)
  * `x-branch-id` (Target Branch ID)
* **Scope Validation**:
  * Must match a valid entry in `UserWarehouseScope` table for the authenticated user.
  * Extracted values are attached as `req.activeScope` and applied implicitly to all queries.

## 2. Warehouse Soft-Delete / Archiving Rule

The `Warehouse` model uses the `isActive` status field:

* **Archiving Logic**:
  * When a client sends a request to archive a warehouse:
    1. Query all active `WarehouseItem` records for the warehouse.
    2. If any record has `onHandQty > 0`, reject the request (throw `400 Bad Request` or `422 Unprocessable Entity`).
    3. If all stock is zero, set `isActive = false` (archived).
  * Operational queries (e.g. dropdown lists for creating PR/PO/GRN, issuing stock, transferring stock) MUST filter for `isActive: true`.
  * Reporting queries and audit log reads MUST bypass the `isActive` filter to show historical transactions.

## 3. Document Status Transition Maps

The controllers enforce state transitions using the `WorkflowStateGuard` and the canonical transition maps imported from `@logirest/shared-types`.

### 3.1 Purchase Request (PR) Statuses
* **Transitions**:
  * `DRAFT` -> `SUBMITTED` (via SUBMIT action)
  * `SUBMITTED` -> `APPROVED` (via APPROVE action)
  * `SUBMITTED` -> `REJECTED` (via REJECT action, requires comments)
  * `DRAFT` / `SUBMITTED` -> `CANCELLED` (via CANCEL action)
  * `APPROVED` -> `CONVERTED_TO_PO` (when PO is created from PR)

### 3.2 Purchase Order (PO) Statuses
* **Transitions**:
  * `DRAFT` -> `SUBMITTED` (via SUBMIT action)
  * `SUBMITTED` -> `APPROVED` (via APPROVE action)
  * `SUBMITTED` -> `REJECTED` (via REJECT action, requires comments)
  * `DRAFT` / `SUBMITTED` -> `CANCELLED` (via CANCEL action)
  * `APPROVED` -> `PARTIALLY_RECEIVED` / `RECEIVED` (when GRN is posted against it)

### 3.3 Goods Received Note (GRN) Statuses
* **Transitions**:
  * `DRAFT` -> `POSTED` (via POST action, triggers ledger updates)
  * `DRAFT` -> `CANCELLED` (via CANCEL action)

### 3.4 Inventory Issue Statuses
* **Transitions**:
  * `DRAFT` -> `POSTED` (via POST action, triggers FEFO/FIFO ledger deductions)
  * `DRAFT` -> `CANCELLED` (via CANCEL action)

### 3.5 Stock Transfer Statuses
* **Transitions**:
  * `DRAFT` -> `IN_TRANSIT` (via SHIP action, deducts from source)
  * `IN_TRANSIT` -> `RECEIVED` (via RECEIVE action, adds to dest, records quantity variance if any)
  * `DRAFT` -> `CANCELLED` (via CANCEL action)

### 3.6 Stocktake Session Statuses
* **Transitions**:
  * `DRAFT` -> `ACTIVE` (via START action, creates WarehouseLock, captures snapshot)
  * `ACTIVE` -> `REVIEW` (via SUBMIT action, counts uploaded)
  * `REVIEW` -> `POSTED` (via POST action, posts surplus/deficit to ledger, releases lock)
  * `DRAFT` / `ACTIVE` / `REVIEW` -> `CANCELLED` (via CANCEL action, releases lock)

### 3.7 Kitchen Request Statuses
* **Transitions**:
  * `DRAFT` -> `SUBMITTED` (via SUBMIT action)
  * `SUBMITTED` -> `FULFILLED` / `PARTIALLY_FULFILLED` (via FULFILL action)
  * `DRAFT` / `SUBMITTED` -> `CANCELLED` (via CANCEL action)

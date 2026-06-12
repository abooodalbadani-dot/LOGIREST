# Data Model & Guard Mapping: RBAC Master-Data Controller Guards

This document maps the security constraints to existing domain entities and controller endpoints. No database schema changes are required for this feature.

## 1. Role Definitions

We utilize the existing `Role` enum defined in the Prisma database schema:
* `ADMIN`, `GM`, `INV_MGR`, `WH_KEEPER`, `PROC_OFFICER`, `APPROVER`, `AUDITOR`, `VIEWER`, `KITCHEN_CHIEF`, `STORE_MGR`, `BRANCH_MGR`, `PROC_MGR`

## 2. API Guard Mappings

The following table details the declarative role mappings that will be applied to the master-data controller endpoints:

| Controller | HTTP Method | Endpoint | Allowed Roles |
|:---|:---|:---|:---|
| `ItemsController` | `GET` | `/items`, `/items/:id` | *All Authenticated Roles* |
| | `POST`, `PUT`, `DELETE` | `/items`, `/items/:id` | `ADMIN`, `GM` |
| `DepartmentsController` | `GET` | `/departments`, `/departments/:id` | *All Authenticated Roles* (scoped) |
| | `POST`, `PUT`, `DELETE` | `/departments`, `/departments/:id` | `ADMIN`, `GM` |
| `BarcodesController` | `GET` | `/barcodes`, `/barcodes/:id`, `/barcodes/check-duplicate` | *All Authenticated Roles* |
| | `POST`, `PUT`, `DELETE` | `/barcodes`, `/barcodes/:id` | `ADMIN`, `GM` |
| `UomController` | `GET` | `/units-of-measure`, `/units-of-measure/:id` | *All Authenticated Roles* |
| | `POST`, `PUT`, `DELETE` | `/units-of-measure`, `/units-of-measure/:id` | `ADMIN`, `GM` |
| `FXRatesController` | `GET` | `/currencies/fx-rates` | `ADMIN`, `GM`, `INV_MGR`, `STORE_MGR`, `BRANCH_MGR`, `PROC_MGR`, `PROC_OFFICER`, `AUDITOR`, `APPROVER` |
| | `POST` | `/currencies/fx-rates` | `ADMIN`, `GM`, `PROC_MGR` |
| `VarianceReasonsController` | `GET` | `/master-data/variance-reasons` | *All Authenticated Roles* |
| | *Mutating (planned)* | `/master-data/variance-reasons` | `ADMIN`, `GM`, `INV_MGR` |

## 3. UI Column Visibility Configuration

For UI-level data protection:
* Columns: `unitCost` and `totalValue` in the `ValuationTable` component.
* Utility check: `canViewFinancialData(user.role)` inside `useColumnVisibility` hook.
* Excluded roles (masked): `WH_KEEPER`, `KITCHEN_CHIEF`, `VIEWER`.


## Role-Based Access Control (RBAC) Matrix

### 2.1 Role Definitions

| Role | Code | Daily Operations & Scope |
| --- | --- | --- |
| **System Admin** | `ADMIN` | **ALL actions on ALL screens.** User management, system settings, SMTP, outbox retry, frozen items unfreeze, audit logs. |
| **General Manager** | `GM` | **Super Approver & Overseer.** View all documents + Export. Approve PRs, POs, Adjustments, Stocktakes. View Audit Logs. No physical document creation. |
| **Inventory Manager** | `INV_MGR` | **Inventory Operations Head.** Create/Post GRNs, Issues, Transfers, Adjustments, Stocktakes. Manage Item Master Data. **NO** financial procurement approvals (POs). |
| **Procurement Manager** | `PROC_MGR` | **Purchasing Head.** Approve POs, Convert PR to PO, Manage Supplier Master Data. **NO** physical receiving (GRN) or inventory access. |
| **Branch Manager** | `BRANCH_MGR` | **Branch Operations.** Oversee branch inventory. Approve branch-level PRs, Issues, and Transfers. |
| **Store Manager** | `STORE_MGR` | **Local Store Operations.** Similar to WH_KEEPER but can approve minor local inventory adjustments. |
| **Procurement Officer** | `PROC_OFFICER` | **Purchasing Operator.** Create/Submit PRs and POs. Convert PR to PO. **NO** approvals. **NO** GRN operations. |
| **Warehouse Keeper** | `WH_KEEPER` | **Physical Operator.** Create/Submit/Receive GRNs, Issues, Transfers. Start/Count Stocktakes. **NO** posting or approvals. |
| **Approver** | `APPROVER` | **Financial/Audit Approver.** View + Approve/Reject PRs, POs, Adjustments, Stocktakes only. |
| **Kitchen Chief** | `KITCHEN_CHIEF` | **Kitchen Operations.** Create/Submit Kitchen Requests. Create stock Issues for the kitchen. |
| **Auditor** | `AUDITOR` | **Compliance.** View-only on ALL documents + export. Full access to Audit Logs. Sees financial valuations. |
| **Viewer** | `VIEWER` | **General Read.** View + export on documents only. Financial columns masked. |

---

### 2.2 Action Permission Matrix

| Action | ADMIN | GM | INV_MGR | PROC_MGR | BRANCH_MGR | STORE_MGR | PROC_OFFICER | WH_KEEPER | APPROVER | KITCHEN_CHIEF | AUDITOR | VIEWER |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **PR: Create/Edit** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PR: Submit** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PR: Approve/Reject** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **PR: Convert to PO** | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PO: Create/Edit** | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PO: Approve/Reject** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **GRN: Create/Edit (Draft)** | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **GRN: Mark Received** | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **GRN: Post (Ledger)** | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Issue: Create/Submit** | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Issue: Post (Ledger)** | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Transfer: Create/Ship** | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Transfer: Receive** | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Adjustment: Create/Submit** | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Adjustment: Approve** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Adjustment: Post (Ledger)** | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Stocktake: Start/Count** | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Stocktake: Approve** | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Stocktake: Post (Ledger)** | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Kitchen Req: Create/Submit** | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Kitchen Req: Fulfill** | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Master Data: Categories/UoM** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Master Data: Items** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Master Data: Suppliers** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Admin: User & Settings** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Reports: View** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Audit Logs: View** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Financials (Cost/Value)** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
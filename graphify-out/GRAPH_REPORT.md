# Graph Report - apps/web/src  (2026-05-20)

## Corpus Check
- Large corpus: 565 files ┬╖ ~209,016 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 242 nodes · 484 edges · 12 communities (8 shown, 4 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Stocktake Operations|Stocktake Operations]]
- [[_COMMUNITY_Transfer & Shipping|Transfer & Shipping]]
- [[_COMMUNITY_Audit & Approvals|Audit & Approvals]]
- [[_COMMUNITY_Kitchen Requests|Kitchen Requests]]
- [[_COMMUNITY_Adjustments Workflow|Adjustments Workflow]]
- [[_COMMUNITY_Authentication & Routing|Authentication & Routing]]
- [[_COMMUNITY_Procurement (PRPO)|Procurement (PR/PO)]]
- [[_COMMUNITY_Issue Management|Issue Management]]
- [[_COMMUNITY_Goods Receipt (GRN)|Goods Receipt (GRN)]]
- [[_COMMUNITY_Yield & Lot Management|Yield & Lot Management]]
- [[_COMMUNITY_Dashboard & Navigation|Dashboard & Navigation]]
- [[_COMMUNITY_Admin & Master Data|Admin & Master Data]]

## God Nodes (most connected - your core abstractions)
1. `KitchenRequestForm` - 21 edges
2. `AdjustmentForm – edit/create adjustment form` - 20 edges
3. `StocktakeCountClient Component` - 20 edges
4. `TransferReceiveClient Component` - 20 edges
5. `TransferShipClient Component` - 20 edges
6. `TransferNewClient Component` - 19 edges
7. `IssueScanModePage` - 17 edges
8. `StocktakeListClient` - 17 edges
9. `StocktakeForm Component` - 17 edges
10. `StocktakeVarianceClient Component` - 17 edges

## Surprising Connections (you probably didn't know these)
- `IssueScanClient – barcode scan issue mode` --conceptually_related_to--> `IssueForm – create issue form`  [INFERRED]
  apps/web/src/app/[locale]/(app)/(operations)/issues/new/scan-mode/issue-scan-client.tsx → apps/web/src/app/[locale]/(app)/(operations)/issues/new/issue-form.tsx
- `IssueListClient – issue list page` --semantically_similar_to--> `AdjustmentListClient – adjustment list page`  [INFERRED] [semantically similar]
  apps/web/src/app/[locale]/(app)/(operations)/issues/IssueListClient.tsx → apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx
- `adjustments/new/page.tsx – create server page` --calls--> `ProtectedRoute component`  [EXTRACTED]
  apps/web/src/app/[locale]/(app)/(operations)/adjustments/new/page.tsx → apps/web/src/components/shared/ProtectedRoute.tsx
- `AdjustmentForm – edit/create adjustment form` --shares_data_with--> `AdjustmentDetailClient – detail/detail orchestrator`  [INFERRED]
  apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentForm.tsx → apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentDetailClient.tsx
- `adjustments/[id]/page.tsx – detail server page` --conceptually_related_to--> `AdjustmentViewer – read-only adjustment display`  [INFERRED]
  apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/page.tsx → apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentViewer.tsx

## Communities (12 total, 4 thin omitted)

### Community 0 - "Stocktake Operations"
Cohesion: 0.08
Nodes (47): AdjustmentDetailClient – detail/detail orchestrator, ConflictDialog – optimistic concurrency UI, DataTable Shared Component, DocumentLineItemTable component, DocumentLockBanner Shared Component, DocumentReadOnlyOverlay Shared Component, GRNDetailClient Dispatcher, GRNForm Component (+39 more)

### Community 1 - "Transfer & Shipping"
Cohesion: 0.10
Nodes (43): IssueViewer, KitchenRequestFormClient, KitchenRequestForm, KitchenRequestViewer, KitchenRequestsListClient, StocktakeArchiveClient, StocktakeListClient, useItems (+35 more)

### Community 2 - "Audit & Approvals"
Cohesion: 0.14
Nodes (39): ActionGuard Component, Breadcrumb Component, DocumentLineItemTable Component, DocumentLockBanner Component, FormFooter Component, LockBanner Component, MetricCard Component, PermissionGate Component (+31 more)

### Community 3 - "Kitchen Requests"
Cohesion: 0.10
Nodes (30): IssueDetailClient, KitchenRequestDetailClient, StocktakeDetailClient, document-engine (isDocumentLocked, canPerformActionV2, DocumentStatus), useConflictHandler, status-guards (isIssuePosted, isStocktakeInProgress, isStocktakePosted), IssueForm, useIssue (+22 more)

### Community 4 - "Adjustments Workflow"
Cohesion: 0.10
Nodes (25): ADJUSTMENT_STATUS enum/constants, ActionGuard – workflow permission component, AdjustmentCreateClient – create adjustment form, AdjustmentForm – edit/create adjustment form, AdjustmentViewer – read-only adjustment display, FEFOLotAllocator component, FormFooter component, adjustments/new/page.tsx – create server page (+17 more)

### Community 5 - "Authentication & Routing"
Cohesion: 0.10
Nodes (23): AdjustmentListClient – adjustment list page, AppShell – main app layout shell, ISSUE_STATUS enum/constants, IssueListClient – issue list page, IssueScanClient – barcode scan issue mode, ProtectedRoute component, adjustments/[id]/page.tsx – detail server page, adjustments/page.tsx – list server page (+15 more)

### Community 6 - "Procurement (PR/PO)"
Cohesion: 0.10
Nodes (23): ConflictDialog Component, DataTable Component, PageHeader Component, PrecisionTable Component, ProtectedRoute Component, SmartCombobox Component, TRANSFER_STATUS Contract, TransferDetailClient Component (+15 more)

### Community 7 - "Issue Management"
Cohesion: 0.25
Nodes (8): PrecisionTable Shared Component, YieldManagementClient Component, YieldNewBatchClient Component, useCreateYieldBatch Hook, YieldBatch Type, useYieldList Hook, Yield Management Page, New Yield Batch Page

## Ambiguous Edges - Review These
- `StocktakeForm Component` → `useStocktakes Hook (API)`  [AMBIGUOUS]
  apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeForm.tsx · relation: references
- `StocktakeViewer Component` → `useStocktakes Hook (API)`  [AMBIGUOUS]
  apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeViewer.tsx · relation: references

## Knowledge Gaps
- **63 isolated node(s):** `NotFound – 404 page`, `LocaleRootPage – redirector`, `OperationsLayout – route group passthrough`, `issues/new/page.tsx – create issue server page`, `useApproveAdjustment mutation hook` (+58 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `StocktakeForm Component` and `useStocktakes Hook (API)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `StocktakeViewer Component` and `useStocktakes Hook (API)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `AdjustmentForm – edit/create adjustment form` connect `Adjustments Workflow` to `Stocktake Operations`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `ProtectedRoute component` connect `Authentication & Routing` to `Stocktake Operations`, `Adjustments Workflow`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `TransferReceiveClient Component` connect `Stocktake Operations` to `Authentication & Routing`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `AdjustmentForm – edit/create adjustment form` (e.g. with `AdjustmentDetailClient – detail/detail orchestrator` and `AdjustmentCreateClient – create adjustment form`) actually correct?**
  _`AdjustmentForm – edit/create adjustment form` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `StocktakeCountClient Component` (e.g. with `StocktakeForm Component` and `StocktakeStartClient Component`) actually correct?**
  _`StocktakeCountClient Component` has 3 INFERRED edges - model-reasoned connections that need verification._
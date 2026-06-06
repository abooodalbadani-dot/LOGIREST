<!-- File name suggestion: RFC_LogiRest-Kitchen-Store-Inventory-System.md -->

# RFC: LogiRest (kitchen-store-inventory-system) — Internal Web Inventory & Procurement
**Status:** Draft  
**Version:** 1.0  
**Last Updated:** 2026-04-18  
**Primary Language:** Arabic (RTL) — English supported (LTR)  
**Source:** “kitchen-store-inventory-system — Project Proposal” (7 pages)

---

## 1. Abstract (الملخص)
يصف هذا الـ RFC متطلبات نظام ويب داخلي لإدارة **التموين والمخزون** لسلسلة مطاعم متعددة الفروع، مع التركيز على العمليات اللوجستية الداخلية فقط: المخزون، الشراء، الاستلام، التحويلات، الجرد، التسويات.  
يعتمد النظام على نموذج **Ledger‑based** (سجل حركات غير قابل للتعديل/الحذف) مع دعم **Lots/Batches + Expiry** وتطبيق سياسة **FEFO** افتراضيًا. كما يدعم الباركود، تعدد اللغات، تعدد العملات (FX عند ترحيل الاستلام)، ومسارات موافقات قابلة للتدقيق.

---

## 2. Background (الخلفية)
تعاني العمليات التشغيلية في سلاسل المطاعم متعددة الفروع من:
- أخطاء في الاستلام والصرف والتحويلات.
- هدر بسبب انتهاء الصلاحية وضعف الرؤية اللحظية للدفعات.
- فروقات جرد غير موثقة أو صعبة التتبع.
- إدخال يدوي بطيء يسبب أخطاء.

هذا النظام يهدف إلى توحيد الدورة التشغيلية ورفع الدقة والشفافية عبر سجل حركات محكم + أقفال + تدقيق.

---

## 3. Goals (الأهداف)
النظام MUST:
1) يوحد دورة التشغيل: **طلب مطبخ → صرف → معالجة عجز → PR → PO → GRN**  
2) يضمن دقة المخزون ويمنع التلاعب عبر:
   - Ledger immutable
   - Transactions + Row-level locks
   - Audit logs
3) يقلل الهدر عبر تنبيهات وتقارير قرب انتهاء الصلاحية.
4) يسرّع العمليات اليومية عبر الباركود.
5) يضبط الجرد والتسويات بمسار موافقات واضح وقابل للتدقيق.

---

## 4. Non‑Goals (خارج النطاق)
النظام MUST NOT يتضمن:
- POS أو المبيعات أو المدفوعات أو فواتير العملاء.
- محاسبة كاملة (AR/AP/GL). (يدعم تكلفة الشراء وتقارير داخلية فقط)
- Multi-tenant SaaS (المؤسسة واحدة متعددة الفروع).

---

## 5. Terminology (مصطلحات)
- **Ledger:** سجل حركات المخزون غير قابل للتعديل/الحذف.
- **Movement:** حركة مخزون ناتجة عن (GRN / Issue / Transfer / Adjustment).
- **Lot/Batch:** دفعة مخزون لها رقم دفعة وصلاحية.
- **Expiry:** تاريخ انتهاء الصلاحية.
- **FEFO:** First Expire First Out (الأقرب انتهاءً يُصرَف أولًا).
- **PR:** Purchase Request (طلب شراء).
- **PO:** Purchase Order (أمر شراء).
- **GRN:** Goods Receipt Note (إذن/محضر استلام).
- **Stocktake:** جرد (جلسة عد).
- **Adjustment:** تسوية مخزون موثقة (تصحيح/هالك/انتهاء/فرق جرد…).
- **Scope:** تقييد بيانات المستخدم حسب (Branch/Warehouse/Department).

---

## 6. Functional Scope (النطاق الوظيفي)

### 6.1 Master Data (البيانات المرجعية)
النظام MUST يدعم:
- Branches, Warehouses, Departments (مع **virtual warehouse لكل قسم**).
- Suppliers.
- Items:
  - Categories, Images
  - Units of Measure + Conversions (UoM)
  - Barcodes (Item/Packaging barcode → item+uom+default qty)
- Currencies + FX Rates.
- Excel Import (Items/UoM/Barcodes) مع:
  - Validation
  - Error Report

### 6.2 Kitchen Requests & Issue (طلبات المطبخ والصرف)
النظام MUST يدعم:
- إنشاء/إرسال/متابعة طلبات المطبخ.
- Issue (صرف) مع:
  - Partial issue
  - FEFO lot suggestion
  - Lot split allocation
  - منع صرف المنتهي افتراضيًا
  - Admin override مع سبب موثق

### 6.3 Procurement (PR → PO → GRN)
النظام MUST يدعم:
- PR ثم PO ثم GRN.
- Approvals (مسار موافقات) للمستندات حسب السياسة المتفق عليها.
- GRN receiving:
  - Lots + Expiry (إلزامي عند الحاجة)
  - تحديث المخزون + تكلفة الشراء
- Multi-currency:
  - PO بعملة المورد
  - تحويل للعملة الأساسية عند **GRN POST**
  - تخزين FX rate لضمان ثبات التقارير

### 6.4 Transfers (Ship → Receive)
النظام MUST يدعم:
- تحويل بين المخازن بمرحلتين:
  - Ship (TRANSFER_OUT)
  - Receive (TRANSFER_IN)
- الحفاظ على lot_number + expiry خلال التحويل.

### 6.5 Stocktake (Snapshot + Lock)
النظام MUST يدعم:
- جلسات جرد (كامل/دوري حسب الحاجة).
- عند START:
  - Snapshot للأرصدة
  - Lock يمنع ترحيل الحركات في المخزن أثناء الجرد
- Counting ثم Variance ثم Adjustment مع موافقات ثم Post/Close.

### 6.6 Adjustments
النظام MUST يدعم:
- تسويات مخزون موثقة:
  - سبب إلزامي
  - مسار موافقات
  - Post ينتج Movements في Ledger
- لا يسمح بتعديل مباشر للأرصدة.

### 6.7 Inventory Views / Reports
النظام MUST يوفر:
- Inventory balances (Warehouse × Item)
- Lot balances (Warehouse × Item × Lot)
- Stock movements ledger (filters + export)
- تقارير (CSV/XLSX):
  - Available inventory
  - Stock movements
  - Expiry / near-expiry
  - Stocktake variance
  - PR/PO/GRN status
  - Currency summaries

### 6.8 Notifications & Email
النظام MUST يدعم:
- In-app notifications.
- Outbox pattern لإرسال الإيميل/الإشعارات بشكل موثوق.
- Email templates قابلة للتخصيص:
  - From / Reply-to / Signature
  - AR/EN templates
- Email logs (سجل إرسال).

---

## 7. Inventory Model & Posting Rules (Ledger‑First)

### 7.1 Immutability
- `stock_movements` MUST be immutable (لا تعديل/حذف).
- أي تصحيح MUST يتم عبر Adjustment.

### 7.2 Balances Performance Tables
- النظام SHOULD يحتفظ بجداول أرصدة محسّنة للأداء:
  - `inventory_balances` (warehouse_id, item_id)
  - `inventory_lot_balances` (warehouse_id, item_id, lot_id)

### 7.3 Transactions & Locking
- كل عمليات POST (GRN/Issue/Transfer/Adjustment/Stocktake) MUST تتم داخل DB Transaction.
- النظام MUST يستخدم Row-level locks لمنع السباقات ومنع الرصيد السلبي.

### 7.4 Negative Stock & Expired Rules
- النظام MUST يمنع الرصيد السلبي.
- النظام MUST يمنع صرف expired افتراضيًا.
- Override expired MAY يكون متاحًا لدور إداري مع:
  - سبب إلزامي
  - audit entry

### 7.5 Idempotency & Outbox
- عمليات POST MUST تكون idempotent لمنع التكرار.
- Outbox MUST يضمن عدم فقد الإشعارات/الإيميلات.

---

## 8. UI/UX Requirements (متطلبات الواجهة)
### 8.1 Language & Direction
- العربية (RTL) MUST تكون الافتراضية.
- الإنجليزية (LTR) MUST تكون مدعومة.
- UI MUST NOT يجمع AR/EN في نفس label/control. (لا “Warehouse/المخزن” داخل نفس الزر/الهيدر)

### 8.2 Barcode UX
- النظام MUST يدعم:
  - USB keyboard wedge
  - (عند الإمكان) mobile camera scan UI
- Scan input MUST يبقى focused.
- كل scan MUST يزيد الكمية حسب default qty mapping.
- النظام SHOULD يوفر:
  - undo last scan
  - clear scans
  - scan feedback (success/fail)

### 8.3 Document Status & Read‑only
- كل مستند MUST يعرض حالة واضحة (Draft/Submitted/Approved/Posted/…).
- Posted documents MUST تكون read-only.
- “POST is irreversible” MUST يظهر كتأكيد قبل الترحيل.

### 8.4 Stocktake Lock Visibility
- عند lock MUST يظهر banner واضح.
- UI MUST يمنع أزرار POST للحركات المتأثرة بالمخزن المقفول.

---

## 9. Security & Compliance (UI implications)
النظام MUST يدعم:
- Authentication: JWT + refresh (انعكاسها في UI: session timeout + re-login)
- XSS/CSRF protections (UI: safe rendering، forms best practices)
- Rate limiting (UI: proper error messaging)
- Audit logs لكل العمليات الحساسة:
  - who/when/what/before/after/reason

---

## 10. Data Export & Import
- Export MUST يدعم CSV/XLSX للتقارير والقوائم الرئيسية.
- Import MUST يدعم:
  - Upload
  - Validation results
  - Error report
  - Commit

---

## 11. MVP Scope (حسب المقترح)
الإصدار الأول MUST يشمل:
- Master data + RBAC/scopes
- Kitchen requests + Issue (lots + FEFO + ledger)
- PR/PO/GRN + lots/expiry + multi-currency at GRN post
- Transfers (ship/receive)
- Stocktake (snapshot + variance + adjustment post)
- Notifications + email + basic templates
- Basic reports + Excel import
- Ops: Docker + CI/CD + backups + monitoring (كمنظومة تشغيل)

---

## 12. Acceptance Criteria (معايير قبول عالية المستوى)
يُعتبر النظام مطابقًا لهذا RFC إذا:
1) كل عمليات المخزون تُرحّل عبر POST وتنتج movements immutable.
2) لا يمكن تعديل/حذف movements، والتصحيح عبر adjustments فقط.
3) FEFO يعمل، والمنتهي blocked افتراضيًا.
4) Stocktake ينشئ snapshot ويقفل المخزن ويمنع الترحيل أثناء القفل.
5) Multi-currency: FX يُثبت عند GRN Post ويظهر في التقارير.
6) Barcode flows تعمل في GRN/Issue/Stocktake.
7) Audit logs متاحة لكل العمليات الحساسة.
8) العربية RTL افتراضية والإنجليزية LTR مدعومة دون خلط داخل نفس control.

---

## 13. Open Questions (أسئلة مفتوحة قبل التنفيذ)
1) ما هي **سياسة التكلفة** (Weighted Avg / FIFO costing / Last price) للتقارير الداخلية؟
2) ما هو **نموذج الموافقات**:
   - حسب الفرع؟
   - حسب قيمة المستند؟
   - حسب نوع الصنف؟
3) هل نحتاج شاشات “هالك/إتلاف” كعملية مستقلة أم تُغطى بالكامل عبر Adjustment reasons؟
4) هل نحتاج **طباعة** مستندات (PO/GRN/Transfer/Stocktake sheets) وملصقات باركود؟
5) مدى إلزامية EN في الـ MVP (AR فقط أولًا أم AR+EN من البداية)؟
6) ما مدى إلزامية Mobile 390 لكل الشاشات أم فقط التشغيلية؟

---

## 14. Appendix (ملاحق)

This appendix enumerates the **expected UI screens** for the system based on the **kitchen-store-inventory-system Proposal** (ledger-based inventory, lots/expiry + FEFO, stocktake snapshot+lock, approvals, email/outbox, i18n AR/EN, multi-currency FX at GRN post).

## A.0 Global Conventions (Applies to All Screens)
- **Default locale:** Arabic (**RTL**)  
  Secondary locale: English (**LTR**)
- **Standard UI states:** Loading / Empty / Error / Permission Denied (PD)
- **Posting rule:** Any **POSTED** document is **read-only** (no edit/delete); corrective actions occur via **Adjustments**.
- **Operational constraints:**  
  - FEFO default for issuing lots  
  - Expired issue blocked by default; admin override requires **reason + audit note**  
  - Stocktake lock blocks posting movements affecting the locked warehouse
- **Breakpoints:**
  - **D** = Desktop 1440 (required)
  - **T** = Tablet 834 (required)
  - **M** = Mobile 390 (required for Issue/GRN/Stocktake/Transfers scan workflows; recommended elsewhere)

### Roles (for visibility)
- **ADMIN** — System Admin
- **INV_MGR** — Inventory Manager
- **WH_KEEPER** — Warehouse Keeper
- **PROC_OFF** — Procurement Officer
- **APPROVER** — Approver/Manager
- **AUDITOR** — Auditor (read-only)

---

## A.1 Auth & Global (6)
| ID | Screen (EN) | Route | BP | Roles | Required States | Notes |
|---|---|---|:--:|---|---|---|
| A1 | Login | `/login` | D/T/M | All | L/Err | — |
| A2 | Forgot Password | `/forgot-password` | D/T/M | All | L/Err | — |
| A3 | Reset Password | `/reset-password` | D/T/M | All | L/Err | — |
| A4 | Session Timeout | `/session-timeout` | D/T/M | All | L | Re-login CTA |
| A5 | Dashboard | `/dashboard` | D/T/M | All (scoped) | L/E/Err/PD | KPIs, near-expiry, pending docs |
| A6 | Profile | `/profile` | D/T/M | All | L/Err/PD | Language preference (AR default) |

---

## A.2 Master Data + Import (34)

### Entities (10 × 3 screens = 30)
> Pattern per entity: **List / Form (Create+Edit) / Details**

| ID | Entity | Screen | Route | BP | Roles | States | Notes |
|---|---|---|---|:--:|---|---|---|
| MD1 | Branches | List | `/master-data/branches` | D/T | ADMIN | L/E/Err/PD | — |
| MD2 | Branches | Form | `/master-data/branches/new` + `/master-data/branches/[id]/edit` | D/T | ADMIN | L/Err/PD | — |
| MD3 | Branches | Details | `/master-data/branches/[id]` | D/T | ADMIN/AUDITOR | L/Err/PD | Audit preview (optional) |
| MD4 | Warehouses | List | `/master-data/warehouses` | D/T | ADMIN/INV_MGR | L/E/Err/PD | — |
| MD5 | Warehouses | Form | `/master-data/warehouses/new` + `/master-data/warehouses/[id]/edit` | D/T | ADMIN/INV_MGR | L/Err/PD | — |
| MD6 | Warehouses | Details | `/master-data/warehouses/[id]` | D/T | ADMIN/INV_MGR/AUDITOR | L/Err/PD | Shows “locked” status during stocktake |
| MD7 | Departments | List | `/master-data/departments` | D/T | ADMIN/INV_MGR | L/E/Err/PD | — |
| MD8 | Departments | Form | `/master-data/departments/new` + `/master-data/departments/[id]/edit` | D/T | ADMIN/INV_MGR | L/Err/PD | Virtual warehouse mapping |
| MD9 | Departments | Details | `/master-data/departments/[id]` | D/T | ADMIN/INV_MGR/AUDITOR | L/Err/PD | — |
| MD10 | Suppliers | List | `/master-data/suppliers` | D/T | ADMIN/PROC_OFF | L/E/Err/PD | — |
| MD11 | Suppliers | Form | `/master-data/suppliers/new` + `/master-data/suppliers/[id]/edit` | D/T | ADMIN/PROC_OFF | L/Err/PD | — |
| MD12 | Suppliers | Details | `/master-data/suppliers/[id]` | D/T | ADMIN/PROC_OFF/AUDITOR | L/Err/PD | — |
| MD13 | Categories | List | `/master-data/categories` | D/T | ADMIN/INV_MGR | L/E/Err/PD | — |
| MD14 | Categories | Form | `/master-data/categories/new` + `/master-data/categories/[id]/edit` | D/T | ADMIN/INV_MGR | L/Err/PD | — |
| MD15 | Categories | Details | `/master-data/categories/[id]` | D/T | ADMIN/INV_MGR/AUDITOR | L/Err/PD | — |
| MD16 | Items | List | `/master-data/items` | D/T | INV_MGR/WH_KEEPER/PROC_OFF/AUDITOR | L/E/Err/PD | Export allowed by role |
| MD17 | Items | Form | `/master-data/items/new` + `/master-data/items/[id]/edit` | D/T | INV_MGR/ADMIN | L/Err/PD | Images, UoM, barcodes |
| MD18 | Items | Details | `/master-data/items/[id]` | D/T | INV_MGR/WH_KEEPER/PROC_OFF/AUDITOR | L/E/Err/PD | Tabs: Overview / Lots / Ledger |
| MD19 | UoM & Conversions | List | `/master-data/uom` | D/T | INV_MGR/ADMIN | L/E/Err/PD | — |
| MD20 | UoM & Conversions | Form | `/master-data/uom/new` + `/master-data/uom/[id]/edit` | D/T | INV_MGR/ADMIN | L/Err/PD | — |
| MD21 | UoM & Conversions | Details | `/master-data/uom/[id]` | D/T | INV_MGR/ADMIN/AUDITOR | L/Err/PD | — |
| MD22 | Barcodes | List | `/master-data/barcodes` | D/T | INV_MGR/ADMIN | L/E/Err/PD | Item/package barcodes |
| MD23 | Barcodes | Form | `/master-data/barcodes/new` + `/master-data/barcodes/[id]/edit` | D/T | INV_MGR/ADMIN | L/Err/PD | Includes default qty per scan |
| MD24 | Barcodes | Details | `/master-data/barcodes/[id]` | D/T | INV_MGR/ADMIN/AUDITOR | L/Err/PD | — |
| MD25 | Currencies | List | `/master-data/currencies` | D/T | ADMIN | L/E/Err/PD | Base currency defined here |
| MD26 | Currencies | Form | `/master-data/currencies/new` + `/master-data/currencies/[id]/edit` | D/T | ADMIN | L/Err/PD | — |
| MD27 | Currencies | Details | `/master-data/currencies/[id]` | D/T | ADMIN/AUDITOR | L/Err/PD | — |
| MD28 | FX Rates | List | `/master-data/fx-rates` | D/T | ADMIN/PROC_OFF | L/E/Err/PD | — |
| MD29 | FX Rates | Form | `/master-data/fx-rates/new` + `/master-data/fx-rates/[id]/edit` | D/T | ADMIN/PROC_OFF | L/Err/PD | — |
| MD30 | FX Rates | Details | `/master-data/fx-rates/[id]` | D/T | ADMIN/PROC_OFF/AUDITOR | L/Err/PD | — |

### Excel Import (4)
| ID | Screen (EN) | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| IMP1 | Import Center | `/master-data/import` | D/T | ADMIN/INV_MGR | L/E/Err/PD | Select: items/uom/barcodes |
| IMP2 | Upload File | `/master-data/import/[type]/upload` | D/T | ADMIN/INV_MGR | L/Err/PD | Type-specific template |
| IMP3 | Validation Results | `/master-data/import/[type]/validate` | D/T | ADMIN/INV_MGR | L/E/Err/PD | Error report download |
| IMP4 | Commit Import | `/master-data/import/[type]/commit` | D/T | ADMIN/INV_MGR | L/Err/PD | Idempotent commit |

---

## A.3 Operations (25)

### Kitchen Requests (3)
| ID | Screen (EN) | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| OPK1 | Kitchen Requests List | `/operations/kitchen-requests` | D/T/M | INV_MGR/WH_KEEPER/APPROVER/AUDITOR | L/E/Err/PD | — |
| OPK2 | Create Kitchen Request | `/operations/kitchen-requests/new` | D/T/M | WH_KEEPER/INV_MGR | L/Err/PD | Partial fulfillment supported |
| OPK3 | Kitchen Request Details | `/operations/kitchen-requests/[id]` | D/T/M | INV_MGR/WH_KEEPER/APPROVER/AUDITOR | L/Err/PD | Approval actions if enabled |

### Issues / Stock Issue (6)
| ID | Screen (EN) | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| OPI1 | Issues List | `/operations/issues` | D/T/M | INV_MGR/WH_KEEPER/AUDITOR | L/E/Err/PD | — |
| OPI2 | Create Issue | `/operations/issues/new` | D/T/M | WH_KEEPER/INV_MGR | L/Err/PD | FEFO default |
| OPI3 | Issue Details | `/operations/issues/[id]` | D/T/M | INV_MGR/WH_KEEPER/AUDITOR | L/Err/PD | Posted = read-only |
| OPI4 | Lot Allocation (FEFO) | `/operations/issues/[id]/lots` | D/T/M | WH_KEEPER/INV_MGR | L/E/Err/PD | Lot split allocations |
| OPI5 | Issue Scan Mode | `/operations/issues/new/scan` | D/T/M | WH_KEEPER/INV_MGR | L/Err/PD | Always-focused scan input |
| OPI6 | Expired Override | `/operations/issues/[id]/override-expired` | D/T/M | ADMIN/INV_MGR | L/Err/PD | Reason + audit note required |

### Transfers (5)
| ID | Screen (EN) | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| OPT1 | Transfers List | `/operations/transfers` | D/T/M | INV_MGR/WH_KEEPER/AUDITOR | L/E/Err/PD | — |
| OPT2 | Create Transfer | `/operations/transfers/new` | D/T/M | WH_KEEPER/INV_MGR | L/Err/PD | Preserve lot/expiry |
| OPT3 | Transfer Details | `/operations/transfers/[id]` | D/T/M | INV_MGR/WH_KEEPER/AUDITOR | L/Err/PD | — |
| OPT4 | Ship Transfer | `/operations/transfers/[id]/ship` | D/T/M | WH_KEEPER/INV_MGR | L/Err/PD | TRANSFER_OUT |
| OPT5 | Receive Transfer | `/operations/transfers/[id]/receive` | D/T/M | WH_KEEPER/INV_MGR | L/Err/PD | TRANSFER_IN + discrepancy reasons |

### Stocktake (8)
| ID | Screen (EN) | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| OPS1 | Stocktake Sessions List | `/operations/stocktakes` | D/T/M | INV_MGR/WH_KEEPER/APPROVER/AUDITOR | L/E/Err/PD | — |
| OPS2 | Create Stocktake | `/operations/stocktakes/new` | D/T/M | INV_MGR | L/Err/PD | Scope selection |
| OPS3 | Stocktake Details | `/operations/stocktakes/[id]` | D/T/M | INV_MGR/WH_KEEPER/APPROVER/AUDITOR | L/Err/PD | Lock banner when started |
| OPS4 | Start Stocktake | `/operations/stocktakes/[id]/start` | D/T | INV_MGR | L/Err/PD | Snapshot + lock confirm |
| OPS5 | Counting | `/operations/stocktakes/[id]/count` | D/T/M | WH_KEEPER/INV_MGR | L/E/Err/PD | Barcode-first flow |
| OPS6 | Variance Review | `/operations/stocktakes/[id]/variance` | D/T | INV_MGR | L/E/Err/PD | Reasons required |
| OPS7 | Approve Stocktake | `/operations/stocktakes/[id]/approve` | D/T | APPROVER | L/Err/PD | Approve/reject + comment |
| OPS8 | Post/Close Stocktake | `/operations/stocktakes/[id]/post` | D/T | INV_MGR | L/Err/PD | Irreversible |

### Adjustments (3)
| ID | Screen (EN) | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| OPA1 | Adjustments List | `/operations/adjustments` | D/T/M | INV_MGR/WH_KEEPER/APPROVER/AUDITOR | L/E/Err/PD | — |
| OPA2 | Create Adjustment | `/operations/adjustments/new` | D/T/M | WH_KEEPER/INV_MGR | L/Err/PD | Reason required |
| OPA3 | Adjustment Details | `/operations/adjustments/[id]` | D/T/M | INV_MGR/WH_KEEPER/APPROVER/AUDITOR | L/Err/PD | Posted = read-only |

---

## A.4 Procurement (13)

### PR (4)
| ID | Screen (EN) | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| PR1 | PR List | `/procurement/pr` | D/T | PROC_OFF/APPROVER/AUDITOR | L/E/Err/PD | — |
| PR2 | Create PR | `/procurement/pr/new` | D/T | PROC_OFF | L/Err/PD | — |
| PR3 | PR Details | `/procurement/pr/[id]` | D/T | PROC_OFF/APPROVER/AUDITOR | L/Err/PD | — |
| PR4 | Approve/Reject PR | `/procurement/pr/[id]/approve` | D/T | APPROVER | L/Err/PD | Comment required on reject |

### PO (4)
| ID | Screen (EN) | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| PO1 | PO List | `/procurement/po` | D/T | PROC_OFF/APPROVER/AUDITOR | L/E/Err/PD | — |
| PO2 | Create PO | `/procurement/po/new` | D/T | PROC_OFF | L/Err/PD | Supplier currency |
| PO3 | PO Details | `/procurement/po/[id]` | D/T | PROC_OFF/APPROVER/AUDITOR | L/Err/PD | — |
| PO4 | Approve/Reject PO | `/procurement/po/[id]/approve` | D/T | APPROVER | L/Err/PD | — |

### GRN (5)
| ID | Screen (EN) | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| GRN1 | GRN List | `/procurement/grn` | D/T/M | WH_KEEPER/PROC_OFF/INV_MGR/AUDITOR | L/E/Err/PD | — |
| GRN2 | Create GRN (from PO) | `/procurement/grn/new?po=[id]` | D/T/M | WH_KEEPER/PROC_OFF | L/Err/PD | Lots + expiry required |
| GRN3 | GRN Details | `/procurement/grn/[id]` | D/T/M | WH_KEEPER/PROC_OFF/INV_MGR/AUDITOR | L/Err/PD | Posted = read-only |
| GRN4 | GRN Scan Mode | `/procurement/grn/new/scan?po=[id]` | D/T/M | WH_KEEPER/PROC_OFF | L/Err/PD | Scan increments lines |
| GRN5 | Post GRN (FX Capture) | `/procurement/grn/[id]/post` | D/T/M | PROC_OFF/INV_MGR | L/Err/PD | Irreversible; stores FX |

---

## A.5 Inventory Views (3)
| ID | Screen (EN) | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| IV1 | Inventory Balances | `/inventory/balances` | D/T | INV_MGR/WH_KEEPER/AUDITOR | L/E/Err/PD | Warehouse × Item |
| IV2 | Lot Balances | `/inventory/lots` | D/T | INV_MGR/WH_KEEPER/AUDITOR | L/E/Err/PD | Warehouse × Item × Lot |
| IV3 | Stock Movements Ledger | `/inventory/movements` | D/T | INV_MGR/WH_KEEPER/PROC_OFF/AUDITOR | L/E/Err/PD | Filters + export |

---

## A.6 Notifications & Email (4)
| ID | Screen (EN) | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| NE1 | Notification Center | `/communications/notifications` | D/T/M | All | L/E/Err/PD | In-app |
| NE2 | Outbox | `/communications/outbox` | D/T | ADMIN/INV_MGR/PROC_OFF/AUDITOR | L/E/Err/PD | Pending/Sent/Failed + retry |
| NE3 | Email Templates | `/communications/email-templates` | D/T | ADMIN | L/E/Err/PD | Separate AR/EN editing + variables |
| NE4 | Email Logs | `/communications/email-logs` | D/T | ADMIN/AUDITOR | L/E/Err/PD | Provider response |

---

## A.7 Reports (7)
| ID | Report Screen | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| R1 | Reports Hub | `/reports` | D/T | INV_MGR/PROC_OFF/AUDITOR | L/E/Err/PD | Entry point |
| R2 | Available Inventory | `/reports/available-inventory` | D/T | INV_MGR/WH_KEEPER/AUDITOR | L/E/Err/PD | Export CSV/XLSX |
| R3 | Stock Movements | `/reports/stock-movements` | D/T | INV_MGR/AUDITOR | L/E/Err/PD | Export |
| R4 | Expiry / Near Expiry | `/reports/expiry` | D/T | INV_MGR/WH_KEEPER/AUDITOR | L/E/Err/PD | Highlights near-expiry |
| R5 | Stocktake Variance | `/reports/stocktake-variance` | D/T | INV_MGR/AUDITOR | L/E/Err/PD | Export |
| R6 | PR/PO/GRN Status | `/reports/procurement-status` | D/T | PROC_OFF/APPROVER/AUDITOR | L/E/Err/PD | Export |
| R7 | Currency Summaries | `/reports/currency-summaries` | D/T | PROC_OFF/INV_MGR/AUDITOR | L/E/Err/PD | Base vs supplier |

---

## A.8 Admin (8)
### Users (4)
| ID | Screen | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| ADU1 | Users List | `/admin/users` | D/T | ADMIN | L/E/Err/PD | — |
| ADU2 | Create User | `/admin/users/new` | D/T | ADMIN | L/Err/PD | Includes scopes + language pref |
| ADU3 | User Details | `/admin/users/[id]` | D/T | ADMIN | L/Err/PD | Roles + scopes |
| ADU4 | Edit User | `/admin/users/[id]/edit` | D/T | ADMIN | L/Err/PD | — |

### Roles & Permissions (2)
| ID | Screen | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| ADR1 | Roles List | `/admin/roles` | D/T | ADMIN | L/E/Err/PD | — |
| ADR2 | Role Details / Permission Matrix | `/admin/roles/[id]` | D/T | ADMIN | L/Err/PD | Module × actions |

### Audit (1) + Settings (1)
| ID | Screen | Route | BP | Roles | States | Notes |
|---|---|---|:--:|---|---|---|
| ADA1 | Audit Logs | `/admin/audit-logs` | D/T | ADMIN/AUDITOR | L/E/Err/PD | Before/after diff + filters |
| ADS1 | Settings | `/admin/settings` | D/T | ADMIN | L/Err/PD | Base currency, default language, email sender placeholders |

---

## A.9 Notes on Out-of-Scope (Per Proposal)
The following are explicitly out-of-scope and should **not** appear as screens in this RFC:
- POS, Sales, Payments, Customer invoices
- Full accounting (AR/AP/GL)
- Multi-tenant SaaS (single organization only)
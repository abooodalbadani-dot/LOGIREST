# Full UX/UI & Navigation Connectivity Audit Report

## 1. Overview
- **Total number of screens:** 130
- **Fully connected screens:** 67

## 2. Orphan Screens List
- `/issues/new/scan-mode` (Operations - List)
- `/issues/[id]/scan-mode` (Operations - Subpage (scan-mode))
- `/kitchen-requests/new` (Operations - Create)
- `/stocktake/archive` (Operations - List)
- `/stocktake/new` (Operations - Create)
- `/stocktake/[id]/approve` (Operations - Subpage (approve))
- `/stocktake/[id]/count` (Operations - Subpage (count))
- `/stocktake/[id]/post` (Operations - Subpage (post))
- `/stocktake/[id]/start` (Operations - Subpage (start))
- `/stocktake/[id]/variance` (Operations - Subpage (variance))
- `/transfers/hub` (Operations - List)
- `/transfers/[id]/dispute` (Operations - Subpage (dispute))
- `/transfers/[id]/receive` (Operations - Subpage (receive))
- `/transfers/[id]/ship` (Operations - Subpage (ship))
- `/yield-management/new` (Operations - Create)
- `/goods-received/new` (Procurement - Create)
- `/goods-received/[id]/post` (Procurement - Subpage (post))
- `/goods-received/[id]/scan-mode` (Procurement - Subpage (scan-mode))
- `/purchase-orders/[id]/approve` (Procurement - Subpage (approve))
- `/purchase-requests/new` (Procurement - Create)
- `/purchase-requests/[id]/approve` (Procurement - Subpage (approve))
- `/purchase-requests/[id]/edit` (Procurement - Edit)
- `/admin/roles/matrix` (Admin - List)
- `/admin/roles/[id]/edit` (Admin - Edit)
- `/admin/users/new` (Admin - Create)
- `/admin/users/[id]/edit` (Admin - Edit)
- `/communications/notifications/settings` (Unknown - List)
- `/context-selector` (Unknown - List)
- `/inventory/expired-override` (Unknown - List)
- `/inventory/transfers/hub` (Unknown - List)
- `/master-data/barcodes/mapping` (Master Data - List)
- `/master-data/barcodes/new` (Master Data - Create)
- `/master-data/barcodes/[id]/edit` (Master Data - Edit)
- `/master-data/branches/new` (Master Data - Create)
- `/master-data/branches/[id]/edit` (Master Data - Edit)
- `/master-data/categories/new` (Master Data - Create)
- `/master-data/categories/[id]/edit` (Master Data - Edit)
- `/master-data/currencies/new` (Master Data - Create)
- `/master-data/currencies/[id]/edit` (Master Data - Edit)
- `/master-data/currencies/[id]/fx-rates` (Master Data - Subpage (fx-rates))
- `/master-data/departments/new` (Master Data - Create)
- `/master-data/departments/[id]/edit` (Master Data - Edit)
- `/master-data/fx-rates/new` (Master Data - Create)
- `/master-data/fx-rates/[id]/edit` (Master Data - Edit)
- `/master-data/import/barcodes` (Master Data - List)
- `/master-data/import/items` (Master Data - List)
- `/master-data/import/uoms` (Master Data - List)
- `/master-data/items/new` (Master Data - Create)
- `/master-data/items/[id]/edit` (Master Data - Edit)
- `/master-data/suppliers/new` (Master Data - Create)
- `/master-data/suppliers/[id]/edit` (Master Data - Edit)
- `/master-data/suppliers/[id]/profile` (Master Data - Subpage (profile))
- `/master-data/units-of-measure/new` (Master Data - Create)
- `/master-data/units-of-measure/[id]/edit` (Master Data - Edit)
- `/master-data/warehouses/new` (Master Data - Create)
- `/master-data/warehouses/[id]/edit` (Master Data - Edit)
- `/reports/available-inventory` (Reports - Report)
- `/reports/currency-summaries` (Reports - Report)
- `/reports/expiry` (Reports - Report)
- `/reports/movements` (Reports - Report)
- `/reports/procurement-status` (Reports - Report)
- `/reports/stocktake-variance` (Reports - Report)
- `/search` (Unknown - List)

## 3. Missing Sidebar Entries (List Pages)
- `/issues/new/scan-mode`
- `/stocktake/archive`
- `/transfers/hub`
- `/admin/roles/matrix`
- `/communications/notifications/settings`
- `/context-selector`
- `/inventory/expired-override`
- `/inventory/scan-mode`
- `/inventory/transfers/hub`
- `/master-data/barcodes/mapping`
- `/master-data/import/barcodes`
- `/master-data/import/items`
- `/master-data/import/uoms`
- `/profile`
- `/search`
- `/forgot-password`
- `/login`
- `/reset-password`

## 4. Missing Dashboard Shortcuts (List Pages)
- `/issues/new/scan-mode`
- `/kitchen-requests`
- `/stocktake/archive`
- `/transfers`
- `/transfers/hub`
- `/yield-management`
- `/goods-received`
- `/landed-cost`
- `/purchase-orders`
- `/admin/audit-logs`
- `/admin/mail-settings`
- `/admin/restaurant-profile`
- `/admin/roles`
- `/admin/roles/matrix`
- `/admin/settings`
- `/communications/email-outbox`
- `/communications/notifications`
- `/communications/notifications/settings`
- `/communications/notifications/templates`
- `/context-selector`
- `/dashboard`
- `/inventory`
- `/inventory/balance`
- `/inventory/expired-override`
- `/inventory/lots`
- `/inventory/movements`
- `/inventory/scan-mode`
- `/inventory/transfers/hub`
- `/master-data`
- `/master-data/barcodes`
- `/master-data/barcodes/mapping`
- `/master-data/branches`
- `/master-data/categories`
- `/master-data/currencies`
- `/master-data/departments`
- `/master-data/fx-rates`
- `/master-data/import`
- `/master-data/import/barcodes`
- `/master-data/import/items`
- `/master-data/import/uoms`
- `/master-data/items`
- `/master-data/suppliers`
- `/master-data/units-of-measure`
- `/master-data/warehouses`
- `/profile`
- `/search`
- `/forgot-password`
- `/login`
- `/reset-password`

## 5. Screen Inventory
| Route | Module | Type | Header | Back | Empty | Loading |
|---|---|---|---|---|---|---|
| `/` | Dashboard | List | No | Yes | No | No |
| `/adjustments` | Operations | List | Yes | Yes | Yes | Yes |
| `/adjustments/[id]` | Operations | Detail | No | Yes | No | Yes |
| `/adjustments/new` | Operations | Create | Yes | Yes | No | Yes |
| `/admin/audit-logs` | Admin | List | Yes | No | Yes | Yes |
| `/admin/mail-settings` | Admin | List | No | Yes | No | Yes |
| `/admin/restaurant-profile` | Admin | List | No | Yes | No | Yes |
| `/admin/roles` | Admin | List | Yes | Yes | No | Yes |
| `/admin/roles/[id]` | Admin | Detail | No | Yes | No | Yes |
| `/admin/roles/[id]/edit` | Admin | Edit | No | No | No | No |
| `/admin/roles/matrix` | Admin | List | No | No | No | No |
| `/admin/settings` | Admin | List | No | Yes | No | Yes |
| `/admin/users` | Admin | List | Yes | No | No | Yes |
| `/admin/users/[id]` | Admin | Detail | No | Yes | No | Yes |
| `/admin/users/[id]/edit` | Admin | Edit | No | No | No | No |
| `/admin/users/new` | Admin | Create | No | No | No | No |
| `/communications/email-outbox` | Unknown | List | Yes | No | No | Yes |
| `/communications/notifications` | Unknown | List | Yes | No | No | No |
| `/communications/notifications/settings` | Unknown | List | No | Yes | No | No |
| `/communications/notifications/templates` | Unknown | List | No | No | No | Yes |
| `/communications/notifications/templates/[id]` | Unknown | Detail | No | Yes | No | Yes |
| `/context-selector` | Unknown | List | No | Yes | No | No |
| `/dashboard` | Unknown | List | Yes | Yes | No | Yes |
| `/forgot-password` | Auth | List | No | Yes | No | No |
| `/goods-received` | Procurement | List | Yes | Yes | Yes | Yes |
| `/goods-received/[id]` | Procurement | Detail | No | Yes | No | Yes |
| `/goods-received/[id]/post` | Procurement | Subpage (post) | Yes | Yes | No | Yes |
| `/goods-received/[id]/scan-mode` | Procurement | Subpage (scan-mode) | Yes | Yes | No | Yes |
| `/goods-received/new` | Procurement | Create | No | No | No | Yes |
| `/inventory` | Unknown | List | No | No | No | No |
| `/inventory/balance` | Unknown | List | No | Yes | Yes | Yes |
| `/inventory/expired-override` | Unknown | List | Yes | No | No | No |
| `/inventory/lots` | Unknown | List | No | Yes | No | Yes |
| `/inventory/movements` | Unknown | List | No | No | No | Yes |
| `/inventory/scan-mode` | Unknown | List | No | Yes | No | Yes |
| `/inventory/transfers/hub` | Unknown | List | Yes | Yes | No | No |
| `/issues` | Operations | List | Yes | Yes | Yes | Yes |
| `/issues/[id]` | Operations | Detail | No | Yes | No | Yes |
| `/issues/[id]/scan-mode` | Operations | Subpage (scan-mode) | No | No | No | Yes |
| `/issues/new` | Operations | Create | No | No | No | Yes |
| `/issues/new/scan-mode` | Operations | List | No | Yes | No | No |
| `/kitchen-requests` | Operations | List | Yes | No | No | Yes |
| `/kitchen-requests/[id]` | Operations | Detail | No | Yes | No | Yes |
| `/kitchen-requests/new` | Operations | Create | Yes | Yes | No | Yes |
| `/landed-cost` | Procurement | List | Yes | No | No | No |
| `/login` | Auth | List | No | Yes | No | Yes |
| `/master-data` | Master Data | List | Yes | No | No | No |
| `/master-data/barcodes` | Master Data | List | Yes | Yes | Yes | Yes |
| `/master-data/barcodes/[id]` | Master Data | Detail | No | No | No | No |
| `/master-data/barcodes/[id]/edit` | Master Data | Edit | No | No | No | No |
| `/master-data/barcodes/mapping` | Master Data | List | Yes | No | No | Yes |
| `/master-data/barcodes/new` | Master Data | Create | No | No | No | No |
| `/master-data/branches` | Master Data | List | Yes | Yes | Yes | Yes |
| `/master-data/branches/[id]` | Master Data | Detail | No | No | No | No |
| `/master-data/branches/[id]/edit` | Master Data | Edit | No | No | No | No |
| `/master-data/branches/new` | Master Data | Create | No | No | No | No |
| `/master-data/categories` | Master Data | List | Yes | Yes | Yes | Yes |
| `/master-data/categories/[id]` | Master Data | Detail | No | No | No | No |
| `/master-data/categories/[id]/edit` | Master Data | Edit | No | No | No | No |
| `/master-data/categories/new` | Master Data | Create | No | No | No | No |
| `/master-data/currencies` | Master Data | List | Yes | Yes | Yes | Yes |
| `/master-data/currencies/[id]` | Master Data | Detail | No | No | No | No |
| `/master-data/currencies/[id]/edit` | Master Data | Edit | No | No | No | No |
| `/master-data/currencies/[id]/fx-rates` | Master Data | Subpage (fx-rates) | No | Yes | No | Yes |
| `/master-data/currencies/new` | Master Data | Create | No | No | No | No |
| `/master-data/departments` | Master Data | List | Yes | Yes | Yes | Yes |
| `/master-data/departments/[id]` | Master Data | Detail | No | No | No | No |
| `/master-data/departments/[id]/edit` | Master Data | Edit | No | No | No | No |
| `/master-data/departments/new` | Master Data | Create | No | No | No | No |
| `/master-data/fx-rates` | Master Data | List | Yes | Yes | Yes | Yes |
| `/master-data/fx-rates/[id]/edit` | Master Data | Edit | No | No | No | No |
| `/master-data/fx-rates/new` | Master Data | Create | No | No | No | No |
| `/master-data/import` | Master Data | List | Yes | Yes | No | No |
| `/master-data/import/barcodes` | Master Data | List | Yes | Yes | No | No |
| `/master-data/import/items` | Master Data | List | Yes | Yes | No | No |
| `/master-data/import/uoms` | Master Data | List | Yes | Yes | No | No |
| `/master-data/items` | Master Data | List | Yes | Yes | Yes | Yes |
| `/master-data/items/[id]` | Master Data | Detail | No | No | No | No |
| `/master-data/items/[id]/edit` | Master Data | Edit | No | No | No | No |
| `/master-data/items/new` | Master Data | Create | No | No | No | No |
| `/master-data/suppliers` | Master Data | List | Yes | Yes | Yes | Yes |
| `/master-data/suppliers/[id]` | Master Data | Detail | No | No | No | No |
| `/master-data/suppliers/[id]/edit` | Master Data | Edit | No | No | No | No |
| `/master-data/suppliers/[id]/profile` | Master Data | Subpage (profile) | Yes | Yes | No | Yes |
| `/master-data/suppliers/new` | Master Data | Create | No | No | No | No |
| `/master-data/units-of-measure` | Master Data | List | Yes | Yes | Yes | Yes |
| `/master-data/units-of-measure/[id]` | Master Data | Detail | No | No | No | No |
| `/master-data/units-of-measure/[id]/edit` | Master Data | Edit | No | No | No | No |
| `/master-data/units-of-measure/new` | Master Data | Create | No | No | No | No |
| `/master-data/warehouses` | Master Data | List | Yes | Yes | Yes | Yes |
| `/master-data/warehouses/[id]` | Master Data | Detail | No | No | No | No |
| `/master-data/warehouses/[id]/edit` | Master Data | Edit | No | No | No | No |
| `/master-data/warehouses/new` | Master Data | Create | No | No | No | No |
| `/profile` | Unknown | List | No | Yes | No | No |
| `/purchase-orders` | Procurement | List | Yes | Yes | Yes | Yes |
| `/purchase-orders/[id]` | Procurement | Detail | No | Yes | No | Yes |
| `/purchase-orders/[id]/approve` | Procurement | Subpage (approve) | Yes | Yes | No | Yes |
| `/purchase-orders/new` | Procurement | Create | No | Yes | No | Yes |
| `/purchase-requests` | Procurement | List | Yes | No | Yes | Yes |
| `/purchase-requests/[id]` | Procurement | Detail | No | Yes | No | Yes |
| `/purchase-requests/[id]/approve` | Procurement | Subpage (approve) | Yes | Yes | No | Yes |
| `/purchase-requests/[id]/edit` | Procurement | Edit | No | Yes | No | Yes |
| `/purchase-requests/new` | Procurement | Create | No | Yes | No | Yes |
| `/reports` | Reports | Report | Yes | Yes | No | No |
| `/reports/available-inventory` | Reports | Report | Yes | Yes | No | Yes |
| `/reports/currency-summaries` | Reports | Report | Yes | Yes | No | Yes |
| `/reports/expiry` | Reports | Report | Yes | Yes | No | Yes |
| `/reports/movements` | Reports | Report | Yes | Yes | No | Yes |
| `/reports/procurement-status` | Reports | Report | Yes | Yes | No | Yes |
| `/reports/stocktake-variance` | Reports | Report | Yes | Yes | No | Yes |
| `/reset-password` | Auth | List | No | Yes | No | No |
| `/search` | Unknown | List | No | No | No | Yes |
| `/stocktake` | Operations | List | Yes | Yes | Yes | Yes |
| `/stocktake/[id]` | Operations | Detail | No | Yes | No | Yes |
| `/stocktake/[id]/approve` | Operations | Subpage (approve) | Yes | Yes | No | Yes |
| `/stocktake/[id]/count` | Operations | Subpage (count) | Yes | Yes | No | Yes |
| `/stocktake/[id]/post` | Operations | Subpage (post) | Yes | Yes | No | Yes |
| `/stocktake/[id]/start` | Operations | Subpage (start) | Yes | Yes | No | Yes |
| `/stocktake/[id]/variance` | Operations | Subpage (variance) | Yes | Yes | No | Yes |
| `/stocktake/archive` | Operations | List | Yes | Yes | Yes | Yes |
| `/stocktake/new` | Operations | Create | Yes | Yes | No | Yes |
| `/transfers` | Operations | List | Yes | Yes | Yes | Yes |
| `/transfers/[id]` | Operations | Detail | Yes | Yes | No | Yes |
| `/transfers/[id]/dispute` | Operations | Subpage (dispute) | Yes | Yes | No | Yes |
| `/transfers/[id]/receive` | Operations | Subpage (receive) | Yes | Yes | No | Yes |
| `/transfers/[id]/ship` | Operations | Subpage (ship) | Yes | Yes | No | Yes |
| `/transfers/hub` | Operations | List | Yes | Yes | No | No |
| `/transfers/new` | Operations | Create | Yes | No | No | Yes |
| `/yield-management` | Operations | List | Yes | No | No | Yes |
| `/yield-management/new` | Operations | Create | Yes | Yes | No | Yes |

## 6. Critical UX Gaps
- **/**: Missing Loading State, Missing Empty State
- **/adjustments/new**: Missing Success Redirect
- **/issues/new**: Missing Success Redirect
- **/issues/new/scan-mode**: Missing Loading State, Missing Empty State
- **/kitchen-requests**: Missing Empty State
- **/kitchen-requests/new**: Missing Success Redirect
- **/stocktake/new**: Missing Success Redirect
- **/transfers**: Missing Error Handling
- **/transfers/hub**: Missing Loading State, Missing Empty State, Missing Error Handling
- **/transfers/new**: Missing Success Redirect
- **/transfers/[id]**: Missing Error Handling
- **/yield-management**: Missing Empty State
- **/yield-management/new**: Missing Error Handling, Missing Success Redirect
- **/landed-cost**: Missing Loading State, Missing Empty State, Missing Error Handling
- **/purchase-orders**: Missing Error Handling
- **/purchase-requests**: Missing Error Handling
- **/admin/mail-settings**: Missing Empty State
- **/admin/restaurant-profile**: Missing Empty State
- **/admin/roles**: Missing Empty State, Missing Error Handling
- **/admin/roles/matrix**: Missing Loading State, Missing Empty State, Missing Error Handling
- **/admin/roles/[id]/edit**: Missing Error Handling, Missing Success Redirect
- **/admin/settings**: Missing Empty State, Missing Error Handling
- **/admin/users**: Missing Empty State, Missing Error Handling
- **/admin/users/new**: Missing Error Handling, Missing Success Redirect
- **/admin/users/[id]/edit**: Missing Error Handling, Missing Success Redirect
- **/communications/email-outbox**: Missing Empty State
- **/communications/notifications**: Missing Loading State, Missing Empty State, Missing Error Handling
- **/communications/notifications/settings**: Missing Loading State, Missing Empty State
- **/communications/notifications/templates**: Missing Empty State
- **/communications/notifications/templates/[id]**: Missing Error Handling
- **/context-selector**: Missing Loading State, Missing Empty State, Missing Error Handling
- **/dashboard**: Missing Empty State
- **/inventory**: Missing Loading State, Missing Empty State
- **/inventory/expired-override**: Missing Loading State, Missing Empty State
- **/inventory/lots**: Missing Empty State
- **/inventory/movements**: Missing Empty State
- **/inventory/scan-mode**: Missing Empty State
- **/inventory/transfers/hub**: Missing Loading State, Missing Empty State, Missing Error Handling
- **/master-data**: Missing Loading State, Missing Empty State, Missing Error Handling
- **/master-data/barcodes/mapping**: Missing Empty State
- **/master-data/barcodes/new**: Missing Error Handling, Missing Success Redirect
- **/master-data/barcodes/[id]**: Missing Loading State, Missing Error Handling
- **/master-data/barcodes/[id]/edit**: Missing Error Handling, Missing Success Redirect
- **/master-data/branches/new**: Missing Error Handling, Missing Success Redirect
- **/master-data/branches/[id]**: Missing Loading State, Missing Error Handling
- **/master-data/branches/[id]/edit**: Missing Error Handling, Missing Success Redirect
- **/master-data/categories/new**: Missing Error Handling, Missing Success Redirect
- **/master-data/categories/[id]**: Missing Loading State, Missing Error Handling
- **/master-data/categories/[id]/edit**: Missing Error Handling, Missing Success Redirect
- **/master-data/currencies/new**: Missing Error Handling, Missing Success Redirect
- **/master-data/currencies/[id]**: Missing Loading State, Missing Error Handling
- **/master-data/currencies/[id]/edit**: Missing Error Handling, Missing Success Redirect
- **/master-data/departments/new**: Missing Error Handling, Missing Success Redirect
- **/master-data/departments/[id]**: Missing Loading State, Missing Error Handling
- **/master-data/departments/[id]/edit**: Missing Error Handling, Missing Success Redirect
- **/master-data/fx-rates/new**: Missing Error Handling, Missing Success Redirect
- **/master-data/fx-rates/[id]/edit**: Missing Error Handling, Missing Success Redirect
- **/master-data/import**: Missing Loading State, Missing Empty State
- **/master-data/import/barcodes**: Missing Loading State, Missing Empty State
- **/master-data/import/items**: Missing Loading State, Missing Empty State
- **/master-data/import/uoms**: Missing Loading State, Missing Empty State
- **/master-data/items/new**: Missing Error Handling, Missing Success Redirect
- **/master-data/items/[id]**: Missing Loading State, Missing Error Handling
- **/master-data/items/[id]/edit**: Missing Error Handling, Missing Success Redirect
- **/master-data/suppliers/new**: Missing Error Handling, Missing Success Redirect
- **/master-data/suppliers/[id]**: Missing Loading State, Missing Error Handling
- **/master-data/suppliers/[id]/edit**: Missing Error Handling, Missing Success Redirect
- **/master-data/units-of-measure/new**: Missing Error Handling, Missing Success Redirect
- **/master-data/units-of-measure/[id]**: Missing Loading State, Missing Error Handling
- **/master-data/units-of-measure/[id]/edit**: Missing Error Handling, Missing Success Redirect
- **/master-data/warehouses/new**: Missing Error Handling, Missing Success Redirect
- **/master-data/warehouses/[id]**: Missing Loading State, Missing Error Handling
- **/master-data/warehouses/[id]/edit**: Missing Error Handling, Missing Success Redirect
- **/profile**: Missing Loading State, Missing Empty State
- **/reports**: Missing Error Handling
- **/reports/available-inventory**: Missing Error Handling
- **/reports/currency-summaries**: Missing Error Handling
- **/reports/movements**: Missing Error Handling
- **/reports/procurement-status**: Missing Error Handling
- **/reports/stocktake-variance**: Missing Error Handling
- **/search**: Missing Empty State
- **/forgot-password**: Missing Loading State, Missing Empty State
- **/login**: Missing Empty State
- **/reset-password**: Missing Loading State, Missing Empty State

## 7. Medium UI Inconsistencies & i18n
- **/adjustments**: Mixed LTR/RTL Layout
- **/adjustments/new**: Mixed LTR/RTL Layout
- **/issues**: Mixed LTR/RTL Layout
- **/issues/new**: Mixed LTR/RTL Layout, Missing Cancel Button
- **/issues/new/scan-mode**: Mixed LTR/RTL Layout
- **/issues/[id]**: Mixed LTR/RTL Layout
- **/kitchen-requests/new**: Mixed LTR/RTL Layout
- **/kitchen-requests/[id]**: Mixed LTR/RTL Layout
- **/stocktake**: Hardcoded Strings Detected, Mixed LTR/RTL Layout
- **/stocktake/archive**: Mixed LTR/RTL Layout
- **/stocktake/new**: Missing Cancel Button
- **/stocktake/[id]**: Mixed LTR/RTL Layout
- **/stocktake/[id]/approve**: Mixed LTR/RTL Layout
- **/stocktake/[id]/count**: Mixed LTR/RTL Layout
- **/stocktake/[id]/post**: Mixed LTR/RTL Layout
- **/stocktake/[id]/start**: Mixed LTR/RTL Layout
- **/stocktake/[id]/variance**: Mixed LTR/RTL Layout
- **/transfers**: Mixed LTR/RTL Layout
- **/transfers/[id]**: Mixed LTR/RTL Layout
- **/transfers/[id]/dispute**: Hardcoded Strings Detected, Mixed LTR/RTL Layout
- **/transfers/[id]/receive**: Mixed LTR/RTL Layout
- **/yield-management/new**: Hardcoded Strings Detected
- **/goods-received**: Mixed LTR/RTL Layout
- **/goods-received/new**: Mixed LTR/RTL Layout
- **/goods-received/[id]**: Mixed LTR/RTL Layout
- **/goods-received/[id]/post**: Mixed LTR/RTL Layout
- **/goods-received/[id]/scan-mode**: Mixed LTR/RTL Layout
- **/landed-cost**: Hardcoded Strings Detected
- **/purchase-orders**: Mixed LTR/RTL Layout
- **/purchase-orders/new**: Mixed LTR/RTL Layout
- **/purchase-orders/[id]**: Mixed LTR/RTL Layout
- **/purchase-orders/[id]/approve**: Mixed LTR/RTL Layout
- **/purchase-requests**: Mixed LTR/RTL Layout
- **/purchase-requests/new**: Mixed LTR/RTL Layout
- **/purchase-requests/[id]**: Mixed LTR/RTL Layout
- **/purchase-requests/[id]/approve**: Mixed LTR/RTL Layout
- **/purchase-requests/[id]/edit**: Mixed LTR/RTL Layout
- **/admin/audit-logs**: Mixed LTR/RTL Layout
- **/admin/mail-settings**: Mixed LTR/RTL Layout
- **/admin/restaurant-profile**: Hardcoded Strings Detected, Mixed LTR/RTL Layout
- **/admin/roles/[id]/edit**: Missing Submit/Save Button, Missing Cancel Button
- **/admin/settings**: Hardcoded Strings Detected, Mixed LTR/RTL Layout
- **/admin/users**: Mixed LTR/RTL Layout
- **/admin/users/new**: Missing Cancel Button
- **/admin/users/[id]**: Mixed LTR/RTL Layout
- **/admin/users/[id]/edit**: Missing Submit/Save Button, Missing Cancel Button
- **/communications/email-outbox**: Mixed LTR/RTL Layout
- **/communications/notifications/settings**: Hardcoded Strings Detected
- **/inventory/balance**: Mixed LTR/RTL Layout
- **/inventory/expired-override**: Mixed LTR/RTL Layout
- **/inventory/lots**: Mixed LTR/RTL Layout
- **/inventory/movements**: Mixed LTR/RTL Layout
- **/inventory/scan-mode**: Mixed LTR/RTL Layout
- **/master-data/barcodes**: Mixed LTR/RTL Layout
- **/master-data/barcodes/mapping**: Mixed LTR/RTL Layout
- **/master-data/barcodes/new**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/barcodes/[id]/edit**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/branches**: Mixed LTR/RTL Layout
- **/master-data/branches/new**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/branches/[id]/edit**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/categories**: Mixed LTR/RTL Layout
- **/master-data/categories/new**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/categories/[id]/edit**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/currencies**: Mixed LTR/RTL Layout
- **/master-data/currencies/new**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/currencies/[id]/edit**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/currencies/[id]/fx-rates**: Mixed LTR/RTL Layout
- **/master-data/departments**: Mixed LTR/RTL Layout
- **/master-data/departments/new**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/departments/[id]/edit**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/fx-rates**: Mixed LTR/RTL Layout
- **/master-data/fx-rates/new**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/fx-rates/[id]/edit**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/items**: Mixed LTR/RTL Layout
- **/master-data/items/new**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/items/[id]/edit**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/suppliers**: Mixed LTR/RTL Layout
- **/master-data/suppliers/new**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/suppliers/[id]/edit**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/suppliers/[id]/profile**: Mixed LTR/RTL Layout
- **/master-data/units-of-measure**: Mixed LTR/RTL Layout
- **/master-data/units-of-measure/new**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/units-of-measure/[id]/edit**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/warehouses**: Mixed LTR/RTL Layout
- **/master-data/warehouses/new**: Missing Submit/Save Button, Missing Cancel Button
- **/master-data/warehouses/[id]/edit**: Missing Submit/Save Button, Missing Cancel Button
- **/profile**: Hardcoded Strings Detected
- **/reports/available-inventory**: Mixed LTR/RTL Layout
- **/reports/expiry**: Mixed LTR/RTL Layout
- **/reports/movements**: Mixed LTR/RTL Layout
- **/reports/procurement-status**: Mixed LTR/RTL Layout
- **/reports/stocktake-variance**: Mixed LTR/RTL Layout
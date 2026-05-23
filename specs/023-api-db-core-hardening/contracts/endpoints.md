# API Endpoints: Reports Service (Phase 1)

This contract defines the reports endpoints implemented in the `ReportsController`.

## Authentication & Headers
All requests require:
*   Header: `Authorization: Bearer <JWT_TOKEN>`
*   Header: `x-warehouse-id: <WAREHOUSE_ID>` (processed via ScopeInterceptor to inject the active scope)

---

## 1. Available Inventory Report
Returns the sum of stock quantities grouped by category for the active warehouse.

*   **Route**: `GET /reports/available-inventory`
*   **Response (200 OK)**:
    ```json
    [
      {
        "categoryName": "Fresh Vegetables",
        "qtyOnHand": 250.0,
        "qtyAllocated": 15.0,
        "qtyAvailable": 235.0
      },
      {
        "categoryName": "Dry Goods",
        "qtyOnHand": 120.0,
        "qtyAllocated": 0.0,
        "qtyAvailable": 120.0
      }
    ]
    ```

---

## 2. Inventory Movements Report
Returns paginated stock ledger entries for the active warehouse.

*   **Route**: `GET /reports/movements`
*   **Query Parameters**:
    *   `page`: integer (default: 1)
    *   `limit`: integer (default: 50)
    *   `itemId`: string (optional, UUID)
    *   `startDate`: ISO DateTime string (optional)
    *   `endDate`: ISO DateTime string (optional)
    *   `transactionType`: enum `DocumentType` (optional)
*   **Response (200 OK)**:
    ```json
    {
      "total": 124,
      "page": 1,
      "limit": 50,
      "data": [
        {
          "id": "ledger-uuid",
          "postedAt": "2026-05-23T20:00:00Z",
          "warehouseId": "warehouse-uuid",
          "itemId": "item-uuid",
          "lotId": "lot-uuid",
          "quantity": 10.0,
          "documentId": "document-uuid",
          "documentType": "GOODS_RECEIVED_NOTE",
          "item": {
            "id": "item-uuid",
            "name": "Tomato Pasteurizer",
            "sku": "ITEM-TOM-PAST"
          }
        }
      ]
    }
    ```

---

## 3. Expiry Report
Returns active item lots that are nearing expiration for the active warehouse.

*   **Route**: `GET /reports/expiry`
*   **Response (200 OK)**:
    ```json
    [
      {
        "itemId": "item-uuid",
        "itemName": "Fresh Milk 1L",
        "sku": "ITEM-MILK-1L",
        "lotNumber": "LOT-202605-01",
        "expiryDate": "2026-06-01T00:00:00Z",
        "qtyOnHand": 45.0
      }
    ]
    ```

---

## 4. Stocktake Variance Report
Returns variance comparisons for a completed stocktake session.

*   **Route**: `GET /reports/stocktake-variance`
*   **Query Parameters**:
    *   `sessionId`: string (required, UUID)
*   **Response (200 OK)**:
    ```json
    [
      {
        "itemId": "item-uuid",
        "itemName": "Beef Patties 10kg",
        "sku": "ITEM-BEEF-PAT",
        "lotNumber": "LOT-BEEF-02",
        "qtySnapshot": 10.0,
        "qtyCounted": 9.5,
        "variance": -0.5
      }
    ]
    ```

---

## 5. Procurement Status Report
Aggregates PO counts and total financial values grouped by document status.

*   **Route**: `GET /reports/procurement-status`
*   **Response (200 OK)**:
    ```json
    [
      {
        "status": "APPROVED",
        "count": 5,
        "totalValue": 12500.5
      },
      {
        "status": "DRAFT",
        "count": 2,
        "totalValue": 1500.0
      }
    ]
    ```

---

## 6. Currency Summaries Report
Aggregates purchase order values grouped by currency, including equivalents in the base currency using latest FX rates.

*   **Route**: `GET /reports/currency-summaries`
*   **Response (200 OK)**:
    ```json
    [
      {
        "currencyCode": "USD",
        "amount": 2500.0,
        "baseAmount": 9375.0
      },
      {
        "currencyCode": "SAR",
        "amount": 15000.0,
        "baseAmount": 15000.0
      }
    ]
    ```

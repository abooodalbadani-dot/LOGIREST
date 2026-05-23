# API Contract: Force-Unlock Warehouse Lock

Exposes the manual override mechanism to deactivate stale/expired warehouse locks.

---

## 1. Force Unlock Endpoint

Deactivates a warehouse lock and releases the locked state on the associated warehouse.

* **URL**: `/api/warehouse-locks/:id/force-unlock`
* **Method**: `POST`
* **Headers**:
  * `Authorization`: `Bearer <jwt_token>` (Strictly requires `ADMIN` role)
  * `Content-Type`: `application/json`
* **URL Params**:
  * `id`: `String` (UUID v4). The unique ID of the target `WarehouseLock` record.

### Request Body
```json
{
  "reason_notes": "Stocktake session #ST-1002 delayed; override lock to allow urgent kitchen transfers."
}
```

#### Validation Constraints
* `reason_notes`: `String`, Mandatory. Minimum length of 10 characters, maximum length of 500 characters.

---

## 2. Responses

### Success (200 OK)
Returned when the warehouse lock is successfully deactivated and auditing logs are written.
```json
{
  "success": true,
  "message": "Warehouse lock successfully deactivated and warehouse unlocked.",
  "data": {
    "lockId": "c92842aa-516d-4ee8-a5eb-b31c9a63212f",
    "warehouseId": "7c3ebcfb-e608-410a-8bf8-2a149c40212f",
    "unlockedBy": "d70c9ebc-10ea-4392-aa7c-8e411b0e012a",
    "unlockedAt": "2026-05-23T01:30:00.000Z"
  }
}
```

### Bad Request (400 Bad Request)
Returned when request parameters/payload are invalid or lock is already inactive.
* **Case A: Missing/Short reason notes**
  ```json
  {
    "statusCode": 400,
    "message": [
      "reason_notes must be longer than or equal to 10 characters"
    ],
    "error": "Bad Request"
  }
  ```
* **Case B: Lock already inactive**
  ```json
  {
    "statusCode": 400,
    "message": "Lock is not active.",
    "error": "Bad Request"
  }
  ```

### Forbidden (403 Forbidden)
Returned when the user is not authenticated or does not hold the `ADMIN` role.
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### Not Found (404 Not Found)
Returned when the target warehouse lock ID does not exist in the database.
```json
{
  "statusCode": 404,
  "message": "Warehouse lock not found with ID c92842aa-516d-4ee8-a5eb-b31c9a63212f",
  "error": "Not Found"
}
```

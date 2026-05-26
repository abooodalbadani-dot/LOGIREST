# Data Model Design: Sprint 1 — High-Priority Hardening

## 1. Document Sequence Uniqueness Constraint
The `document_sequences` table enforces uniqueness across document types, years, and branches.

### Prisma representation
```prisma
model DocumentSequence {
  id           String       @id @default(uuid())
  documentType DocumentType @map("document_type")
  year         Int
  branchId     String       @map("branch_id")
  nextNumber   Int          @default(1) @map("next_number")

  @@unique([documentType, year, branchId], name: "uq_document_sequences_type_year_branch")
  @@map("document_sequences")
}
```

### PostgreSQL DDL Representation
```sql
ALTER TABLE "document_sequences"
  ADD CONSTRAINT "uq_document_sequences_type_year_branch"
  UNIQUE ("document_type", "year", "branch_id");
```

---

## 2. Low-Stock Alert Debounce Key State
The alert debouncing relies on Redis keys with a standard schema:
* **Key Format**: `debounce:low_stock:{warehouseId}:{itemId}`
* **Value**: `"1"`
* **Expiration (TTL)**: `86400` seconds (24 hours)

---

## 3. SystemSettings SMTP Encrypted Configuration Storage
SMTP settings are stored inside the `SystemSetting` model under the `system_settings` key as a JSON string with encrypted passwords:
* **Storage Key**: `smtp_password` -> Base64 encrypted cipher string.
* **Encryption standard**: AES-256-CBC with project's internal `crypto.util.ts` utilities.

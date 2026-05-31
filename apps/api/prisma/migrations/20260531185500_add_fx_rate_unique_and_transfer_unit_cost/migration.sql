-- Deduplicate fx_rates to prevent unique constraint failures
DELETE FROM fx_rates
WHERE id NOT IN (
  SELECT MIN(id)
  FROM fx_rates
  GROUP BY "fromCurrencyId", "toCurrencyId", "effectiveFrom"
);

-- DropIndex
DROP INDEX "fx_rates_fromCurrencyId_toCurrencyId_effectiveFrom_idx";

-- AlterTable
ALTER TABLE "transfer_lines" ADD COLUMN     "unitCost" DECIMAL(18,4);

-- CreateIndex
CREATE UNIQUE INDEX "fx_rates_fromCurrencyId_toCurrencyId_effectiveFrom_key" ON "fx_rates"("fromCurrencyId", "toCurrencyId", "effectiveFrom");

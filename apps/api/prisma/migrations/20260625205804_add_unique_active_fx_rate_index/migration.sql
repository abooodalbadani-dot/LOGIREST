-- Deactivate older active rates, keeping only the newest active rate per pair
WITH ranked_rates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "fromCurrencyId", "toCurrencyId"
           ORDER BY "effectiveFrom" DESC
         ) as rn
  FROM fx_rates
  WHERE "isActive" = true
)
UPDATE fx_rates
SET "isActive" = false
WHERE id IN (
  SELECT id 
  FROM ranked_rates 
  WHERE rn > 1
);

-- CreateIndex
CREATE UNIQUE INDEX "fx_rates_active_unique_idx" ON "fx_rates" ("fromCurrencyId", "toCurrencyId") WHERE "isActive" = true;
-- Remove existing RULE definitions safely
DROP RULE IF EXISTS protect_stock_ledger_updates ON stock_ledger;
DROP RULE IF EXISTS protect_stock_ledger_deletes ON stock_ledger;
DROP RULE IF EXISTS protect_cost_ledger_updates ON cost_ledger;
DROP RULE IF EXISTS protect_cost_ledger_deletes ON cost_ledger;

-- Create PostgreSQL function to raise exception on update/delete
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Ledger tables are immutable and cannot be modified';
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to stock_ledger and cost_ledger tables after dropping if exists
DROP TRIGGER IF EXISTS stock_ledger_immutable ON stock_ledger;
CREATE TRIGGER stock_ledger_immutable
BEFORE UPDATE OR DELETE ON stock_ledger
FOR EACH ROW
EXECUTE FUNCTION prevent_ledger_mutation();

DROP TRIGGER IF EXISTS cost_ledger_immutable ON cost_ledger;
CREATE TRIGGER cost_ledger_immutable
BEFORE UPDATE OR DELETE ON cost_ledger
FOR EACH ROW
EXECUTE FUNCTION prevent_ledger_mutation();
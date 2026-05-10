-- Remove redundant categoryCode from sales lines.
-- Category is derived from StockMaster via stockMasterId.

ALTER TABLE "sales"
DROP COLUMN IF EXISTS "categoryCode";


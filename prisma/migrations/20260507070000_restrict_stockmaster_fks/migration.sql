-- Align migration history with the current database state by switching
-- StockMaster foreign keys to RESTRICT (delete-block) semantics.

ALTER TABLE "StockMaster" DROP CONSTRAINT IF EXISTS "StockMaster_categoryCode_fkey";
ALTER TABLE "StockMaster" DROP CONSTRAINT IF EXISTS "StockMaster_subcategoryCode_fkey";

ALTER TABLE "StockMaster"
ADD CONSTRAINT "StockMaster_categoryCode_fkey"
FOREIGN KEY ("categoryCode") REFERENCES "Category"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMaster"
ADD CONSTRAINT "StockMaster_subcategoryCode_fkey"
FOREIGN KEY ("subcategoryCode") REFERENCES "Subcategory"("code") ON DELETE RESTRICT ON UPDATE CASCADE;


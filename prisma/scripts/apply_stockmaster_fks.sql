-- Apply missing foreign keys for StockMaster (idempotent)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'StockMaster_categoryCode_fkey'
  ) THEN
    ALTER TABLE "StockMaster"
      ADD CONSTRAINT "StockMaster_categoryCode_fkey"
      FOREIGN KEY ("categoryCode") REFERENCES "Category"("code")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'StockMaster_subcategoryCode_fkey'
  ) THEN
    ALTER TABLE "StockMaster"
      ADD CONSTRAINT "StockMaster_subcategoryCode_fkey"
      FOREIGN KEY ("subcategoryCode") REFERENCES "Subcategory"("code")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;


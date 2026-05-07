-- Make StockMaster.location optional and require subcategory for all stock rows.
-- This migration also backfills any existing rows that have NULL/empty values.

-- Normalize empty strings to NULL for location (so the field can truly be optional).
UPDATE "StockMaster"
SET "location" = NULL
WHERE "location" IS NOT NULL AND btrim("location") = '';

-- Backfill missing subcategory for any existing stock rows.
-- For each category that has stock with NULL subcategoryCode, create a placeholder subcategory.
INSERT INTO "Subcategory" ("code", "name", "imageUrl", "categoryCode", "createdAt", "updatedAt")
SELECT DISTINCT
  (sm."categoryCode" || '-UNCATEGORIZED') AS "code",
  'Uncategorized' AS "name",
  NULL AS "imageUrl",
  sm."categoryCode" AS "categoryCode",
  NOW() AS "createdAt",
  NOW() AS "updatedAt"
FROM "StockMaster" sm
WHERE sm."subcategoryCode" IS NULL
ON CONFLICT ("code") DO NOTHING;

-- Point orphaned stock rows at the placeholder subcategory.
UPDATE "StockMaster"
SET
  "subcategoryCode" = ("categoryCode" || '-UNCATEGORIZED'),
  "subcategoryName" = COALESCE(NULLIF(btrim("subcategoryName"), ''), 'Uncategorized')
WHERE "subcategoryCode" IS NULL;

-- Ensure subcategoryName is present and matches the referenced subcategory.
UPDATE "StockMaster" sm
SET "subcategoryName" = sc."name"
FROM "Subcategory" sc
WHERE sm."subcategoryCode" = sc."code"
  AND (sm."subcategoryName" IS NULL OR btrim(sm."subcategoryName") = '');

-- Alter columns to enforce requirements.
ALTER TABLE "StockMaster" ALTER COLUMN "location" DROP NOT NULL;
ALTER TABLE "StockMaster" ALTER COLUMN "subcategoryCode" SET NOT NULL;
ALTER TABLE "StockMaster" ALTER COLUMN "subcategoryName" SET NOT NULL;


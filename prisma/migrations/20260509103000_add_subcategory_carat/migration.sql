-- Add carat to Subcategory so sales can auto-load it from the master record.

ALTER TABLE "Subcategory"
ADD COLUMN IF NOT EXISTS "carat" TEXT;

-- Best-effort backfill: if exactly one distinct non-empty carat exists in StockMaster per subcategory.
WITH one_carat AS (
  SELECT
    "subcategoryCode" AS code,
    MAX(TRIM(COALESCE("carat", ''))) AS carat_value
  FROM "StockMaster"
  WHERE TRIM(COALESCE("carat", '')) <> ''
  GROUP BY "subcategoryCode"
  HAVING COUNT(DISTINCT TRIM(COALESCE("carat", ''))) = 1
)
UPDATE "Subcategory" s
SET "carat" = oc.carat_value
FROM one_carat oc
WHERE s."code" = oc.code
  AND (s."carat" IS NULL OR TRIM(COALESCE(s."carat", '')) = '');


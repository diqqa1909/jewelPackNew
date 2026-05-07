-- Backfill missing Category/Subcategory rows for existing StockMaster data

-- 1) Categories referenced by StockMaster but missing in Category
INSERT INTO "Category" ("code", "name", "createdAt", "updatedAt")
SELECT
  sm."categoryCode" AS code,
  COALESCE(MAX(NULLIF(sm."articleName", '')), sm."categoryCode") AS name,
  NOW(),
  NOW()
FROM "StockMaster" sm
LEFT JOIN "Category" c ON c."code" = sm."categoryCode"
WHERE c."code" IS NULL
GROUP BY sm."categoryCode";

-- 2) Subcategories referenced by StockMaster but missing in Subcategory
INSERT INTO "Subcategory" ("code", "name", "imageUrl", "categoryCode", "createdAt", "updatedAt")
SELECT
  sm."subcategoryCode" AS code,
  COALESCE(MAX(NULLIF(sm."subcategoryName", '')), sm."subcategoryCode") AS name,
  NULL AS "imageUrl",
  sm."categoryCode" AS "categoryCode",
  NOW(),
  NOW()
FROM "StockMaster" sm
LEFT JOIN "Subcategory" s ON s."code" = sm."subcategoryCode"
WHERE sm."subcategoryCode" IS NOT NULL
  AND s."code" IS NULL
GROUP BY sm."subcategoryCode", sm."categoryCode";


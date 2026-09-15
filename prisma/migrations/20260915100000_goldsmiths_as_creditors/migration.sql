ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "goldsmithCode" TEXT;

UPDATE "Supplier" s
SET "goldsmithCode" = g."code",
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Goldsmith" g
WHERE s."goldsmithCode" IS NULL
  AND LOWER(TRIM(s."name")) = LOWER(TRIM(g."name"))
  AND NOT EXISTS (
    SELECT 1 FROM "Supplier" existing
    WHERE existing."goldsmithCode" = g."code"
  );

INSERT INTO "Supplier" ("accountNumber", "goldsmithCode", "name", "contact", "createdAt", "updatedAt")
SELECT 'GSM-' || g."code", g."code", g."name", 'Goldsmith', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Goldsmith" g
WHERE NOT EXISTS (
  SELECT 1 FROM "Supplier" s
  WHERE s."goldsmithCode" = g."code"
);

UPDATE "purchases" p
SET "supplierId" = s."id"
FROM "Supplier" s
WHERE p."supplierId" IS NULL
  AND p."gsmCode" IS NOT NULL
  AND s."goldsmithCode" = p."gsmCode";

CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_goldsmithCode_key" ON "Supplier"("goldsmithCode");

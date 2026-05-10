-- Add code to Salesman and backfill existing rows.

ALTER TABLE "Salesman"
ADD COLUMN IF NOT EXISTS "code" TEXT;

UPDATE "Salesman"
SET "code" = 'SAL-' || LPAD("id"::text, 4, '0')
WHERE ("code" IS NULL OR TRIM(COALESCE("code", '')) = '');

ALTER TABLE "Salesman"
ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Salesman_code_key" ON "Salesman"("code");
CREATE INDEX IF NOT EXISTS "Salesman_code_idx" ON "Salesman"("code");


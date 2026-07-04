ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "purchaseGroupNo" TEXT;

UPDATE "purchases"
SET "purchaseGroupNo" = "purchaseNo"
WHERE "purchaseGroupNo" IS NULL;

CREATE INDEX IF NOT EXISTS "purchases_purchaseGroupNo_idx" ON "purchases"("purchaseGroupNo");

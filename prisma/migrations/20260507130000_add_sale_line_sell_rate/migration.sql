-- Store per-item sell rate on sales lines.

ALTER TABLE "sales"
ADD COLUMN IF NOT EXISTS "sellRatePer8g" DECIMAL(65,30) NOT NULL DEFAULT 0;


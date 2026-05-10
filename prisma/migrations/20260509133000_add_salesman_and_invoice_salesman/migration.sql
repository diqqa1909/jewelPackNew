-- Add Salesman master + optional salesmanId on invoices (salesNTX)

CREATE TABLE IF NOT EXISTS "Salesman" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Salesman_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Salesman_name_idx" ON "Salesman"("name");

ALTER TABLE "salesNTX"
ADD COLUMN IF NOT EXISTS "salesmanId" INTEGER;

CREATE INDEX IF NOT EXISTS "salesNTX_salesmanId_idx" ON "salesNTX"("salesmanId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'salesNTX_salesmanId_fkey'
  ) THEN
    ALTER TABLE "salesNTX"
    ADD CONSTRAINT "salesNTX_salesmanId_fkey"
    FOREIGN KEY ("salesmanId") REFERENCES "Salesman"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;


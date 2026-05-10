-- 1) Customer account number
ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;

-- Backfill any missing account numbers based on id
UPDATE "Customer"
SET "accountNumber" = 'CUST-' || LPAD("id"::text, 6, '0')
WHERE ("accountNumber" IS NULL OR TRIM(COALESCE("accountNumber", '')) = '');

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_accountNumber_key" ON "Customer"("accountNumber");

-- 2) Transactions table
CREATE TABLE IF NOT EXISTS "transactions" (
  "id" SERIAL NOT NULL,
  "date" DATE NOT NULL,
  "source" TEXT,
  "account" TEXT,
  "memo" TEXT,
  "debit" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "account_number" TEXT,
  "type" TEXT,
  "bank_debit" DECIMAL(12, 2) DEFAULT 0,
  "bank_credit" DECIMAL(12, 2) DEFAULT 0,
  "realized_date" DATE,
  "reference_number" TEXT,
  "remarks" TEXT,
  "bank_code" TEXT,
  "recon" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "transactions_account_number_idx" ON "transactions"("account_number");
CREATE INDEX IF NOT EXISTS "transactions_date_idx" ON "transactions"("date");


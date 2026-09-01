ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_accountNumber_key" ON "Supplier"("accountNumber");

UPDATE "Supplier"
SET "accountNumber" = 'SUP-' || LPAD("id"::text, 6, '0')
WHERE "accountNumber" IS NULL;

CREATE TABLE IF NOT EXISTS "cash_book" (
  "id" SERIAL PRIMARY KEY,
  "date" DATE NOT NULL,
  "account_type" TEXT NOT NULL,
  "account_id" INTEGER NOT NULL,
  "account_no" TEXT NOT NULL,
  "account_name" TEXT NOT NULL,
  "memo" TEXT,
  "debit" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "cash_book_date_idx" ON "cash_book"("date");
CREATE INDEX IF NOT EXISTS "cash_book_account_type_idx" ON "cash_book"("account_type");
CREATE INDEX IF NOT EXISTS "cash_book_account_no_idx" ON "cash_book"("account_no");

CREATE TABLE IF NOT EXISTS "general_ledger_accounts" (
  "id" SERIAL PRIMARY KEY,
  "account_number" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "general_ledger_accounts_account_number_key"
  ON "general_ledger_accounts"("account_number");

CREATE INDEX IF NOT EXISTS "general_ledger_accounts_name_idx"
  ON "general_ledger_accounts"("name");

INSERT INTO "general_ledger_accounts" ("account_number", "name", "updated_at")
VALUES
  ('GL-000001', 'Sales', CURRENT_TIMESTAMP),
  ('GL-000002', 'Purchases', CURRENT_TIMESTAMP),
  ('GL-000003', 'Salaries', CURRENT_TIMESTAMP),
  ('GL-000004', 'Printing & Stationory', CURRENT_TIMESTAMP)
ON CONFLICT ("account_number") DO NOTHING;

ALTER TABLE "cash_book" ADD COLUMN IF NOT EXISTS "transaction_id" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "cash_book_transaction_id_key"
  ON "cash_book"("transaction_id");

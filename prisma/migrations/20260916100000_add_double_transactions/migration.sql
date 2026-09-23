CREATE TABLE IF NOT EXISTS "system_account_mappings" (
  "id" SERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "account_number" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_account_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "system_account_mappings_key_key"
  ON "system_account_mappings"("key");

CREATE INDEX IF NOT EXISTS "system_account_mappings_account_number_idx"
  ON "system_account_mappings"("account_number");

ALTER TABLE "system_account_mappings"
DROP CONSTRAINT IF EXISTS "system_account_mappings_account_number_fkey";

ALTER TABLE "system_account_mappings"
ADD CONSTRAINT "system_account_mappings_account_number_fkey"
FOREIGN KEY ("account_number") REFERENCES "general_ledger_accounts"("account_number")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "general_ledger_accounts" ("account_number", "name", "updated_at")
VALUES
  ('1000', 'Sales', CURRENT_TIMESTAMP),
  ('2011', 'Purchases', CURRENT_TIMESTAMP),
  ('6001', 'Cash', CURRENT_TIMESTAMP),
  ('6021', 'Debtors', CURRENT_TIMESTAMP),
  ('7001', 'Creditors', CURRENT_TIMESTAMP)
ON CONFLICT ("account_number") DO UPDATE
SET "name" = EXCLUDED."name",
    "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "system_account_mappings" ("key", "account_number", "updated_at")
VALUES
  ('SALES_ACCOUNT', '1000', CURRENT_TIMESTAMP),
  ('PURCHASES_ACCOUNT', '2011', CURRENT_TIMESTAMP),
  ('CASHBOOK_ACCOUNT', '6001', CURRENT_TIMESTAMP),
  ('DEBTORS_CONTROL_ACCOUNT', '6021', CURRENT_TIMESTAMP),
  ('CREDITORS_CONTROL_ACCOUNT', '7001', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE
SET "account_number" = EXCLUDED."account_number",
    "updated_at" = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "dbltransactions" (
  "id" SERIAL NOT NULL,
  "posting_key" TEXT NOT NULL,
  "line_no" INTEGER NOT NULL,
  "date" DATE NOT NULL,
  "source" TEXT NOT NULL,
  "account" TEXT NOT NULL,
  "account_number" TEXT NOT NULL,
  "memo" TEXT,
  "debit" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "type" TEXT,
  "reference_number" TEXT,
  "document_type" TEXT,
  "document_id" TEXT,
  "source_transaction_id" INTEGER,
  "remarks" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dbltransactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dbltransactions_posting_key_line_no_key"
  ON "dbltransactions"("posting_key", "line_no");

CREATE INDEX IF NOT EXISTS "dbltransactions_source_transaction_id_idx"
  ON "dbltransactions"("source_transaction_id");

CREATE INDEX IF NOT EXISTS "dbltransactions_account_number_idx"
  ON "dbltransactions"("account_number");

CREATE INDEX IF NOT EXISTS "dbltransactions_date_idx"
  ON "dbltransactions"("date");

CREATE INDEX IF NOT EXISTS "dbltransactions_source_idx"
  ON "dbltransactions"("source");

CREATE INDEX IF NOT EXISTS "dbltransactions_reference_number_idx"
  ON "dbltransactions"("reference_number");

ALTER TABLE "dbltransactions"
DROP CONSTRAINT IF EXISTS "dbltransactions_source_transaction_id_fkey";

ALTER TABLE "dbltransactions"
ADD CONSTRAINT "dbltransactions_source_transaction_id_fkey"
FOREIGN KEY ("source_transaction_id") REFERENCES "transactions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dbltransactions"
DROP CONSTRAINT IF EXISTS "dbltransactions_one_sided_amount_check";

ALTER TABLE "dbltransactions"
ADD CONSTRAINT "dbltransactions_one_sided_amount_check"
CHECK (
  "debit" >= 0
  AND "credit" >= 0
  AND (
    ("debit" > 0 AND "credit" = 0)
    OR ("credit" > 0 AND "debit" = 0)
  )
);

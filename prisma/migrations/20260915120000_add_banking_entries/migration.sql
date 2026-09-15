CREATE TABLE IF NOT EXISTS "banking" (
  "id" SERIAL NOT NULL,
  "date" DATE NOT NULL,
  "bank_account_id" INTEGER NOT NULL,
  "bank_account_no" TEXT NOT NULL,
  "bank_account_name" TEXT NOT NULL,
  "account_type" TEXT NOT NULL,
  "account_id" INTEGER NOT NULL,
  "account_no" TEXT NOT NULL,
  "account_name" TEXT NOT NULL,
  "memo" TEXT,
  "debit" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "bank_transaction_id" INTEGER,
  "account_transaction_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "banking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "banking_bank_transaction_id_key" ON "banking"("bank_transaction_id");
CREATE UNIQUE INDEX IF NOT EXISTS "banking_account_transaction_id_key" ON "banking"("account_transaction_id");
CREATE INDEX IF NOT EXISTS "banking_date_idx" ON "banking"("date");
CREATE INDEX IF NOT EXISTS "banking_bank_account_no_idx" ON "banking"("bank_account_no");
CREATE INDEX IF NOT EXISTS "banking_account_type_idx" ON "banking"("account_type");
CREATE INDEX IF NOT EXISTS "banking_account_no_idx" ON "banking"("account_no");

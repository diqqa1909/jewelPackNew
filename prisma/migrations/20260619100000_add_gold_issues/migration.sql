CREATE TABLE IF NOT EXISTS "gold_issues" (
  "id" SERIAL NOT NULL,
  "issueDate" DATE NOT NULL,
  "goldsmithCode" TEXT NOT NULL,
  "carat" TEXT NOT NULL,
  "goldWeight" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "referenceNumber" TEXT,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "gold_issues_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gold_issues_issueDate_idx" ON "gold_issues"("issueDate");
CREATE INDEX IF NOT EXISTS "gold_issues_goldsmithCode_idx" ON "gold_issues"("goldsmithCode");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gold_issues_goldsmithCode_fkey'
  ) THEN
    ALTER TABLE "gold_issues"
    ADD CONSTRAINT "gold_issues_goldsmithCode_fkey"
    FOREIGN KEY ("goldsmithCode") REFERENCES "Goldsmith"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "GoldReceipts"
ADD COLUMN "grnNo" TEXT,
ADD COLUMN "transactionDate" DATE,
ADD COLUMN "customerId" INTEGER,
ADD COLUMN "salesmanId" INTEGER,
ADD COLUMN "remarks" TEXT;

UPDATE "GoldReceipts" gr
SET
  "grnNo" = s."saleNo",
  "transactionDate" = s."transactionDate"::date,
  "customerId" = s."customerId",
  "salesmanId" = s."salesmanId",
  "remarks" = s."remarks"
FROM "salesNTX" s
WHERE gr."salesNTXId" = s."id";

ALTER TABLE "GoldReceipts"
ALTER COLUMN "salesNTXId" DROP NOT NULL;

CREATE INDEX "GoldReceipts_grnNo_idx" ON "GoldReceipts"("grnNo");
CREATE INDEX "GoldReceipts_transactionDate_idx" ON "GoldReceipts"("transactionDate");
CREATE INDEX "GoldReceipts_customerId_idx" ON "GoldReceipts"("customerId");
CREATE INDEX "GoldReceipts_salesmanId_idx" ON "GoldReceipts"("salesmanId");

ALTER TABLE "GoldReceipts"
ADD CONSTRAINT "GoldReceipts_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GoldReceipts"
ADD CONSTRAINT "GoldReceipts_salesmanId_fkey"
FOREIGN KEY ("salesmanId") REFERENCES "Salesman"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

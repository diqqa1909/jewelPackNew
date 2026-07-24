CREATE TABLE "GoldReceipts" (
  "id" SERIAL NOT NULL,
  "salesNTXId" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "carat" TEXT NOT NULL,
  "goldWeight" DECIMAL(12,3) NOT NULL,
  "pure_gold_weight" DECIMAL(12,3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GoldReceipts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GoldReceipts_salesNTXId_idx" ON "GoldReceipts"("salesNTXId");

ALTER TABLE "GoldReceipts"
ADD CONSTRAINT "GoldReceipts_salesNTXId_fkey"
FOREIGN KEY ("salesNTXId") REFERENCES "salesNTX"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

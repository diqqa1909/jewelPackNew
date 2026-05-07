-- Customers + Sales tables, plus balancing fields on StockMaster.

-- 1) StockMaster balancing fields
ALTER TABLE "StockMaster"
ADD COLUMN "soldQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "balanceQty" INTEGER,
ADD COLUMN "soldGoldWeight" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "balanceGoldWeight" DECIMAL(65,30),
ADD COLUMN "soldCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "balanceCost" DECIMAL(65,30);

-- Backfill balances for existing receipts
UPDATE "StockMaster"
SET
  "balanceQty" = "qty",
  "balanceGoldWeight" = "goldWeight",
  "balanceCost" = "totalCost"
WHERE "balanceQty" IS NULL OR "balanceGoldWeight" IS NULL OR "balanceCost" IS NULL;

ALTER TABLE "StockMaster" ALTER COLUMN "balanceQty" SET NOT NULL;
ALTER TABLE "StockMaster" ALTER COLUMN "balanceGoldWeight" SET NOT NULL;
ALTER TABLE "StockMaster" ALTER COLUMN "balanceCost" SET NOT NULL;

-- 2) Customers
CREATE TABLE "Customer" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- 3) Sales header (salesNTX) and lines (sales)
CREATE TABLE "salesNTX" (
  "id" SERIAL NOT NULL,
  "saleNo" TEXT NOT NULL,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "customerId" INTEGER NOT NULL,
  "totalItems" INTEGER NOT NULL,
  "totalQty" INTEGER NOT NULL,
  "totalGoldWeight" DECIMAL(65,30) NOT NULL,
  "totalCost" DECIMAL(65,30) NOT NULL,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "salesNTX_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "salesNTX_saleNo_key" ON "salesNTX"("saleNo");
CREATE INDEX "salesNTX_transactionDate_idx" ON "salesNTX"("transactionDate");
CREATE INDEX "salesNTX_customerId_idx" ON "salesNTX"("customerId");

ALTER TABLE "salesNTX"
ADD CONSTRAINT "salesNTX_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "sales" (
  "id" SERIAL NOT NULL,
  "salesNTXId" INTEGER NOT NULL,
  "stockMasterId" INTEGER NOT NULL,
  "categoryCode" TEXT NOT NULL,
  "subcategoryCode" TEXT NOT NULL,
  "carat" TEXT,
  "qty" INTEGER NOT NULL,
  "goldWeight" DECIMAL(65,30) NOT NULL,
  "cost" DECIMAL(65,30) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sales_salesNTXId_idx" ON "sales"("salesNTXId");
CREATE INDEX "sales_stockMasterId_idx" ON "sales"("stockMasterId");
CREATE INDEX "sales_subcategoryCode_idx" ON "sales"("subcategoryCode");

ALTER TABLE "sales"
ADD CONSTRAINT "sales_salesNTXId_fkey"
FOREIGN KEY ("salesNTXId") REFERENCES "salesNTX"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales"
ADD CONSTRAINT "sales_stockMasterId_fkey"
FOREIGN KEY ("stockMasterId") REFERENCES "StockMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


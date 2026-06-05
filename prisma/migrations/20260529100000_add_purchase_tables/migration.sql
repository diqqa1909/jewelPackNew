-- Purchase headers, purchase lines, and sale-to-purchase allocation links.

CREATE TABLE IF NOT EXISTS "purchases" (
  "id" SERIAL NOT NULL,
  "purchaseNo" TEXT NOT NULL,
  "purchaseDate" TIMESTAMP(3) NOT NULL,
  "location" TEXT,
  "gsmCode" TEXT,
  "gsmName" TEXT,
  "categoryCode" TEXT,
  "articleName" TEXT,
  "subcategoryCode" TEXT,
  "subcategoryName" TEXT,
  "qty" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT,
  "carat" TEXT,
  "wastageYN" BOOLEAN NOT NULL DEFAULT false,
  "goldWeight" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "goldCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "wastageMg" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "wastage" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "labourCharges" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "otherCosts" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "supplierId" INTEGER,
  "purchaseGold" TEXT,
  "totalItems" INTEGER NOT NULL DEFAULT 0,
  "totalWeight" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "subTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "otherCharges" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "balanceDue" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "purchases_purchaseNo_key" ON "purchases"("purchaseNo");
CREATE INDEX IF NOT EXISTS "purchases_purchaseDate_idx" ON "purchases"("purchaseDate");
CREATE INDEX IF NOT EXISTS "purchases_supplierId_idx" ON "purchases"("supplierId");

ALTER TABLE "purchases"
DROP CONSTRAINT IF EXISTS "purchases_supplierId_fkey";

ALTER TABLE "purchases"
ADD CONSTRAINT "purchases_supplierId_fkey"
FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "purchase_items" (
  "id" SERIAL NOT NULL,
  "purchaseId" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "karat" TEXT,
  "weight" DECIMAL(65,30) NOT NULL,
  "ratePerGram" DECIMAL(65,30) NOT NULL,
  "makingPerPiece" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "amount" DECIMAL(65,30) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");

ALTER TABLE "purchase_items"
DROP CONSTRAINT IF EXISTS "purchase_items_purchaseId_fkey";

ALTER TABLE "purchase_items"
ADD CONSTRAINT "purchase_items_purchaseId_fkey"
FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales"
ADD COLUMN IF NOT EXISTS "purchaseId" INTEGER;

ALTER TABLE "sales"
ALTER COLUMN "stockMasterId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "sales_purchaseId_idx" ON "sales"("purchaseId");

ALTER TABLE "sales"
DROP CONSTRAINT IF EXISTS "sales_purchaseId_fkey";

ALTER TABLE "sales"
ADD CONSTRAINT "sales_purchaseId_fkey"
FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

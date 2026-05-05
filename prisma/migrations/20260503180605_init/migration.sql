-- CreateTable
CREATE TABLE "StockMaster" (
    "id" SERIAL NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "gsmCode" TEXT NOT NULL,
    "gsmName" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "articleName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "description" TEXT,
    "carat" TEXT,
    "wastageYN" BOOLEAN NOT NULL DEFAULT false,
    "goldWeight" DECIMAL(65,30) NOT NULL,
    "goldCost" DECIMAL(65,30) NOT NULL,
    "wastage" DECIMAL(65,30) NOT NULL,
    "labourCharges" DECIMAL(65,30) NOT NULL,
    "otherCosts" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system" (
    "id" INTEGER NOT NULL,
    "vatRate" DECIMAL(65,30) NOT NULL,
    "nslRate" DECIMAL(65,30) NOT NULL,
    "goldCostRatePer8g" DECIMAL(65,30) NOT NULL,
    "wastageRateMgPer8g" DECIMAL(65,30) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StockMaster" ADD COLUMN     "subcategoryCode" TEXT,
ADD COLUMN     "subcategoryName" TEXT;

-- CreateTable
CREATE TABLE "Subcategory" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "categoryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("code")
);

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "Category"("code") ON DELETE CASCADE ON UPDATE CASCADE;

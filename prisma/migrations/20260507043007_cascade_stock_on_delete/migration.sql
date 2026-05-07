-- CreateIndex
CREATE INDEX "StockMaster_categoryCode_idx" ON "StockMaster"("categoryCode");

-- CreateIndex
CREATE INDEX "StockMaster_subcategoryCode_idx" ON "StockMaster"("subcategoryCode");

-- AddForeignKey
ALTER TABLE "StockMaster" ADD CONSTRAINT "StockMaster_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "Category"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMaster" ADD CONSTRAINT "StockMaster_subcategoryCode_fkey" FOREIGN KEY ("subcategoryCode") REFERENCES "Subcategory"("code") ON DELETE CASCADE ON UPDATE CASCADE;

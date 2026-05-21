import { InventoryStockList } from "@/components/app/InventoryStockList";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const [rows, categories] = await Promise.all([
    prismaWithRetry((p) =>
      p.stockMaster.findMany({
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 150
      })
    ),
    prismaWithRetry((p) => p.category.findMany({ orderBy: { name: "asc" } }))
  ]);

  return (
    <InventoryStockList
      categories={categories.map((c) => ({ code: c.code, name: c.name }))}
      rows={rows.map((r) => ({
        id: r.id,
        barcode: r.subcategoryCode,
        designNo: r.description || r.subcategoryCode,
        categoryCode: r.categoryCode,
        categoryName: r.articleName,
        subcategoryName: r.subcategoryName,
        karat: r.carat || "",
        grossWeight: r.goldWeight.toString(),
        netWeight: r.balanceGoldWeight.toString(),
        making: r.labourCharges.toString(),
        balanceQty: r.balanceQty,
        updatedAt: r.updatedAt.toISOString()
      }))}
    />
  );
}

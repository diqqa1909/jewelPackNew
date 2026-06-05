import { InventoryStockList } from "@/components/app/InventoryStockList";
import { buildInventorySummary } from "@/lib/inventory-summary";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const [purchases, sales, categories, subcategories] = await Promise.all([
    prismaWithRetry((p) =>
      p.purchase.findMany({
        select: {
          categoryCode: true,
          articleName: true,
          subcategoryCode: true,
          subcategoryName: true,
          carat: true,
          qty: true
          ,
          goldWeight: true
        }
      })
    ),
    prismaWithRetry((p) =>
      p.sale.findMany({
        select: {
          subcategoryCode: true,
          carat: true,
          qty: true,
          goldWeight: true
        }
      })
    ),
    prismaWithRetry((p) => p.category.findMany({ orderBy: { name: "asc" } })),
    prismaWithRetry((p) => p.subcategory.findMany({ orderBy: [{ categoryCode: "asc" }, { code: "asc" }] }))
  ]);
  const { categoryRows, subcategoryRows } = buildInventorySummary({
    categories,
    subcategories,
    purchases,
    sales
  });

  return (
    <InventoryStockList
      categories={categories.map((c) => ({ code: c.code, name: c.name }))}
      rows={categoryRows}
      subcategoryRows={subcategoryRows}
    />
  );
}

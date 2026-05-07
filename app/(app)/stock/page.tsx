import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { prismaWithRetry } from "@/lib/prisma";
import { StockCounts } from "@/components/app/StockCounts";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const [categories, subcategories, categoryCountsRaw, subcategoryCountsRaw] = await Promise.all([
    prismaWithRetry((p) => p.category.findMany({ orderBy: { code: "asc" } })),
    prismaWithRetry((p) =>
      p.subcategory.findMany({ orderBy: [{ categoryCode: "asc" }, { code: "asc" }] })
    ),
    prismaWithRetry((p) =>
      p.stockMaster.groupBy({
        by: ["categoryCode", "articleName"],
        _sum: {
          qty: true,
          goldWeight: true,
          totalCost: true,
          soldQty: true,
          soldGoldWeight: true,
          soldCost: true,
          balanceQty: true,
          balanceGoldWeight: true,
          balanceCost: true
        }
      })
    ),
    prismaWithRetry((p) =>
      p.stockMaster.groupBy({
        by: ["categoryCode", "subcategoryCode", "subcategoryName"],
        _sum: {
          qty: true,
          goldWeight: true,
          totalCost: true,
          soldQty: true,
          soldGoldWeight: true,
          soldCost: true,
          balanceQty: true,
          balanceGoldWeight: true,
          balanceCost: true
        }
      })
    )
  ]);

  const categoryCounts = categoryCountsRaw.map((r) => ({
    categoryCode: r.categoryCode,
    categoryName: r.articleName,
    arrivedQty: r._sum.qty ?? 0,
    arrivedGoldWeight: r._sum.goldWeight?.toString() ?? "0",
    arrivedTotalCost: r._sum.totalCost?.toString() ?? "0",
    soldQty: r._sum.soldQty ?? 0,
    soldGoldWeight: r._sum.soldGoldWeight?.toString() ?? "0",
    soldCost: r._sum.soldCost?.toString() ?? "0",
    balanceQty: r._sum.balanceQty ?? 0,
    balanceGoldWeight: r._sum.balanceGoldWeight?.toString() ?? "0",
    balanceCost: r._sum.balanceCost?.toString() ?? "0"
  }));
  const subcategoryCounts = subcategoryCountsRaw
    .filter((r) => r.subcategoryCode != null)
    .map((r) => ({
      categoryCode: r.categoryCode,
      subcategoryCode: r.subcategoryCode ?? "",
      subcategoryName: r.subcategoryName ?? "",
      arrivedQty: r._sum.qty ?? 0,
      arrivedGoldWeight: r._sum.goldWeight?.toString() ?? "0",
      arrivedTotalCost: r._sum.totalCost?.toString() ?? "0",
      soldQty: r._sum.soldQty ?? 0,
      soldGoldWeight: r._sum.soldGoldWeight?.toString() ?? "0",
      soldCost: r._sum.soldCost?.toString() ?? "0",
      balanceQty: r._sum.balanceQty ?? 0,
      balanceGoldWeight: r._sum.balanceGoldWeight?.toString() ?? "0",
      balanceCost: r._sum.balanceCost?.toString() ?? "0"
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/stock/system-data"
          className="rounded-lg border border-ebony-300 bg-white px-5 py-2.5 text-sm font-medium text-ebony-700 hover:bg-ebony-50 transition-all"
        >
          System Data
        </Link>
        <Link
          href="/stock/receipts/new"
          className="rounded-lg bg-gold-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-gold-700 transition-all"
        >
          Add New Receipts
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Overview</CardTitle>
          <CardDescription>Counts by category. Tap to expand subcategory counts.</CardDescription>
        </CardHeader>
        <CardContent>
          <StockCounts
            categories={categories.map((c) => ({ code: c.code, name: c.name }))}
            subcategories={subcategories}
            categoryCounts={categoryCounts}
            subcategoryCounts={subcategoryCounts}
          />
        </CardContent>
      </Card>
    </div>
  );
}

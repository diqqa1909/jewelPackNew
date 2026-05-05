import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { prismaWithRetry } from "@/lib/prisma";
import { StocksTable } from "@/components/app/StocksTable";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const rows = await prismaWithRetry((p) =>
    prismaWithRetry((p) =>
      p.stockMaster.findMany({
        orderBy: { createdAt: "desc" },
        take: 200
      })
    )
  );

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
          <CardDescription>Latest receipts added to StockMaster.</CardDescription>
        </CardHeader>
        <CardContent>
          <StocksTable initial={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

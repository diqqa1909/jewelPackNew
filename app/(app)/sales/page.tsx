import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { prismaWithRetry } from "@/lib/prisma";
import { SalesTable } from "@/components/app/SalesTable";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const sales = await prismaWithRetry((p) =>
    p.salesNTX.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { customer: true }
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/sales/new"
          className="rounded-lg bg-gold-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold-700 transition-all"
        >
          New Invoice
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Invoices (header totals). Click &quot;New Invoice&quot; to add items.</CardDescription>
        </CardHeader>
        <CardContent>
          <SalesTable
            initial={sales.map((s) => ({
              id: s.id,
              saleNo: s.saleNo,
              transactionDate: new Date(s.transactionDate).toISOString().slice(0, 10),
              customerName: s.customer.name,
              totalItems: s.totalItems,
              totalQty: s.totalQty,
              totalGoldWeight: s.totalGoldWeight.toString(),
              totalCost: s.sellSubTotal.toString()
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

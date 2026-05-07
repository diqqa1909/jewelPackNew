import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { prismaWithRetry } from "@/lib/prisma";

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
          New Sale
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales</CardTitle>
          <CardDescription>Sales receipts (header totals). Click “New Sale” to add items.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-ebony-100 bg-white">
            <table className="min-w-[860px] w-full text-sm">
              <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
                <tr>
                  <th className="px-5 py-4">Sale No</th>
                  <th className="px-5 py-4">Date — Customer</th>
                  <th className="px-5 py-4 text-right">Items</th>
                  <th className="px-5 py-4 text-right">Qty</th>
                  <th className="px-5 py-4 text-right">Weight</th>
                  <th className="px-5 py-4 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {sales.map((s) => (
                  <tr key={s.id} className="bg-white">
                    <td className="px-5 py-4 font-semibold text-ebony-900">{s.saleNo}</td>
                    <td className="px-5 py-4 text-ebony-700">
                      <div className="font-semibold text-ebony-900">
                        {new Date(s.transactionDate).toISOString().slice(0, 10)}
                      </div>
                      <div className="text-xs text-ebony-600">{s.customer.name}</div>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-ebony-900">{s.totalItems}</td>
                    <td className="px-5 py-4 text-right text-ebony-700">{s.totalQty}</td>
                    <td className="px-5 py-4 text-right text-ebony-700">
                      {Number(s.totalGoldWeight.toString()).toFixed(3)}g
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-ebony-900">
                      {Number(s.totalCost.toString()).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={6}>
                      No sales yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

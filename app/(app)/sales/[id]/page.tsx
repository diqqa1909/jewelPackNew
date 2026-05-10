import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { prismaWithRetry } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SaleViewPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
          <CardDescription>Invalid id.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const sale = await prismaWithRetry((p) =>
    p.salesNTX.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          orderBy: [{ id: "asc" }]
        }
      }
    })
  );

  if (!sale) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
          <CardDescription>Not found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/sales"
          className="rounded-lg border border-ebony-300 bg-white px-5 py-2.5 text-sm font-semibold text-ebony-700 hover:bg-ebony-50 transition-all"
        >
          Back to Invoices
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{sale.saleNo}</CardTitle>
          <CardDescription>
            {new Date(sale.transactionDate).toISOString().slice(0, 10)} • {sale.customer.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-ebony-100 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Items</div>
              <div className="mt-1 text-xl font-extrabold text-ebony-900 tabular-nums">{sale.totalItems}</div>
            </div>
            <div className="rounded-xl border border-ebony-100 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Qty</div>
              <div className="mt-1 text-xl font-extrabold text-ebony-900 tabular-nums">{sale.totalQty}</div>
            </div>
            <div className="rounded-xl border border-ebony-100 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Weight</div>
              <div className="mt-1 text-xl font-extrabold text-ebony-900 tabular-nums">
                {Number(sale.totalGoldWeight.toString()).toFixed(3)}g
              </div>
            </div>
            <div className="rounded-xl border border-ebony-100 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Invoice Amount</div>
              <div className="mt-1 text-xl font-extrabold text-ebony-900 tabular-nums">
                {Number(sale.sellSubTotal.toString()).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-ebony-100 bg-white">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
                <tr>
                  <th className="px-4 py-3">Receipt ID</th>
                  <th className="px-4 py-3">Subcategory</th>
                  <th className="px-4 py-3">Carat</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Weight</th>
                  <th className="px-4 py-3 text-right">Sell Rate/8g</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {sale.items.map((it) => (
                  <tr key={it.id} className="bg-white">
                    <td className="px-4 py-3 font-semibold text-ebony-900 tabular-nums">{it.stockMasterId}</td>
                    <td className="px-4 py-3 text-ebony-700">{it.subcategoryCode}</td>
                    <td className="px-4 py-3 text-ebony-700">{it.carat ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ebony-900 tabular-nums">{it.qty}</td>
                    <td className="px-4 py-3 text-right text-ebony-700 tabular-nums">
                      {Number(it.goldWeight.toString()).toFixed(3)}g
                    </td>
                    <td className="px-4 py-3 text-right text-ebony-700 tabular-nums">
                      {Number(it.sellRatePer8g.toString()).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ebony-900 tabular-nums">
                      {Number(it.sellCost.toString()).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {sale.items.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-ebony-600" colSpan={7}>
                      No items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {sale.remarks ? (
            <div className="rounded-xl border border-ebony-100 bg-white px-4 py-3 text-sm text-ebony-700">
              <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Remarks</div>
              <div className="mt-1 whitespace-pre-wrap">{sale.remarks}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

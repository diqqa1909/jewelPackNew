import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Prisma } from "@/lib/generated/prisma";
import { prismaWithRetry } from "@/lib/prisma";

function formatLkr(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `LKR ${Math.round(n).toLocaleString("en-US")}`;
  }
}

function toNumber(d: unknown) {
  if (typeof d === "number") return d;
  if (d && typeof (d as any).toString === "function") {
    const n = Number((d as any).toString());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export default async function DashboardPage() {
  const now = new Date();
  const from30d = new Date(now);
  from30d.setDate(from30d.getDate() - 30);

  const [stockAgg, categoryCount, lowStockCount, invAgg, recentInvoices] = await Promise.all([
    prismaWithRetry((p) =>
      p.stockMaster.aggregate({
        _sum: { balanceQty: true },
        _count: { _all: true }
      })
    ),
    prismaWithRetry((p) => p.category.count()),
    prismaWithRetry((p) =>
      p.stockMaster.count({
        where: { balanceQty: { gt: 0, lte: 2 } }
      })
    ),
    prismaWithRetry((p) =>
      p.salesNTX.aggregate({
        where: { transactionDate: { gte: from30d } },
        _sum: { sellSubTotal: true, totalCost: true },
        _count: { _all: true }
      })
    ),
    prismaWithRetry((p) =>
      p.salesNTX.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { customer: true, salesman: true }
      })
    )
  ]);

  const onHandItems = stockAgg._sum.balanceQty ?? 0;
  const invAmount30d = toNumber(invAgg._sum.sellSubTotal ?? new Prisma.Decimal("0"));
  const invCost30d = toNumber(invAgg._sum.totalCost ?? new Prisma.Decimal("0"));
  const invCount30d = invAgg._count._all ?? 0;
  const grossMarginPct = invAmount30d > 0 ? ((invAmount30d - invCost30d) / invAmount30d) * 100 : 0;

  const kpis = [
    { label: "On-hand Items", value: String(onHandItems), note: `Across ${categoryCount} categories` },
    { label: "Low Stock", value: String(lowStockCount), note: "Balance qty â‰¤ 2" },
    { label: "Invoices (30d)", value: formatLkr(invAmount30d), note: `Invoices: ${invCount30d}` },
    { label: "Gross Margin (30d)", value: `${grossMarginPct.toFixed(1)}%`, note: "Based on invoice amount vs cost" }
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <CardTitle className="text-sm">{kpi.label}</CardTitle>
              <CardDescription>{kpi.note}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold tracking-tight text-ebony-900">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Latest invoices (most recent first).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-ebony-100">
              <table className="w-full text-sm">
                <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
                  <tr>
                    <th className="px-5 py-4">Invoice</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Salesman</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ebony-100">
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="bg-white hover:bg-ebony-50 transition-colors">
                      <td className="px-5 py-4 font-semibold text-ebony-900">{inv.saleNo}</td>
                      <td className="px-5 py-4 text-ebony-700">
                        <div className="font-semibold text-ebony-900">{inv.customer.name}</div>
                        <div className="text-xs text-ebony-600">{new Date(inv.transactionDate).toISOString().slice(0, 10)}</div>
                      </td>
                      <td className="px-5 py-4 text-ebony-700 font-medium tabular-nums">
                        {formatLkr(toNumber(inv.sellSubTotal))}
                      </td>
                      <td className="px-5 py-4 text-ebony-700">
                        {inv.salesman ? `${inv.salesman.code} â€” ${inv.salesman.name}` : "â€”"}
                      </td>
                    </tr>
                  ))}
                  {recentInvoices.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={4}>
                        No invoices yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

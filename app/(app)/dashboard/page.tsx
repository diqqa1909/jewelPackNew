import { SalesChart, StockSummary } from "@/components/app/DashboardClient";
import { Prisma } from "@/lib/generated/prisma";
import { fetchGoldPrices } from "@/lib/goldPrices";
import { prismaWithRetry } from "@/lib/prisma";
import {
  AlertTriangle,
  Banknote,
  Gem,
  HandCoins,
  PackageCheck,
  ShoppingBag,
  TrendingUp,
  Users
} from "lucide-react";

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

function formatWeight(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 3 })} g`;
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const fromToday = new Date(now);
  fromToday.setHours(0, 0, 0, 0);
  const from30d = new Date(now);
  from30d.setDate(from30d.getDate() - 30);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    systemRow,
    stockAgg,
    categoryCount,
    invAgg30d,
    invAggToday,
    recentInvoices,
    lowStockRows,
    workerPending,
    monthInvoices,
    stockByCategoryAgg,
    customerCount,
    supplierCount,
    cashAgg,
    customerSalesRows,
    liveGoldPrices
  ] = await Promise.all([
    prismaWithRetry((p) => p.system.findUnique({ where: { id: 1 } })),
    prismaWithRetry((p) =>
      p.stockMaster.aggregate({
        _sum: { balanceQty: true, balanceGoldWeight: true, balanceCost: true },
        _count: { _all: true }
      })
    ),
    prismaWithRetry((p) => p.category.count()),
    prismaWithRetry((p) =>
      p.salesNTX.aggregate({
        where: { transactionDate: { gte: from30d } },
        _sum: { sellSubTotal: true },
        _count: { _all: true }
      })
    ),
    prismaWithRetry((p) =>
      p.salesNTX.aggregate({
        where: { transactionDate: { gte: fromToday } },
        _sum: { sellSubTotal: true },
        _count: { _all: true }
      })
    ),
    prismaWithRetry((p) =>
      p.salesNTX.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { customer: true, salesman: true }
      })
    ),
    prismaWithRetry((p) =>
      p.stockMaster.findMany({
        where: { balanceQty: { gt: 0, lte: 2 } },
        orderBy: [{ balanceQty: "asc" }, { updatedAt: "desc" }],
        take: 8
      })
    ),
    prismaWithRetry((p) =>
      p.stockMaster.groupBy({
        by: ["gsmCode", "gsmName"],
        where: { balanceQty: { gt: 0 } },
        _sum: { balanceQty: true, balanceGoldWeight: true },
        orderBy: { _sum: { balanceQty: "desc" } },
        take: 8
      })
    ),
    prismaWithRetry((p) =>
      p.salesNTX.findMany({
        where: { transactionDate: { gte: startOfMonth } },
        select: { transactionDate: true, sellSubTotal: true },
        orderBy: { transactionDate: "asc" },
        take: 2000
      })
    ),
    prismaWithRetry((p) =>
      p.stockMaster.groupBy({
        by: ["categoryCode", "articleName"],
        _sum: { balanceQty: true, balanceGoldWeight: true },
        orderBy: { _sum: { balanceQty: "desc" } },
        take: 8
      })
    ),
    prismaWithRetry((p) => p.customer.count()),
    prismaWithRetry((p) => p.supplier.count()),
    prismaWithRetry((p) =>
      p.transaction.aggregate({
        _sum: { debit: true, credit: true, bankDebit: true, bankCredit: true }
      })
    ),
    prismaWithRetry((p) =>
      p.salesNTX.findMany({
        where: { transactionDate: { gte: from30d } },
        select: { customerId: true, sellSubTotal: true, customer: { select: { name: true } } },
        take: 1000
      })
    ),
    fetchGoldPrices()
  ]);

  const onHandItems = stockAgg._sum.balanceQty ?? 0;
  const netGoldWeight = toNumber(stockAgg._sum.balanceGoldWeight ?? new Prisma.Decimal("0"));
  const invAmount30d = toNumber(invAgg30d._sum.sellSubTotal ?? new Prisma.Decimal("0"));
  const invAmountToday = toNumber(invAggToday._sum.sellSubTotal ?? new Prisma.Decimal("0"));
  const invCountToday = invAggToday._count._all ?? 0;
  const cashInHand =
    toNumber(cashAgg._sum.debit ?? new Prisma.Decimal("0")) -
    toNumber(cashAgg._sum.credit ?? new Prisma.Decimal("0")) +
    toNumber(cashAgg._sum.bankDebit ?? new Prisma.Decimal("0")) -
    toNumber(cashAgg._sum.bankCredit ?? new Prisma.Decimal("0"));

  const salesPoints = (() => {
    const map = new Map<string, number>();
    for (const inv of monthInvoices) {
      const day = new Date(inv.transactionDate).toISOString().slice(8, 10);
      const amt = toNumber(inv.sellSubTotal ?? new Prisma.Decimal("0"));
      map.set(day, (map.get(day) ?? 0) + amt);
    }
    return Array.from(map.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([day, amount]) => ({ day, amount: Math.round(amount) }));
  })();

  const stockByCategory = stockByCategoryAgg.map((r) => ({
    name: r.articleName || r.categoryCode,
    value: toNumber(r._sum.balanceGoldWeight ?? new Prisma.Decimal("0"))
  }));

  const topCustomers = Array.from(
    customerSalesRows
      .reduce((map, row) => {
        const current = map.get(row.customerId) ?? { name: row.customer.name, amount: 0 };
        current.amount += toNumber(row.sellSubTotal ?? new Prisma.Decimal("0"));
        map.set(row.customerId, current);
        return map;
      }, new Map<number, { name: string; amount: number }>())
      .values()
  )
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const goldRatePer8g = systemRow ? toNumber(systemRow.goldCostRatePer8g) : 0;
  const liveRates = liveGoldPrices.ok ? liveGoldPrices.rates : {};
  const goldRates = (["24", "22", "21", "18"] as const).map((carat) => ({
    label: `${carat}K (8g)`,
    value: Number(liveRates[carat] ?? 0) || (goldRatePer8g * Number(carat)) / 24
  }));
  const goldRateUpdated = liveGoldPrices.ok
    ? liveGoldPrices.fetchedAt
    : systemRow
      ? systemRow.updatedAt.toISOString()
      : "";

  const metricCards = [
    {
      label: "Today Sales",
      value: formatLkr(invAmountToday),
      meta: `${invCountToday} invoices today`,
      icon: TrendingUp,
      color: "text-cyan-600",
      bg: "bg-cyan-50"
    },
    {
      label: "Stock Value",
      value: formatLkr(toNumber(stockAgg._sum.balanceCost ?? new Prisma.Decimal("0"))),
      meta: `${onHandItems.toLocaleString("en-US")} pieces`,
      icon: PackageCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      label: "Gold Stock (Net)",
      value: formatWeight(netGoldWeight),
      meta: `Across ${categoryCount} categories`,
      icon: Gem,
      color: "text-amber-600",
      bg: "bg-amber-50"
    },
    {
      label: "Customer Pending",
      value: formatLkr(invAmount30d),
      meta: `${customerCount} customers`,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50"
    },
    {
      label: "Supplier Pending",
      value: `${supplierCount}`,
      meta: "Suppliers",
      icon: ShoppingBag,
      color: "text-rose-600",
      bg: "bg-rose-50"
    },
    {
      label: "Cash in Hand",
      value: formatLkr(cashInHand),
      meta: "Current balance",
      icon: Banknote,
      color: "text-green-600",
      bg: "bg-green-50"
    }
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-lg border border-ebony-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${metric.bg} ${metric.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="text-xs font-bold text-indigo-900">{metric.label}</div>
              </div>
              <div className="mt-3 text-lg font-extrabold tracking-tight text-ebony-900">{metric.value}</div>
              <div className="mt-3 text-xs font-semibold text-ebony-600">{metric.meta}</div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="rounded-lg border border-ebony-100 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="mb-3 flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-bold text-indigo-900">Gold Rate Today</h2>
          </div>
          <div className="divide-y divide-ebony-100">
            {goldRates.map((rate) => (
              <div key={rate.label} className="flex items-center justify-between py-3 text-sm">
                <span className="font-semibold text-ebony-800">{rate.label}</span>
                <span className="font-extrabold tabular-nums text-ebony-900">{formatLkr(rate.value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 text-[11px] font-semibold text-ebony-500">
            <div className="flex items-center justify-between gap-3">
              <span>Last Updated: {goldRateUpdated ? new Date(goldRateUpdated).toISOString().slice(0, 10) : "-"}</span>
              
            </div>
            <div>{liveGoldPrices.ok ? liveGoldPrices.sourceUrl : liveGoldPrices.error ?? "Using saved system rate."}</div>
          </div>
        </div>

        <div className="xl:col-span-4">
          <StockSummary rows={stockByCategory} total={netGoldWeight} />
        </div>

        <div className="rounded-lg border border-ebony-100 bg-white p-5 shadow-sm xl:col-span-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <h2 className="text-sm font-bold text-rose-700">Low Stock Alert</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-ebony-100">
            <table className="w-full text-sm">
              <thead className="bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Net Weight</th>
                  <th className="px-4 py-3">Karat</th>
                  <th className="px-4 py-3 text-right">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {lowStockRows.slice(0, 5).map((r) => (
                  <tr key={r.id} className="bg-white">
                    <td className="px-4 py-3 font-semibold text-ebony-900">{r.subcategoryName}</td>
                    <td className="px-4 py-3 tabular-nums text-ebony-700">{formatWeight(toNumber(r.balanceGoldWeight))}</td>
                    <td className="px-4 py-3 text-ebony-700">{r.carat ?? "-"}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-ebony-900">{r.balanceQty}</td>
                  </tr>
                ))}
                {lowStockRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-ebony-600" colSpan={4}>
                      No low stock items.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="rounded-lg border border-ebony-100 bg-white p-5 shadow-sm xl:col-span-3">
          <h2 className="mb-3 text-sm font-bold text-indigo-900">Top 5 Customers (By Sales)</h2>
          <div className="space-y-3">
            {topCustomers.map((customer, idx) => (
              <div key={customer.name} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 text-sm">
                <span className="text-xs font-bold text-ebony-500">{idx + 1}.</span>
                <span className="truncate font-semibold text-ebony-800">{customer.name}</span>
                <span className="font-bold tabular-nums text-ebony-900">{formatLkr(customer.amount)}</span>
              </div>
            ))}
            {topCustomers.length === 0 ? <div className="py-8 text-center text-sm text-ebony-600">No customer sales yet.</div> : null}
          </div>
          <div className="mt-5 text-right text-xs font-bold text-indigo-700">This Month</div>
        </div>

        <div className="xl:col-span-5">
          <SalesChart rows={salesPoints} />
        </div>

        <div className="rounded-lg border border-ebony-100 bg-white p-5 shadow-sm xl:col-span-4">
          <h2 className="mb-3 text-sm font-bold text-indigo-900">Worker Pending Jobs</h2>
          <div className="overflow-hidden rounded-lg border border-ebony-100">
            <table className="w-full text-sm">
              <thead className="bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
                <tr>
                  <th className="px-4 py-3">Worker</th>
                  <th className="px-4 py-3 text-right">Pending Items</th>
                  <th className="px-4 py-3 text-right">Gold Given</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {workerPending.slice(0, 5).map((r) => (
                  <tr key={r.gsmCode} className="bg-white">
                    <td className="px-4 py-3 font-semibold text-ebony-900">{r.gsmName}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ebony-800">{r._sum.balanceQty ?? 0}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ebony-800">
                      {formatWeight(toNumber(r._sum.balanceGoldWeight))}
                    </td>
                  </tr>
                ))}
                {workerPending.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-ebony-600" colSpan={3}>
                      No pending jobs.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-right text-xs font-bold text-indigo-700">View All</div>
        </div>
      </section>

      <section className="rounded-lg border border-ebony-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-indigo-900">Recent Invoices</h2>
        <div className="overflow-hidden rounded-lg border border-ebony-100">
          <table className="w-full text-sm">
            <thead className="bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Salesman</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {recentInvoices.slice(0, 6).map((inv) => (
                <tr key={inv.id} className="bg-white">
                  <td className="px-4 py-3 font-bold text-ebony-900">{inv.saleNo}</td>
                  <td className="px-4 py-3 text-ebony-700">{inv.customer.name}</td>
                  <td className="px-4 py-3 text-ebony-700">{inv.salesman ? inv.salesman.name : "-"}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-ebony-900">
                    {formatLkr(toNumber(inv.sellSubTotal))}
                  </td>
                </tr>
              ))}
              {recentInvoices.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-ebony-600" colSpan={4}>
                    No invoices yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import { buttonClassName } from "@/components/ui/Button";
import { prismaWithRetry } from "@/lib/prisma";
import { Eye, Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  const n = Number(value && typeof (value as any).toString === "function" ? (value as any).toString() : value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function fmt(value: unknown, fractionDigits = 3) {
  const n = toNumber(value);
  return n.toLocaleString("en-US", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
}

export default async function GoldsmithTrackingPage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code);

  const [goldsmith, purchases, sales] = await Promise.all([
    prismaWithRetry((p) => p.goldsmith.findUnique({ where: { code } })),
    prismaWithRetry((p) =>
      p.purchase.findMany({
        where: { gsmCode: code },
        orderBy: [{ purchaseDate: "desc" }, { id: "desc" }]
      })
    ),
    prismaWithRetry((p) =>
      p.sale.findMany({
        where: { purchase: { gsmCode: code } },
        include: { purchase: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }]
      })
    )
  ]);

  if (!goldsmith) {
    return <div className="rounded-lg border border-ebony-100 bg-white p-6 text-sm font-semibold text-ebony-700 shadow-sm">Goldsmith not found.</div>;
  }

  const salesByPurchase = new Map<number, { qty: number; weight: number }>();
  for (const sale of sales) {
    if (sale.purchaseId == null) continue;
    const current = salesByPurchase.get(sale.purchaseId) ?? { qty: 0, weight: 0 };
    current.qty += Number(sale.qty ?? 0);
    current.weight += toNumber(sale.goldWeight);
    salesByPurchase.set(sale.purchaseId, current);
  }

  const rows = purchases.map((purchase) => {
    const sold = salesByPurchase.get(purchase.id) ?? { qty: 0, weight: 0 };
    const pendingQty = Math.max(0, Number(purchase.qty ?? 0) - sold.qty);
    const pendingWeight = Math.max(0, toNumber(purchase.goldWeight) - sold.weight);
    return {
      id: purchase.id,
      transactionDate: purchase.purchaseDate,
      subcategoryName: purchase.subcategoryName ?? purchase.subcategoryCode ?? "-",
      carat: purchase.carat ?? "-",
      goldWeight: toNumber(purchase.goldWeight),
      soldGoldWeight: sold.weight,
      balanceGoldWeight: pendingWeight,
      labourCharges: toNumber(purchase.labourCharges),
      labourChargePaid: toNumber(purchase.paidAmount),
      labourChargeBalance: Math.max(0, toNumber(purchase.labourCharges) - toNumber(purchase.paidAmount)),
      pendingQty,
      status: pendingWeight > 0 ? "Pending" : "Completed"
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.goldGiven += row.goldWeight;
      acc.returned += row.soldGoldWeight;
      acc.pending += row.balanceGoldWeight;
      acc.labour += row.labourCharges;
      acc.labourPaid += row.labourChargePaid;
      acc.labourBalance += row.labourChargeBalance;
      return acc;
    },
    { goldGiven: 0, returned: 0, pending: 0, labour: 0, labourPaid: 0, labourBalance: 0 }
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/purchases/new" className={buttonClassName("primary", "px-5 py-2.5")}>
          <Plus className="h-4 w-4" />
          Add New Entry
        </Link>
      </div>

      <section className="overflow-hidden rounded-lg border border-ebony-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-ebony-50 text-left text-xs font-bold text-ebony-700">
              <tr>
                <th className="px-4 py-4">Worker Name</th>
                <th className="px-4 py-4 text-right">Gold Given (g)</th>
                <th className="px-4 py-4 text-right">Returned (g)</th>
                <th className="px-4 py-4 text-right">Wastage (g)</th>
                <th className="px-4 py-4 text-right">Pending (g)</th>
                <th className="px-4 py-4 text-right">Labour Charge</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              <tr className="bg-white">
                <td className="px-4 py-4 font-bold text-indigo-900">{goldsmith.name}</td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">{fmt(totals.goldGiven)}</td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">{fmt(totals.returned)}</td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">0.000</td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">{fmt(totals.pending)}</td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">{fmt(totals.labour, 2)}</td>
                <td className="px-4 py-4">
                  <span
                    className={
                      totals.pending > 0
                        ? "rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700"
                        : "rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700"
                    }
                  >
                    {totals.pending > 0 ? "Pending" : "Completed"}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <Link href="/purchases/new" className={buttonClassName("secondary", "h-8 w-8 px-0 py-0 text-ebony-500")} aria-label="Add entry" title="Add entry">
                    <Plus className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
              <tr className="bg-ebony-50 font-extrabold">
                <td className="px-4 py-4 text-ebony-900">Total</td>
                <td className="px-4 py-4 text-right tabular-nums text-ebony-900">{fmt(totals.goldGiven)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-ebony-900">{fmt(totals.returned)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-ebony-900">0.000</td>
                <td className="px-4 py-4 text-right tabular-nums text-ebony-900">{fmt(totals.pending)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-ebony-900">{fmt(totals.labour, 2)}</td>
                <td className="px-4 py-4" />
                <td className="px-4 py-4" />
              </tr>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-ebony-600" colSpan={8}>
                    No stock entries found for this goldsmith.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-ebony-100 bg-white shadow-sm">
        <div className="border-b border-ebony-100 px-4 py-3 text-sm font-bold text-indigo-900">
          Entry Breakdown
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] text-sm">
            <thead className="bg-ebony-50 text-left text-xs font-bold text-ebony-700">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Received</th>
                <th className="px-4 py-3 text-right">Returned</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3 text-right">Labour Charge Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-right">Labour</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {rows.map((row) => (
                <tr key={row.id} className="bg-white">
                  <td className="px-4 py-3 tabular-nums text-ebony-700">{new Date(row.transactionDate).toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-3 text-ebony-800">
                    <div className="font-semibold">{row.subcategoryName}</div>
                    <div className="text-xs text-ebony-500">{row.carat}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{fmt(row.goldWeight)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{fmt(row.soldGoldWeight)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{fmt(row.balanceGoldWeight)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{fmt(row.labourChargePaid, 2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{fmt(row.labourChargeBalance, 2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{fmt(row.labourCharges, 2)}</td>
                  <td className="px-4 py-3 text-center">
                    <Link href={`/purchases/${row.id}`} className={buttonClassName("secondary", "h-8 w-8 px-0 py-0 text-ebony-500")} aria-label="View entry" title="View entry">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

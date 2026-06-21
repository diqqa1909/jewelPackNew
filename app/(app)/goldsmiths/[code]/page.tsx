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

  const [goldsmith, purchases, goldIssues] = await Promise.all([
    prismaWithRetry((p) => p.goldsmith.findUnique({ where: { code } })),
    prismaWithRetry((p) =>
      p.purchase.findMany({
        where: { gsmCode: code },
        orderBy: [{ purchaseDate: "desc" }, { id: "desc" }]
      })
    ),
    prismaWithRetry((p) =>
      p.goldIssue.findMany({
        where: { goldsmithCode: code },
        orderBy: [{ issueDate: "desc" }, { id: "desc" }]
      })
    )
  ]);

  if (!goldsmith) {
    return <div className="rounded-lg border border-ebony-100 bg-white p-6 text-sm font-semibold text-ebony-700 shadow-sm">Goldsmith not found.</div>;
  }

  const issueRows = goldIssues.map((issue) => ({
    id: `ISS-${issue.id}`,
    transactionDate: issue.issueDate,
    subcategoryName: "Gold Issue",
    carat: issue.carat ?? "-",
    receivedGoldWeight: 0,
    issuedGoldWeight: toNumber(issue.goldWeight),
    labourCharges: 0,
    labourChargePaid: 0,
    labourChargeBalance: 0,
    sourceHref: "/gold",
    sourceLabel: issue.referenceNumber ?? `GI-${String(issue.id).padStart(5, "0")}`
  }));

  const purchaseRows = purchases.map((purchase) => {
    const goldWeight = toNumber(purchase.goldWeight);
    return {
      id: `PUR-${purchase.id}`,
      transactionDate: purchase.purchaseDate,
      subcategoryName: purchase.subcategoryName ?? purchase.subcategoryCode ?? "-",
      carat: purchase.carat ?? "-",
      receivedGoldWeight: goldWeight,
      issuedGoldWeight: 0,
      labourCharges: toNumber(purchase.labourCharges),
      labourChargePaid: toNumber(purchase.paidAmount),
      labourChargeBalance: Math.max(0, toNumber(purchase.labourCharges) - toNumber(purchase.paidAmount)),
      sourceHref: `/purchases/${purchase.id}`,
      sourceLabel: purchase.purchaseNo
    };
  });
  const rows = [...issueRows, ...purchaseRows].sort(
    (a, b) => b.transactionDate.getTime() - a.transactionDate.getTime() || b.id.localeCompare(a.id)
  );

  const totals = rows.reduce(
    (acc, row) => {
      acc.received += row.receivedGoldWeight;
      acc.issued += row.issuedGoldWeight;
      acc.labour += row.labourCharges;
      acc.labourPaid += row.labourChargePaid;
      acc.labourBalance += row.labourChargeBalance;
      return acc;
    },
    { received: 0, issued: 0, labour: 0, labourPaid: 0, labourBalance: 0 }
  );
  const pendingGold = totals.received - totals.issued;

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
                <th className="px-4 py-4 text-right">Received (g)</th>
                <th className="px-4 py-4 text-right">Issued (g)</th>
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
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">{fmt(totals.received)}</td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">{fmt(totals.issued)}</td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">0.000</td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">{fmt(pendingGold)}</td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">{fmt(totals.labour, 2)}</td>
                <td className="px-4 py-4">
                  <span
                    className={
                      pendingGold !== 0
                        ? "rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700"
                        : "rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700"
                    }
                  >
                    {pendingGold !== 0 ? "Pending" : "Completed"}
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
                <td className="px-4 py-4 text-right tabular-nums text-ebony-900">{fmt(totals.received)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-ebony-900">{fmt(totals.issued)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-ebony-900">0.000</td>
                <td className="px-4 py-4 text-right tabular-nums text-ebony-900">{fmt(pendingGold)}</td>
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
                <th className="px-4 py-3 text-right">Issued</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3 text-right">Paid</th>
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
                    <div className="text-xs text-ebony-500">{row.carat} {row.sourceLabel ? `| ${row.sourceLabel}` : ""}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{row.receivedGoldWeight ? fmt(row.receivedGoldWeight) : "-"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{row.issuedGoldWeight ? fmt(row.issuedGoldWeight) : "-"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{fmt(row.receivedGoldWeight - row.issuedGoldWeight)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{fmt(row.labourChargePaid, 2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{fmt(row.labourChargeBalance, 2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{fmt(row.labourCharges, 2)}</td>
                  <td className="px-4 py-3 text-center">
                    <Link href={row.sourceHref} className={buttonClassName("secondary", "h-8 w-8 px-0 py-0 text-ebony-500")} aria-label="View entry" title="View entry">
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

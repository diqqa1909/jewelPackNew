import { prismaWithRetry } from "@/lib/prisma";
import { ArrowDownLeft, ArrowUpRight, Gem } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  const n = Number(value && typeof (value as any).toString === "function" ? (value as any).toString() : value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function weight(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function date(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(value);
}

type GoldLedgerRow = {
  id: string;
  date: Date;
  type: "ISSUED" | "RECEIVED";
  reference: string;
  supplier: string;
  goldsmithCode: string;
  goldsmithName: string;
  item: string;
  carat: string;
  issued: number;
  received: number;
  remarks: string;
  balance: number;
};

export default async function GoldPage() {
  const [purchases, sales] = await Promise.all([
    prismaWithRetry((p) =>
      p.purchase.findMany({
        where: {
          OR: [{ gsmCode: { not: null } }, { gsmName: { not: null } }]
        },
        include: { supplier: true },
        orderBy: [{ purchaseDate: "asc" }, { id: "asc" }]
      })
    ),
    prismaWithRetry((p) =>
      p.sale.findMany({
        where: {
          purchase: {
            OR: [{ gsmCode: { not: null } }, { gsmName: { not: null } }]
          }
        },
        include: {
          salesNTX: true,
          purchase: { include: { supplier: true } }
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }]
      })
    )
  ]);

  const movementRows: Omit<GoldLedgerRow, "balance">[] = [
    ...purchases.map((purchase) => ({
      id: `PUR-${purchase.id}`,
      date: purchase.purchaseDate,
      type: "ISSUED" as const,
      reference: purchase.purchaseNo,
      supplier: purchase.supplier?.name ?? "-",
      goldsmithCode: purchase.gsmCode ?? purchase.gsmName ?? "-",
      goldsmithName: purchase.gsmName ?? purchase.gsmCode ?? "-",
      item: purchase.subcategoryName ?? purchase.subcategoryCode ?? "-",
      carat: purchase.carat ?? "-",
      issued: toNumber(purchase.goldWeight),
      received: 0,
      remarks: purchase.remarks ?? purchase.notes ?? ""
    })),
    ...sales.map((sale) => ({
      id: `SAL-${sale.id}`,
      date: sale.salesNTX.transactionDate,
      type: "RECEIVED" as const,
      reference: sale.salesNTX.saleNo,
      supplier: sale.purchase?.supplier?.name ?? "-",
      goldsmithCode: sale.purchase?.gsmCode ?? sale.purchase?.gsmName ?? "-",
      goldsmithName: sale.purchase?.gsmName ?? sale.purchase?.gsmCode ?? "-",
      item: sale.purchase?.subcategoryName ?? sale.subcategoryCode,
      carat: sale.carat ?? sale.purchase?.carat ?? "-",
      issued: 0,
      received: toNumber(sale.goldWeight),
      remarks: sale.salesNTX.remarks ?? ""
    }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));

  const runningByGoldsmith = new Map<string, number>();
  const ledgerAsc = movementRows.map((row) => {
    const key = row.goldsmithCode || row.goldsmithName || "-";
    const balance = (runningByGoldsmith.get(key) ?? 0) + row.issued - row.received;
    runningByGoldsmith.set(key, balance);
    return { ...row, balance };
  });
  const ledger = [...ledgerAsc].reverse();

  const totals = ledgerAsc.reduce(
    (acc, row) => {
      acc.issued += row.issued;
      acc.received += row.received;
      return acc;
    },
    { issued: 0, received: 0 }
  );
  const balanceTotal = totals.issued - totals.received;

  const balances = Array.from(
    ledgerAsc
      .reduce((map, row) => {
        const key = row.goldsmithCode || row.goldsmithName || "-";
        const current = map.get(key) ?? {
          goldsmithCode: row.goldsmithCode,
          goldsmithName: row.goldsmithName,
          supplier: row.supplier,
          issued: 0,
          received: 0,
          balance: 0,
          transactions: 0
        };
        current.issued += row.issued;
        current.received += row.received;
        current.balance += row.issued - row.received;
        current.transactions += 1;
        map.set(key, current);
        return map;
      }, new Map<string, { goldsmithCode: string; goldsmithName: string; supplier: string; issued: number; received: number; balance: number; transactions: number }>())
      .values()
  ).sort((a, b) => b.balance - a.balance || a.goldsmithName.localeCompare(b.goldsmithName));

  const metricCards = [
    { label: "Gold Issued", value: `${weight(totals.issued)} g`, icon: ArrowUpRight, tone: "text-amber-700 bg-amber-50" },
    { label: "Gold Received", value: `${weight(totals.received)} g`, icon: ArrowDownLeft, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Gold Balance", value: `${weight(balanceTotal)} g`, icon: Gem, tone: "text-indigo-700 bg-indigo-50" }
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-lg border border-ebony-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-lg ${metric.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-ebony-500">{metric.label}</div>
                  <div className="mt-1 text-xl font-extrabold tabular-nums text-ebony-900">{metric.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-lg border border-ebony-100 bg-white shadow-sm">
        <div className="border-b border-ebony-100 px-5 py-4">
          <h2 className="text-sm font-extrabold text-indigo-900">Gold Balances by Supplier / Goldsmith</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-ebony-50 text-left text-xs font-bold uppercase tracking-wide text-ebony-600">
              <tr>
                <th className="px-4 py-3">Goldsmith</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3 text-right">Issued (g)</th>
                <th className="px-4 py-3 text-right">Received (g)</th>
                <th className="px-4 py-3 text-right">Balance (g)</th>
                <th className="px-4 py-3 text-right">Transactions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {balances.map((row) => (
                <tr key={row.goldsmithCode} className="bg-white hover:bg-ebony-50/70">
                  <td className="px-4 py-3">
                    <Link href={`/goldsmiths/${encodeURIComponent(row.goldsmithCode)}`} className="font-bold text-indigo-800 hover:underline">
                      {row.goldsmithName}
                    </Link>
                    <div className="text-xs font-semibold text-ebony-500">{row.goldsmithCode}</div>
                  </td>
                  <td className="px-4 py-3 text-ebony-700">{row.supplier}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{weight(row.issued)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{weight(row.received)}</td>
                  <td className="px-4 py-3 text-right font-extrabold tabular-nums text-ebony-900">{weight(row.balance)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-700">{row.transactions}</td>
                </tr>
              ))}
              {balances.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-ebony-600" colSpan={6}>
                    No gold transactions found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-ebony-100 bg-white shadow-sm">
        <div className="border-b border-ebony-100 px-5 py-4">
          <h2 className="text-sm font-extrabold text-indigo-900">Gold Transaction Ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="sticky top-0 bg-ebony-50 text-left text-xs font-bold uppercase tracking-wide text-ebony-600">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Goldsmith</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Karat</th>
                <th className="px-4 py-3 text-right">Issued (g)</th>
                <th className="px-4 py-3 text-right">Received (g)</th>
                <th className="px-4 py-3 text-right">Balance (g)</th>
                <th className="px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {ledger.map((row) => (
                <tr key={row.id} className="bg-white hover:bg-ebony-50/70">
                  <td className="px-4 py-3 tabular-nums text-ebony-700">{date(row.date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        row.type === "ISSUED"
                          ? "rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700"
                          : "rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700"
                      }
                    >
                      {row.type === "ISSUED" ? "Issued" : "Received"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-ebony-900">{row.reference}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ebony-900">{row.goldsmithName}</div>
                    <div className="text-xs font-semibold text-ebony-500">{row.goldsmithCode}</div>
                  </td>
                  <td className="px-4 py-3 text-ebony-700">{row.supplier}</td>
                  <td className="px-4 py-3 text-ebony-700">{row.item}</td>
                  <td className="px-4 py-3 font-semibold text-ebony-800">{row.carat}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{row.issued ? weight(row.issued) : "-"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{row.received ? weight(row.received) : "-"}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-ebony-900">{weight(row.balance)}</td>
                  <td className="max-w-56 truncate px-4 py-3 text-ebony-600" title={row.remarks}>
                    {row.remarks || "-"}
                  </td>
                </tr>
              ))}
              {ledger.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-ebony-600" colSpan={11}>
                    No gold ledger entries yet.
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

import { GoldIssueButton } from "@/components/app/GoldIssueActions";
import { prismaWithRetry } from "@/lib/prisma";
import { ArrowDownLeft, ArrowUpRight, Filter, Gem, Search } from "lucide-react";
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

function dateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDate(value: unknown, endOfDay = false) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
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

export default async function GoldPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const fromParam = typeof searchParams?.from === "string" ? searchParams.from : "";
  const toParam = typeof searchParams?.to === "string" ? searchParams.to : "";
  const goldsmithParam = typeof searchParams?.goldsmith === "string" ? searchParams.goldsmith.trim() : "";
  const from = parseDate(fromParam);
  const to = parseDate(toParam, true);

  const [goldsmiths, goldIssues, purchases] = await Promise.all([
    prismaWithRetry((p) => p.goldsmith.findMany({ orderBy: [{ name: "asc" }] })),
    prismaWithRetry((p) =>
      p.goldIssue.findMany({
        include: { goldsmith: true },
        orderBy: [{ issueDate: "asc" }, { id: "asc" }]
      })
    ),
    prismaWithRetry((p) =>
      p.purchase.findMany({
        where: {
          OR: [{ gsmCode: { not: null } }, { gsmName: { not: null } }]
        },
        include: { supplier: true },
        orderBy: [{ purchaseDate: "asc" }, { id: "asc" }]
      })
    )
  ]);

  const movementRows: Omit<GoldLedgerRow, "balance">[] = [
    ...goldIssues.map((issue) => ({
      id: `GOLD-${issue.id}`,
      date: issue.issueDate,
      type: "ISSUED" as const,
      reference: issue.referenceNumber ?? `GI-${String(issue.id).padStart(5, "0")}`,
      supplier: "Direct Issue",
      goldsmithCode: issue.goldsmithCode,
      goldsmithName: issue.goldsmith.name,
      item: "Gold Issue",
      carat: issue.carat,
      issued: toNumber(issue.goldWeight),
      received: 0,
      remarks: issue.remarks ?? ""
    })),
    ...purchases.map((purchase) => ({
      id: `PUR-${purchase.id}`,
      date: purchase.purchaseDate,
      type: "RECEIVED" as const,
      reference: purchase.purchaseNo,
      supplier: purchase.supplier?.name ?? "-",
      goldsmithCode: purchase.gsmCode ?? purchase.gsmName ?? "-",
      goldsmithName: purchase.gsmName ?? purchase.gsmCode ?? "-",
      item: purchase.subcategoryName ?? purchase.subcategoryCode ?? "-",
      carat: purchase.carat ?? "-",
      issued: 0,
      received: toNumber(purchase.goldWeight),
      remarks: purchase.remarks ?? purchase.notes ?? ""
    }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));

  const runningByGoldsmith = new Map<string, number>();
  const ledgerAsc = movementRows.map((row) => {
    const key = row.goldsmithCode || row.goldsmithName || "-";
    const balance = (runningByGoldsmith.get(key) ?? 0) + row.received - row.issued;
    runningByGoldsmith.set(key, balance);
    return { ...row, balance };
  });

  const goldsmithOptions = Array.from(
    [
      ...goldsmiths.map((g) => ({ code: g.code, name: g.name })),
      ...ledgerAsc.map((row) => ({ code: row.goldsmithCode, name: row.goldsmithName }))
    ]
      .reduce((map, row) => {
        const key = row.code || row.name || "-";
        if (!map.has(key)) map.set(key, { code: row.code, name: row.name });
        return map;
      }, new Map<string, { code: string; name: string }>())
      .values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const selectedGoldsmith = goldsmithOptions.find((g) => g.code === goldsmithParam) ?? null;
  const term = q.toLowerCase();
  const matchesSearch = (row: Omit<GoldLedgerRow, "balance">) => {
    if (!term) return true;
    return [row.reference, row.supplier, row.goldsmithCode, row.goldsmithName, row.item, row.carat, row.remarks, row.type]
      .join(" ")
      .toLowerCase()
      .includes(term);
  };

  const matchesGoldsmith = (row: Omit<GoldLedgerRow, "balance">) => {
    if (!goldsmithParam) return true;
    return (row.goldsmithCode || row.goldsmithName || "-") === goldsmithParam;
  };

  const openingBalance =
    goldsmithParam && from
      ? movementRows
          .filter((row) => matchesGoldsmith(row) && row.date < from)
          .reduce((sum, row) => sum + row.received - row.issued, 0)
      : 0;

  const filteredMovements = movementRows.filter((row) => {
    if (!matchesGoldsmith(row)) return false;
    if (!matchesSearch(row)) return false;
    if (from && row.date < from) return false;
    if (to && row.date > to) return false;
    return true;
  });

  const filteredRunningByGoldsmith = new Map<string, number>();
  if (goldsmithParam) filteredRunningByGoldsmith.set(goldsmithParam, openingBalance);
  const filteredLedgerAsc = filteredMovements.map((row) => {
    const key = row.goldsmithCode || row.goldsmithName || "-";
    const balance = (filteredRunningByGoldsmith.get(key) ?? 0) + row.received - row.issued;
    filteredRunningByGoldsmith.set(key, balance);
    return { ...row, balance };
  });
  const ledger = [...filteredLedgerAsc].reverse();

  const totals = filteredLedgerAsc.reduce(
    (acc, row) => {
      acc.issued += row.issued;
      acc.received += row.received;
      return acc;
    },
    { issued: 0, received: 0 }
  );
  const balanceTotal = goldsmithParam ? openingBalance + totals.received - totals.issued : totals.received - totals.issued;

  const balances = Array.from(
    filteredLedgerAsc
      .reduce((map, row) => {
        const key = row.goldsmithCode || row.goldsmithName || "-";
        const current = map.get(key) ?? {
          goldsmithCode: row.goldsmithCode,
          goldsmithName: row.goldsmithName,
          supplier: row.supplier,
          issued: 0,
          received: 0,
          balance: goldsmithParam ? openingBalance : 0,
          transactions: 0
        };
        current.issued += row.issued;
        current.received += row.received;
        current.balance += row.received - row.issued;
        current.transactions += 1;
        map.set(key, current);
        return map;
      }, new Map<string, { goldsmithCode: string; goldsmithName: string; supplier: string; issued: number; received: number; balance: number; transactions: number }>())
      .values()
  ).sort((a, b) => b.balance - a.balance || a.goldsmithName.localeCompare(b.goldsmithName));

  for (const goldsmith of goldsmithOptions) {
    if (goldsmithParam && goldsmith.code !== goldsmithParam) continue;
    if (balances.some((row) => row.goldsmithCode === goldsmith.code)) continue;
    balances.push({
      goldsmithCode: goldsmith.code,
      goldsmithName: goldsmith.name,
      supplier: "-",
      issued: 0,
      received: 0,
      balance: goldsmithParam ? openingBalance : 0,
      transactions: 0
    });
  }

  balances.sort((a, b) => b.balance - a.balance || a.goldsmithName.localeCompare(b.goldsmithName));

  if (goldsmithParam && balances.length === 0) {
    balances.push({
      goldsmithCode: selectedGoldsmith?.code ?? goldsmithParam,
      goldsmithName: selectedGoldsmith?.name ?? goldsmithParam,
      supplier: "-",
      issued: 0,
      received: 0,
      balance: openingBalance,
      transactions: 0
    });
  }

  const metricCards = [
    { label: "Gold Issued", value: `${weight(totals.issued)} g`, icon: ArrowUpRight, tone: "text-amber-700 bg-amber-50" },
    { label: "Gold Received", value: `${weight(totals.received)} g`, icon: ArrowDownLeft, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Gold Balance", value: `${weight(balanceTotal)} g`, icon: Gem, tone: "text-indigo-700 bg-indigo-50" }
  ];

  return (
    <div className="space-y-5">
      <form className="rounded-lg border border-ebony-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[10rem_10rem_minmax(14rem,1fr)_minmax(16rem,1.2fr)_auto_auto]">
          <label className="space-y-1.5 text-sm">
            <div className="text-xs font-bold text-ebony-700">From</div>
            <input
              type="date"
              name="from"
              defaultValue={fromParam}
              className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <div className="text-xs font-bold text-ebony-700">To</div>
            <input
              type="date"
              name="to"
              defaultValue={toParam}
              className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <div className="text-xs font-bold text-ebony-700">Goldsmith</div>
            <select
              name="goldsmith"
              defaultValue={goldsmithParam}
              className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            >
              <option value="">All goldsmiths</option>
              {goldsmithOptions.map((goldsmith) => (
                <option key={goldsmith.code} value={goldsmith.code}>
                  {goldsmith.code} - {goldsmith.name}
                </option>
              ))}
            </select>
          </label>
          <label className="relative space-y-1.5 text-sm">
            <div className="text-xs font-bold text-ebony-700">Search</div>
            <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-ebony-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Reference, item, supplier, remarks..."
              className="h-10 w-full rounded-md border border-ebony-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-ebony-900 px-5 text-sm font-bold text-white hover:bg-ebony-800"
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <Link
            href="/gold"
            className="inline-flex h-10 items-center justify-center self-end rounded-md border border-ebony-200 bg-white px-5 text-sm font-bold text-ebony-700 hover:bg-ebony-50"
          >
            Reset
          </Link>
        </div>
      </form>

      {goldsmithParam ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-amber-700">Opening Balance</div>
              <div className="mt-1 text-sm font-semibold text-ebony-800">
                {selectedGoldsmith ? `${selectedGoldsmith.code} - ${selectedGoldsmith.name}` : goldsmithParam}
                {from ? ` before ${dateInput(from)}` : " from beginning"}
              </div>
            </div>
            <div className="text-2xl font-extrabold tabular-nums text-amber-800">{weight(openingBalance)} g</div>
          </div>
        </section>
      ) : null}

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
                <th className="px-4 py-3 text-center">Action</th>
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
                  <td className="px-4 py-3 text-center">
                    <GoldIssueButton goldsmith={{ code: row.goldsmithCode, name: row.goldsmithName }} />
                  </td>
                </tr>
              ))}
              {balances.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-ebony-600" colSpan={7}>
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

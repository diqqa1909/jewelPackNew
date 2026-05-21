import { Prisma } from "@/lib/generated/prisma";
import { prismaWithRetry } from "@/lib/prisma";
import { Filter, Search } from "lucide-react";

export const dynamic = "force-dynamic";

function toDecimal(value: unknown) {
  if (value instanceof Prisma.Decimal) return value;
  if (value && typeof (value as any).toString === "function") return new Prisma.Decimal((value as any).toString());
  return new Prisma.Decimal("0");
}

function formatMoney(value: unknown) {
  const n = Number(toDecimal(value).toString());
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(value);
}

function dateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function CustomerAccountPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = Number(params.id);
  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const fromParam = typeof sp.from === "string" ? sp.from : "";
  const toParam = typeof sp.to === "string" ? sp.to : "";
  const from = parseDate(fromParam);
  const to = parseDate(toParam);
  if (to) to.setHours(23, 59, 59, 999);

  if (!Number.isFinite(id)) {
    return (
      <div className="rounded-lg border border-ebony-100 bg-white p-6 text-sm font-semibold text-ebony-700 shadow-sm">
        Invalid customer id.
      </div>
    );
  }

  const customer = await prismaWithRetry((p) => p.customer.findUnique({ where: { id } }));
  if (!customer) {
    return (
      <div className="rounded-lg border border-ebony-100 bg-white p-6 text-sm font-semibold text-ebony-700 shadow-sm">
        Customer not found.
      </div>
    );
  }

  const accountNumber = (customer.accountNumber ?? "").trim();
  const dateWhere = {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {})
  };

  const where: Prisma.TransactionWhereInput = {
    accountNumber,
    ...(from || to ? { date: dateWhere } : {}),
    ...(q
      ? {
          OR: [
            { source: { contains: q, mode: "insensitive" } },
            { memo: { contains: q, mode: "insensitive" } },
            { referenceNumber: { contains: q, mode: "insensitive" } },
            { remarks: { contains: q, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [agg, txsAsc] = accountNumber
    ? await Promise.all([
        prismaWithRetry((p) =>
          p.transaction.aggregate({
            where: { accountNumber },
            _sum: { debit: true, credit: true }
          })
        ),
        prismaWithRetry((p) =>
          p.transaction.findMany({
            where,
            orderBy: [{ date: "asc" }, { id: "asc" }],
            take: 300
          })
        )
      ])
    : [{ _sum: { debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("0") } } as any, []];

  const totalSales = toDecimal(agg?._sum?.debit);
  const totalPayments = toDecimal(agg?._sum?.credit);
  const pendingAmount = totalSales.minus(totalPayments);
  let running = new Prisma.Decimal("0");
  const ledgerRows = txsAsc
    .map((tx) => {
      running = running.plus(tx.debit).minus(tx.credit);
      return { ...tx, balance: running };
    })
    .reverse();
  const runningBalance = ledgerRows[0]?.balance ?? pendingAmount;

  const defaultFrom = fromParam || dateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const defaultTo = toParam || dateInput(new Date());

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[minmax(260px,1.2fr)_repeat(3,minmax(180px,1fr))]">
        <div className="rounded-lg border border-ebony-100 bg-white p-5 shadow-sm">
          <div className="text-lg font-extrabold text-indigo-900">
            {customer.name} <span className="text-xs font-bold text-ebony-500">({accountNumber || "-"})</span>
          </div>
          <div className="mt-2 space-y-1 text-sm font-semibold text-ebony-700">
            <div>Phone: {customer.phone || "-"}</div>
            <div>Credit Limit: 2,000,000.00</div>
          </div>
        </div>

        <div className="rounded-lg border border-ebony-100 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold text-ebony-600">Total Sales</div>
          <div className="mt-4 text-xl font-extrabold tabular-nums text-ebony-900">{formatMoney(totalSales)}</div>
        </div>

        <div className="rounded-lg border border-ebony-100 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold text-ebony-600">Total Payments</div>
          <div className="mt-4 text-xl font-extrabold tabular-nums text-ebony-900">{formatMoney(totalPayments)}</div>
        </div>

        <div className="rounded-lg border border-ebony-100 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold text-ebony-600">Pending Amount</div>
          <div className="mt-4 text-2xl font-extrabold tabular-nums text-red-600">{formatMoney(pendingAmount)}</div>
        </div>
      </section>

      <form className="flex flex-wrap items-end justify-center gap-4 rounded-lg border border-ebony-100 bg-white p-4 shadow-sm">
        <label className="space-y-1.5 text-sm">
          <div className="text-xs font-bold text-ebony-700">From</div>
          <input
            type="date"
            name="from"
            defaultValue={defaultFrom}
            className="h-10 w-40 rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <div className="text-xs font-bold text-ebony-700">To</div>
          <input
            type="date"
            name="to"
            defaultValue={defaultTo}
            className="h-10 w-40 rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          />
        </label>
        <label className="relative space-y-1.5 text-sm">
          <div className="text-xs font-bold text-ebony-700">Search</div>
          <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-ebony-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search..."
            className="h-10 w-64 rounded-md border border-ebony-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-ebony-100 px-5 text-sm font-bold text-ebony-800 hover:bg-ebony-200"
        >
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </form>

      <section className="overflow-hidden rounded-lg border border-ebony-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-ebony-50 text-left text-xs font-bold text-ebony-700">
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Ref No</th>
                <th className="px-5 py-4">Particulars</th>
                <th className="px-5 py-4 text-right">Debit (LKR)</th>
                <th className="px-5 py-4 text-right">Credit (LKR)</th>
                <th className="px-5 py-4 text-right">Balance (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {ledgerRows.map((tx) => (
                <tr key={tx.id} className="bg-white hover:bg-ebony-50/70">
                  <td className="px-5 py-3 tabular-nums text-ebony-700">{formatDate(tx.date)}</td>
                  <td className="px-5 py-3 font-semibold tabular-nums text-ebony-800">{tx.referenceNumber || "-"}</td>
                  <td className="px-5 py-3 text-ebony-700">{tx.memo || tx.remarks || tx.source || "-"}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-ebony-900">
                    {formatMoney(tx.debit)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-ebony-900">
                    {formatMoney(tx.credit)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-ebony-900">
                    {formatMoney(tx.balance)}
                  </td>
                </tr>
              ))}
              {ledgerRows.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-ebony-600" colSpan={6}>
                    No ledger transactions found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-center justify-end gap-10 rounded-lg bg-white px-6 py-5 shadow-sm">
        <span className="text-sm font-bold text-ebony-800">Running Balance</span>
        <span className="text-2xl font-extrabold tabular-nums text-red-600">{formatMoney(runningBalance)}</span>
      </div>
    </div>
  );
}

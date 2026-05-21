import { Prisma } from "@/lib/generated/prisma";
import { prismaWithRetry } from "@/lib/prisma";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

function toDecimal(value: unknown) {
  if (value instanceof Prisma.Decimal) return value;
  if (value && typeof (value as any).toString === "function") return new Prisma.Decimal((value as any).toString());
  return new Prisma.Decimal("0");
}

function fmt(value: unknown) {
  const n = Number(toDecimal(value).toString());
  if (!Number.isFinite(n)) return "0.000";
  return n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function money(value: unknown) {
  const n = Number(toDecimal(value).toString());
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function GoldsmithTrackingPage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code);

  const [goldsmith, rows] = await Promise.all([
    prismaWithRetry((p) => p.goldsmith.findUnique({ where: { code } })),
    prismaWithRetry((p) =>
      p.stockMaster.findMany({
        where: { gsmCode: code },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 200
      })
    )
  ]);

  if (!goldsmith) {
    return (
      <div className="rounded-lg border border-ebony-100 bg-white p-6 text-sm font-semibold text-ebony-700 shadow-sm">
        Goldsmith not found.
      </div>
    );
  }

  const total = rows.reduce(
    (acc, row) => {
      acc.goldGiven = acc.goldGiven.plus(row.goldWeight);
      acc.returned = acc.returned.plus(row.soldGoldWeight);
      acc.wastage = acc.wastage.plus(row.wastageMg);
      acc.pending = acc.pending.plus(row.balanceGoldWeight);
      acc.labour = acc.labour.plus(row.labourCharges);
      return acc;
    },
    {
      goldGiven: new Prisma.Decimal("0"),
      returned: new Prisma.Decimal("0"),
      wastage: new Prisma.Decimal("0"),
      pending: new Prisma.Decimal("0"),
      labour: new Prisma.Decimal("0")
    }
  );

  const status = total.pending.gt(0) ? "Pending" : "Completed";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/stock/receipts/new"
          className={buttonClassName("primary", "px-5 py-2.5")}
        >
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
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">{fmt(total.goldGiven)}</td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">{fmt(total.returned)}</td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">{fmt(total.wastage)}</td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">{fmt(total.pending)}</td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-ebony-800">{money(total.labour)}</td>
                <td className="px-4 py-4">
                  <span
                    className={
                      status === "Pending"
                        ? "rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700"
                        : "rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700"
                    }
                  >
                    {status}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <Link
                    href="/stock/receipts/new"
                    className={buttonClassName("secondary", "h-8 w-8 px-0 py-0 text-ebony-500")}
                    aria-label="Add entry"
                    title="Add entry"
                  >
                    <Plus className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
              <tr className="bg-ebony-50 font-extrabold">
                <td className="px-4 py-4 text-ebony-900">Total</td>
                <td className="px-4 py-4 text-right tabular-nums text-ebony-900">{fmt(total.goldGiven)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-ebony-900">{fmt(total.returned)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-ebony-900">{fmt(total.wastage)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-ebony-900">{fmt(total.pending)}</td>
                <td className="px-4 py-4 text-right tabular-nums text-ebony-900">{money(total.labour)}</td>
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
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-ebony-50 text-left text-xs font-bold text-ebony-700">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Given</th>
                <th className="px-4 py-3 text-right">Returned</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3 text-right">Labour</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {rows.map((row) => (
                <tr key={row.id} className="bg-white">
                  <td className="px-4 py-3 tabular-nums text-ebony-700">
                    {new Date(row.transactionDate).toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-ebony-800">
                    <div className="font-semibold">{row.subcategoryName}</div>
                    <div className="text-xs text-ebony-500">{row.carat || "-"}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{fmt(row.goldWeight)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{fmt(row.soldGoldWeight)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{fmt(row.balanceGoldWeight)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ebony-800">{money(row.labourCharges)}</td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/stock/receipts/${row.id}`}
                      className={buttonClassName("secondary", "h-8 w-8 px-0 py-0 text-ebony-500")}
                      aria-label="View entry"
                      title="View entry"
                    >
                      <Trash2 className="h-4 w-4" />
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Prisma } from "@/lib/generated/prisma";
import { prismaWithRetry } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CustomerAccountPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Account</CardTitle>
          <CardDescription>Invalid id.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const customer = await prismaWithRetry((p) => p.customer.findUnique({ where: { id } }));
  if (!customer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Account</CardTitle>
          <CardDescription>Not found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const accountNumber = (customer.accountNumber ?? "").trim();
  const [agg, txs] = accountNumber
    ? await Promise.all([
        prismaWithRetry((p) =>
          p.transaction.aggregate({
            where: { accountNumber },
            _sum: { debit: true, credit: true }
          })
        ),
        prismaWithRetry((p) =>
          p.transaction.findMany({
            where: { accountNumber },
            orderBy: [{ date: "desc" }, { id: "desc" }],
            take: 200
          })
        )
      ])
    : [{ _sum: { debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("0") } } as any, []];

  const debit = (agg?._sum?.debit as Prisma.Decimal | null) ?? new Prisma.Decimal("0");
  const credit = (agg?._sum?.credit as Prisma.Decimal | null) ?? new Prisma.Decimal("0");
  const balance = debit.minus(credit);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/customers"
          className="rounded-lg border border-ebony-300 bg-white px-5 py-2.5 text-sm font-semibold text-ebony-700 hover:bg-ebony-50 transition-all"
        >
          Back to Customers
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{customer.name}</CardTitle>
          <CardDescription>
            Account #: {accountNumber || "â€”"}
            {customer.phone ? ` â€¢ ${customer.phone}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-ebony-100 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Debit</div>
              <div className="mt-1 text-xl font-extrabold text-ebony-900 tabular-nums">{debit.toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-ebony-100 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Credit</div>
              <div className="mt-1 text-xl font-extrabold text-ebony-900 tabular-nums">{credit.toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-ebony-100 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Balance</div>
              <div className="mt-1 text-xl font-extrabold text-ebony-900 tabular-nums">{balance.toFixed(2)}</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-ebony-100 bg-white">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Memo</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {txs.map((t) => (
                  <tr key={t.id} className="bg-white">
                    <td className="px-4 py-3 text-ebony-700 tabular-nums">{new Date(t.date).toISOString().slice(0, 10)}</td>
                    <td className="px-4 py-3 text-ebony-700">{t.source ?? "â€”"}</td>
                    <td className="px-4 py-3 font-semibold text-ebony-900 tabular-nums">{t.referenceNumber ?? "â€”"}</td>
                    <td className="px-4 py-3 text-ebony-700">{t.memo ?? "â€”"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ebony-900 tabular-nums">{t.debit.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ebony-900 tabular-nums">{t.credit.toFixed(2)}</td>
                  </tr>
                ))}
                {txs.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-ebony-600" colSpan={6}>
                      No transactions.
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


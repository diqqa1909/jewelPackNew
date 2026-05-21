import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function fmtMoney(v: any) {
  const n = Number(v?.toString?.() ?? 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function AccountsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const accountNumber = typeof sp.account === "string" ? sp.account.trim() : "";

  const rows = await prismaWithRetry((p) =>
    p.transaction.findMany({
      where: accountNumber ? { accountNumber } : undefined,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 200
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
        <CardDescription>
          Recent transactions {accountNumber ? `for account ${accountNumber}` : "(all accounts)"}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border border-ebony-100">
          <table className="w-full text-sm">
            <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Account</th>
                <th className="px-5 py-4">Memo</th>
                <th className="px-5 py-4 text-right">Debit</th>
                <th className="px-5 py-4 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {rows.map((r) => (
                <tr key={r.id} className="bg-white hover:bg-ebony-50 transition-colors">
                  <td className="px-5 py-4 text-ebony-700 tabular-nums">
                    {new Date(r.date).toISOString().slice(0, 10)}
                  </td>
                  <td className="px-5 py-4 text-ebony-700">
                    <div className="font-semibold text-ebony-900">{r.accountNumber ?? "—"}</div>
                    <div className="text-xs text-ebony-600">{r.account ?? r.source ?? "—"}</div>
                  </td>
                  <td className="px-5 py-4 text-ebony-700">{r.memo ?? r.remarks ?? "—"}</td>
                  <td className="px-5 py-4 text-right font-medium text-ebony-900 tabular-nums">
                    {fmtMoney(r.debit)}
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-ebony-900 tabular-nums">
                    {fmtMoney(r.credit)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={5}>
                    No transactions found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}


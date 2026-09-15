import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { accountChartCode } from "@/lib/account-chart";
import { prismaWithRetry } from "@/lib/prisma";
import { AccountsClient } from "@/components/app/AccountsClient";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [customers, suppliers, ledgerAccounts, chartRows, transactions] = await Promise.all([
    prismaWithRetry((p) =>
      p.customer.findMany({
        orderBy: [{ name: "asc" }],
        take: 500
      })
    ),
    prismaWithRetry((p) =>
      p.supplier.findMany({
        orderBy: [{ name: "asc" }],
        take: 500
      })
    ),
    prismaWithRetry((p) =>
      p.generalLedgerAccount.findMany({
        orderBy: [{ name: "asc" }],
        take: 500
      })
    ),
    prismaWithRetry((p) =>
      p.chart.findMany({
        orderBy: [{ rangeStart: "asc" }],
        select: { code: true, name: true, rangeStart: true, rangeEnd: true }
      })
    ),
    prismaWithRetry((p) =>
      p.transaction.findMany({
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 1000
      })
    )
  ]);

  const chartByCode = new Map(chartRows.map((row) => [row.code, row]));
  const ledgerAccountsWithChart = ledgerAccounts.map((account) => {
    const chart = chartByCode.get(accountChartCode(account.accountNumber) ?? "");
    return {
      ...account,
      chartName: chart ? `${chart.name} (${chart.rangeStart}-${chart.rangeEnd})` : null
    };
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>Select an account to view its transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <AccountsClient
            customers={customers}
            suppliers={suppliers}
            ledgerAccounts={ledgerAccountsWithChart}
            transactions={transactions}
          />
        </CardContent>
      </Card>
    </div>
  );
}

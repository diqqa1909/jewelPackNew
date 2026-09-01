import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { prismaWithRetry } from "@/lib/prisma";
import { AccountsClient } from "@/components/app/AccountsClient";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [customers, suppliers, ledgerAccounts, transactions] = await Promise.all([
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
      p.transaction.findMany({
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 1000
      })
    )
  ]);

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
            ledgerAccounts={ledgerAccounts}
            transactions={transactions}
          />
        </CardContent>
      </Card>
    </div>
  );
}

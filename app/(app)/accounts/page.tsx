import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { prismaWithRetry } from "@/lib/prisma";
import { AccountsClient } from "@/components/app/AccountsClient";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [customers, transactions] = await Promise.all([
    prismaWithRetry((p) =>
      p.customer.findMany({
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
          <CardDescription>Select a customer to view their transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <AccountsClient customers={customers} transactions={transactions} />
        </CardContent>
      </Card>
    </div>
  );
}


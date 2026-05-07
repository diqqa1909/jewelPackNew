import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { CustomersTable } from "@/components/app/CustomersTable";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prismaWithRetry((p) => p.customer.findMany({ orderBy: { createdAt: "desc" } }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customers</CardTitle>
        <CardDescription>Manage customers used in Sales receipts.</CardDescription>
      </CardHeader>
      <CardContent>
        <CustomersTable initial={customers} />
      </CardContent>
    </Card>
  );
}


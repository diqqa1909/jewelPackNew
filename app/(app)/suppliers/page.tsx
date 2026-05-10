import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { SuppliersTable } from "@/components/app/SuppliersTable";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await prismaWithRetry((p) => p.supplier.findMany({ orderBy: { createdAt: "desc" } }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suppliers</CardTitle>
        <CardDescription>Vendor directory for metals and gemstones.</CardDescription>
      </CardHeader>
      <CardContent>
        <SuppliersTable initial={suppliers} />
      </CardContent>
    </Card>
  );
}

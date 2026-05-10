import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { prismaWithRetry } from "@/lib/prisma";
import { SalesAnalysisClient } from "@/components/app/SalesAnalysisClient";

export const dynamic = "force-dynamic";

export default async function SalesAnalysisPage() {
  const [categories, subcategories, customers, salesmen] = await Promise.all([
    prismaWithRetry((p) => p.category.findMany({ orderBy: [{ code: "asc" }] })),
    prismaWithRetry((p) => p.subcategory.findMany({ orderBy: [{ code: "asc" }] })),
    prismaWithRetry((p) => p.customer.findMany({ orderBy: [{ name: "asc" }] })),
    prismaWithRetry((p) => p.salesman.findMany({ orderBy: [{ name: "asc" }] }))
  ]);

  return (
    <Card className="max-w-6xl">
      <CardHeader>
        <CardTitle>Sales Analysis</CardTitle>
        <CardDescription>Analyze invoice totals by category, subcategory, customer, and salesman.</CardDescription>
      </CardHeader>
      <CardContent>
        <SalesAnalysisClient
          categories={categories.map((c) => ({ code: c.code, name: c.name }))}
          subcategories={subcategories.map((s) => ({ code: s.code, name: s.name }))}
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          salesmen={salesmen.map((s) => ({ id: s.id, name: s.name }))}
        />
      </CardContent>
    </Card>
  );
}


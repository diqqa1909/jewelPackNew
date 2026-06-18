import { ReportsClient } from "@/components/app/ReportsClient";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [categories, subcategories, customers, suppliers, goldsmiths, salesmen] = await Promise.all([
    prismaWithRetry((p) => p.category.findMany({ orderBy: [{ code: "asc" }] })),
    prismaWithRetry((p) => p.subcategory.findMany({ orderBy: [{ code: "asc" }] })),
    prismaWithRetry((p) => p.customer.findMany({ orderBy: [{ name: "asc" }] })),
    prismaWithRetry((p) => p.supplier.findMany({ orderBy: [{ name: "asc" }] })),
    prismaWithRetry((p) => p.goldsmith.findMany({ orderBy: [{ name: "asc" }] })),
    prismaWithRetry((p) => p.salesman.findMany({ orderBy: [{ name: "asc" }] }))
  ]);

  return (
    <ReportsClient
      categories={categories.map((c) => ({ code: c.code, name: c.name }))}
      subcategories={subcategories.map((s) => ({ code: s.code, name: s.name }))}
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      goldsmiths={goldsmiths.map((g) => ({ code: g.code, name: g.name }))}
      salesmen={salesmen.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}

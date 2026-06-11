import { CustomersTable } from "@/components/app/CustomersTable";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prismaWithRetry((p) => p.customer.findMany({ orderBy: { createdAt: "desc" } }));

  return <CustomersTable initial={customers} />;
}

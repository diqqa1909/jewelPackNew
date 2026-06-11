import { SalesmenTable } from "@/components/app/SalesmenTable";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SalesmenPage() {
  const salesmen = await prismaWithRetry((p) => p.salesman.findMany({ orderBy: [{ code: "asc" }, { id: "asc" }] }));

  return (
    <SalesmenTable initial={salesmen.map((s) => ({ id: s.id, code: s.code, name: s.name }))} />
  );
}

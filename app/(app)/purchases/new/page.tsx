import { PurchaseEntryForm } from "@/components/app/PurchaseEntryForm";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage({
  searchParams
}: {
  searchParams?: { supplierId?: string };
}) {
  const suppliers = await prismaWithRetry((p) => p.supplier.findMany({ orderBy: { name: "asc" } }));
  const supplierId = Number(searchParams?.supplierId);

  return (
    <PurchaseEntryForm
      initialSupplierId={Number.isFinite(supplierId) ? supplierId : undefined}
      suppliers={suppliers.map((s) => ({
        id: s.id,
        name: s.name
      }))}
    />
  );
}

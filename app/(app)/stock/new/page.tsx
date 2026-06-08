import { prismaWithRetry } from "@/lib/prisma";
import { ReceiptForm } from "@/components/app/ReceiptForm";

export default async function NewStockPage() {
  // Load initial data for the form
  const [goldsmiths, categories, subcategories] = await Promise.all([
    prismaWithRetry((p) => p.goldsmith.findMany({ orderBy: { code: "asc" } })),
    prismaWithRetry((p) => p.category.findMany({ orderBy: { code: "asc" } })),
    prismaWithRetry((p) => p.subcategory.findMany({ orderBy: { code: "asc" } }))
  ]);

  return (
    <ReceiptForm
      mode="create"
      title="Add New Stock"
      description="Record a new stock receipt or inventory addition"
      submitLabel="Add Stock"
      redirectPath="/stock"
    />
  );
}


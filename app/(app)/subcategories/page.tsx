import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { SubcategoriesTable } from "@/components/app/SubcategoriesTable";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SubcategoriesPage() {
  const [categories, subcategories] = await Promise.all([
    prismaWithRetry((p) => p.category.findMany({ orderBy: { code: "asc" } })),
    prismaWithRetry((p) => p.subcategory.findMany({ orderBy: [{ categoryCode: "asc" }, { code: "asc" }] }))
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subcategories</CardTitle>
        <CardDescription>Create subcategories under categories and upload an image.</CardDescription>
      </CardHeader>
      <CardContent>
        <SubcategoriesTable
          initial={subcategories.map((s) => ({
            code: s.code,
            name: s.name,
            categoryCode: s.categoryCode,
            imageUrl: s.imageUrl ?? ""
          }))}
          categories={categories.map((c) => ({ code: c.code, name: c.name }))}
        />
      </CardContent>
    </Card>
  );
}

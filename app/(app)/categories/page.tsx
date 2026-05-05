import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { CategoriesTable } from "@/components/app/CategoriesTable";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prismaWithRetry((p) =>
    p.category.findMany({
      orderBy: { code: "asc" }
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <CardDescription>Manage category codes and names.</CardDescription>
      </CardHeader>
      <CardContent>
        <CategoriesTable initial={categories} />
      </CardContent>
    </Card>
  );
}

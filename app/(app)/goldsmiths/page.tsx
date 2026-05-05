import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { GoldsmithsTable } from "@/components/app/GoldsmithsTable";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GoldsmithsPage() {
  const goldsmiths = await prismaWithRetry((p) =>
    p.goldsmith.findMany({
      orderBy: { code: "asc" }
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goldsmiths</CardTitle>
        <CardDescription>Manage GSM codes and names.</CardDescription>
      </CardHeader>
      <CardContent>
        <GoldsmithsTable initial={goldsmiths} />
      </CardContent>
    </Card>
  );
}

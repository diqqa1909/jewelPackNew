import { GoldsmithsTable } from "@/components/app/GoldsmithsTable";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GoldsmithsPage() {
  const goldsmiths = await prismaWithRetry((p) =>
    p.goldsmith.findMany({
      orderBy: { code: "asc" }
    })
  );

  return <GoldsmithsTable initial={goldsmiths} />;
}

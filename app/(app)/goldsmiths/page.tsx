import { GoldsmithsTable } from "@/components/app/GoldsmithsTable";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function realGoldWeight(goldWeight: unknown, wastageMg: unknown, carat: string | null) {
  const karatValue = Number.parseFloat(carat ?? "") || 0;
  return ((Number(goldWeight) + Number(wastageMg) / 1000) / 24) * karatValue;
}

export default async function GoldsmithsPage() {
  const [goldsmiths, goldIssues, purchases] = await Promise.all([
    prismaWithRetry((p) => p.goldsmith.findMany({ orderBy: { code: "asc" } })),
    prismaWithRetry((p) => p.goldIssue.findMany({ select: { goldsmithCode: true, issueType: true, goldWeight: true, cashAmount: true } })),
    prismaWithRetry((p) =>
      p.purchase.findMany({
        where: { gsmCode: { not: null } },
        select: {
          gsmCode: true,
          purchaseType: true,
          goldWeight: true,
          wastageMg: true,
          carat: true,
          labourCharges: true,
          totalCost: true,
          paidAmount: true
        }
      })
    )
  ]);

  const balances = new Map<string, { goldDr: number; goldCr: number; cashDr: number; cashCr: number }>();
  for (const issue of goldIssues) {
    const current = balances.get(issue.goldsmithCode) ?? { goldDr: 0, goldCr: 0, cashDr: 0, cashCr: 0 };
    if ((issue.issueType ?? "GOLD") === "CASH") {
      current.cashDr += Number(issue.cashAmount);
    } else {
      current.goldDr += Number(issue.goldWeight);
    }
    balances.set(issue.goldsmithCode, current);
  }
  for (const purchase of purchases) {
    if (!purchase.gsmCode) continue;
    const current = balances.get(purchase.gsmCode) ?? { goldDr: 0, goldCr: 0, cashDr: 0, cashCr: 0 };
    current.cashDr += Number(purchase.paidAmount);
    if (purchase.purchaseType.trim().toLowerCase() === "rate") {
      current.cashCr += Number(purchase.totalCost);
    } else {
      current.goldCr += realGoldWeight(purchase.goldWeight, purchase.wastageMg, purchase.carat);
      current.cashCr += Number(purchase.labourCharges);
    }
    balances.set(purchase.gsmCode, current);
  }

  const rows = goldsmiths.map((goldsmith) => {
    const values = balances.get(goldsmith.code) ?? { goldDr: 0, goldCr: 0, cashDr: 0, cashCr: 0 };
    return {
      ...goldsmith,
      ...values,
      goldBl: values.goldDr - values.goldCr,
      cashBl: values.cashCr - values.cashDr
    };
  });

  return <GoldsmithsTable initial={rows} />;
}

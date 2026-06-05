import { PrismaClient } from "@/lib/generated/prisma";

export type InventoryBalanceRow = {
  subcategoryCode: string;
  carat: string;
  balanceQty: number;
  balanceGoldWeight: string;
};

export function normalizeCarat(value: string | null | undefined) {
  const raw = (value ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return "";
  return raw.endsWith("KT") ? raw.slice(0, -1) : raw;
}

export async function getInventoryBalanceRows(prisma: PrismaClient): Promise<InventoryBalanceRow[]> {
  const [purchases, sales] = await Promise.all([
    prisma.purchase.findMany({
      select: {
        subcategoryCode: true,
        carat: true,
        qty: true,
        goldWeight: true
      }
    }),
    prisma.sale.findMany({
      select: {
        subcategoryCode: true,
        carat: true,
        qty: true,
        goldWeight: true
      }
    })
  ]);

  const rows = new Map<string, { subcategoryCode: string; carat: string; balanceQty: number; balanceGoldWeight: number }>();

  for (const row of purchases) {
    const code = (row.subcategoryCode ?? "").trim();
    if (!code) continue;
    const carat = normalizeCarat(row.carat);
    const key = `${code}||${carat}`;
    const current = rows.get(key) ?? { subcategoryCode: code, carat, balanceQty: 0, balanceGoldWeight: 0 };
    current.balanceQty += Number(row.qty ?? 0);
    current.balanceGoldWeight += Number(row.goldWeight?.toString?.() ?? 0);
    rows.set(key, current);
  }

  for (const row of sales) {
    const code = (row.subcategoryCode ?? "").trim();
    if (!code) continue;
    const carat = normalizeCarat(row.carat);
    const key = `${code}||${carat}`;
    const current = rows.get(key) ?? { subcategoryCode: code, carat, balanceQty: 0, balanceGoldWeight: 0 };
    current.balanceQty -= Number(row.qty ?? 0);
    current.balanceGoldWeight -= Number(row.goldWeight?.toString?.() ?? 0);
    rows.set(key, current);
  }

  return Array.from(rows.values()).map((row) => ({
    subcategoryCode: row.subcategoryCode,
    carat: row.carat,
    balanceQty: Math.max(0, row.balanceQty),
    balanceGoldWeight: Math.max(0, row.balanceGoldWeight).toString()
  }));
}

import type { Subcategory } from "@/lib/generated/prisma";
import { normalizeCarat } from "@/lib/inventory-balance";

export type CategoryStockRow = {
  categoryCode: string;
  categoryName: string;
  purchasedQty: number;
  soldQty: number;
  availableQty: number;
};

export type SubcategoryStockRow = {
  categoryCode: string;
  categoryName: string;
  subcategoryCode: string;
  subcategoryName: string;
  carat: string;
  purchasedQty: number;
  soldQty: number;
  availableQty: number;
  purchasedGoldWeight: number;
  soldGoldWeight: number;
  availableGoldWeight: number;
};

export function buildInventorySummary({
  categories,
  subcategories,
  purchases,
  sales
}: {
  categories: Array<{ code: string; name: string }>;
  subcategories: Subcategory[];
  purchases: Array<{
    categoryCode: string | null;
    articleName: string | null;
    subcategoryCode: string | null;
    subcategoryName: string | null;
    carat: string | null;
    qty: number | null;
    goldWeight: { toString(): string } | null;
  }>;
  sales: Array<{
    subcategoryCode: string | null;
    carat: string | null;
    qty: number | null;
    goldWeight: { toString(): string } | null;
  }>;
}) {
  const categoryByCode = new Map(categories.map((c) => [c.code, c.name]));
  const subcategoryByCode = new Map(
    subcategories.map((s) => [
      s.code,
      { name: s.name, categoryCode: s.categoryCode, carat: normalizeCarat(s.carat) }
    ])
  );

  const categoryMap = new Map<string, CategoryStockRow>();
  const subcategoryMap = new Map<string, SubcategoryStockRow>();

  for (const c of categories) {
    categoryMap.set(c.code, {
      categoryCode: c.code,
      categoryName: c.name,
      purchasedQty: 0,
      soldQty: 0,
      availableQty: 0
    });
  }

  for (const p of purchases) {
    const categoryCode = (p.categoryCode ?? "").trim();
    if (categoryCode) {
      const current = categoryMap.get(categoryCode) ?? {
        categoryCode,
        categoryName: categoryByCode.get(categoryCode) ?? p.articleName ?? categoryCode,
        purchasedQty: 0,
        soldQty: 0,
        availableQty: 0
      };
      current.purchasedQty += Number(p.qty ?? 0);
      categoryMap.set(categoryCode, current);
    }

    const subcategoryCode = (p.subcategoryCode ?? "").trim();
    if (!subcategoryCode) continue;
    const sub = subcategoryByCode.get(subcategoryCode);
    const carat = normalizeCarat(p.carat) || sub?.carat || "";
    const key = `${subcategoryCode}||${carat}`;
    const current = subcategoryMap.get(key) ?? {
      categoryCode: sub?.categoryCode ?? categoryCode,
      categoryName: categoryByCode.get(sub?.categoryCode ?? categoryCode) ?? p.articleName ?? categoryCode,
      subcategoryCode,
      subcategoryName: p.subcategoryName ?? sub?.name ?? subcategoryCode,
      carat,
      purchasedQty: 0,
      soldQty: 0,
      availableQty: 0,
      purchasedGoldWeight: 0,
      soldGoldWeight: 0,
      availableGoldWeight: 0
    };
    current.purchasedQty += Number(p.qty ?? 0);
    current.purchasedGoldWeight += Number(p.goldWeight?.toString?.() ?? 0);
    subcategoryMap.set(key, current);
  }

  for (const s of sales) {
    const subcategoryCode = (s.subcategoryCode ?? "").trim();
    if (!subcategoryCode) continue;
    const sub = subcategoryByCode.get(subcategoryCode);
    const carat = normalizeCarat(s.carat) || sub?.carat || "";
    const key = `${subcategoryCode}||${carat}`;
    const current = subcategoryMap.get(key) ?? {
      categoryCode: sub?.categoryCode ?? "",
      categoryName: categoryByCode.get(sub?.categoryCode ?? "") ?? sub?.categoryCode ?? "",
      subcategoryCode,
      subcategoryName: sub?.name ?? subcategoryCode,
      carat,
      purchasedQty: 0,
      soldQty: 0,
      availableQty: 0,
      purchasedGoldWeight: 0,
      soldGoldWeight: 0,
      availableGoldWeight: 0
    };
    current.soldQty += Number(s.qty ?? 0);
    current.soldGoldWeight += Number(s.goldWeight?.toString?.() ?? 0);
    subcategoryMap.set(key, current);
  }

  const subcategoryRows = Array.from(subcategoryMap.values())
    .map((row) => ({
      ...row,
      availableQty: Math.max(0, row.purchasedQty - row.soldQty),
      availableGoldWeight: Math.max(0, row.purchasedGoldWeight - row.soldGoldWeight)
    }))
    .sort((a, b) =>
      a.categoryCode === b.categoryCode
        ? a.subcategoryCode.localeCompare(b.subcategoryCode)
        : a.categoryCode.localeCompare(b.categoryCode)
    );

  const categoryRows = Array.from(categoryMap.values())
    .map((row) => ({
      ...row,
      availableQty: Math.max(0, row.purchasedQty - row.soldQty)
    }))
    .sort((a, b) => a.categoryCode.localeCompare(b.categoryCode));

  return { categoryRows, subcategoryRows };
}

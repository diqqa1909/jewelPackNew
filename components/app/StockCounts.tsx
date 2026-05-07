"use client";

import type { Subcategory } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

type CategoryCount = {
  categoryCode: string;
  categoryName: string;
  arrivedQty: number;
  arrivedGoldWeight: string;
  arrivedTotalCost: string;
  balanceQty: number;
  balanceGoldWeight: string;
  balanceCost: string;
  soldQty: number;
  soldGoldWeight: string;
  soldCost: string;
};
type SubcategoryCount = {
  categoryCode: string;
  subcategoryCode: string;
  subcategoryName: string;
  arrivedQty: number;
  arrivedGoldWeight: string;
  arrivedTotalCost: string;
  balanceQty: number;
  balanceGoldWeight: string;
  balanceCost: string;
  soldQty: number;
  soldGoldWeight: string;
  soldCost: string;
};

export function StockCounts({
  categories,
  subcategories,
  categoryCounts,
  subcategoryCounts
}: {
  categories: Array<{ code: string; name: string }>;
  subcategories: Subcategory[];
  categoryCounts: CategoryCount[];
  subcategoryCounts: SubcategoryCount[];
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const subByCategory = useMemo(() => {
    const map = new Map<string, SubcategoryCount[]>();
    for (const s of subcategoryCounts) {
      const list = map.get(s.categoryCode) ?? [];
      list.push(s);
      map.set(s.categoryCode, list);
    }
    for (const [k, v] of map.entries()) v.sort((a, b) => b.balanceQty - a.balanceQty);
    return map;
  }, [subcategoryCounts]);

  const imageBySubCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subcategories) {
      if (s.imageUrl) map.set(s.code, s.imageUrl);
    }
    return map;
  }, [subcategories]);

  const nameByCategoryCode = useMemo(() => new Map(categories.map((c) => [c.code, c.name])), [categories]);

  return (
    <div className="space-y-4">
      {categoryCounts
        .slice()
        .sort((a, b) => b.balanceQty - a.balanceQty)
        .map((c) => {
          const isOpen = !!open[c.categoryCode];
          const children = subByCategory.get(c.categoryCode) ?? [];
          return (
            <div
              key={c.categoryCode}
              className="overflow-hidden rounded-2xl border border-ebony-100 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => setOpen((p) => ({ ...p, [c.categoryCode]: !isOpen }))}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-cream-50/60 transition-colors"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <div className="rounded-lg bg-ebony-900 px-2.5 py-1 text-xs font-bold tracking-widest text-cream-50">
                      {c.categoryCode}
                    </div>
                    <div className="text-sm font-semibold text-ebony-900">
                      {nameByCategoryCode.get(c.categoryCode) ?? c.categoryName}
                    </div>
                  </div>
                  <div className="text-xs text-ebony-500">{children.length} subcategories</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden text-right sm:block">
                    <div className="flex items-center justify-end gap-2">
                      <div className="rounded-full bg-gold-100 px-3 py-1 text-xs font-bold text-ebony-900">
                        In hand: {c.balanceQty}
                      </div>
                      <div className="rounded-full bg-cream-100 px-3 py-1 text-xs font-bold text-ebony-900">
                        Arrived: {c.arrivedQty}
                      </div>
                      <div className="rounded-full bg-cream-100 px-3 py-1 text-xs font-bold text-ebony-900">
                        Sold: {c.soldQty}
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-ebony-600 transition-transform",
                      isOpen ? "rotate-180" : "rotate-0"
                    )}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-ebony-100 bg-white px-5 py-4">
                  <div className="overflow-x-auto rounded-xl border border-ebony-100">
                    <table className="min-w-[980px] w-full text-sm">
                      <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
                        <tr>
                          <th className="px-4 py-3">Subcategory</th>
                          <th className="px-4 py-3 text-right">Arrived Qty</th>
                          <th className="px-4 py-3 text-right">Arrived Wt</th>
                          <th className="px-4 py-3 text-right">Arrived Cost</th>
                          <th className="px-4 py-3 text-right">In Hand Qty</th>
                          <th className="px-4 py-3 text-right">In Hand Wt</th>
                          <th className="px-4 py-3 text-right">In Hand Cost</th>
                          <th className="px-4 py-3 text-right">Sold Qty</th>
                          <th className="px-4 py-3 text-right">Sold Wt</th>
                          <th className="px-4 py-3 text-right">Sold Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ebony-100 bg-white">
                        {children.map((s) => (
                          <tr key={s.subcategoryCode} className="hover:bg-cream-50/40">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {imageBySubCode.get(s.subcategoryCode) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={imageBySubCode.get(s.subcategoryCode)}
                                    alt={s.subcategoryName}
                                    className="h-9 w-9 flex-none rounded-lg object-cover ring-1 ring-ebony-200"
                                  />
                                ) : (
                                  <div className="h-9 w-9 flex-none rounded-lg bg-ebony-50 ring-1 ring-ebony-200" />
                                )}
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-ebony-900">
                                    {s.subcategoryCode}{" "}
                                    <span className="font-medium text-ebony-600">{s.subcategoryName}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-ebony-900">
                              {s.arrivedQty}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-ebony-700">
                              {Number(s.arrivedGoldWeight ?? 0).toFixed(3)}g
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-ebony-700">
                              {Number(s.arrivedTotalCost ?? 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-ebony-900">
                              {s.balanceQty}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-ebony-700">
                              {Number(s.balanceGoldWeight ?? 0).toFixed(3)}g
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-ebony-700">
                              {Number(s.balanceCost ?? 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-ebony-900">
                              {s.soldQty}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-ebony-700">
                              {Number(s.soldGoldWeight ?? 0).toFixed(3)}g
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-ebony-700">
                              {Number(s.soldCost ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        {children.length === 0 && (
                          <tr>
                            <td className="px-4 py-6 text-sm text-ebony-600" colSpan={10}>
                              No subcategories.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      {categoryCounts.length === 0 && (
        <div className="rounded-lg border border-ebony-100 bg-white px-5 py-8 text-center text-sm text-ebony-600">
          No stock yet.
        </div>
      )}
    </div>
  );
}

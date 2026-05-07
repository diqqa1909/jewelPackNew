"use client";

import type { Subcategory } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

type CategoryCount = { categoryCode: string; categoryName: string; qty: number; goldWeight: string; totalCost: string };
type SubcategoryCount = {
  categoryCode: string;
  subcategoryCode: string;
  subcategoryName: string;
  qty: number;
  goldWeight: string;
  totalCost: string;
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
    for (const [k, v] of map.entries()) v.sort((a, b) => b.qty - a.qty);
    return map;
  }, [subcategoryCounts]);

  const imageBySubCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subcategories) {
      if (s.imageUrl) map.set(s.code, s.imageUrl);
    }
    return map;
  }, [subcategories]);

  const nameByCategoryCode = useMemo(() => {
    return new Map(categories.map((c) => [c.code, c.name]));
  }, [categories]);

  const totals = useMemo(() => {
    const qty = categoryCounts.reduce((acc, c) => acc + (c.qty ?? 0), 0);
    const goldWeight = categoryCounts.reduce((acc, c) => acc + Number(c.goldWeight ?? 0), 0);
    const totalCost = categoryCounts.reduce((acc, c) => acc + Number(c.totalCost ?? 0), 0);
    return { qty, goldWeight, totalCost };
  }, [categoryCounts]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-ebony-100 bg-gradient-to-br from-cream-50 to-white px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Total Qty</div>
          <div className="mt-1 text-2xl font-extrabold text-ebony-900">{totals.qty}</div>
        </div>
        <div className="rounded-2xl border border-ebony-100 bg-gradient-to-br from-cream-50 to-white px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Total Weight</div>
          <div className="mt-1 text-2xl font-extrabold text-ebony-900">{totals.goldWeight.toFixed(3)}g</div>
        </div>
        <div className="rounded-2xl border border-ebony-100 bg-gradient-to-br from-gold-50 to-white px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Total Cost</div>
          <div className="mt-1 text-2xl font-extrabold text-ebony-900">{totals.totalCost.toFixed(2)}</div>
        </div>
      </div>
      {categoryCounts
        .slice()
        .sort((a, b) => b.qty - a.qty)
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
                      <div className="rounded-full bg-cream-100 px-3 py-1 text-xs font-bold text-ebony-900">
                        Qty {c.qty}
                      </div>
                      <div className="rounded-full bg-cream-100 px-3 py-1 text-xs font-bold text-ebony-900">
                        {Number(c.goldWeight ?? 0).toFixed(3)}g
                      </div>
                      <div className="rounded-full bg-gold-100 px-3 py-1 text-xs font-bold text-ebony-900">
                        {Number(c.totalCost ?? 0).toFixed(2)}
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
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {children.map((s) => (
                      <div
                        key={s.subcategoryCode}
                        className="flex items-center gap-3 rounded-2xl border border-ebony-100 bg-gradient-to-br from-ebony-50 to-white px-3 py-3"
                      >
                        {imageBySubCode.get(s.subcategoryCode) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageBySubCode.get(s.subcategoryCode)}
                            alt={s.subcategoryName}
                            className="h-11 w-11 rounded-xl object-cover ring-1 ring-ebony-200"
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-xl bg-white ring-1 ring-ebony-200" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-ebony-900">
                            {s.subcategoryCode}{" "}
                            <span className="font-medium text-ebony-600">
                              {s.subcategoryName}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-cream-100 px-2.5 py-1 text-ebony-800">
                              Qty {s.qty}
                            </span>
                            <span className="rounded-full bg-cream-100 px-2.5 py-1 text-ebony-800">
                              {Number(s.goldWeight ?? 0).toFixed(3)}g
                            </span>
                            <span className="rounded-full bg-gold-100 px-2.5 py-1 text-ebony-800">
                              {Number(s.totalCost ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {children.length === 0 && (
                      <div className="text-sm text-ebony-600">No subcategories.</div>
                    )}
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

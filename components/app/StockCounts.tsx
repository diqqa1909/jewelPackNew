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

  return (
    <div className="space-y-3">
      {categoryCounts
        .slice()
        .sort((a, b) => b.qty - a.qty)
        .map((c) => {
          const isOpen = !!open[c.categoryCode];
          const children = subByCategory.get(c.categoryCode) ?? [];
          return (
            <div
              key={c.categoryCode}
              className="rounded-lg border border-ebony-100 bg-white"
            >
              <button
                type="button"
                onClick={() => setOpen((p) => ({ ...p, [c.categoryCode]: !isOpen }))}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <div>
                  <div className="text-sm font-semibold text-ebony-900">
                    {c.categoryCode}{" "}
                    <span className="text-ebony-600 font-medium">
                      {nameByCategoryCode.get(c.categoryCode) ?? c.categoryName}
                    </span>
                  </div>
                  <div className="text-xs text-ebony-500">
                    {children.length} subcategories
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="rounded-lg bg-cream-100 px-3 py-1 text-sm font-bold text-ebony-900">
                      Qty {c.qty}
                    </div>
                    <div className="mt-1 text-xs text-ebony-600">
                      Wt {c.goldWeight}g · Cost {c.totalCost}
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
                <div className="border-t border-ebony-100 px-5 py-4">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {children.map((s) => (
                      <div
                        key={s.subcategoryCode}
                        className="flex items-center gap-3 rounded-lg border border-ebony-100 bg-ebony-50 px-3 py-2"
                      >
                        {imageBySubCode.get(s.subcategoryCode) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageBySubCode.get(s.subcategoryCode)}
                            alt={s.subcategoryName}
                            className="h-10 w-10 rounded-md object-cover ring-1 ring-ebony-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-white ring-1 ring-ebony-200" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-ebony-900">
                            {s.subcategoryCode}{" "}
                            <span className="font-medium text-ebony-600">
                              {s.subcategoryName}
                            </span>
                          </div>
                          <div className="text-xs text-ebony-500">
                            Qty {s.qty} · Wt {s.goldWeight}g · Cost {s.totalCost}
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

"use client";

import { buttonClassName } from "@/components/ui/Button";
import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronDown, ChevronRight, Plus, Search } from "lucide-react";

type StockRow = {
  categoryCode: string;
  categoryName: string;
  purchasedQty: number;
  soldQty: number;
  availableQty: number;
};

type SubcategoryRow = {
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

type Category = {
  code: string;
  name: string;
};

export function InventoryStockList({
  rows,
  subcategoryRows,
  categories
}: {
  rows: StockRow[];
  subcategoryRows: SubcategoryRow[];
  categories: Category[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (code: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedCategories(newExpanded);
  };

  const totalPurchased = useMemo(() => rows.reduce((sum, row) => sum + row.purchasedQty, 0), [rows]);
  const totalSold = useMemo(() => rows.reduce((sum, row) => sum + row.soldQty, 0), [rows]);
  const totalAvailable = useMemo(() => rows.reduce((sum, row) => sum + row.availableQty, 0), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.categoryCode.toLowerCase().includes(q) ||
        row.categoryName.toLowerCase().includes(q);
      const matchesCategory = category === "All" || row.categoryCode === category;
      return matchesSearch && matchesCategory;
    });
  }, [category, query, rows]);

  const visibleRows = filtered.slice(0, 50);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Purchased Qty" value={totalPurchased} tone="blue" />
        <Stat label="Sold Qty" value={totalSold} tone="amber" />
        <Stat label="Available Qty" value={totalAvailable} tone="emerald" />
      </section>

      <section className="rounded-lg border border-ebony-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ebony-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by category code or name..."
              className="h-10 w-full rounded-md border border-ebony-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </div>

          <label className="space-y-1">
            <span className="text-[11px] font-bold text-ebony-700">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            >
              <option>All</option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <Link href="/purchases/new" className={buttonClassName("primary", "h-10 w-full px-5 xl:w-auto")}>
              <Plus className="h-4 w-4" />
              Add New Purchase
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-ebony-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
              <tr>
                <th className="px-4 py-3 w-12"></th>
                <th className="px-4 py-3">Category Code</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Purchased Qty</th>
                <th className="px-4 py-3 text-right">Sold Qty</th>
                <th className="px-4 py-3 text-right">Available Qty</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {visibleRows.map((row) => {
                const available = row.availableQty > 0;
                const isExpanded = expandedCategories.has(row.categoryCode);
                const categorySubcategories = subcategoryRows.filter(
                  (sub) => sub.categoryCode === row.categoryCode
                );

                return (
                  <tbody key={row.categoryCode}>
                    <tr className="bg-white hover:bg-ebony-50/70">
                      <td className="px-4 py-3">
                        {categorySubcategories.length > 0 && (
                          <button
                            onClick={() => toggleCategory(row.categoryCode)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-ebony-100"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-ebony-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-ebony-600" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-ebony-900">{row.categoryCode}</td>
                      <td className="px-4 py-3 text-ebony-700">{row.categoryName}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-ebony-800">{row.purchasedQty}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-ebony-800">{row.soldQty}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-ebony-900">{row.availableQty}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            available
                              ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700"
                              : "rounded-md bg-ebony-100 px-2 py-1 text-xs font-bold text-ebony-600"
                          }
                        >
                          {available ? "Available" : "Sold Out"}
                        </span>
                      </td>
                    </tr>

                    {isExpanded &&
                      categorySubcategories.map((subRow) => {
                        const subAvailable = subRow.availableQty > 0 || subRow.availableGoldWeight > 0;
                        return (
                          <tr
                            key={`${subRow.subcategoryCode}||${subRow.carat}`}
                            className="bg-ebony-50/50 hover:bg-ebony-50"
                          >
                            <td colSpan={2} className="px-4 py-3">
                              <div className="ml-6 flex items-center gap-2">
                                <div className="text-xs text-ebony-500">→</div>
                                <div>
                                  <div className="font-semibold text-ebony-900">{subRow.subcategoryCode}</div>
                                  <div className="text-xs text-ebony-600">{subRow.subcategoryName}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-semibold text-ebony-700 text-sm">
                              {subRow.carat || "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-ebony-800">{subRow.purchasedQty}</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-ebony-800">{subRow.soldQty}</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-ebony-900">{subRow.availableQty}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={
                                    subAvailable
                                      ? "rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700"
                                      : "rounded-md bg-ebony-100 px-2 py-1 text-[11px] font-bold text-ebony-600"
                                  }
                                >
                                  {subAvailable ? "Available" : "Sold Out"}
                                </span>
                                <span className="text-[10px] text-ebony-600">
                                  Wt: {subRow.availableGoldWeight.toFixed(3)}g
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                );
              })}
              {visibleRows.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-ebony-600" colSpan={7}>
                    No category inventory found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-ebony-600">
          Showing {visibleRows.length} of {filtered.length} categories
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <QuickTile href="/purchases/new" icon={Plus} label="New Purchase" tone="blue" />
        <QuickTile href="/sales/new" icon={BarChart3} label="Sales" tone="green" />
        <QuickTile href="/reports" icon={BarChart3} label="Reports" tone="violet" />
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "blue" | "amber" | "emerald" }) {
  const toneClasses = {
    blue: "border-sky-100 bg-sky-50 text-sky-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700"
  };

  return (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${toneClasses[tone]}`}>
      <div className="text-xs font-bold uppercase tracking-widest">{label}</div>
      <div className="mt-1 text-xl font-extrabold tabular-nums text-ebony-900">{value}</div>
    </div>
  );
}

function QuickTile({
  href,
  icon: Icon,
  label,
  tone
}: {
  href: string;
  icon: typeof Plus;
  label: string;
  tone: "blue" | "green" | "violet";
}) {
  const toneClasses = {
    blue: "bg-sky-50 text-sky-700",
    green: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700"
  };

  return (
    <Link
      href={href}
      className={`flex h-14 items-center justify-between rounded-lg border border-ebony-100 px-4 text-sm font-bold shadow-sm ${toneClasses[tone]}`}
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <ChevronRight className="h-4 w-4 opacity-70" />
    </Link>
  );
}

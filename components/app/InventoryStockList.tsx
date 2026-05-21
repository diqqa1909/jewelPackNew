"use client";

import Link from "next/link";
import { useToast } from "@/components/ui/ToastProvider";
import { useMemo, useState } from "react";
import { buttonClassName } from "@/components/ui/Button";
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit,
  Factory,
  Plus,
  Search,
  Shuffle,
  Trash2
} from "lucide-react";

type StockRow = {
  id: number;
  barcode: string;
  designNo: string;
  categoryCode: string;
  categoryName: string;
  subcategoryName: string;
  karat: string;
  grossWeight: string;
  netWeight: string;
  making: string;
  balanceQty: number;
  updatedAt: string;
};

type Category = {
  code: string;
  name: string;
};

function toNumber(value: string | number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatWeight(value: string | number) {
  return toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
}

function formatMoney(value: string | number) {
  return toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function InventoryStockList({ rows, categories }: { rows: StockRow[]; categories: Category[] }) {
  const toast = useToast();
  const [items, setItems] = useState(rows);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [karat, setKarat] = useState("All");
  const [status, setStatus] = useState("All");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function remove(id: number) {
    const ok = confirm("Delete this stock receipt?");
    if (!ok) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/stock/receipts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((row) => row.id !== id));
      toast.success("Stock item deleted");
    } catch (e) {
      toast.error("Unable to delete stock item", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  const karats = useMemo(() => {
    return Array.from(new Set(items.map((r) => r.karat).filter(Boolean))).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((row) => {
      const rowStatus = row.balanceQty > 0 ? "Available" : "Sold";
      const matchesSearch =
        !q ||
        row.barcode.toLowerCase().includes(q) ||
        row.designNo.toLowerCase().includes(q) ||
        row.categoryName.toLowerCase().includes(q) ||
        row.subcategoryName.toLowerCase().includes(q);
      const matchesCategory = category === "All" || row.categoryCode === category;
      const matchesKarat = karat === "All" || row.karat === karat;
      const matchesStatus = status === "All" || rowStatus === status;
      return matchesSearch && matchesCategory && matchesKarat && matchesStatus;
    });
  }, [category, items, karat, query, status]);

  const visibleRows = filtered.slice(0, 8);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 8));

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-ebony-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_150px_120px_120px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ebony-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by barcode, design no, name..."
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

          <label className="space-y-1">
            <span className="text-[11px] font-bold text-ebony-700">Karat</span>
            <select
              value={karat}
              onChange={(e) => setKarat(e.target.value)}
              className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            >
              <option>All</option>
              {karats.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-bold text-ebony-700">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            >
              <option>All</option>
              <option>Available</option>
              <option>Sold</option>
            </select>
          </label>

          <div className="flex items-end">
            <Link
              href="/stock/receipts/new"
              className={buttonClassName("primary", "h-10 w-full px-5 xl:w-auto")}
            >
              <Plus className="h-4 w-4" />
              Add New Item
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-ebony-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
              <tr>
                <th className="px-4 py-3">Barcode</th>
                <th className="px-4 py-3">Design No</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Karat</th>
                <th className="px-4 py-3 text-right">Gross Wt (g)</th>
                <th className="px-4 py-3 text-right">Net Wt (g)</th>
                <th className="px-4 py-3 text-right">Making</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {visibleRows.map((row) => {
                const available = row.balanceQty > 0;
                return (
                  <tr key={row.id} className="bg-white hover:bg-ebony-50/70">
                    <td className="px-4 py-3 font-semibold tabular-nums text-ebony-900">{row.barcode}</td>
                    <td className="px-4 py-3 text-ebony-700">{row.designNo}</td>
                    <td className="px-4 py-3 text-ebony-700">{row.categoryName}</td>
                    <td className="px-4 py-3 font-semibold text-ebony-800">{row.karat || "-"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ebony-700">{formatWeight(row.grossWeight)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ebony-700">{formatWeight(row.netWeight)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ebony-700">{formatMoney(row.making)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          available
                            ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700"
                            : "rounded-md bg-ebony-100 px-2 py-1 text-xs font-bold text-ebony-600"
                        }
                      >
                        {available ? "Available" : "Sold"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/stock/receipts/${row.id}`}
                          className={buttonClassName("secondary", "h-8 w-8 px-0 py-0 text-ebony-600")}
                          aria-label="Edit item"
                          title="Edit item"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => void remove(row.id)}
                          disabled={busyId === row.id}
                          className={buttonClassName("secondary", "h-8 w-8 px-0 py-0 text-red-600 disabled:opacity-50")}
                          aria-label="Delete item"
                          title="Delete item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-ebony-600" colSpan={9}>
                    No stock items found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-ebony-600">
          Showing 1 to {visibleRows.length} of {filtered.length} items
        </div>
        <div className="flex items-center gap-1">
          <button className={buttonClassName("secondary", "h-8 w-8 px-0 py-0 text-ebony-500")}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          {[1, 2, 3, 4, 5].slice(0, Math.min(5, totalPages)).map((page) => (
            <button
              key={page}
              className={
                page === 1
                  ? buttonClassName("primary", "h-8 w-8 px-0 py-0 text-xs")
                  : buttonClassName("secondary", "h-8 w-8 px-0 py-0 text-xs")
              }
            >
              {page}
            </button>
          ))}
          <button className={buttonClassName("secondary", "h-8 w-8 px-0 py-0 text-ebony-500")}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <QuickTile href="/stock/receipts/new" icon={ClipboardList} label="Stock Adjustment" tone="cyan" />
        <QuickTile href="/stock/receipts/new" icon={Shuffle} label="Stock Transfer" tone="green" />
        <QuickTile href="/stock/system-data" icon={Factory} label="Melting / Scrap" tone="violet" />
        <QuickTile href="/reports" icon={BarChart3} label="Stock Report" tone="blue" />
      </section>
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
  icon: typeof Boxes;
  label: string;
  tone: "cyan" | "green" | "violet" | "blue";
}) {
  const toneClasses = {
    cyan: "bg-cyan-50 text-cyan-700",
    green: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
    blue: "bg-sky-50 text-sky-700"
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

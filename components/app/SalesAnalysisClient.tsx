"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Modal } from "@/components/ui/Modal";

type Opt = { code: string; name: string };
type CustomerOpt = { id: number; name: string };
type PersonOpt = { id: number; name: string };

type Row = {
  key: string;
  label: string;
  invoices: number;
  qty: number;
  weight: number;
  amount: number;
  cost: number;
  profit: number;
  profitPct: number;
};

type GroupBy = "category" | "subcategory" | "customer" | "salesman";
type ChartType = "none" | "bar" | "pie";

export function SalesAnalysisClient({
  categories,
  subcategories,
  customers,
  salesmen
}: {
  categories: Opt[];
  subcategories: Opt[];
  customers: CustomerOpt[];
  salesmen: PersonOpt[];
}) {
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [subcategoryCode, setSubcategoryCode] = useState("");
  const [customerId, setCustomerId] = useState<number | "">("");
  const [salesmanId, setSalesmanId] = useState<number | "">("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState<ChartType>("none");
  const [topN, setTopN] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("groupBy", groupBy);
    if (dateFrom) sp.set("dateFrom", dateFrom);
    if (dateTo) sp.set("dateTo", dateTo);
    if (categoryCode) sp.set("categoryCode", categoryCode);
    if (subcategoryCode) sp.set("subcategoryCode", subcategoryCode);
    if (typeof customerId === "number") sp.set("customerId", String(customerId));
    if (typeof salesmanId === "number") sp.set("salesmanId", String(salesmanId));
    return sp.toString();
  }, [groupBy, dateFrom, dateTo, categoryCode, subcategoryCode, customerId, salesmanId]);

  useEffect(() => {
    let active = true;
    (async () => {
      setBusy(true);
      setError("");
      try {
        const res = await fetch(`/api/reports/sales-analysis?${query}`, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as { error?: string; rows?: Row[] } | null;
        if (!res.ok) throw new Error(json?.error ?? "Unable to load report");
        if (!active) return;
        setRows(json?.rows ?? []);
      } catch (e) {
        if (!active) return;
        setRows([]);
        setError(e instanceof Error ? e.message : "Unable to load report");
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [query]);

  const chartRows = useMemo(() => {
    const n = Math.max(3, Math.min(50, Math.floor(topN || 10)));
    const top = [...rows].slice(0, n);
    if (chartType !== "pie") return top;
    // For pie, group remaining into "Others" to keep it readable.
    const rest = rows.slice(n);
    if (rest.length === 0) return top;
    const othersAmount = rest.reduce((sum, r) => sum + (Number.isFinite(r.amount) ? r.amount : 0), 0);
    if (othersAmount <= 0) return top;
    return [...top, { key: "OTHERS", label: "Others", invoices: 0, qty: 0, weight: 0, amount: othersAmount }];
  }, [rows, topN, chartType]);

  const totals = useMemo(() => {
    let invoices = 0;
    let qty = 0;
    let weight = 0;
    let amount = 0;
    let cost = 0;
    for (const r of rows) {
      invoices += r.invoices ?? 0;
      qty += r.qty ?? 0;
      weight += r.weight ?? 0;
      amount += r.amount ?? 0;
      cost += r.cost ?? 0;
    }
    const profit = amount - cost;
    const profitPct = amount > 0 ? (profit / amount) * 100 : 0;
    return { invoices, qty, weight, amount, cost, profit, profitPct };
  }, [rows]);

  const pieColors = ["#B08D57", "#2E3A59", "#6B7280", "#1F7A8C", "#C08497", "#4B5563", "#0F766E", "#7C3AED", "#A16207", "#DC2626", "#111827"];

  async function exportPdf() {
    setExporting(true);
    try {
      const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = (autoTableMod as any).default ?? (autoTableMod as any);
      const { toPng } = await import("html-to-image");

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const title = "Sales Analysis";
      doc.setFontSize(16);
      doc.text(title, 40, 40);

      doc.setFontSize(10);
      const filters = [
        `GroupBy: ${groupBy}`,
        dateFrom ? `From: ${dateFrom}` : "",
        dateTo ? `To: ${dateTo}` : "",
        categoryCode ? `Category: ${categoryCode}` : "",
        subcategoryCode ? `Subcategory: ${subcategoryCode}` : "",
        typeof customerId === "number" ? `CustomerId: ${customerId}` : "",
        typeof salesmanId === "number" ? `SalesmanId: ${salesmanId}` : ""
      ].filter(Boolean);
      doc.text(filters.join("   |   ") || "Filters: (none)", 40, 62);

      const totalInvoices = rows.reduce((s, r) => s + (r.invoices ?? 0), 0);
      const totalQty = rows.reduce((s, r) => s + (r.qty ?? 0), 0);
      const totalWeight = rows.reduce((s, r) => s + (r.weight ?? 0), 0);
      const totalAmount = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
      const totalCost = rows.reduce((s, r) => s + (r.cost ?? 0), 0);
      const totalProfit = totalAmount - totalCost;
      const totalProfitPct = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;
      doc.text(
        `Totals — Invoices: ${totalInvoices}   Qty: ${totalQty}   Weight: ${totalWeight.toFixed(3)}g   Amount: ${totalAmount.toFixed(2)}   Cost: ${totalCost.toFixed(2)}   Profit: ${totalProfit.toFixed(2)}   Profit%: ${totalProfitPct.toFixed(1)}%`,
        40,
        80
      );

      let nextY = 100;

      if (chartType !== "none" && chartContainerRef.current) {
        try {
          const png = await toPng(chartContainerRef.current, { cacheBust: true, backgroundColor: "#ffffff" });
          // Fit chart to page width with margins.
          const pageW = doc.internal.pageSize.getWidth();
          const maxW = pageW - 80;
          const imgW = maxW;
          const imgH = 220;
          doc.addImage(png, "PNG", 40, nextY, imgW, imgH, undefined, "FAST");
          nextY += imgH + 20;
        } catch {
          // ignore chart capture failures; still export table
        }
      }

      autoTable(doc, {
        startY: nextY,
        head: [["Group", "Invoices", "Qty", "Weight (g)", "Amount", "Cost", "Profit", "Profit %"]],
        body: rows.map((r) => [
          r.label,
          String(r.invoices),
          String(r.qty),
          Number(r.weight).toFixed(3),
          Number(r.amount).toFixed(2),
          Number(r.cost).toFixed(2),
          Number(r.profit).toFixed(2),
          Number(r.profitPct).toFixed(1) + "%"
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [46, 58, 89] }
      });

      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setPreviewOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to export PDF");
    } finally {
      setExporting(false);
    }
  }

  function closePreview() {
    setPreviewOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void exportPdf()}
          disabled={busy || exporting || rows.length === 0}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? "Exporting..." : "Export PDF"}
        </button>
      </div>
      <div className="grid gap-3 rounded-lg border border-ebony-200 bg-white p-4 md:grid-cols-3">
        <label className="space-y-2 text-sm">
          <div className="font-semibold text-ebony-700">Group By</div>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          >
            <option value="category">Category</option>
            <option value="subcategory">Subcategory</option>
            <option value="customer">Customer</option>
            <option value="salesman">Salesman</option>
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <div className="font-semibold text-ebony-700">From</div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          />
        </label>

        <label className="space-y-2 text-sm">
          <div className="font-semibold text-ebony-700">To</div>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          />
        </label>

        <label className="space-y-2 text-sm">
          <div className="font-semibold text-ebony-700">Category</div>
          <select
            value={categoryCode}
            onChange={(e) => setCategoryCode(e.target.value)}
            className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <div className="font-semibold text-ebony-700">Subcategory</div>
          <select
            value={subcategoryCode}
            onChange={(e) => setSubcategoryCode(e.target.value)}
            className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          >
            <option value="">All</option>
            {subcategories.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <div className="font-semibold text-ebony-700">Customer</div>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}
            className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          >
            <option value="">All</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <div className="font-semibold text-ebony-700">Salesman</div>
          <select
            value={salesmanId}
            onChange={(e) => setSalesmanId(e.target.value ? Number(e.target.value) : "")}
            className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          >
            <option value="">All</option>
            {salesmen.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <div className="font-semibold text-ebony-700">Chart</div>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          >
            <option value="none">None</option>
            <option value="bar">Bar</option>
            <option value="pie">Pie</option>
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <div className="font-semibold text-ebony-700">Top N</div>
          <input
            inputMode="numeric"
            value={String(topN)}
            onChange={(e) => setTopN(Number(e.target.value || "10"))}
            className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-ebony-100 bg-white px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Amount</div>
          <div className="mt-1 text-xl font-extrabold text-ebony-900 tabular-nums">{totals.amount.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-ebony-100 bg-white px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Cost</div>
          <div className="mt-1 text-xl font-extrabold text-ebony-900 tabular-nums">{totals.cost.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-ebony-100 bg-white px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Profit</div>
          <div className="mt-1 text-xl font-extrabold text-ebony-900 tabular-nums">{totals.profit.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-ebony-100 bg-white px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Profit %</div>
          <div className="mt-1 text-xl font-extrabold text-ebony-900 tabular-nums">{totals.profitPct.toFixed(1)}%</div>
        </div>
      </div>

      {chartType !== "none" && chartRows.length > 0 ? (
        <div className="rounded-lg border border-ebony-100 bg-white p-4">
          <div className="mb-2 text-sm font-semibold text-ebony-900">
            Chart ({groupBy}) — Top {Math.max(3, Math.min(50, Math.floor(topN || 10)))}
          </div>
          <div ref={chartContainerRef} className="h-[360px]">
            {chartType === "bar" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows} margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="amount" name="Amount" fill="#B08D57" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie
                    data={chartRows}
                    dataKey="amount"
                    nameKey="label"
                    outerRadius={120}
                    label={(p: any) => (p?.name ? String(p.name).slice(0, 16) : "")}
                  >
                    {chartRows.map((_, idx) => (
                      <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      ) : null}

      <Modal open={previewOpen} onClose={closePreview} title="PDF Preview" className="max-w-6xl">
        {previewUrl ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <a
                href={previewUrl}
                download={`sales-analysis-${groupBy}-${new Date().toISOString().slice(0, 10)}.pdf`}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Download
              </a>
              <button
                type="button"
                onClick={() => {
                  const w = window.open(previewUrl, "_blank");
                  if (!w) return;
                  setTimeout(() => {
                    try {
                      w.focus();
                      w.print();
                    } catch {
                      // ignore
                    }
                  }, 600);
                }}
                className="rounded-lg border border-ebony-300 bg-white px-4 py-2 text-sm font-semibold text-ebony-700 hover:bg-ebony-50"
              >
                Print
              </button>
            </div>
            <div className="h-[70vh] overflow-hidden rounded-xl border border-ebony-100">
              <iframe title="PDF Preview" src={previewUrl} className="h-full w-full" />
            </div>
          </div>
        ) : (
          <div className="text-sm text-ebony-600">No preview.</div>
        )}
      </Modal>

      <div className="overflow-x-auto rounded-lg border border-ebony-100 bg-white">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
            <tr>
              <th className="px-5 py-4">Group</th>
              <th className="px-5 py-4 text-right">Invoices</th>
              <th className="px-5 py-4 text-right">Qty</th>
              <th className="px-5 py-4 text-right">Weight</th>
              <th className="px-5 py-4 text-right">Amount</th>
              <th className="px-5 py-4 text-right">Cost</th>
              <th className="px-5 py-4 text-right">Profit</th>
              <th className="px-5 py-4 text-right">Profit %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ebony-100">
            {rows.map((r) => (
              <tr key={r.key} className="bg-white">
                <td className="px-5 py-4 font-semibold text-ebony-900">{r.label}</td>
                <td className="px-5 py-4 text-right text-ebony-700 tabular-nums">{r.invoices}</td>
                <td className="px-5 py-4 text-right text-ebony-700 tabular-nums">{r.qty}</td>
                <td className="px-5 py-4 text-right text-ebony-700 tabular-nums">{r.weight.toFixed(3)}g</td>
                <td className="px-5 py-4 text-right font-semibold text-ebony-900 tabular-nums">{r.amount.toFixed(2)}</td>
                <td className="px-5 py-4 text-right text-ebony-700 tabular-nums">{r.cost.toFixed(2)}</td>
                <td className="px-5 py-4 text-right font-semibold text-ebony-900 tabular-nums">{r.profit.toFixed(2)}</td>
                <td className="px-5 py-4 text-right text-ebony-700 tabular-nums">{r.profitPct.toFixed(1)}%</td>
              </tr>
            ))}
            {rows.length === 0 && !busy ? (
              <tr>
                <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={8}>
                  No data.
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="bg-ebony-50">
              <td className="px-5 py-4 font-semibold text-ebony-900">Totals</td>
              <td className="px-5 py-4 text-right font-semibold text-ebony-900 tabular-nums">{totals.invoices}</td>
              <td className="px-5 py-4 text-right font-semibold text-ebony-900 tabular-nums">{totals.qty}</td>
              <td className="px-5 py-4 text-right font-semibold text-ebony-900 tabular-nums">{totals.weight.toFixed(3)}g</td>
              <td className="px-5 py-4 text-right font-semibold text-ebony-900 tabular-nums">{totals.amount.toFixed(2)}</td>
              <td className="px-5 py-4 text-right font-semibold text-ebony-900 tabular-nums">{totals.cost.toFixed(2)}</td>
              <td className="px-5 py-4 text-right font-semibold text-ebony-900 tabular-nums">{totals.profit.toFixed(2)}</td>
              <td className="px-5 py-4 text-right font-semibold text-ebony-900 tabular-nums">{totals.profitPct.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

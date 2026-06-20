"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Modal } from "@/components/ui/Modal";

type Option = { id?: number; code?: string; name: string };
type ColumnType = "text" | "number" | "currency" | "weight" | "date" | "percent";
type Column = { key: string; label: string; type?: ColumnType };
type Row = Record<string, string | number | null>;

type ReportType =
  | "daily-summary"
  | "monthly-summary"
  | "sales-detail"
  | "sales-analysis"
  | "purchase-detail"
  | "stock-valuation"
  | "stock-movement"
  | "profit-loss"
  | "customer-outstanding"
  | "supplier-outstanding"
  | "goldsmith-pending"
  | "payments"
  | "cashbook";

type ReportData = {
  title: string;
  columns: Column[];
  rows: Row[];
  totals: Record<string, number>;
  chartKey?: string;
  chartLabelKey?: string;
  appliedFilters: string[];
};

const reports: Array<{ type: ReportType; label: string; description: string }> = [
  { type: "daily-summary", label: "Daily Summary", description: "Sales, purchases, payments, and outstanding for today or a chosen date range." },
  { type: "monthly-summary", label: "Monthly Summary", description: "Month-to-date sales and purchase movement." },
  { type: "sales-detail", label: "Sales Detail", description: "Invoice list with customer, salesman, weight, amount, and profit." },
  { type: "sales-analysis", label: "Sales Analysis", description: "Grouped sales by category, subcategory, customer, or salesman." },
  { type: "purchase-detail", label: "Purchase Detail", description: "Purchase entries by supplier, goldsmith, category, and item." },
  { type: "stock-valuation", label: "Stock Valuation", description: "Available quantity, weight, and remaining cost value." },
  { type: "stock-movement", label: "Stock Movement", description: "Purchased, sold, and available stock by item." },
  { type: "profit-loss", label: "Profit & Loss", description: "Sales, cost, profit, and margin from sold lines." },
  { type: "customer-outstanding", label: "Customer Outstanding", description: "Customer account balances from account transactions." },
  { type: "supplier-outstanding", label: "Supplier Outstanding", description: "Open purchase balances." },
  { type: "goldsmith-pending", label: "Goldsmith Received", description: "Received pieces and gold weight by goldsmith." },
  { type: "payments", label: "Payments", description: "Customer payment transactions." },
  { type: "cashbook", label: "Cashbook", description: "Cash and bank debit/credit transaction report." }
];

function fmt(value: unknown, type: ColumnType = "text") {
  if (value == null || value === "") return "-";
  if (type === "currency") {
    const n = Number(value);
    return Number.isFinite(n)
      ? new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 2 }).format(n)
      : "-";
  }
  if (type === "weight") {
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toLocaleString("en-US", { maximumFractionDigits: 3 })}g` : "-";
  }
  if (type === "percent") {
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toFixed(1)}%` : "-";
  }
  if (type === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 3 }) : "-";
  }
  return String(value);
}

function isNumeric(type?: ColumnType) {
  return type === "number" || type === "currency" || type === "weight" || type === "percent";
}

export function ReportsClient({
  categories,
  subcategories,
  customers,
  suppliers,
  goldsmiths,
  salesmen
}: {
  categories: Option[];
  subcategories: Option[];
  customers: Option[];
  suppliers: Option[];
  goldsmiths: Option[];
  salesmen: Option[];
}) {
  const [type, setType] = useState<ReportType>("daily-summary");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [groupBy, setGroupBy] = useState("category");
  const [categoryCode, setCategoryCode] = useState("");
  const [subcategoryCode, setSubcategoryCode] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [goldsmithCode, setGoldsmithCode] = useState("");
  const [salesmanId, setSalesmanId] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const chartRef = useRef<HTMLDivElement | null>(null);

  const selectedReport = reports.find((r) => r.type === type) ?? reports[0];

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("type", type);
    if (dateFrom) sp.set("dateFrom", dateFrom);
    if (dateTo) sp.set("dateTo", dateTo);
    if (groupBy) sp.set("groupBy", groupBy);
    if (categoryCode) sp.set("categoryCode", categoryCode);
    if (subcategoryCode) sp.set("subcategoryCode", subcategoryCode);
    if (customerId) sp.set("customerId", customerId);
    if (supplierId) sp.set("supplierId", supplierId);
    if (goldsmithCode) sp.set("goldsmithCode", goldsmithCode);
    if (salesmanId) sp.set("salesmanId", salesmanId);
    return sp.toString();
  }, [type, dateFrom, dateTo, groupBy, categoryCode, subcategoryCode, customerId, supplierId, goldsmithCode, salesmanId]);

  useEffect(() => {
    let active = true;
    (async () => {
      setBusy(true);
      setError("");
      try {
        const res = await fetch(`/api/reports/generate?${query}`, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as (ReportData & { error?: string }) | null;
        if (!res.ok) throw new Error(json?.error ?? "Unable to load report");
        if (active) setData(json);
      } catch (e) {
        if (!active) return;
        setData(null);
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
    if (!data?.chartKey) return [];
    const labelKey = data.chartLabelKey ?? data.columns[0]?.key ?? "label";
    return data.rows
      .map((row) => ({ name: String(row[labelKey] ?? ""), value: Number(row[data.chartKey!] ?? 0) }))
      .filter((row) => Number.isFinite(row.value) && row.value !== 0)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 12);
  }, [data]);

  const summaryItems = useMemo(() => {
    if (!data) return [];
    return data.columns
      .filter((c) => c.key in data.totals)
      .slice(0, 6)
      .map((c) => ({ label: c.label, value: fmt(data.totals[c.key], c.type) }));
  }, [data]);

  async function exportPdf() {
    if (!data) return;
    setExporting(true);
    try {
      const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = (autoTableMod as any).default ?? autoTableMod;
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(16);
      doc.text(data.title, 40, 40);
      doc.setFontSize(9);
      doc.text((data.appliedFilters?.length ? data.appliedFilters.join(" | ") : "Filters: All").slice(0, 140), 40, 60);

      let y = 82;
      if (chartRows.length > 0 && chartRef.current) {
        try {
          const { toPng } = await import("html-to-image");
          const png = await toPng(chartRef.current, { cacheBust: true, backgroundColor: "#ffffff" });
          doc.addImage(png, "PNG", 40, y, doc.internal.pageSize.getWidth() - 80, 180, undefined, "FAST");
          y += 200;
        } catch {
          y = 82;
        }
      }

      autoTable(doc, {
        startY: y,
        head: [data.columns.map((c) => c.label)],
        body: data.rows.map((row) => data.columns.map((c) => fmt(row[c.key], c.type))),
        foot:
          Object.keys(data.totals ?? {}).length > 0
            ? [data.columns.map((c, index) => (index === 0 ? "Totals" : c.key in data.totals ? fmt(data.totals[c.key], c.type) : ""))]
            : undefined,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [46, 58, 89] },
        footStyles: { fillColor: [241, 245, 249], textColor: [17, 24, 39] }
      });

      const url = URL.createObjectURL(doc.output("blob"));
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border border-ebony-100 bg-white p-3 shadow-sm">
          <div className="mb-2 px-2 text-xs font-bold uppercase tracking-widest text-ebony-500">Reports</div>
          <div className="space-y-1">
            {reports.map((report) => (
              <button
                key={report.type}
                type="button"
                onClick={() => setType(report.type)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                  type === report.type ? "bg-indigo-900 text-white" : "text-ebony-700 hover:bg-ebony-50"
                }`}
              >
                {report.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-lg border border-ebony-100 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-extrabold text-ebony-900">{selectedReport.label}</h1>
                <p className="mt-1 text-sm text-ebony-600">{selectedReport.description}</p>
              </div>
              <button
                type="button"
                onClick={() => void exportPdf()}
                disabled={busy || exporting || !data || data.rows.length === 0}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? "Exporting..." : "Export PDF"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              <label className="space-y-1 text-sm">
                <span className="font-semibold text-ebony-700">From</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-md border border-ebony-200 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold text-ebony-700">To</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-md border border-ebony-200 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold text-ebony-700">Group</span>
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="w-full rounded-md border border-ebony-200 px-3 py-2">
                  <option value="category">Category</option>
                  <option value="subcategory">Subcategory</option>
                  <option value="customer">Customer</option>
                  <option value="salesman">Salesman</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold text-ebony-700">Category</span>
                <select value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} className="w-full rounded-md border border-ebony-200 px-3 py-2">
                  <option value="">All</option>
                  {categories.map((o) => (
                    <option key={o.code} value={o.code}>{o.code} - {o.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold text-ebony-700">Subcategory</span>
                <select value={subcategoryCode} onChange={(e) => setSubcategoryCode(e.target.value)} className="w-full rounded-md border border-ebony-200 px-3 py-2">
                  <option value="">All</option>
                  {subcategories.map((o) => (
                    <option key={o.code} value={o.code}>{o.code} - {o.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold text-ebony-700">Customer</span>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full rounded-md border border-ebony-200 px-3 py-2">
                  <option value="">All</option>
                  {customers.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold text-ebony-700">Supplier</span>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full rounded-md border border-ebony-200 px-3 py-2">
                  <option value="">All</option>
                  {suppliers.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold text-ebony-700">Goldsmith</span>
                <select value={goldsmithCode} onChange={(e) => setGoldsmithCode(e.target.value)} className="w-full rounded-md border border-ebony-200 px-3 py-2">
                  <option value="">All</option>
                  {goldsmiths.map((o) => (
                    <option key={o.code} value={o.code}>{o.code} - {o.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold text-ebony-700">Salesman</span>
                <select value={salesmanId} onChange={(e) => setSalesmanId(e.target.value)} className="w-full rounded-md border border-ebony-200 px-3 py-2">
                  <option value="">All</option>
                  {salesmen.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-lg border border-ebony-100 bg-white p-4 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-ebony-500">{item.label}</div>
                <div className="mt-2 text-lg font-extrabold tabular-nums text-ebony-900">{item.value}</div>
              </div>
            ))}
          </div>

          {chartRows.length > 0 ? (
            <div className="rounded-lg border border-ebony-100 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-bold text-indigo-900">Top {chartRows.length} by {data?.columns.find((c) => c.key === data.chartKey)?.label}</div>
              <div ref={chartRef} className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRows} margin={{ top: 8, right: 8, bottom: 48, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={64} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#B08D57" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-ebony-100 bg-white shadow-sm">
            <table className="min-w-[920px] w-full text-sm">
              <thead className="bg-ebony-50 text-left text-xs font-bold uppercase tracking-wide text-ebony-600">
                <tr>
                  {data?.columns.map((c) => (
                    <th key={c.key} className={`px-4 py-3 ${isNumeric(c.type) ? "text-right" : ""}`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {busy ? (
                  <tr><td className="px-4 py-8 text-center text-sm text-ebony-600" colSpan={data?.columns.length ?? 1}>Loading report...</td></tr>
                ) : data?.rows.length ? (
                  data.rows.map((row, index) => (
                    <tr key={index} className="bg-white">
                      {data.columns.map((c) => (
                        <td key={c.key} className={`px-4 py-3 ${isNumeric(c.type) ? "text-right tabular-nums" : ""}`}>{fmt(row[c.key], c.type)}</td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr><td className="px-4 py-8 text-center text-sm text-ebony-600" colSpan={data?.columns.length ?? 1}>No data.</td></tr>
                )}
              </tbody>
              {data && Object.keys(data.totals).length > 0 ? (
                <tfoot>
                  <tr className="bg-ebony-50">
                    {data.columns.map((c, index) => (
                      <td key={c.key} className={`px-4 py-3 font-bold text-ebony-900 ${isNumeric(c.type) ? "text-right tabular-nums" : ""}`}>
                        {index === 0 ? "Totals" : c.key in data.totals ? fmt(data.totals[c.key], c.type) : ""}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </section>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="PDF Preview" className="max-w-6xl">
        {previewUrl ? (
          <div className="space-y-3">
            <div className="flex justify-end gap-2">
              <a href={previewUrl} download={`${data?.title ?? "report"}-${new Date().toISOString().slice(0, 10)}.pdf`} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Download</a>
              <button type="button" onClick={() => window.open(previewUrl, "_blank")?.print()} className="rounded-md border border-ebony-200 px-4 py-2 text-sm font-semibold text-ebony-800">Print</button>
            </div>
            <iframe title="PDF Preview" src={previewUrl} className="h-[70vh] w-full rounded-lg border border-ebony-100" />
          </div>
        ) : (
          <div className="text-sm text-ebony-600">No preview.</div>
        )}
      </Modal>
    </div>
  );
}

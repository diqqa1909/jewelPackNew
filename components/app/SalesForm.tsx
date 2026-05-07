"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

type CustomerRow = { id: number; name: string; phone?: string | null };
type CategoryRow = { code: string; name: string };
type SubcategoryRow = { code: string; name: string; categoryCode: string };

type AvailabilityRow = {
  subcategoryCode: string;
  carat: string;
  balanceQty: number;
  balanceGoldWeight: string;
  balanceCost: string;
};

type Line = {
  id: string;
  categoryCode: string;
  subcategoryCode: string;
  carat: "" | "18K" | "22K";
  qty: string;
  goldWeight: string;
  sellRatePer8g: string;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function SalesForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);

  const [transactionDate, setTransactionDate] = useState(todayISO());
  const [customerId, setCustomerId] = useState<number | "">("");
  const [remarks, setRemarks] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [lines, setLines] = useState<Line[]>([
    {
      id: uid(),
      categoryCode: "",
      subcategoryCode: "",
      carat: "",
      qty: "",
      goldWeight: "",
      sellRatePer8g: ""
    }
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [categoryRefs] = useState(() => new Map<string, HTMLSelectElement | null>());
  const [cellRefs] = useState(
    () => new Map<string, HTMLSelectElement | HTMLInputElement | HTMLButtonElement | null>()
  );

  useEffect(() => {
    if (!pendingFocusId) return;
    const cell = cellRefs.get(`${pendingFocusId}:category`) ?? null;
    const el = (cell as any) ?? categoryRefs.get(pendingFocusId) ?? null;
    if (el && typeof (el as any).focus === "function") {
      (el as any).focus();
      setPendingFocusId(null);
    }
  }, [categoryRefs, pendingFocusId, lines.length]);

  const navCols = ["category", "subcategory", "carat", "qty", "weight", "sellRate"] as const;
  type NavCol = (typeof navCols)[number];

  function setCellRef(rowId: string, col: NavCol, el: any) {
    cellRefs.set(`${rowId}:${col}`, el);
  }

  function focusCell(rowId: string, col: NavCol) {
    const el = cellRefs.get(`${rowId}:${col}`) ?? null;
    if (el && typeof (el as any).focus === "function") (el as any).focus();
  }

  function handleTabNav(e: React.KeyboardEvent, rowId: string, col: NavCol) {
    if (e.key !== "Tab") return;
    e.preventDefault();

    const rowIndex = lines.findIndex((l) => l.id === rowId);
    if (rowIndex < 0) return;

    const colIndex = navCols.indexOf(col);
    const dir = e.shiftKey ? -1 : 1;
    let nextRowIndex = rowIndex;
    let nextColIndex = colIndex + dir;

    if (nextColIndex >= navCols.length) {
      nextRowIndex = rowIndex + 1;
      nextColIndex = 0;
    } else if (nextColIndex < 0) {
      nextRowIndex = rowIndex - 1;
      nextColIndex = navCols.length - 1;
    }

    if (nextRowIndex >= lines.length) {
      addLine();
      // focus will happen via pendingFocusId, but we want the first cell
      // (category) on the new row.
      return;
    }
    if (nextRowIndex < 0) return;

    focusCell(lines[nextRowIndex].id, navCols[nextColIndex]);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [c1, c2, c3, c4, inv] = await Promise.all([
          fetch("/api/customers", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/categories", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/subcategories", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/stock/availability", { cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/sales?preview=1&transactionDate=${encodeURIComponent(todayISO())}`, {
            cache: "no-store"
          }).then((r) => r.json())
        ]);
        if (!active) return;
        setCustomers(c1.customers ?? []);
        setCategories(c2.categories ?? []);
        setSubcategories(c3.subcategories ?? []);
        setAvailability(c4.rows ?? []);
        setInvoiceNo(inv.saleNo ?? "");
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const inv = await fetch(
          `/api/sales?preview=1&transactionDate=${encodeURIComponent(transactionDate || todayISO())}`,
          { cache: "no-store" }
        ).then((r) => r.json());
        if (cancelled) return;
        setInvoiceNo(inv.saleNo ?? "");
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transactionDate]);

  const subsByCategory = useMemo(() => {
    const map = new Map<string, SubcategoryRow[]>();
    for (const s of subcategories) {
      const list = map.get(s.categoryCode) ?? [];
      list.push(s);
      map.set(s.categoryCode, list);
    }
    for (const [k, v] of map.entries()) v.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [subcategories]);

  const availabilityKeyed = useMemo(() => {
    const map = new Map<string, AvailabilityRow>();
    for (const r of availability) map.set(`${r.subcategoryCode}||${r.carat}`, r);
    return map;
  }, [availability]);

  const totals = useMemo(() => {
    let totalQty = 0;
    let totalWeight = 0;
    for (const l of lines) {
      totalQty += Math.max(0, Math.floor(toNumber(l.qty)));
      totalWeight += Math.max(0, toNumber(l.goldWeight));
    }
    return { totalItems: lines.filter((l) => l.subcategoryCode).length, totalQty, totalWeight };
  }, [lines]);

  const qtyErrors = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of lines) {
      if (!l.subcategoryCode || !l.carat) continue;
      const avail = availabilityKeyed.get(`${l.subcategoryCode}||${l.carat}`);
      if (!avail) continue;
      const qty = Math.floor(toNumber(l.qty));
      if (qty > (avail.balanceQty ?? 0)) map.set(l.id, `Quantity exceeded (available ${avail.balanceQty})`);
    }
    return map;
  }, [availabilityKeyed, lines]);

  const sellSubTotal = useMemo(() => {
    let sum = 0;
    for (const l of lines) {
      const rate = Math.max(0, toNumber(l.sellRatePer8g));
      const w = Math.max(0, toNumber(l.goldWeight));
      if (!w || !rate) continue;
      sum += (w / 8) * rate;
    }
    return sum;
  }, [lines]);

  function updateLine(id: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setError("");
  }

  function addLine() {
    const nextId = uid();
    setLines((prev) => [
      ...prev,
      {
        id: nextId,
        categoryCode: "",
        subcategoryCode: "",
        carat: "",
        qty: "",
        goldWeight: "",
        sellRatePer8g: ""
      }
    ]);
    setPendingFocusId(nextId);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.id !== id)));
  }

  async function submit() {
    setError("");
    const cid = typeof customerId === "number" ? customerId : Number(customerId);
    if (!transactionDate) return setError("Transaction date is required.");
    if (!Number.isFinite(cid)) return setError("Customer is required.");

    const items = lines
      .filter((l) => l.subcategoryCode.trim() !== "")
      .map((l) => ({
        subcategoryCode: l.subcategoryCode.trim(),
        carat: l.carat,
        qty: Math.floor(toNumber(l.qty)),
        goldWeight: String(l.goldWeight ?? "").trim(),
        sellRatePer8g: String(l.sellRatePer8g ?? "").trim()
      }));

    if (items.length === 0) return setError("Add at least one item.");
    for (const it of items) {
      if (!it.carat) return setError("Select carat for all items.");
      if (!Number.isFinite(it.qty) || it.qty <= 0) return setError("Enter valid qty for all items.");
      if (!it.goldWeight || toNumber(it.goldWeight) <= 0) return setError("Enter valid weight for all items.");
      if (!it.sellRatePer8g || toNumber(it.sellRatePer8g) <= 0)
        return setError("Enter valid sell rate for all items.");
    }
    if (qtyErrors.size > 0) return setError("Quantity exceeded. Please reduce qty.");

    setBusy(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transactionDate, customerId: cid, remarks, items })
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Save failed");
      setLines([
        {
          id: uid(),
          categoryCode: "",
          subcategoryCode: "",
          carat: "",
          qty: "",
          goldWeight: "",
          sellRatePer8g: ""
        }
      ]);
      setRemarks("");
      router.push("/sales");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-6xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Create Sale</CardTitle>
            <CardDescription>Create a sales receipt with multiple items.</CardDescription>
          </div>
          <div className="rounded-lg border border-ebony-200 bg-white px-3 py-2 text-xs font-semibold text-ebony-700">
            Invoice No: {invoiceNo || "—"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Invoice Date</div>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
            />
          </label>

          <label className="space-y-2 text-sm md:col-span-2">
            <div className="font-semibold text-ebony-700">Customer</div>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="hidden">
            <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Sell Subtotal</div>
            <div className="mt-1 text-2xl font-extrabold text-ebony-900">{sellSubTotal.toFixed(2)}</div>
            <div className="mt-1 text-xs text-ebony-500">Sum of (weight ÷ 8 × sell rate) for all rows.</div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-ebony-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ebony-100 px-4 py-3">
            <div className="text-sm font-semibold text-ebony-900">Items</div>
            <div className="text-xs font-semibold text-ebony-500">Excel-style entry.</div>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-sm font-semibold text-ebony-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead className="sticky top-0 z-10 bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
                  <tr>
                    <th className="border border-ebony-200 px-3 py-2">Category</th>
                    <th className="border border-ebony-200 px-3 py-2">Subcategory</th>
                    <th className="border border-ebony-200 px-3 py-2">Carat</th>
                    <th className="border border-ebony-200 px-3 py-2 text-right">Qty</th>
                    <th className="border border-ebony-200 px-3 py-2 text-right">Weight (g)</th>
                    <th className="border border-ebony-200 px-3 py-2 text-right">Sell Rate/8g</th>
                    <th className="border border-ebony-200 px-3 py-2 text-right">Sell Cost</th>
                    <th className="border border-ebony-200 px-3 py-2 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ebony-100">
                  {lines.map((l) => {
                    const subs = l.categoryCode ? subsByCategory.get(l.categoryCode) ?? [] : subcategories;
                    const sellRate = Math.max(0, toNumber(l.sellRatePer8g));
                    const sellCost = (Math.max(0, toNumber(l.goldWeight)) / 8) * sellRate;
                    return (
                      <tr key={l.id} className="bg-white hover:bg-cream-50/40 transition-colors">
                        <td className="border border-ebony-200 p-0">
                          <select
                            value={l.categoryCode}
                            onChange={(e) =>
                              updateLine(l.id, { categoryCode: e.target.value, subcategoryCode: "" })
                            }
                            onKeyDown={(e) => handleTabNav(e, l.id, "category")}
                            ref={(el) => {
                              categoryRefs.set(l.id, el);
                              setCellRef(l.id, "category", el);
                            }}
                            className="h-10 w-full rounded-none border-0 bg-white px-2 outline-none focus:bg-cream-50"
                          >
                            <option value="">All</option>
                            {categories.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-ebony-200 p-0">
                          <select
                            value={l.subcategoryCode}
                            onChange={(e) => updateLine(l.id, { subcategoryCode: e.target.value })}
                            onKeyDown={(e) => handleTabNav(e, l.id, "subcategory")}
                            ref={(el) => setCellRef(l.id, "subcategory", el)}
                            className="h-10 w-full rounded-none border-0 bg-white px-2 outline-none focus:bg-cream-50"
                          >
                            <option value="">Select subcategory...</option>
                            {subs
                              .slice()
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((s) => (
                                <option key={s.code} value={s.code}>
                                  {s.code} — {s.name}
                                </option>
                              ))}
                          </select>
                          {qtyErrors.get(l.id) && (
                            <div className="px-2 pb-1 text-xs font-semibold text-red-600">{qtyErrors.get(l.id)}</div>
                          )}
                        </td>
                        <td className="border border-ebony-200 p-0">
                          <select
                            value={l.carat}
                            onChange={(e) => updateLine(l.id, { carat: e.target.value as Line["carat"] })}
                            onKeyDown={(e) => handleTabNav(e, l.id, "carat")}
                            ref={(el) => setCellRef(l.id, "carat", el)}
                            className="h-10 w-full rounded-none border-0 bg-white px-2 outline-none focus:bg-cream-50"
                          >
                            <option value="">Select...</option>
                            <option value="18K">18K</option>
                            <option value="22K">22K</option>
                          </select>
                        </td>
                        <td className="border border-ebony-200 p-0 text-right">
                          <input
                            inputMode="numeric"
                            value={l.qty}
                            onChange={(e) => updateLine(l.id, { qty: e.target.value })}
                            onKeyDown={(e) => handleTabNav(e, l.id, "qty")}
                            ref={(el) => setCellRef(l.id, "qty", el)}
                            className={[
                              "h-10 w-full rounded-none border-0 bg-white px-2 text-right outline-none focus:bg-cream-50",
                              qtyErrors.get(l.id) ? "text-red-700" : ""
                            ].join(" ")}
                          />
                        </td>
                        <td className="border border-ebony-200 p-0 text-right">
                          <input
                            inputMode="decimal"
                            value={l.goldWeight}
                            onChange={(e) => updateLine(l.id, { goldWeight: e.target.value })}
                            onKeyDown={(e) => handleTabNav(e, l.id, "weight")}
                            ref={(el) => setCellRef(l.id, "weight", el)}
                            className="h-10 w-full rounded-none border-0 bg-white px-2 text-right outline-none focus:bg-cream-50"
                          />
                        </td>
                        <td className="border border-ebony-200 p-0 text-right">
                          <input
                            inputMode="decimal"
                            value={l.sellRatePer8g}
                            onChange={(e) => updateLine(l.id, { sellRatePer8g: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Tab") return handleTabNav(e, l.id, "sellRate");
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              addLine();
                            }}
                            ref={(el) => setCellRef(l.id, "sellRate", el)}
                            placeholder="0.00"
                            className="h-10 w-full rounded-none border-0 bg-white px-2 text-right outline-none focus:bg-cream-50"
                          />
                        </td>
                        <td className="border border-ebony-200 p-0 text-right">
                          <div className="h-10 w-full bg-cream-100 px-2 py-2 text-right font-bold text-ebony-900">
                            {Number.isFinite(sellCost) ? sellCost.toFixed(2) : "0.00"}
                          </div>
                        </td>
                        <td className="border border-ebony-200 p-0 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(l.id)}
                            className="inline-flex h-10 w-10 items-center justify-center bg-white text-red-700 hover:bg-red-50"
                            aria-label="Remove row"
                            title="Remove row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-ebony-50">
                    <td className="border border-ebony-200 px-3 py-2 font-semibold text-ebony-900" colSpan={3}>
                      Overall Total
                    </td>
                    <td className="border border-ebony-200 px-3 py-2 text-right font-bold text-ebony-900">
                      {totals.totalQty}
                    </td>
                    <td className="border border-ebony-200 px-3 py-2 text-right font-bold text-ebony-900">
                      {totals.totalWeight.toFixed(3)}
                    </td>
                    <td className="border border-ebony-200 px-3 py-2" />
                    <td className="border border-ebony-200 px-3 py-2 text-right font-bold text-ebony-900">
                      {sellSubTotal.toFixed(2)}
                    </td>
                    <td className="border border-ebony-200 px-3 py-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ebony-100 px-4 py-3">
            <button
              type="button"
              onClick={addLine}
              className="rounded-lg border border-ebony-300 bg-white px-4 py-2 text-sm font-semibold text-ebony-700 hover:bg-ebony-50"
            >
              + Add Row
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/sales")}
                disabled={busy}
                className="rounded-lg border border-ebony-300 bg-white px-5 py-2.5 text-sm font-semibold text-ebony-700 hover:bg-ebony-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy}
                className="rounded-lg bg-gold-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gold-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Saving..." : "Save Sale"}
              </button>
            </div>
          </div>
        </div>

        <label className="block space-y-2 text-sm">
          <div className="font-semibold text-ebony-700">Remarks</div>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="min-h-24 w-full resize-y rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            placeholder="Optional notes..."
          />
        </label>
      </CardContent>
    </Card>
  );
}

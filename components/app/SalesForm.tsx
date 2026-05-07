"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  const [sellRatePer8g, setSellRatePer8g] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { id: uid(), categoryCode: "", subcategoryCode: "", carat: "", qty: "", goldWeight: "" }
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [c1, c2, c3, c4] = await Promise.all([
          fetch("/api/customers", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/categories", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/subcategories", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/stock/availability", { cache: "no-store" }).then((r) => r.json())
        ]);
        if (!active) return;
        setCustomers(c1.customers ?? []);
        setCategories(c2.categories ?? []);
        setSubcategories(c3.subcategories ?? []);
        setAvailability(c4.rows ?? []);
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

  const sellSubTotal = useMemo(() => {
    const rate = Math.max(0, toNumber(sellRatePer8g));
    let sum = 0;
    for (const l of lines) {
      const w = Math.max(0, toNumber(l.goldWeight));
      if (!w) continue;
      sum += (w / 8) * rate;
    }
    return sum;
  }, [lines, sellRatePer8g]);

  function updateLine(id: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setError("");
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { id: uid(), categoryCode: "", subcategoryCode: "", carat: "", qty: "", goldWeight: "" }
    ]);
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
        goldWeight: String(l.goldWeight ?? "").trim()
      }));

    if (items.length === 0) return setError("Add at least one item.");
    for (const it of items) {
      if (!it.carat) return setError("Select carat for all items.");
      if (!Number.isFinite(it.qty) || it.qty <= 0) return setError("Enter valid qty for all items.");
      if (!it.goldWeight || toNumber(it.goldWeight) <= 0) return setError("Enter valid weight for all items.");
    }

    setBusy(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transactionDate, customerId: cid, remarks, sellRatePer8g, items })
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Save failed");
      setLines([{ id: uid(), categoryCode: "", subcategoryCode: "", carat: "", qty: "", goldWeight: "" }]);
      setRemarks("");
      setSellRatePer8g("");
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
        <CardTitle>Create Sale</CardTitle>
        <CardDescription>Create a sales receipt with multiple items.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Transaction Date</div>
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

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Sell Rate (per 8g)</div>
            <input
              inputMode="decimal"
              value={sellRatePer8g}
              onChange={(e) => setSellRatePer8g(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
            />
            <div className="text-xs font-semibold text-ebony-400">Used to calculate sell cost per item.</div>
          </label>
          <div className="md:col-span-2 rounded-2xl border border-ebony-100 bg-gradient-to-br from-gold-50 to-white px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Sell Subtotal</div>
            <div className="mt-1 text-2xl font-extrabold text-ebony-900">{sellSubTotal.toFixed(2)}</div>
            <div className="mt-1 text-xs text-ebony-500">Sum of (weight ÷ 8 × sell rate) for all rows.</div>
          </div>
        </div>

        <div className="rounded-2xl border border-ebony-100 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ebony-100 px-4 py-3">
            <div className="text-sm font-semibold text-ebony-900">Items</div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-cream-100 px-3 py-1 text-ebony-800">Rows {lines.length}</span>
              <span className="rounded-full bg-cream-100 px-3 py-1 text-ebony-800">Qty {totals.totalQty}</span>
              <span className="rounded-full bg-cream-100 px-3 py-1 text-ebony-800">
                Wt {totals.totalWeight.toFixed(3)}g
              </span>
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-sm font-semibold text-ebony-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
                  <tr>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Subcategory</th>
                    <th className="px-4 py-3">Carat</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Weight (g)</th>
                    <th className="px-4 py-3 text-right">Sell Cost</th>
                    <th className="px-4 py-3">Available</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ebony-100">
                  {lines.map((l) => {
                    const subs = l.categoryCode ? subsByCategory.get(l.categoryCode) ?? [] : subcategories;
                    const avail = l.subcategoryCode && l.carat ? availabilityKeyed.get(`${l.subcategoryCode}||${l.carat}`) : null;
                    const sellRate = Math.max(0, toNumber(sellRatePer8g));
                    const sellCost = (Math.max(0, toNumber(l.goldWeight)) / 8) * sellRate;
                    return (
                      <tr key={l.id} className="bg-white">
                        <td className="px-4 py-3">
                          <select
                            value={l.categoryCode}
                            onChange={(e) =>
                              updateLine(l.id, { categoryCode: e.target.value, subcategoryCode: "" })
                            }
                            className="w-full rounded-lg border border-ebony-200 bg-white px-3 py-2 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                          >
                            <option value="">All</option>
                            {categories.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={l.subcategoryCode}
                            onChange={(e) => updateLine(l.id, { subcategoryCode: e.target.value })}
                            className="w-full rounded-lg border border-ebony-200 bg-white px-3 py-2 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
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
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={l.carat}
                            onChange={(e) => updateLine(l.id, { carat: e.target.value as Line["carat"] })}
                            className="w-full rounded-lg border border-ebony-200 bg-white px-3 py-2 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                          >
                            <option value="">Select...</option>
                            <option value="18K">18K</option>
                            <option value="22K">22K</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            inputMode="numeric"
                            value={l.qty}
                            onChange={(e) => updateLine(l.id, { qty: e.target.value })}
                            className="w-28 rounded-lg border border-ebony-200 bg-white px-3 py-2 text-right outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            inputMode="decimal"
                            value={l.goldWeight}
                            onChange={(e) => updateLine(l.id, { goldWeight: e.target.value })}
                            className="w-36 rounded-lg border border-ebony-200 bg-white px-3 py-2 text-right outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="w-36 rounded-lg bg-cream-100 px-3 py-2 text-right font-bold text-ebony-900">
                            {Number.isFinite(sellCost) ? sellCost.toFixed(2) : "0.00"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {avail ? (
                            <div className="text-xs font-semibold text-ebony-700">
                              <div>Qty {avail.balanceQty}</div>
                              <div className="text-ebony-500">Wt {Number(avail.balanceGoldWeight).toFixed(3)}g</div>
                            </div>
                          ) : (
                            <div className="text-xs text-ebony-400">—</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(l.id)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ebony-100 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={addLine}
                className="rounded-lg border border-ebony-300 bg-white px-4 py-2 text-sm font-semibold text-ebony-700 hover:bg-ebony-50"
              >
                + Add Row
              </button>
              <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-bold text-ebony-900">
                Subtotal {sellSubTotal.toFixed(2)}
              </span>
            </div>
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

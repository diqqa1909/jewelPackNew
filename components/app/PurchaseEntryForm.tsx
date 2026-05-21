"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { buttonClassName } from "@/components/ui/Button";

type Supplier = {
  id: number;
  name: string;
};

type Line = {
  id: string;
  description: string;
  karat: string;
  weight: string;
  ratePerGram: string;
  makingPerPiece: string;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeDecimal(raw: string) {
  const s = String(raw ?? "").replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot === -1) return s;
  return s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
}

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function weight(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
}

export function PurchaseEntryForm({
  suppliers,
  initialSupplierId
}: {
  suppliers: Supplier[];
  initialSupplierId?: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [supplierId, setSupplierId] = useState<number | "">(initialSupplierId ?? "");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [purchaseGold, setPurchaseGold] = useState("");
  const [notes, setNotes] = useState("");
  const [otherCharges, setOtherCharges] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [lines, setLines] = useState<Line[]>([{ id: uid(), description: "", karat: "", weight: "", ratePerGram: "", makingPerPiece: "" }]);

  function updateLine(id: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
    setMessage("");
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { id: uid(), description: "", karat: purchaseGold, weight: "", ratePerGram: "", makingPerPiece: "" }
    ]);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((line) => line.id !== id)));
  }

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadPreview() {
      try {
        const res = await fetch(`/api/purchases?preview=1&purchaseDate=${purchaseDate}`, { signal: controller.signal });
        const json = (await res.json().catch(() => null)) as { purchaseNo?: string } | null;
        if (!res.ok || !json?.purchaseNo) return;
        if (active) setInvoiceNo(json.purchaseNo);
      } catch {
        // keep the current invoice number if preview fetch fails
      }
    }

    void loadPreview();
    return () => {
      active = false;
      controller.abort();
    };
  }, [purchaseDate]);

  useEffect(() => {
    if (initialSupplierId && !supplierId) {
      setSupplierId(initialSupplierId);
    }
  }, [initialSupplierId, supplierId]);

  const totals = useMemo(() => {
    const totalWeight = lines.reduce((sum, line) => sum + toNumber(line.weight), 0);
    const subTotal = lines.reduce(
      (sum, line) =>
        sum + toNumber(line.weight) * toNumber(line.ratePerGram) + toNumber(line.makingPerPiece),
      0
    );
    const charges = toNumber(otherCharges);
    const totalAmount = subTotal + charges;
    const paid = toNumber(paidAmount);
    return {
      totalWeight,
      subTotal,
      charges,
      totalAmount,
      paid,
      balance: Math.max(0, totalAmount - paid)
    };
  }, [lines, otherCharges, paidAmount]);

  async function save(openPrint = false) {
    if (saving) return;
    if (!supplierId) {
      setMessage("Please choose a supplier.");
      toast.error("Supplier required", "Pick a supplier before saving the purchase.");
      return;
    }

    const payload = {
      purchaseNo: invoiceNo.trim(),
      purchaseDate,
      supplierId,
      purchaseGold,
      notes,
      otherCharges,
      paidAmount,
      items: lines.map((line) => ({
        description: line.description,
        karat: line.karat,
        weight: line.weight,
        ratePerGram: line.ratePerGram,
        makingPerPiece: line.makingPerPiece
      }))
    };

    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; purchase?: { id: number; purchaseNo: string }; error?: string } | null;
      if (!res.ok || !json?.purchase) {
        throw new Error(json?.error ?? "Unable to save purchase");
      }

      toast.success("Purchase saved", json.purchase.purchaseNo);
      router.push(openPrint ? `/purchases/${json.purchase.id}?print=1` : `/purchases/${json.purchase.id}`);
    } catch (e) {
      const error = e instanceof Error ? e.message : "Unable to save purchase";
      setMessage(error);
      toast.error("Unable to save purchase", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {message}
        </div>
      ) : null}

      <section className="rounded-lg border border-ebony-100 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_0.75fr]">
          <label className="space-y-1.5 text-sm">
            <span className="text-xs font-bold text-ebony-800">Supplier *</span>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : "")}
              className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            >
              <option value="">Select supplier...</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="text-xs font-bold text-ebony-800">Invoice No</span>
            <input
              disabled
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="text-xs font-bold text-ebony-800">Date</span>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="text-xs font-bold text-ebony-800">Purchase Gold</span>
            <select
              value={purchaseGold}
              onChange={(e) => setPurchaseGold(e.target.value)}
              className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            >
              <option value="">Select karat...</option>
              <option>24K</option>
              <option>22K</option>
              <option>21K</option>
              <option>18K</option>
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-ebony-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
              <tr>
                <th className="px-4 py-3 text-center">#</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Karat</th>
                <th className="px-4 py-3 text-right">Weight (g)</th>
                <th className="px-4 py-3 text-right">Rate / Per g</th>
                <th className="px-4 py-3 text-right">Making / Pcs</th>
                <th className="px-4 py-3 text-right">Amount (LKR)</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {lines.map((line, index) => {
                const amount = toNumber(line.weight) * toNumber(line.ratePerGram) + toNumber(line.makingPerPiece);
                return (
                  <tr key={line.id} className="bg-white">
                    <td className="px-4 py-2 text-center font-semibold text-ebony-700">{index + 1}</td>
                    <td className="p-0">
                      <input
                        value={line.description}
                        onChange={(e) => updateLine(line.id, { description: e.target.value })}
                        className="h-10 w-full border-0 bg-white px-3 outline-none focus:bg-cream-50"
                      />
                    </td>
                    <td className="p-0">
                      <select
                        value={line.karat}
                        onChange={(e) => updateLine(line.id, { karat: e.target.value })}
                        className="h-10 w-full border-0 bg-white px-3 outline-none focus:bg-cream-50"
                      >
                        <option value="">Select</option>
                        <option>24K</option>
                        <option>22K</option>
                        <option>21K</option>
                        <option>18K</option>
                      </select>
                    </td>
                    <td className="p-0">
                      <input
                        value={line.weight}
                        onChange={(e) => updateLine(line.id, { weight: sanitizeDecimal(e.target.value) })}
                        inputMode="decimal"
                        className="h-10 w-full border-0 bg-white px-3 text-right outline-none focus:bg-cream-50"
                      />
                    </td>
                    <td className="p-0">
                      <input
                        value={line.ratePerGram}
                        onChange={(e) => updateLine(line.id, { ratePerGram: sanitizeDecimal(e.target.value) })}
                        inputMode="decimal"
                        className="h-10 w-full border-0 bg-white px-3 text-right outline-none focus:bg-cream-50"
                      />
                    </td>
                    <td className="p-0">
                      <input
                        value={line.makingPerPiece}
                        onChange={(e) => updateLine(line.id, { makingPerPiece: sanitizeDecimal(e.target.value) })}
                        inputMode="decimal"
                        className="h-10 w-full border-0 bg-white px-3 text-right outline-none focus:bg-cream-50"
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-bold tabular-nums text-ebony-900">{money(amount)}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className={buttonClassName("secondary", "h-8 w-8 px-0 py-0 text-red-600")}
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
          </table>
        </div>
      </section>

      <button type="button" onClick={addLine} className={buttonClassName("secondary", "px-3 py-2 shadow-sm")}>
        <Plus className="h-4 w-4" />
        Add Row
      </button>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <label className="space-y-2 text-sm lg:self-end">
          <span className="font-bold text-ebony-800">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-28 w-full resize-y rounded-md border border-ebony-200 bg-white px-4 py-3 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          />
        </label>

        <div className="rounded-lg border border-ebony-100 bg-white shadow-sm">
          <SummaryRow label="Total Weight" value={`${weight(totals.totalWeight)} g`} />
          <SummaryRow label="Sub Total" value={money(totals.subTotal)} />
          <label className="flex items-center justify-between border-b border-ebony-100 px-4 py-2 text-sm">
            <span className="font-semibold text-ebony-700">Other Charges</span>
            <input
              value={otherCharges}
              onChange={(e) => setOtherCharges(sanitizeDecimal(e.target.value))}
              inputMode="decimal"
              placeholder="0.00"
              className="h-9 w-32 rounded-md border border-ebony-200 px-2 text-right font-bold tabular-nums outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>
          <SummaryRow label="Total Amount" value={money(totals.totalAmount)} strong />
          <label className="flex items-center justify-between border-b border-ebony-100 px-4 py-2 text-sm">
            <span className="font-semibold text-ebony-700">Paid Amount</span>
            <input
              value={paidAmount}
              onChange={(e) => setPaidAmount(sanitizeDecimal(e.target.value))}
              inputMode="decimal"
              placeholder="0.00"
              className="h-9 w-32 rounded-md border border-ebony-200 px-2 text-right font-bold tabular-nums outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-base font-extrabold text-red-600">Balance Due</span>
            <span className="text-lg font-extrabold tabular-nums text-red-600">{money(totals.balance)}</span>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save(false)}
          disabled={saving}
          className={buttonClassName("primary", "px-7 py-3")}
        >
          <Save className="h-4 w-4" />
          Save
        </button>
        <button
          type="button"
          onClick={() => void save(true)}
          disabled={saving}
          className={buttonClassName("primary", "px-7 py-3")}
        >
          <Save className="h-4 w-4" />
          Save & Print
        </button>
        <button
          type="button"
          onClick={() => router.push("/purchases")}
          disabled={saving}
          className={buttonClassName("secondary", "px-7 py-3")}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-ebony-100 px-4 py-3 text-sm">
      <span className="font-semibold text-ebony-700">{label}</span>
      <span className={strong ? "font-extrabold tabular-nums text-ebony-900" : "font-bold tabular-nums text-ebony-800"}>
        {value}
      </span>
    </div>
  );
}

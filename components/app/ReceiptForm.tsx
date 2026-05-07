"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import type { StockMaster } from "@/lib/generated/prisma";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

type ReceiptFormState = {
  transactionDate: string;
  location: string;
  gsmCode: string;
  gsmName: string;
  categoryCode: string;
  articleName: string;
  subcategoryCode: string;
  qty: string;
  description: string;
  carat: "" | "18K" | "22K";
  wastageYN: "Y" | "N";
  goldWeight: string;
  wastageMg: string;
  labourCharges: string;
  otherCosts: string;
  remarks: string;
};

type Errors = Partial<Record<keyof ReceiptFormState, string>> & { form?: string };

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isPositiveNumber(value: string) {
  const n = toNumber(value);
  return n > 0;
}

function isNonNegativeNumber(value: string) {
  const n = toNumber(value);
  return n >= 0;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): ReceiptFormState {
  return {
    transactionDate: todayISO(),
    location: "",
    gsmCode: "",
    gsmName: "",
    categoryCode: "",
    articleName: "",
    subcategoryCode: "",
    qty: "",
    description: "",
    carat: "",
    wastageYN: "N",
    goldWeight: "",
    wastageMg: "",
    labourCharges: "",
    otherCosts: "",
    remarks: ""
  };
}

export function ReceiptForm({
  mode,
  receiptId
}: {
  mode: "create" | "edit";
  receiptId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ReceiptFormState>(emptyForm());
  const [errors, setErrors] = useState<Errors>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(mode === "edit");
  const [goldsmiths, setGoldsmiths] = useState<Array<{ code: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ code: string; name: string }>>([]);
  const [subcategories, setSubcategories] = useState<
    Array<{ code: string; name: string; categoryCode: string }>
  >([]);
  const [system, setSystem] = useState<{ goldCostRatePer8g: number; wastageRateMgPer8g: number } | null>(
    null
  );
  const [systemModalOpen, setSystemModalOpen] = useState(false);
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false);
  const [systemForm, setSystemForm] = useState({
    vatRate: "",
    nslRate: "",
    goldCostRatePer8g: "",
    wastageRateMgPer8g: ""
  });
  const [systemSaveState, setSystemSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [subcatForm, setSubcatForm] = useState({ categoryCode: "", name: "" });
  const [subcatSaveState, setSubcatSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [subcatError, setSubcatError] = useState("");

  function update<K extends keyof ReceiptFormState>(key: K, value: ReceiptFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  }

  function setGsmCode(nextCode: string) {
    const code = nextCode.trim();
    const match = goldsmiths.find((g) => g.code === code);
    setForm((prev) => ({
      ...prev,
      gsmCode: code,
      gsmName: match?.name ?? ""
    }));
    setErrors((prev) => ({ ...prev, gsmCode: undefined, gsmName: undefined, form: undefined }));
  }

  function setCategoryCode(nextCode: string) {
    const code = nextCode.trim();
    const match = categories.find((c) => c.code === code);
    setForm((prev) => ({
      ...prev,
      categoryCode: code,
      articleName: match?.name ?? "",
      subcategoryCode: ""
    }));
    setErrors((prev) => ({ ...prev, categoryCode: undefined, articleName: undefined, form: undefined }));
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [gs, cs, subs, sys] = await Promise.all([
          fetch("/api/goldsmiths", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/categories", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/subcategories", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/system", { cache: "no-store" }).then((r) => r.json())
        ]);
        if (!active) return;
        setGoldsmiths(gs.goldsmiths ?? []);
        setCategories(cs.categories ?? []);
        setSubcategories(subs.subcategories ?? []);
        const data = sys.data ?? null;
        setSystem({
          goldCostRatePer8g: Number(data?.goldCostRatePer8g ?? 0) || 0,
          wastageRateMgPer8g: Number(data?.wastageRateMgPer8g ?? 0) || 0
        });
        if (data) {
          setSystemForm({
            vatRate: String(data.vatRate ?? ""),
            nslRate: String(data.nslRate ?? ""),
            goldCostRatePer8g: String(data.goldCostRatePer8g ?? ""),
            wastageRateMgPer8g: String(data.wastageRateMgPer8g ?? "")
          });
        }
      } catch {
        // ignore
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const filteredSubcategories = useMemo(() => {
    if (!form.categoryCode) return [];
    return subcategories.filter((s) => s.categoryCode === form.categoryCode);
  }, [form.categoryCode, subcategories]);

  useEffect(() => {
    if (form.wastageYN !== "Y" && form.wastageMg !== "") update("wastageMg", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.wastageYN]);

  useEffect(() => {
    if (mode !== "edit" || !receiptId) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stock/receipts?id=${receiptId}`, { cache: "no-store" });
        const json = (await res.json()) as { row?: StockMaster | null };
        const row = json.row ?? null;
        if (!active || !row) return;
        setForm({
          transactionDate: new Date(row.transactionDate).toISOString().slice(0, 10),
          location: row.location ?? "",
          gsmCode: row.gsmCode,
          gsmName: row.gsmName,
          categoryCode: row.categoryCode,
          articleName: row.articleName,
          subcategoryCode: row.subcategoryCode,
          qty: String(row.qty),
          description: row.description ?? "",
          carat: (row.carat as ReceiptFormState["carat"]) ?? "",
          wastageYN: row.wastageYN ? "Y" : "N",
          goldWeight: row.goldWeight.toString(),
          wastageMg: row.wastageMg.toString(),
          labourCharges: row.labourCharges.toString(),
          otherCosts: row.otherCosts.toString(),
          remarks: row.remarks ?? ""
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [mode, receiptId]);

  const goldCostCalculated = useMemo(() => {
    const weight = toNumber(form.goldWeight);
    const rate = system?.goldCostRatePer8g ?? 0;
    return (weight / 8) * rate;
  }, [form.goldWeight, system?.goldCostRatePer8g]);

  const wastageCostCalculated = useMemo(() => {
    if (form.wastageYN !== "Y") return 0;
    const mg = toNumber(form.wastageMg);
    const rate = system?.wastageRateMgPer8g ?? 0;
    return mg * rate;
  }, [form.wastageMg, form.wastageYN, system?.wastageRateMgPer8g]);

  const totalCost = useMemo(() => {
    return (
      goldCostCalculated +
      wastageCostCalculated +
      toNumber(form.labourCharges) +
      toNumber(form.otherCosts)
    );
  }, [form.labourCharges, form.otherCosts, goldCostCalculated, wastageCostCalculated]);

  function validate(): boolean {
    const next: Errors = {};
    if (!form.transactionDate) next.transactionDate = "Required";
    if (!form.gsmCode.trim()) next.gsmCode = "Required";
    if (!form.categoryCode.trim()) next.categoryCode = "Required";
    if (!form.subcategoryCode.trim()) next.subcategoryCode = "Required";
    if (!form.carat) next.carat = "Required";
    if (!isPositiveNumber(form.qty)) next.qty = "Enter a valid qty";
    if (!isPositiveNumber(form.goldWeight)) next.goldWeight = "Enter a valid gold weight";
    if (!isNonNegativeNumber(form.labourCharges) || form.labourCharges.trim() === "")
      next.labourCharges = "Enter labour charges";
    if (form.wastageYN === "Y") {
      if (!isNonNegativeNumber(form.wastageMg) || form.wastageMg.trim() === "")
        next.wastageMg = "Enter wastage (mg)";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaveState("saving");
    try {
      const payload = {
        ...form,
        goldCost: goldCostCalculated.toFixed(2),
        wastage: wastageCostCalculated.toFixed(2)
      };
      const res = await fetch("/api/stock/receipts", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          mode === "edit" && receiptId
            ? { id: receiptId, ...payload, wastageYN: form.wastageYN === "Y" }
            : payload
        )
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveState("saved");
      setForm(emptyForm());
      router.push("/stock");
    } catch {
      setSaveState("error");
      setErrors((prev) => ({ ...prev, form: "Save failed. Please try again." }));
    }
  }

  async function refreshSubcategories() {
    const subs = await fetch("/api/subcategories", { cache: "no-store" }).then((r) => r.json());
    setSubcategories(subs.subcategories ?? []);
  }

  async function refreshSystem() {
    const sys = await fetch("/api/system", { cache: "no-store" }).then((r) => r.json());
    const data = sys.data ?? null;
    setSystem({
      goldCostRatePer8g: Number(data?.goldCostRatePer8g ?? 0) || 0,
      wastageRateMgPer8g: Number(data?.wastageRateMgPer8g ?? 0) || 0
    });
    setSystemForm({
      vatRate: String(data?.vatRate ?? ""),
      nslRate: String(data?.nslRate ?? ""),
      goldCostRatePer8g: String(data?.goldCostRatePer8g ?? ""),
      wastageRateMgPer8g: String(data?.wastageRateMgPer8g ?? "")
    });
  }

  async function saveSystemData(e: React.FormEvent) {
    e.preventDefault();
    setSystemSaveState("saving");
    try {
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(systemForm)
      });
      if (!res.ok) throw new Error("Save failed");
      await refreshSystem();
      setSystemSaveState("saved");
      setTimeout(() => setSystemSaveState("idle"), 1500);
      setSystemModalOpen(false);
    } catch {
      setSystemSaveState("error");
    }
  }

  async function addSubcategory(e: React.FormEvent) {
    e.preventDefault();
    setSubcatError("");
    const categoryCode = (subcatForm.categoryCode ?? "").trim();
    const name = (subcatForm.name ?? "").trim();
    if (!categoryCode || !name) {
      setSubcatError("Category and subcategory name are required.");
      return;
    }
    setSubcatSaveState("saving");
    try {
      const res = await fetch("/api/subcategories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryCode, name })
      });
      const json = (await res.json()) as { subcategory?: { code: string } };
      if (!res.ok || !json?.subcategory?.code) throw new Error("Create failed");
      await refreshSubcategories();
      update("subcategoryCode", json.subcategory.code);
      setSubcatSaveState("saved");
      setTimeout(() => setSubcatSaveState("idle"), 1500);
      setSubcategoryModalOpen(false);
    } catch {
      setSubcatSaveState("error");
      setSubcatError("Unable to add subcategory.");
    }
  }

  const title = mode === "edit" ? "Edit Receipt" : "Add New Receipt";

  return (
    <Card className="max-w-5xl">
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>Capture inbound stock receipt details.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await refreshSystem();
                setSystemSaveState("idle");
                setSystemModalOpen(true);
              }}
              className="rounded-lg border border-ebony-300 bg-white px-3 py-2 text-xs font-semibold text-ebony-700 hover:bg-ebony-50 transition-all"
            >
              Edit System Data
            </button>
            <button
              type="button"
              onClick={() => {
                setSubcatError("");
                setSubcatSaveState("idle");
                setSubcatForm({ categoryCode: form.categoryCode || "", name: "" });
                setSubcategoryModalOpen(true);
              }}
              className="rounded-lg bg-gold-600 px-3 py-2 text-xs font-semibold text-white hover:bg-gold-700 transition-all"
            >
              Add Subcategory
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm font-semibold text-slate-500">Loading...</div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-2">
            {errors.form && (
              <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.form}
              </div>
            )}

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">Transaction Date</div>
              <input
                type="date"
                value={form.transactionDate}
                onChange={(e) => update("transactionDate", e.target.value)}
                className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
              />
              {errors.transactionDate && <div className="text-xs text-red-600">{errors.transactionDate}</div>}
            </label>

            <label className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-bold text-ebony-700">Location</div>
                <div className="text-xs font-semibold text-ebony-400">Optional</div>
              </div>
              <input
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="Main Branch / Vault / Counter 1"
                className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
              />
              {errors.location && <div className="text-xs text-red-600">{errors.location}</div>}
            </label>

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">GSM Code</div>
              <select
                value={form.gsmCode}
                onChange={(e) => setGsmCode(e.target.value)}
                className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
              >
                <option value="">Select goldsmith...</option>
                {goldsmiths.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.code}
                  </option>
                ))}
              </select>
              {errors.gsmCode && <div className="text-xs text-red-600">{errors.gsmCode}</div>}
            </label>

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">GSM Name</div>
              <input
                readOnly
                value={form.gsmName}
                className="w-full cursor-not-allowed rounded-lg border-2 border-gold-300 bg-cream-50 px-4 py-2.5 text-ebony-800 outline-none"
              />
            </label>

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">Category Code</div>
              <select
                value={form.categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
              {errors.categoryCode && <div className="text-xs text-red-600">{errors.categoryCode}</div>}
            </label>

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">Article Name</div>
              <input
                readOnly
                value={form.articleName}
                className="w-full cursor-not-allowed rounded-lg border-2 border-gold-300 bg-cream-50 px-4 py-2.5 text-ebony-800 outline-none"
              />
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <div className="font-bold text-ebony-700">Subcategory</div>
              <select
                value={form.subcategoryCode}
                onChange={(e) => update("subcategoryCode", e.target.value)}
                disabled={!form.categoryCode}
                className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30 disabled:opacity-60"
              >
                <option value="">
                  {form.categoryCode ? "Select subcategory..." : "Select category first"}
                </option>
                {filteredSubcategories.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code}
                  </option>
                ))}
              </select>
              {errors.subcategoryCode && (
                <div className="text-xs text-red-600">{errors.subcategoryCode}</div>
              )}
            </label>

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">Qty</div>
              <input
                inputMode="numeric"
                value={form.qty}
                onChange={(e) => update("qty", e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
              />
              {errors.qty && <div className="text-xs text-red-600">{errors.qty}</div>}
            </label>

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">Carat</div>
              <select
                value={form.carat}
                onChange={(e) => update("carat", e.target.value as ReceiptFormState["carat"])}
                className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
              >
                <option value=""></option>
                <option value="18K">18K</option>
                <option value="22K">22K</option>
              </select>
              {errors.carat && <div className="text-xs text-red-600">{errors.carat}</div>}
            </label>

            {/* Subcategory replaces description per workflow */}

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">Wastage (Y/N)</div>
              <select
                value={form.wastageYN}
                onChange={(e) => update("wastageYN", e.target.value as "Y" | "N")}
                className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
              >
                <option value="N">N</option>
                <option value="Y">Y</option>
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">Gold Weight</div>
              <input
                value={form.goldWeight}
                onChange={(e) => update("goldWeight", e.target.value)}
                placeholder="grams"
                className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
              />
              {errors.goldWeight && <div className="text-xs text-red-600">{errors.goldWeight}</div>}
            </label>

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">Gold Cost</div>
              <input
                readOnly
                value={goldCostCalculated.toFixed(2)}
                className="w-full cursor-not-allowed rounded-lg border-2 border-gold-300 bg-cream-50 px-4 py-2.5 text-ebony-800 outline-none"
              />
            </label>

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">Wastage (mg)</div>
              <input
                inputMode="decimal"
                disabled={form.wastageYN !== "Y"}
                value={form.wastageMg}
                onChange={(e) => update("wastageMg", e.target.value)}
                placeholder={form.wastageYN === "Y" ? "0" : "Enable wastage to enter"}
                className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30 disabled:opacity-60"
              />
              {errors.wastageMg && <div className="text-xs text-red-600">{errors.wastageMg}</div>}
            </label>

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">Wastage Cost</div>
              <input
                readOnly
                value={wastageCostCalculated.toFixed(2)}
                className="w-full cursor-not-allowed rounded-lg border-2 border-gold-300 bg-cream-50 px-4 py-2.5 text-ebony-800 outline-none"
              />
            </label>

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">Labour Charges</div>
              <input
                inputMode="decimal"
                value={form.labourCharges}
                onChange={(e) => update("labourCharges", e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
              />
              {errors.labourCharges && <div className="text-xs text-red-600">{errors.labourCharges}</div>}
            </label>

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">Other Costs</div>
              <input
                inputMode="decimal"
                value={form.otherCosts}
                onChange={(e) => update("otherCosts", e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
              />
            </label>

            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-700">Total Cost</div>
              <input
                readOnly
                value={totalCost.toFixed(2)}
                className="w-full cursor-not-allowed rounded-lg border-2 border-gold-400 bg-gradient-gold px-4 py-2.5 font-bold text-gold-700 outline-none"
              />
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <div className="font-bold text-ebony-700">Remarks</div>
              <textarea
                value={form.remarks}
                onChange={(e) => update("remarks", e.target.value)}
                placeholder="Any special remarks..."
                className="min-h-28 w-full resize-y rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
              />
            </label>

            <div className="md:col-span-2 flex items-center justify-end gap-3 pt-4">
              {saveState === "saved" && <span className="text-sm font-bold text-jewel-700">Saved</span>}
              {saveState === "error" && <span className="text-sm font-bold text-red-600">Save failed</span>}
              <button
                type="submit"
                disabled={saveState === "saving"}
                className="rounded-lg bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2.5 text-sm font-bold text-ebony-900 shadow-md hover:shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveState === "saving" ? "Saving..." : "Save Receipt"}
              </button>
            </div>
          </form>
        )}
      </CardContent>

      <Modal open={systemModalOpen} onClose={() => setSystemModalOpen(false)} title="System Data">
        <form onSubmit={saveSystemData} className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">VAT Rate</div>
            <input
              inputMode="decimal"
              value={systemForm.vatRate}
              onChange={(e) => setSystemForm((p) => ({ ...p, vatRate: e.target.value }))}
              placeholder="e.g. 18"
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">NSL Rate</div>
            <input
              inputMode="decimal"
              value={systemForm.nslRate}
              onChange={(e) => setSystemForm((p) => ({ ...p, nslRate: e.target.value }))}
              placeholder="e.g. 2.5"
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Gold Cost Rate (per 8 grams)</div>
            <input
              inputMode="decimal"
              value={systemForm.goldCostRatePer8g}
              onChange={(e) => setSystemForm((p) => ({ ...p, goldCostRatePer8g: e.target.value }))}
              placeholder="e.g. 0.00"
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Wastage Rate (mg per 8 grams)</div>
            <input
              inputMode="decimal"
              value={systemForm.wastageRateMgPer8g}
              onChange={(e) => setSystemForm((p) => ({ ...p, wastageRateMgPer8g: e.target.value }))}
              placeholder="e.g. 0"
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
            {systemSaveState === "error" && (
              <span className="text-sm font-semibold text-red-600">Save failed</span>
            )}
            <button
              type="button"
              onClick={() => setSystemModalOpen(false)}
              className="rounded-lg border border-ebony-300 bg-white px-5 py-2.5 text-sm font-semibold text-ebony-700 hover:bg-ebony-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={systemSaveState === "saving"}
              className="rounded-lg bg-gold-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gold-700 transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {systemSaveState === "saving" ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={subcategoryModalOpen} onClose={() => setSubcategoryModalOpen(false)} title="Add Subcategory">
        <form onSubmit={addSubcategory} className="grid gap-5">
          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Category</div>
            <select
              value={subcatForm.categoryCode}
              onChange={(e) => setSubcatForm((p) => ({ ...p, categoryCode: e.target.value }))}
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Subcategory Name</div>
            <input
              value={subcatForm.name}
              onChange={(e) => setSubcatForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Bangles, Rings, Chains"
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          {subcatError && <div className="text-sm font-semibold text-red-600">{subcatError}</div>}
          {subcatSaveState === "error" && (
            <div className="text-sm font-semibold text-red-600">Save failed</div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setSubcategoryModalOpen(false)}
              className="rounded-lg border border-ebony-300 bg-white px-5 py-2.5 text-sm font-semibold text-ebony-700 hover:bg-ebony-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={subcatSaveState === "saving"}
              className="rounded-lg bg-gold-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gold-700 transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {subcatSaveState === "saving" ? "Saving..." : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

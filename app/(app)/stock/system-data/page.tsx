"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type React from "react";
import { useEffect, useState } from "react";

type SystemDataState = {
  vatRate: string;
  nslRate: string;
  goldCostRatePer8g: string;
  wastageRateMgPer8g: string;
};

export default function SystemDataPage() {
  const [form, setForm] = useState<SystemDataState>({
    vatRate: "",
    nslRate: "",
    goldCostRatePer8g: "",
    wastageRateMgPer8g: ""
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(true);

  function update<K extends keyof SystemDataState>(key: K, value: SystemDataState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/system", { cache: "no-store" });
        const json = (await res.json()) as { ok: boolean; data: SystemDataState | null };
        if (cancelled) return;
        if (res.ok && json?.data) setForm(json.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    try {
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>System Data</CardTitle>
        <CardDescription>Configure global rates used by receipts and pricing (UI only).</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">VAT Rate</div>
            <input
              inputMode="decimal"
              value={form.vatRate}
              onChange={(e) => update("vatRate", e.target.value)}
              placeholder="e.g. 18"
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">NSL Rate</div>
            <input
              inputMode="decimal"
              value={form.nslRate}
              onChange={(e) => update("nslRate", e.target.value)}
              placeholder="e.g. 2.5"
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Gold Cost Rate (per 8 grams)</div>
            <input
              inputMode="decimal"
              value={form.goldCostRatePer8g}
              onChange={(e) => update("goldCostRatePer8g", e.target.value)}
              placeholder="e.g. 0.00"
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Wastage Rate (mg per 8 grams)</div>
            <input
              inputMode="decimal"
              value={form.wastageRateMgPer8g}
              onChange={(e) => update("wastageRateMgPer8g", e.target.value)}
              placeholder="e.g. 0"
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-4">
            {loading && <span className="text-sm font-semibold text-slate-500">Loading...</span>}
            {saveState === "saved" && (
              <span className="text-sm font-semibold text-jewel-700">Saved</span>
            )}
            {saveState === "error" && (
              <span className="text-sm font-semibold text-red-600">Save failed</span>
            )}
            <button
              type="submit"
              disabled={saveState === "saving"}
              className="rounded-lg bg-gold-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-gold-700 transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saveState === "saving" ? "Saving..." : "Save System Data"}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

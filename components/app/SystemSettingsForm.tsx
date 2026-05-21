"use client";

import { useToast } from "@/components/ui/ToastProvider";
import { useEffect, useState } from "react";

type SystemData = {
  vatRate: string;
  nslRate: string;
  goldCostRatePer8g: string;
  wastageRateMgPer8g: string;
};

function sanitizeDecimal(raw: string) {
  const s = String(raw ?? "").replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot === -1) return s;
  return s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
}

export function SystemSettingsForm() {
  const toast = useToast();
  const [data, setData] = useState<SystemData>({
    vatRate: "0",
    nslRate: "0",
    goldCostRatePer8g: "0",
    wastageRateMgPer8g: "0"
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/system", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: SystemData | null } | null;
        if (!res.ok) throw new Error("Unable to load system settings");
        if (!active) return;
        if (json?.data) setData(json.data);
      } catch (e) {
        if (!active) return;
        const message = e instanceof Error ? e.message : "Unable to load system settings";
        setError(message);
        toast.error("Unable to load settings", message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  async function save() {
    setBusy(true);
    setOk(false);
    setError("");
    try {
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data)
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Unable to save");
      setOk(true);
      toast.success("System settings saved");
      setTimeout(() => setOk(false), 2000);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to save";
      setError(message);
      toast.error("Unable to save settings", message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-sm text-ebony-600">Loading…</div>;

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {ok ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Saved.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <div className="font-semibold text-ebony-700">VAT Rate (%)</div>
          <input
            value={data.vatRate}
            onChange={(e) => setData((p) => ({ ...p, vatRate: sanitizeDecimal(e.target.value) }))}
            inputMode="decimal"
            className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          />
        </label>
        <label className="space-y-2 text-sm">
          <div className="font-semibold text-ebony-700">NSL Rate (%)</div>
          <input
            value={data.nslRate}
            onChange={(e) => setData((p) => ({ ...p, nslRate: sanitizeDecimal(e.target.value) }))}
            inputMode="decimal"
            className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          />
        </label>
        <label className="space-y-2 text-sm">
          <div className="font-semibold text-ebony-700">Gold Cost Rate (per 8g)</div>
          <input
            value={data.goldCostRatePer8g}
            onChange={(e) => setData((p) => ({ ...p, goldCostRatePer8g: sanitizeDecimal(e.target.value) }))}
            inputMode="decimal"
            className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          />
        </label>
        <label className="space-y-2 text-sm">
          <div className="font-semibold text-ebony-700">Wastage Rate (mg per 8g)</div>
          <input
            value={data.wastageRateMgPer8g}
            onChange={(e) => setData((p) => ({ ...p, wastageRateMgPer8g: sanitizeDecimal(e.target.value) }))}
            inputMode="decimal"
            className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          />
        </label>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="rounded-lg bg-gold-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Saving…" : "Update Rates"}
        </button>
      </div>
    </div>
  );
}

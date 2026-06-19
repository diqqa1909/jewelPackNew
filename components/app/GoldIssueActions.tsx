"use client";

import { Modal } from "@/components/ui/Modal";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type GoldsmithOption = {
  code: string;
  name: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeDecimal(raw: string) {
  const s = String(raw ?? "").replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot === -1) return s;
  return s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
}

export function GoldIssueButton({
  goldsmith,
  className
}: {
  goldsmith: GoldsmithOption;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [issueDate, setIssueDate] = useState(todayISO());
  const [carat, setCarat] = useState("22K");
  const [goldWeight, setGoldWeight] = useState("0");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setIssueDate(todayISO());
    setCarat("22K");
    setGoldWeight("0");
    setReferenceNumber("");
    setRemarks("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/gold/issues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          issueDate,
          goldsmithCode: goldsmith.code,
          carat,
          goldWeight,
          referenceNumber,
          remarks
        })
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Unable to issue gold");
      setOpen(false);
      reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to issue gold");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex h-8 items-center justify-center gap-1 rounded-md border border-ebony-200 bg-white px-3 text-xs font-bold text-ebony-700 hover:bg-ebony-50"
        }
      >
        <Plus className="h-3.5 w-3.5" />
        Issue
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Issue Gold - ${goldsmith.name}`} panelClassName="max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-ebony-700">Goldsmith</span>
              <input
                value={`${goldsmith.code} - ${goldsmith.name}`}
                readOnly
                className="h-10 w-full rounded-md border border-ebony-200 bg-ebony-50 px-3 text-sm font-semibold text-ebony-800"
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-ebony-700">Date</span>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-ebony-700">Carat</span>
              <select
                value={carat}
                onChange={(e) => setCarat(e.target.value)}
                className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
              >
                {["18K", "19K", "20K", "21K", "22K", "24K"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-ebony-700">Weight (g)</span>
              <input
                inputMode="decimal"
                value={goldWeight}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setGoldWeight(sanitizeDecimal(e.target.value))}
                className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-right text-sm font-bold tabular-nums outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
              />
            </label>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-ebony-700">Reference No</span>
            <input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Optional"
              className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-ebony-700">Remarks</span>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional note"
              className="min-h-24 w-full rounded-md border border-ebony-200 bg-white px-3 py-2 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-ebony-200 bg-white px-4 py-2 text-sm font-semibold text-ebony-700 hover:bg-ebony-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-gold-600 px-5 py-2 text-sm font-bold text-white hover:bg-gold-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Issuing..." : "Issue Gold"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

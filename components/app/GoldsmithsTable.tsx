"use client";

import type { Goldsmith } from "@/lib/generated/prisma";
import { useMemo, useState } from "react";

type Props = { initial: Goldsmith[] };

export function GoldsmithsTable({ initial }: Props) {
  const [rows, setRows] = useState<Goldsmith[]>(initial);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const canAdd = useMemo(() => code.trim() !== "" && name.trim() !== "" && !busy, [busy, code, name]);
  const isEditing = useMemo(() => rows.some((r) => r.code === code.trim()), [code, rows]);

  async function add() {
    if (!canAdd) return;
    setBusy(true);
    try {
      const res = await fetch("/api/goldsmiths", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, name })
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { goldsmith: Goldsmith };
      setRows((prev) => [...prev.filter((r) => r.code !== data.goldsmith.code), data.goldsmith].sort((a, b) => a.code.localeCompare(b.code)));
      setCode("");
      setName("");
    } finally {
      setBusy(false);
    }
  }

  async function remove(targetCode: string) {
    const ok = confirm(`Delete goldsmith ${targetCode}?`);
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/goldsmiths?code=${encodeURIComponent(targetCode)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setRows((prev) => prev.filter((r) => r.code !== targetCode));
    } finally {
      setBusy(false);
    }
  }

  async function update(targetCode: string, nextName: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/goldsmiths", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: targetCode, name: nextName })
      });
      if (!res.ok) throw new Error("Failed");
      setRows((prev) => prev.map((r) => (r.code === targetCode ? { ...r, name: nextName } : r)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border border-ebony-200 bg-white p-4 md:grid-cols-[12rem_1fr_auto]">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="GSM Code"
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="GSM Name"
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
        />
        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          className="rounded-lg bg-gold-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-gold-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isEditing ? "Save" : "Add"}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-ebony-100">
        <table className="w-full text-sm">
          <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
            <tr>
              <th className="px-5 py-4">Code</th>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ebony-100">
            {rows.map((r) => (
              <tr key={r.code} className="bg-white">
                <td className="px-5 py-4 font-semibold text-ebony-900">{r.code}</td>
                <td className="px-5 py-4 text-ebony-700">{r.name}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setCode(r.code);
                      setName(r.name);
                    }}
                    disabled={busy}
                    className="rounded-lg border border-ebony-200 bg-white px-4 py-2 text-xs font-semibold text-ebony-700 hover:bg-ebony-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(r.code)}
                    disabled={busy}
                    className="ml-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={3}>
                  No goldsmiths yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

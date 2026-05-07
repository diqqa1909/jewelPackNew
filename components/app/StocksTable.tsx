"use client";

import type { StockMaster } from "@/lib/generated/prisma";
import Link from "next/link";
import { useState } from "react";

type Props = {
  initial: StockMaster[];
};

export function StocksTable({ initial }: Props) {
  const [rows, setRows] = useState<StockMaster[]>(initial);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  async function remove(id: number) {
    const ok = confirm("Delete this receipt? This cannot be undone.");
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/stock/receipts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusy(false);
    }
  }

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (r.location ?? "").toLowerCase().includes(q) ||
      r.gsmCode.toLowerCase().includes(q) ||
      r.gsmName.toLowerCase().includes(q) ||
      r.categoryCode.toLowerCase().includes(q) ||
      r.articleName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by location, GSM, category..."
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm font-medium placeholder:text-ebony-400 outline-none transition-all duration-200 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-ebony-100">
        <table className="min-w-[800px] w-full text-sm">
          <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
            <tr>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4">GSM</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4 text-right">Qty</th>
              <th className="px-5 py-4 text-right">Carat</th>
              <th className="px-5 py-4 text-right">Total</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ebony-100">
            {filtered.map((r) => (
              <tr key={r.id} className="bg-white hover:bg-ebony-50 transition-colors">
                <td className="px-5 py-4 font-semibold text-ebony-900">
                 {new Date(r.transactionDate).toISOString().slice(0, 10)}
                </td>
                <td className="px-5 py-4 text-ebony-700">{r.location ?? "—"}</td>
                <td className="px-5 py-4 text-ebony-700">
                  <div className="font-semibold text-ebony-900">{r.gsmCode}</div>
                  <div className="text-xs text-ebony-600">{r.gsmName}</div>
                </td>
                <td className="px-5 py-4 text-ebony-700">
                  <div className="font-semibold text-ebony-900">{r.categoryCode}</div>
                  <div className="text-xs text-ebony-600">{r.articleName}</div>
                </td>
                <td className="px-5 py-4 text-right font-semibold text-ebony-900">{r.qty}</td>
                <td className="px-5 py-4 text-right text-ebony-700">{r.carat ?? ""}</td>
                <td className="px-5 py-4 text-right font-semibold text-ebony-900">{r.totalCost.toString()}</td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/stock/receipts/${r.id}`}
                    className="inline-flex rounded-lg border border-ebony-200 bg-white px-3 py-2 text-xs font-semibold text-ebony-700 hover:bg-ebony-50"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => void remove(r.id)}
                    disabled={busy}
                    className="ml-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td className="px-5 py-10 text-center text-sm text-ebony-600" colSpan={8}>
                  No matching receipts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

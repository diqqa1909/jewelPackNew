"use client";

import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Row = {
  id: number;
  saleNo: string;
  salesType: "Gold" | "Rate";
  transactionDate: string;
  customerCode: string;
  customerName: string;
  totalItems: number;
  totalQty: number;
  totalGoldWeight: string;
  grandTotal: string;
  paidAmount: string;
  balanceDue: string;
};

export function SalesTable({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const rows = useMemo(() => initial, [initial]);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(target: Row) {
    setBusy(true);
    try {
      const res = await fetch(`/api/sales?id=${target.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Delete failed");
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ebony-100 bg-white">
      <table className="w-full table-fixed text-[11px]">
        <thead className="bg-ebony-50 text-left text-[10px] font-semibold uppercase tracking-wide text-ebony-700">
          <tr>
            <th className="w-[13%] px-2 py-3">Invoice No</th>
            <th className="w-[20%] px-2 py-3">Date / Customer</th>
            <th className="w-[7%] px-2 py-3 text-right">Items</th>
            <th className="w-[7%] px-2 py-3 text-right">Qty</th>
            <th className="w-[10%] px-2 py-3 text-right">Weight</th>
            <th className="w-[12%] px-2 py-3 text-right">Grand Total</th>
            <th className="w-[10%] px-2 py-3 text-right">Paid</th>
            <th className="w-[10%] px-2 py-3 text-right">Balance</th>
            <th className="w-[11%] px-2 py-3 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ebony-100">
          {rows.map((s) => (
            <tr
              key={s.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/sales/${s.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/sales/${s.id}`);
                }
              }}
              className="cursor-pointer bg-white transition-colors hover:bg-cream-50/60 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
              title="View invoice"
            >
              <td className="truncate px-2 py-3 font-semibold text-ebony-900">{s.saleNo}</td>
              <td className="px-2 py-3 text-ebony-700">
                <div className="font-semibold text-ebony-900">{s.transactionDate}</div>
                <div className="truncate text-[10px] text-ebony-600">
                  {s.customerCode} · {s.customerName}
                </div>
              </td>
              <td className="px-2 py-3 text-right font-semibold text-ebony-900">{s.totalItems}</td>
              <td className="px-2 py-3 text-right tabular-nums text-ebony-700">{s.totalQty}</td>
              <td className="px-2 py-3 text-right tabular-nums text-ebony-700">
                {Number(s.totalGoldWeight).toFixed(3)}g
              </td>
              <td className="px-2 py-3 text-right font-semibold tabular-nums text-ebony-900">
                {Number(s.grandTotal).toFixed(2)}
              </td>
              <td className="px-2 py-3 text-right font-semibold tabular-nums text-emerald-700">
                {s.salesType === "Rate" ? Number(s.paidAmount).toFixed(2) : "-"}
              </td>
              <td className="px-2 py-3 text-right font-semibold tabular-nums text-red-600">
                {s.salesType === "Rate" ? Number(s.balanceDue).toFixed(2) : "-"}
              </td>
              <td className="px-2 py-3 text-center">
                <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => router.push(`/sales/${s.id}`)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ebony-200 bg-white text-ebony-700 transition hover:bg-ebony-50"
                    aria-label={`View invoice ${s.saleNo}`}
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/sales/${s.id}/edit`)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ebony-200 bg-white text-ebony-700 transition hover:bg-ebony-50"
                    aria-label={`Edit invoice ${s.saleNo}`}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(s)}
                    disabled={busy}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Delete invoice ${s.saleNo}`}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={9}>
                No invoices yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <DeleteConfirmModal
        open={deleteTarget !== null}
        itemLabel={deleteTarget ? `invoice ${deleteTarget.saleNo}` : "this invoice"}
        description="This will delete the invoice lines and related customer ledger entries. This action cannot be undone."
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void remove(deleteTarget);
        }}
      />
    </div>
  );
}

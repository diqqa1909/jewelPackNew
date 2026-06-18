"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

type Row = {
  id: number;
  saleNo: string;
  transactionDate: string;
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

  return (
    <div className="overflow-hidden rounded-lg border border-ebony-100 bg-white">
      <table className="w-full table-fixed text-[11px]">
        <thead className="bg-ebony-50 text-left text-[10px] font-semibold uppercase tracking-wide text-ebony-700">
          <tr>
            <th className="w-[14%] px-2 py-3">Invoice No</th>
            <th className="w-[22%] px-2 py-3">Date / Customer</th>
            <th className="w-[7%] px-2 py-3 text-right">Items</th>
            <th className="w-[7%] px-2 py-3 text-right">Qty</th>
            <th className="w-[10%] px-2 py-3 text-right">Weight</th>
            <th className="w-[14%] px-2 py-3 text-right">Grand Total</th>
            <th className="w-[13%] px-2 py-3 text-right">Paid</th>
            <th className="w-[13%] px-2 py-3 text-right">Balance</th>
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
                <div className="truncate text-[10px] text-ebony-600">{s.customerName}</div>
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
                {Number(s.paidAmount).toFixed(2)}
              </td>
              <td className="px-2 py-3 text-right font-semibold tabular-nums text-red-600">
                {Number(s.balanceDue).toFixed(2)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={8}>
                No invoices yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

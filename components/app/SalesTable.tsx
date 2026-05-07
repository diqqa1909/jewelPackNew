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
  totalCost: string;
};

export function SalesTable({ initial }: { initial: Row[] }) {
  const router = useRouter();

  const rows = useMemo(() => initial, [initial]);

  return (
    <div className="overflow-x-auto rounded-lg border border-ebony-100 bg-white">
      <table className="min-w-[860px] w-full text-sm">
        <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
          <tr>
            <th className="px-5 py-4">Sale No</th>
            <th className="px-5 py-4">Date — Customer</th>
            <th className="px-5 py-4 text-right">Items</th>
            <th className="px-5 py-4 text-right">Qty</th>
            <th className="px-5 py-4 text-right">Weight</th>
            <th className="px-5 py-4 text-right">Cost</th>
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
              title="View sale"
            >
              <td className="px-5 py-4 font-semibold text-ebony-900">{s.saleNo}</td>
              <td className="px-5 py-4 text-ebony-700">
                <div className="font-semibold text-ebony-900">{s.transactionDate}</div>
                <div className="text-xs text-ebony-600">{s.customerName}</div>
              </td>
              <td className="px-5 py-4 text-right font-semibold text-ebony-900">{s.totalItems}</td>
              <td className="px-5 py-4 text-right text-ebony-700 tabular-nums">{s.totalQty}</td>
              <td className="px-5 py-4 text-right text-ebony-700 tabular-nums">
                {Number(s.totalGoldWeight).toFixed(3)}g
              </td>
              <td className="px-5 py-4 text-right font-semibold text-ebony-900 tabular-nums">
                {Number(s.totalCost).toFixed(2)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={6}>
                No sales yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


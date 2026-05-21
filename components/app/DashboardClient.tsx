"use client";

import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type SalesPoint = { day: string; amount: number };
type PieRow = { name: string; value: number };

const pieColors = ["#2563EB", "#0F766E", "#F59E0B", "#7C3AED", "#DB2777", "#14B8A6", "#64748B", "#B45309"];

function formatWeight(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 3 })} g`;
}

function formatCompactLkr(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

export function StockSummary({ rows, total }: { rows: PieRow[]; total: number }) {
  return (
    <div className="h-full rounded-lg border border-ebony-100 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-indigo-900">Stock Summary (By Category)</h2>
      <div className="grid min-h-[190px] items-center gap-3 sm:grid-cols-[minmax(130px,0.9fr)_minmax(160px,1fr)]">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={1}>
              {rows.map((_, idx) => (
                <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatWeight(Number(value))} />
          </PieChart>
        </ResponsiveContainer>

        <div className="space-y-2">
          {rows.slice(0, 6).map((row, idx) => (
            <div key={row.name} className="grid grid-cols-[0.75rem_1fr_auto] items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[idx % pieColors.length] }} />
              <span className="truncate text-ebony-700">{row.name}</span>
              <span className="font-bold tabular-nums text-ebony-900">{formatWeight(row.value)}</span>
            </div>
          ))}
          <div className="mt-3 border-t border-ebony-100 pt-3 text-right text-base font-extrabold tabular-nums text-ebony-900">
            {formatWeight(total)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SalesChart({ rows }: { rows: SalesPoint[] }) {
  return (
    <div className="h-full rounded-lg border border-ebony-100 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-indigo-900">Sales Chart (This Month)</h2>
      <div className="h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatCompactLkr} />
            <Tooltip formatter={(value) => [`LKR ${Number(value).toLocaleString("en-US")}`, "Sales"]} />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#4338CA"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#4338CA", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

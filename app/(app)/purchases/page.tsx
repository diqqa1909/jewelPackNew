import Link from "next/link";
import { Plus } from "lucide-react";
import { prismaWithRetry } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { buttonClassName } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

function money(value: unknown) {
  const n = Number(value && typeof (value as any).toString === "function" ? (value as any).toString() : value ?? 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function weight(value: unknown) {
  const n = Number(value && typeof (value as any).toString === "function" ? (value as any).toString() : value ?? 0);
  if (!Number.isFinite(n)) return "0.000";
  return n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(value);
}

export default async function PurchasesPage() {
  const [purchases, suppliers] = await Promise.all([
    prismaWithRetry((p) =>
      p.purchase.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 200,
        include: { supplier: true, items: { take: 3, orderBy: { id: "asc" } } }
      })
    ),
    prismaWithRetry((p) => p.supplier.findMany({ orderBy: { name: "asc" } }))
  ]);

  const supplierTotals = new Map<number, { purchaseCount: number; totalAmount: number; totalWeight: number }>();
  for (const purchase of purchases) {
    const current = supplierTotals.get(purchase.supplierId) ?? {
      purchaseCount: 0,
      totalAmount: 0,
      totalWeight: 0
    };
    current.purchaseCount += 1;
    current.totalAmount += Number(purchase.totalAmount.toString());
    current.totalWeight += Number(purchase.totalWeight.toString());
    supplierTotals.set(purchase.supplierId, current);
  }

  const totalPurchases = purchases.length;
  const totalAmount = purchases.reduce((sum, purchase) => sum + Number(purchase.totalAmount.toString()), 0);
  const totalOutstanding = purchases.reduce((sum, purchase) => sum + Number(purchase.balanceDue.toString()), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Purchase Entries" value={String(totalPurchases)} />
          <Stat label="Total Amount" value={money(totalAmount)} />
          <Stat label="Outstanding" value={money(totalOutstanding)} tone="red" />
        </div>
        <Link
          href="/purchases/new"
          className={buttonClassName("primary", "px-5 py-2.5")}
        >
          <Plus className="h-4 w-4" />
          Add New Purchase
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Register</CardTitle>
          <CardDescription>Saved purchase entries with supplier and balance summaries.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-ebony-100 bg-white">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="bg-ebony-50 text-left text-xs font-bold uppercase tracking-widest text-ebony-700">
                <tr>
                  <th className="px-5 py-4">Purchase No</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Supplier</th>
                  <th className="px-5 py-4">Gold</th>
                  <th className="px-5 py-4 text-right">Items</th>
                  <th className="px-5 py-4 text-right">Weight</th>
                  <th className="px-5 py-4 text-right">Amount</th>
                  <th className="px-5 py-4 text-right">Paid</th>
                  <th className="px-5 py-4 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="bg-white hover:bg-cream-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/purchases/${purchase.id}`} className="font-semibold text-indigo-900 hover:underline">
                        {purchase.purchaseNo}
                      </Link>
                    </td>
                    <td className="px-5 py-4 tabular-nums text-ebony-700">{formatDate(purchase.purchaseDate)}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-ebony-900">{purchase.supplier.name}</div>
                      <div className="text-xs text-ebony-600">{purchase.supplier.phone ?? "-"}</div>
                    </td>
                    <td className="px-5 py-4 text-ebony-700">{purchase.purchaseGold ?? "-"}</td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-ebony-800">{purchase.totalItems}</td>
                    <td className="px-5 py-4 text-right tabular-nums text-ebony-700">{weight(purchase.totalWeight)} g</td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-ebony-900">{money(purchase.totalAmount)}</td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-ebony-800">{money(purchase.paidAmount)}</td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-red-600">{money(purchase.balanceDue)}</td>
                  </tr>
                ))}
                {purchases.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={9}>
                      No purchases yet. Start by creating the first entry.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suppliers</CardTitle>
          <CardDescription>Supplier history and totals from saved purchase records.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-ebony-100 bg-white">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-ebony-50 text-left text-xs font-bold uppercase tracking-widest text-ebony-700">
                <tr>
                  <th className="px-5 py-4">Supplier</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Phone</th>
                  <th className="px-5 py-4 text-right">Purchases</th>
                  <th className="px-5 py-4 text-right">Weight</th>
                  <th className="px-5 py-4 text-right">Amount</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {suppliers.map((supplier) => {
                  const summary = supplierTotals.get(supplier.id) ?? { purchaseCount: 0, totalAmount: 0, totalWeight: 0 };
                  return (
                    <tr key={supplier.id} className="bg-white">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ebony-900">{supplier.name}</div>
                      </td>
                      <td className="px-5 py-4 text-ebony-700">{supplier.contact ?? "-"}</td>
                      <td className="px-5 py-4 text-ebony-700">{supplier.phone ?? "-"}</td>
                      <td className="px-5 py-4 text-right font-semibold tabular-nums text-ebony-800">
                        {summary.purchaseCount}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-ebony-700">{weight(summary.totalWeight)} g</td>
                      <td className="px-5 py-4 text-right font-semibold tabular-nums text-ebony-900">
                        {money(summary.totalAmount)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/purchases/new?supplierId=${supplier.id}`}
                          className={buttonClassName("secondary", "px-4 py-2 text-xs")}
                        >
                          New Purchase
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {suppliers.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={7}>
                      No suppliers found. Add one from the suppliers screen first.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "red" }) {
  return (
    <div
      className={[
        "min-w-44 rounded-lg border bg-white px-4 py-3 shadow-sm",
        tone === "red" ? "border-red-200" : "border-ebony-100"
      ].join(" ")}
    >
      <div className="text-xs font-bold uppercase tracking-widest text-ebony-600">{label}</div>
      <div className={["mt-1 text-xl font-extrabold tabular-nums", tone === "red" ? "text-red-600" : "text-ebony-900"].join(" ")}>
        {value}
      </div>
    </div>
  );
}

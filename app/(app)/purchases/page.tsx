import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { buttonClassName } from "@/components/ui/Button";
import { prismaWithRetry } from "@/lib/prisma";

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
  const purchases = await prismaWithRetry((p) =>
    p.purchase.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 200
    })
  );

  const totalPurchases = purchases.length;
  const totalQty = purchases.reduce((sum, purchase) => sum + Number(purchase.qty ?? 0), 0);
  const totalWeight = purchases.reduce((sum, purchase) => sum + Number(purchase.goldWeight?.toString?.() ?? 0), 0);
  const totalCost = purchases.reduce((sum, purchase) => sum + Number(purchase.totalCost?.toString?.() ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Entries" value={String(totalPurchases)} />
          <Stat label="Qty" value={String(totalQty)} />
          <Stat label="Weight" value={`${weight(totalWeight)} g`} />
          <Stat label="Total Cost" value={money(totalCost)} tone="red" />
        </div>
        <Link href="/purchases/new" className={buttonClassName("primary", "px-5 py-2.5")}>
          <Plus className="h-4 w-4" />
          Add New Purchase
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Register</CardTitle>
          <CardDescription>Receipt-style purchase entries saved through the purchase form.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-ebony-100 bg-white">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-ebony-50 text-left text-xs font-bold uppercase tracking-widest text-ebony-700">
                <tr>
                  <th className="px-5 py-4">No</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">GSM</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Subcategory</th>
                  <th className="px-5 py-4 text-right">Qty</th>
                  <th className="px-5 py-4">Carat</th>
                  <th className="px-5 py-4 text-right">Gold Wt</th>
                  <th className="px-5 py-4 text-right">Cost</th>
                  <th className="px-5 py-4">Action</th>
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
                      <div className="font-semibold text-ebony-900">{purchase.gsmCode ?? "-"}</div>
                      <div className="text-xs text-ebony-600">{purchase.gsmName ?? "-"}</div>
                    </td>
                    <td className="px-5 py-4 text-ebony-700">
                      <div className="font-semibold text-ebony-900">{purchase.categoryCode ?? "-"}</div>
                      <div className="text-xs text-ebony-600">{purchase.articleName ?? "-"}</div>
                    </td>
                    <td className="px-5 py-4 text-ebony-700">
                      <div className="font-semibold text-ebony-900">{purchase.subcategoryCode ?? "-"}</div>
                      <div className="text-xs text-ebony-600">{purchase.subcategoryName ?? "-"}</div>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-ebony-800">{purchase.qty}</td>
                    <td className="px-5 py-4 text-ebony-700">{purchase.carat ?? "-"}</td>
                    <td className="px-5 py-4 text-right tabular-nums text-ebony-700">{weight(purchase.goldWeight)} g</td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-ebony-900">{money(purchase.totalCost)}</td>
                    <td className="px-5 py-4">
                      <Link href={`/purchases/${purchase.id}`} className={buttonClassName("secondary", "px-4 py-2 text-xs")}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {purchases.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={10}>
                      No purchases yet. Start by creating the first entry.
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
        "min-w-40 rounded-lg border bg-white px-4 py-3 shadow-sm",
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

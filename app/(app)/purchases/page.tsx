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

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function text(value: unknown) {
  if (value == null) return "-";
  const raw = String(value).trim();
  return raw || "-";
}

export default async function PurchasesPage() {
  const purchases = await prismaWithRetry((p) =>
    p.purchase.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      include: { supplier: true }
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

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Purchase Register</CardTitle>
          <CardDescription>Receipt-style purchase entries saved through the purchase form.</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden">
          <div className="max-w-full overflow-hidden rounded-lg border border-ebony-100 bg-white">
            <div className="max-w-full overflow-x-auto">
              <table className="min-w-[2600px] table-fixed text-xs">
                <thead className="bg-ebony-50 text-left text-[10px] font-bold uppercase tracking-wide text-ebony-700">
                  <tr>
                    <th className="w-24 px-3 py-3">ID</th>
                    <th className="w-36 px-3 py-3">Purchase No</th>
                    <th className="w-28 px-3 py-3">Date</th>
                    <th className="w-32 px-3 py-3">Location</th>
                    <th className="w-24 px-3 py-3">GSM Code</th>
                    <th className="w-40 px-3 py-3">GSM Name</th>
                    <th className="w-28 px-3 py-3">Category</th>
                    <th className="w-40 px-3 py-3">Article</th>
                    <th className="w-32 px-3 py-3">Subcategory</th>
                    <th className="w-44 px-3 py-3">Subcategory Name</th>
                    <th className="w-20 px-3 py-3 text-right">Qty</th>
                    <th className="w-44 px-3 py-3">Description</th>
                    <th className="w-20 px-3 py-3">Carat</th>
                    <th className="w-24 px-3 py-3">Wastage</th>
                    <th className="w-28 px-3 py-3 text-right">Gold Wt</th>
                    <th className="w-28 px-3 py-3 text-right">Gold Cost</th>
                    <th className="w-28 px-3 py-3 text-right">Wastage Mg</th>
                    <th className="w-28 px-3 py-3 text-right">Wastage</th>
                    <th className="w-32 px-3 py-3 text-right">Labour</th>
                    <th className="w-32 px-3 py-3 text-right">Other Costs</th>
                    <th className="w-32 px-3 py-3 text-right">Total Cost</th>
                    <th className="w-44 px-3 py-3">Remarks</th>
                    <th className="w-40 px-3 py-3">Supplier</th>
                    <th className="w-28 px-3 py-3">Purchase Gold</th>
                    <th className="w-24 px-3 py-3 text-right">Total Items</th>
                    <th className="w-28 px-3 py-3 text-right">Total Wt</th>
                    <th className="w-32 px-3 py-3 text-right">Sub Total</th>
                    <th className="w-32 px-3 py-3 text-right">Other Charges</th>
                    <th className="w-32 px-3 py-3 text-right">Total Amount</th>
                    <th className="w-32 px-3 py-3 text-right">Paid</th>
                    <th className="w-32 px-3 py-3 text-right">Balance Due</th>
                    <th className="w-44 px-3 py-3">Notes</th>
                    <th className="w-36 px-3 py-3">Created</th>
                    <th className="w-36 px-3 py-3">Updated</th>
                    <th className="sticky right-0 w-24 bg-ebony-50 px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ebony-100">
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="bg-white hover:bg-cream-50/60 transition-colors">
                    <td className="px-3 py-3 tabular-nums text-ebony-700">{purchase.id}</td>
                    <td className="px-3 py-3">
                      <Link href={`/purchases/${purchase.id}`} className="font-semibold text-indigo-900 hover:underline">
                        {purchase.purchaseNo}
                      </Link>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-ebony-700">{formatDate(purchase.purchaseDate)}</td>
                    <TextCell value={purchase.location} />
                    <TextCell value={purchase.gsmCode} strong />
                    <TextCell value={purchase.gsmName} />
                    <TextCell value={purchase.categoryCode} strong />
                    <TextCell value={purchase.articleName} />
                    <TextCell value={purchase.subcategoryCode} strong />
                    <TextCell value={purchase.subcategoryName} />
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-ebony-800">{purchase.qty}</td>
                    <TextCell value={purchase.description} />
                    <TextCell value={purchase.carat} />
                    <td className="px-3 py-3 font-semibold text-ebony-800">{purchase.wastageYN ? "Y" : "N"}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ebony-700">{weight(purchase.goldWeight)} g</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ebony-700">{money(purchase.goldCost)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ebony-700">{weight(purchase.wastageMg)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ebony-700">{money(purchase.wastage)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ebony-700">{money(purchase.labourCharges)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ebony-700">{money(purchase.otherCosts)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-ebony-900">{money(purchase.totalCost)}</td>
                    <TextCell value={purchase.remarks} />
                    <TextCell value={purchase.supplier?.name ?? purchase.supplierId} />
                    <TextCell value={purchase.purchaseGold} />
                    <td className="px-3 py-3 text-right tabular-nums text-ebony-700">{purchase.totalItems}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ebony-700">{weight(purchase.totalWeight)} g</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ebony-700">{money(purchase.subTotal)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ebony-700">{money(purchase.otherCharges)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-ebony-900">{money(purchase.totalAmount)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ebony-700">{money(purchase.paidAmount)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-red-600">{money(purchase.balanceDue)}</td>
                    <TextCell value={purchase.notes} />
                    <td className="px-3 py-3 tabular-nums text-ebony-700">{formatDateTime(purchase.createdAt)}</td>
                    <td className="px-3 py-3 tabular-nums text-ebony-700">{formatDateTime(purchase.updatedAt)}</td>
                    <td className="sticky right-0 bg-white px-3 py-3 shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.35)]">
                      <Link href={`/purchases/${purchase.id}`} className={buttonClassName("secondary", "px-4 py-2 text-xs")}>
                        View
                      </Link>
                    </td>
                    </tr>
                  ))}
                  {purchases.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={35}>
                        No purchases yet. Start by creating the first entry.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TextCell({ value, strong = false }: { value: unknown; strong?: boolean }) {
  return (
    <td
      className={[
        "truncate px-3 py-3 text-ebony-700",
        strong ? "font-semibold text-ebony-900" : ""
      ].join(" ")}
      title={text(value)}
    >
      {text(value)}
    </td>
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

import Link from "next/link";
import { Eye, Pencil, Plus } from "lucide-react";
import { PurchaseDeleteButton } from "@/components/app/PurchaseDeleteButton";
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
  const purchaseGroups = Array.from(
    purchases
      .reduce((map, purchase) => {
        const key = purchase.purchaseGroupNo ?? purchase.purchaseNo;
        const current =
          map.get(key) ??
          ({
            ...purchase,
            purchaseNo: key,
            qty: 0,
            goldWeight: 0,
            goldCost: 0,
            wastageMg: 0,
            wastage: 0,
            labourCharges: 0,
            totalCost: 0,
            totalItems: 0,
            totalWeight: 0,
            subTotal: 0,
            purchaseAmount: 0,
            lineCount: 0,
            subcategoryCode: "",
            subcategoryName: ""
          } as typeof purchase & {
            goldWeight: number;
            goldCost: number;
            wastageMg: number;
            wastage: number;
            labourCharges: number;
            totalCost: number;
            totalWeight: number;
            subTotal: number;
            purchaseAmount: number;
            lineCount: number;
          });
        current.qty += Number(purchase.qty ?? 0);
        current.goldWeight += Number(purchase.goldWeight?.toString?.() ?? 0);
        current.goldCost += Number(purchase.goldCost?.toString?.() ?? 0);
        current.wastageMg += Number(purchase.wastageMg?.toString?.() ?? 0);
        current.wastage += Number(purchase.wastage?.toString?.() ?? 0);
        current.labourCharges += Number(purchase.labourCharges?.toString?.() ?? 0);
        const rowTotal =
          Number(purchase.goldCost?.toString?.() ?? 0) +
          Number(purchase.wastage?.toString?.() ?? 0) +
          Number(purchase.labourCharges?.toString?.() ?? 0);
        current.totalCost += rowTotal;
        current.totalItems += Number(purchase.qty ?? 0);
        current.totalWeight += Number(purchase.goldWeight?.toString?.() ?? 0);
        current.subTotal += rowTotal;
        current.purchaseAmount += rowTotal;
        current.lineCount += 1;
        current.subcategoryCode = current.lineCount > 1 ? `${current.lineCount} items` : purchase.subcategoryCode ?? "";
        current.subcategoryName = current.lineCount > 1 ? "Multiple items" : purchase.subcategoryName ?? "";
        map.set(key, current);
        return map;
      }, new Map<string, any>())
      .values()
  );

  const totalPurchases = purchaseGroups.length;
  const totalQty = purchaseGroups.reduce((sum, purchase) => sum + Number(purchase.qty ?? 0), 0);
  const totalWeight = purchaseGroups.reduce((sum, purchase) => sum + Number(purchase.goldWeight ?? 0), 0);
  const totalCost = purchaseGroups.reduce((sum, purchase) => sum + Number(purchase.totalCost ?? 0), 0);

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
              <table className="min-w-[1040px] table-fixed text-sm">
                <thead className="bg-ebony-50 text-left text-[10px] font-bold uppercase tracking-wide text-ebony-700">
                  <tr>
                    <th className="w-36 px-3 py-3">Purchase No</th>
                    <th className="w-28 px-3 py-3">Date</th>
                    <th className="w-24 px-3 py-3">Type</th>
                    <th className="w-24 px-3 py-3">GSM Code</th>
                    <th className="w-40 px-3 py-3">GSM Name</th>
                    <th className="w-40 px-3 py-3">Supplier</th>
                    <th className="w-28 px-3 py-3">Location</th>
                    <th className="w-20 px-3 py-3 text-right">Rows</th>
                    <th className="w-20 px-3 py-3 text-right">Qty</th>
                    <th className="w-32 px-3 py-3 text-right">Gold Wt</th>
                    <th className="w-36 px-3 py-3 text-right">Purchase Amount</th>
                    <th className="sticky right-0 w-36 bg-ebony-50 px-3 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ebony-100">
                  {purchaseGroups.map((purchase) => (
                    <tr key={purchase.id} className="bg-white hover:bg-cream-50/60 transition-colors">
                    <td className="px-3 py-3">
                      <Link href={`/purchases/${purchase.id}`} className="font-semibold text-indigo-900 hover:underline">
                        {purchase.purchaseNo}
                      </Link>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-ebony-700">{formatDate(purchase.purchaseDate)}</td>
                    <TextCell value={purchase.purchaseType} strong />
                    <TextCell value={purchase.gsmCode} strong />
                    <TextCell value={purchase.gsmName} />
                    <TextCell value={purchase.supplier?.name ?? purchase.supplierId} />
                    <TextCell value={purchase.location} />
                    <td className="px-3 py-3 text-right tabular-nums text-ebony-700">{purchase.lineCount}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-ebony-800">{purchase.qty}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ebony-700">{weight(purchase.goldWeight)} g</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-ebony-900">{money(purchase.purchaseAmount)}</td>
                    <td className="sticky right-0 bg-white px-3 py-3 text-center shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.35)]">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/purchases/${purchase.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ebony-200 bg-white text-ebony-700 transition hover:bg-ebony-50"
                          aria-label={`View purchase ${purchase.purchaseNo}`}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/purchases/${purchase.id}?edit=1`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ebony-200 bg-white text-ebony-700 transition hover:bg-ebony-50"
                          aria-label={`Edit purchase ${purchase.purchaseNo}`}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <PurchaseDeleteButton purchaseId={purchase.id} purchaseNo={purchase.purchaseNo} />
                      </div>
                    </td>
                    </tr>
                  ))}
                  {purchaseGroups.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={12}>
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

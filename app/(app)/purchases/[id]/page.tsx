import Link from "next/link";
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

function dateText(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(value);
}

export default async function PurchaseViewPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return <div className="rounded-lg border border-ebony-200 bg-white p-5 text-sm font-semibold text-ebony-700">Invalid purchase id.</div>;
  }

  const purchase = await prismaWithRetry((p) =>
    p.purchase.findUnique({
      where: { id },
      include: { supplier: true, items: { orderBy: { id: "asc" } } }
    })
  );

  if (!purchase) {
    return <div className="rounded-lg border border-ebony-200 bg-white p-5 text-sm font-semibold text-ebony-700">Purchase not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/purchases" className={buttonClassName("secondary", "px-5 py-2.5")}>
          ← Back to Purchases
        </Link>
      </div>

      <div className="grid gap-6">
        {/* Purchase Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Purchase #{purchase.purchaseNo}</CardTitle>
                <CardDescription>Purchase dated {dateText(purchase.purchaseDate)}</CardDescription>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold text-ebony-700">Total Amount</div>
                <div className="text-xl font-bold text-gold-700">{money(purchase.totalAmount)}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Purchase No" value={purchase.purchaseNo} />
              <DetailItem label="Date" value={dateText(purchase.purchaseDate)} />
              <DetailItem label="Supplier" value={purchase.supplier?.name ?? "-"} />
              <DetailItem label="GSM Code" value={purchase.gsmCode ?? "-"} />
              <DetailItem label="GSM Name" value={purchase.gsmName ?? "-"} />
              <DetailItem label="Category" value={purchase.categoryCode ? `${purchase.categoryCode} - ${purchase.articleName}` : "-"} />
              <DetailItem label="Subcategory" value={purchase.subcategoryCode ? `${purchase.subcategoryCode} - ${purchase.subcategoryName}` : "-"} />
              <DetailItem label="Location" value={purchase.location ?? "-"} />
              <DetailItem label="Carat" value={purchase.carat ? String(purchase.carat) : "-"} />
            </div>
          </CardContent>
        </Card>

        {/* Item Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Quantity" value={String(purchase.qty)} />
                <DetailItem label="Gold Weight (g)" value={weight(purchase.goldWeight)} />
                <DetailItem label="Gold Cost (Rs)" value={money(purchase.goldCost)} />
              </div>
              {purchase.description && (
                <div className="rounded-md border border-ebony-200 bg-ebony-50 p-3">
                  <div className="text-xs font-semibold text-ebony-700">Description</div>
                  <div className="text-sm text-ebony-800">{purchase.description}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown Card */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-ebony-100 pb-3">
                <span className="text-ebony-700">Gold Cost</span>
                <span className="font-semibold text-ebony-900 tabular-nums">{money(purchase.goldCost)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-ebony-100 pb-3">
                <span className="text-ebony-700">Wastage (mg)</span>
                <span className="font-semibold text-ebony-900 tabular-nums">{weight(purchase.wastageMg)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-ebony-100 pb-3">
                <span className="text-ebony-700">Labour Charges</span>
                <span className="font-semibold text-ebony-900 tabular-nums">{money(purchase.labourCharges)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-ebony-100 pb-3">
                <span className="text-ebony-700">Other Costs</span>
                <span className="font-semibold text-ebony-900 tabular-nums">{money(purchase.otherCosts)}</span>
              </div>
              <div className="flex items-center justify-between bg-ebony-50 px-3 py-2 rounded-md">
                <span className="font-semibold text-ebony-900">Total Cost</span>
                <span className="text-lg font-bold text-ebony-900 tabular-nums">{money(purchase.totalCost)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-ebony-700">Total Amount</span>
                <span className="font-semibold text-ebony-900 tabular-nums">{money(purchase.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ebony-700">Paid Amount</span>
                <span className="font-semibold text-ebony-900 tabular-nums">{money(purchase.paidAmount)}</span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-yellow-50 px-3 py-2">
                <span className="font-semibold text-ebony-900">Balance Due</span>
                <span className={`text-lg font-bold tabular-nums ${Number(purchase.balanceDue) > 0 ? "text-red-600" : "text-green-600"}`}>
                  {money(purchase.balanceDue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remarks Card */}
        {purchase.remarks && (
          <Card>
            <CardHeader>
              <CardTitle>Remarks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-ebony-200 bg-ebony-50 p-3 text-sm text-ebony-800">
                {purchase.remarks}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-ebony-600">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ebony-900">{value}</div>
    </div>
  );
}

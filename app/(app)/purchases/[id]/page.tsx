import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { buttonClassName } from "@/components/ui/Button";
import { prismaWithRetry } from "@/lib/prisma";
import { ReceiptForm } from "@/components/app/ReceiptForm";

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

function dateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function PurchaseViewPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { edit?: string };
}) {
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
  const purchaseGroupNo = purchase.purchaseGroupNo ?? purchase.purchaseNo;
  const purchaseRows = await prismaWithRetry((p) =>
    p.purchase.findMany({
      where: { OR: [{ purchaseGroupNo }, { purchaseNo: purchaseGroupNo }] },
      orderBy: [{ id: "asc" }],
      include: { supplier: true }
    })
  );
  const groupedRows = purchaseRows.length ? purchaseRows : [purchase];
  const totalQty = groupedRows.reduce((sum, row) => sum + Number(row.qty ?? 0), 0);
  const totalGoldWeight = groupedRows.reduce((sum, row) => sum + Number(row.goldWeight?.toString?.() ?? 0), 0);
  const totalGoldCost = groupedRows.reduce((sum, row) => sum + Number(row.goldCost?.toString?.() ?? 0), 0);
  const totalWastageMg = groupedRows.reduce((sum, row) => sum + Number(row.wastageMg?.toString?.() ?? 0), 0);
  const totalLabour = groupedRows.reduce((sum, row) => sum + Number(row.labourCharges?.toString?.() ?? 0), 0);
  const totalOtherCosts = groupedRows.reduce((sum, row) => sum + Number(row.otherCosts?.toString?.() ?? 0), 0);
  const totalCost = groupedRows.reduce((sum, row) => sum + Number(row.totalCost?.toString?.() ?? 0), 0);

  const isEditing = searchParams?.edit === "1";
  const formId = "purchase-edit-form";

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/purchases/${purchase.id}`} className={buttonClassName("secondary", "px-5 py-2.5")}>
            Cancel
          </Link>
          <button
            type="submit"
            form={formId}
            className={buttonClassName("primary", "px-5 py-2.5")}
          >
            Save Changes
          </button>
        </div>

        <ReceiptForm
          mode="edit"
          receiptId={purchase.id}
          submitPath="/api/purchases"
          redirectPath={`/purchases/${purchase.id}`}
          title={`Edit Purchase #${purchase.purchaseNo}`}
          description="Update purchase receipt details."
          submitLabel="Save Changes"
          layout="table"
          formId={formId}
          initialValues={{
            purchaseType: purchase.purchaseType === "Rate" ? "Rate" : "Gold",
            transactionDate: dateInputValue(purchase.purchaseDate),
            location: purchase.location ?? "",
            gsmCode: purchase.gsmCode ?? "",
            gsmName: purchase.gsmName ?? "",
            categoryCode: "",
            articleName: "",
            subcategoryCode: "",
            qty: "0",
            description: "",
            carat: "",
            wastageYN: "N",
            goldWeight: "0",
            wastageMg: "0",
            labourCharges: "0",
            otherCosts: "0",
            remarks: purchase.remarks ?? ""
          }}
          initialLines={groupedRows.map((row) => ({
            categoryCode: row.categoryCode ?? "",
            articleName: row.articleName ?? "",
            subcategoryCode: row.subcategoryCode ?? "",
            qty: String(row.qty ?? "0"),
            description: row.description ?? row.subcategoryName ?? "",
            carat: row.carat ? String(row.carat) : "",
            wastageYN: row.wastageYN ? "Y" : "N",
            goldWeight: row.goldWeight.toString(),
            wastageMg: row.wastageMg.toString(),
            labourCharges: row.labourCharges.toString(),
            otherCosts: row.otherCosts.toString()
          }))}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/purchases" className={buttonClassName("secondary", "px-5 py-2.5")}>
          ← Back to Purchases
        </Link>
        <Link href={`/purchases/${purchase.id}?edit=1`} className={buttonClassName("primary", "px-5 py-2.5")}>
          Edit Purchase
        </Link>
      </div>

      <div className="grid gap-6">
        {/* Purchase Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Purchase #{purchaseGroupNo}</CardTitle>
                <CardDescription>Purchase dated {dateText(purchase.purchaseDate)}</CardDescription>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold text-ebony-700">Total Amount</div>
                <div className="text-xl font-bold text-gold-700">{money(totalCost)}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Purchase No" value={purchaseGroupNo} />
              <DetailItem label="Purchase Type" value={purchase.purchaseType === "Rate" ? "Rate" : "Gold"} />
              <DetailItem label="Date" value={dateText(purchase.purchaseDate)} />
              <DetailItem label="Supplier" value={purchase.supplier?.name ?? "-"} />
              <DetailItem label="GSM Code" value={purchase.gsmCode ?? "-"} />
              <DetailItem label="GSM Name" value={purchase.gsmName ?? "-"} />
              <DetailItem label="Rows" value={String(groupedRows.length)} />
              <DetailItem label="Location" value={purchase.location ?? "-"} />
            </div>
          </CardContent>
        </Card>

        {/* Item Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-ebony-100">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-ebony-50 text-left text-xs font-bold uppercase tracking-wide text-ebony-600">
                  <tr>
                    <th className="px-3 py-3">Subcategory</th>
                    <th className="px-3 py-3">Carat</th>
                    <th className="px-3 py-3 text-right">Qty</th>
                    <th className="px-3 py-3 text-right">Gold Wt</th>
                    <th className="px-3 py-3 text-right">Gold Cost</th>
                    <th className="px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ebony-100">
                  {groupedRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-3 font-semibold text-ebony-900">{row.subcategoryCode} - {row.subcategoryName}</td>
                      <td className="px-3 py-3 text-ebony-700">{row.carat ?? "-"}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.qty}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{weight(row.goldWeight)} g</td>
                      <td className="px-3 py-3 text-right tabular-nums">{money(row.goldCost)}</td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums">{money(row.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <span className="font-semibold text-ebony-900 tabular-nums">{money(totalGoldCost)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-ebony-100 pb-3">
                <span className="text-ebony-700">Wastage (mg)</span>
                <span className="font-semibold text-ebony-900 tabular-nums">{weight(totalWastageMg)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-ebony-100 pb-3">
                <span className="text-ebony-700">Labour Charges</span>
                <span className="font-semibold text-ebony-900 tabular-nums">{money(totalLabour)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-ebony-100 pb-3">
                <span className="text-ebony-700">Other Costs</span>
                <span className="font-semibold text-ebony-900 tabular-nums">{money(totalOtherCosts)}</span>
              </div>
              <div className="flex items-center justify-between bg-ebony-50 px-3 py-2 rounded-md">
                <span className="font-semibold text-ebony-900">Total Cost</span>
                <span className="text-lg font-bold text-ebony-900 tabular-nums">{money(totalCost)}</span>
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
                <span className="font-semibold text-ebony-900 tabular-nums">{money(totalCost)}</span>
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

import { PrintButton } from "@/components/app/PrintButton";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { prismaWithRetry } from "@/lib/prisma";
import Link from "next/link";

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

function invoiceDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(value);
}

function decimalKey(value: unknown) {
  return value && typeof (value as any).toString === "function" ? (value as any).toString() : String(value ?? "");
}

function caratNumber(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/K(T)?$/, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export default async function SaleViewPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
          <CardDescription>Invalid id.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const sale = await prismaWithRetry((p) =>
    p.salesNTX.findUnique({
      where: { id },
      include: {
        customer: true,
        salesman: true,
        items: {
          orderBy: [{ id: "asc" }],
          include: { purchase: true, stockMaster: true }
        },
        goldReceipts: { orderBy: [{ id: "asc" }] }
      }
    })
  );

  if (!sale) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
          <CardDescription>Not found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const accountTransactions = await prismaWithRetry((p) =>
    p.transaction.findMany({
      where: {
        referenceNumber: sale.saleNo,
        type: { in: ["INVOICE", "PAYMENT"] },
        ...(sale.customer.accountNumber ? { accountNumber: sale.customer.accountNumber } : {})
      },
      select: { type: true, credit: true }
    })
  );

  const total24KtWeight = Number(sale.totalNetWeight.toString());
  const grandTotal = Number(sale.sellSubTotal.toString());
  const isRateSale = accountTransactions.some((tx) => tx.type === "INVOICE");
  const isGoldReceipt = !isRateSale && sale.goldTransactionType === "RECEIVED";
  const paidAmount = isRateSale
    ? accountTransactions
        .filter((tx) => tx.type === "PAYMENT")
        .reduce((sum, tx) => sum + Number(tx.credit.toString()), 0)
    : 0;
  const balanceDue = Math.max(0, grandTotal - paidAmount);
  const invoiceItems = Array.from(
    sale.items
      .reduce((map, item) => {
        const key = [item.subcategoryCode, item.carat ?? "", decimalKey(item.sellRatePer8g)].join("||");
        const current = map.get(key);
        if (!current) {
          map.set(key, {
            id: item.id,
            description: item.purchase?.subcategoryName || item.stockMaster?.subcategoryName || item.subcategoryCode,
            subcategoryCode: item.subcategoryCode,
            carat: item.carat,
            goldWeight: Number(item.goldWeight.toString()),
            sellRatePer8g: Number(item.sellRatePer8g.toString()),
            pureGoldWeight: (Number(item.goldWeight.toString()) * caratNumber(item.carat)) / 24,
            sellCost: Number(item.sellCost.toString())
          });
          return map;
        }
        current.goldWeight += Number(item.goldWeight.toString());
        current.pureGoldWeight += (Number(item.goldWeight.toString()) * caratNumber(item.carat)) / 24;
        current.sellCost += Number(item.sellCost.toString());
        return map;
      }, new Map<string, { id: number; description: string; subcategoryCode: string; carat: string | null; goldWeight: number; pureGoldWeight: number; sellRatePer8g: number; sellCost: number }>())
      .values()
  );

  return (
    <div className="space-y-4 print:bg-white">
      <style>{`
        @media print {
          body { background: #fff !important; }
          body * { visibility: hidden; }
          .invoice-print, .invoice-print * { visibility: visible; }
          .invoice-print {
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            box-shadow: none !important;
            border: 1px solid #111827 !important;
          }
          .invoice-page-shell { padding: 0 !important; }
          @page { size: A4 portrait; margin: 12mm; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/sales"
          className="rounded-lg border border-ebony-300 bg-white px-5 py-2.5 text-sm font-semibold text-ebony-700 transition-all hover:bg-ebony-50"
        >
          Back to Invoices
        </Link>
        <PrintButton />
      </div>

      <div className="invoice-page-shell mx-auto max-w-5xl">
        <section className="invoice-print rounded-xl border-2 border-ebony-800 bg-white p-6 shadow-sm">
          <header className="grid gap-4 border-b border-ebony-300 pb-4 md:grid-cols-[1fr_auto]">
            <div className="flex items-start gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold-200 bg-gold-50 text-xl font-extrabold text-gold-700">
                JP
              </div>
              <div>
                <div className="text-4xl font-extrabold leading-none text-gold-700">Jewel Pack</div>
                <div className="mt-2 h-px w-80 max-w-full bg-ebony-200" />
                <div className="mt-2 text-xs font-semibold leading-5 text-ebony-700">
                  No. 123 Main Street, Colombo
                  <br />
                  Tel: 011-2345678 | Email: info@jewelpack.lk
                </div>
              </div>
            </div>

            <div className="min-w-64 text-sm">
              <div className="mb-3 text-right text-2xl font-extrabold tracking-wide text-ebony-900">INVOICE</div>
              <div className="grid grid-cols-[6rem_1fr] gap-y-1 text-xs font-semibold text-ebony-800">
                <span>Invoice No</span>
                <span>: {sale.saleNo}</span>
                <span>Date</span>
                <span>: {invoiceDate(sale.transactionDate)}</span>
                <span>Customer</span>
                <span>: {sale.customer.name}</span>
                <span>Mobile</span>
                <span>: {sale.customer.phone || "-"}</span>
                <span>Salesman</span>
                <span>: {sale.salesman?.name || "-"}</span>
                {!isRateSale ? (
                  <>
                    <span>Gold Txn</span>
                    <span>: {sale.goldTransactionType || "-"}</span>
                  </>
                ) : null}
              </div>
            </div>
          </header>

          <div className="mt-5 overflow-hidden border border-ebony-700">
            {isGoldReceipt ? (
              <table className="w-full text-sm">
                <thead className="bg-ebony-50 text-left text-xs font-extrabold text-ebony-900">
                  <tr>
                    <th className="border border-ebony-700 px-3 py-2 text-center">#</th>
                    <th className="border border-ebony-700 px-3 py-2">Description</th>
                    <th className="border border-ebony-700 px-3 py-2 text-center">Karat</th>
                    <th className="border border-ebony-700 px-3 py-2 text-right">Gold Wt (g)</th>
                    <th className="border border-ebony-700 px-3 py-2 text-right">24KT Wt (g)</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.goldReceipts.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border border-ebony-700 px-3 py-2 text-center font-semibold">{index + 1}</td>
                      <td className="border border-ebony-700 px-3 py-2">{item.description}</td>
                      <td className="border border-ebony-700 px-3 py-2 text-center">{item.carat}</td>
                      <td className="border border-ebony-700 px-3 py-2 text-right tabular-nums">{weight(item.goldWeight)}</td>
                      <td className="border border-ebony-700 px-3 py-2 text-right font-semibold tabular-nums">
                        {weight(item.pureGoldWeight)}
                      </td>
                    </tr>
                  ))}
                  {sale.goldReceipts.length === 0 ? (
                    <tr>
                      <td className="border border-ebony-700 px-3 py-6 text-center text-ebony-600" colSpan={5}>
                        No items.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
              <thead className="bg-ebony-50 text-left text-xs font-extrabold text-ebony-900">
                <tr>
                  <th className="border border-ebony-700 px-3 py-2 text-center">#</th>
                  <th className="border border-ebony-700 px-3 py-2">Description</th>
                  <th className="border border-ebony-700 px-3 py-2 text-center">Karat</th>
                  <th className="border border-ebony-700 px-3 py-2 text-right">24KT Wt (g)</th>
                  {isRateSale ? (
                    <>
                      <th className="border border-ebony-700 px-3 py-2 text-right">Rate (/Per g)</th>
                      <th className="border border-ebony-700 px-3 py-2 text-right">Amount (LKR)</th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item, index) => {
                  const ratePerGram = item.sellRatePer8g / 8;
                  return (
                    <tr key={item.id}>
                      <td className="border border-ebony-700 px-3 py-2 text-center font-semibold">{index + 1}</td>
                    <td className="border border-ebony-700 px-3 py-2">
                        {item.description}
                      </td>
                      <td className="border border-ebony-700 px-3 py-2 text-center">{item.carat || "-"}</td>
                      <td className="border border-ebony-700 px-3 py-2 text-right tabular-nums">{weight(item.pureGoldWeight)}</td>
                      {isRateSale ? (
                        <>
                          <td className="border border-ebony-700 px-3 py-2 text-right tabular-nums">{money(ratePerGram)}</td>
                          <td className="border border-ebony-700 px-3 py-2 text-right font-semibold tabular-nums">
                            {money(item.sellCost)}
                          </td>
                        </>
                      ) : null}
                    </tr>
                  );
                })}
                {invoiceItems.length === 0 ? (
                  <tr>
                    <td className="border border-ebony-700 px-3 py-6 text-center text-ebony-600" colSpan={isRateSale ? 6 : 4}>
                      No items.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            )}
          </div>

          <div className="mt-4 grid gap-5 md:grid-cols-[1fr_20rem]">
            <div className="flex min-h-40 flex-col justify-end text-sm font-semibold text-ebony-800">
              Thank you for your business!
            </div>

            <div className="overflow-hidden rounded-md border border-ebony-300 text-sm">
              <SummaryRow
                label="Total 24KT Weight"
                value={`${weight(total24KtWeight)} g`}
              />
              {isRateSale ? (
                <>
                  <SummaryRow label="Grand Total" value={money(grandTotal)} strong />
                  <SummaryRow label="Paid Amount" value={money(paidAmount)} />
                  <SummaryRow label="Balance Due" value={money(balanceDue)} danger />
                </>
              ) : null}
            </div>
          </div>

          {sale.remarks ? (
            <div className="mt-4 rounded-md border border-ebony-200 px-3 py-2 text-xs text-ebony-700">
              {sale.remarks}
            </div>
          ) : null}

          <footer className="mt-12 flex justify-end">
            <div className="w-48 border-t border-ebony-800 pt-2 text-center text-sm font-semibold text-ebony-800">
              Authorized Signature
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
  danger = false
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-ebony-200 px-4 py-2 last:border-b-0">
      <span className="font-semibold text-ebony-700">{label}</span>
      <span
        className={[
          "font-bold tabular-nums",
          strong ? "text-base text-ebony-900" : "text-ebony-800",
          danger ? "text-red-600" : ""
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

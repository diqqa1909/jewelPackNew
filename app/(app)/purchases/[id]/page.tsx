import Link from "next/link";
import { AutoPrint } from "@/components/app/AutoPrint";
import { PrintButton } from "@/components/app/PrintButton";
import { prismaWithRetry } from "@/lib/prisma";
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

function dateText(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(value);
}

export default async function PurchaseViewPage({ params, searchParams }: { params: { id: string }; searchParams?: { print?: string } }) {
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

  const printMode = searchParams?.print === "1";

  return (
    <div className="space-y-4 print:bg-white">
      <style>{`
        @media print {
          body { background: #fff !important; }
          body * { visibility: hidden; }
          .purchase-print, .purchase-print * { visibility: visible; }
          .purchase-print {
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            box-shadow: none !important;
            border: 1px solid #111827 !important;
          }
          .purchase-page-shell { padding: 0 !important; }
          @page { size: A4 portrait; margin: 12mm; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/purchases"
          className={buttonClassName("secondary", "px-5 py-2.5")}
        >
          Back to Purchases
        </Link>
        <PrintButton />
      </div>

      <div className="purchase-page-shell mx-auto max-w-5xl">
        <section className="purchase-print rounded-xl border-2 border-ebony-800 bg-white p-6 shadow-sm">
          <header className="grid gap-4 border-b border-ebony-300 pb-4 md:grid-cols-[1fr_auto]">
            <div className="flex items-start gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold-200 bg-gold-50 text-xl font-extrabold text-gold-700">
                JP
              </div>
              <div>
                <div className="text-4xl font-extrabold leading-none text-gold-700">Jewel Pack</div>
                <div className="mt-2 h-px w-80 max-w-full bg-ebony-200" />
                <div className="mt-2 text-xs font-semibold leading-5 text-ebony-700">
                  Purchase entry register
                  <br />
                  Tel: 011-2345678 | Email: info@jewelpack.lk
                </div>
              </div>
            </div>

            <div className="min-w-64 text-sm">
              <div className="mb-3 text-right text-2xl font-extrabold tracking-wide text-ebony-900">PURCHASE</div>
              <div className="grid grid-cols-[6rem_1fr] gap-y-1 text-xs font-semibold text-ebony-800">
                <span>Purchase No</span>
                <span>: {purchase.purchaseNo}</span>
                <span>Date</span>
                <span>: {dateText(purchase.purchaseDate)}</span>
                <span>Supplier</span>
                <span>: {purchase.supplier.name}</span>
                <span>Phone</span>
                <span>: {purchase.supplier.phone || "-"}</span>
                <span>Gold</span>
                <span>: {purchase.purchaseGold || "-"}</span>
              </div>
            </div>
          </header>

          <div className="mt-5 overflow-hidden border border-ebony-700">
            <table className="w-full text-sm">
              <thead className="bg-ebony-50 text-left text-xs font-extrabold text-ebony-900">
                <tr>
                  <th className="border border-ebony-700 px-3 py-2 text-center">#</th>
                  <th className="border border-ebony-700 px-3 py-2">Description</th>
                  <th className="border border-ebony-700 px-3 py-2 text-center">Karat</th>
                  <th className="border border-ebony-700 px-3 py-2 text-right">Weight (g)</th>
                  <th className="border border-ebony-700 px-3 py-2 text-right">Rate / g</th>
                  <th className="border border-ebony-700 px-3 py-2 text-right">Making</th>
                  <th className="border border-ebony-700 px-3 py-2 text-right">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border border-ebony-700 px-3 py-2 text-center font-semibold">{index + 1}</td>
                    <td className="border border-ebony-700 px-3 py-2">{item.description}</td>
                    <td className="border border-ebony-700 px-3 py-2 text-center">{item.karat || "-"}</td>
                    <td className="border border-ebony-700 px-3 py-2 text-right tabular-nums">{weight(item.weight)}</td>
                    <td className="border border-ebony-700 px-3 py-2 text-right tabular-nums">{money(item.ratePerGram)}</td>
                    <td className="border border-ebony-700 px-3 py-2 text-right tabular-nums">{money(item.makingPerPiece)}</td>
                    <td className="border border-ebony-700 px-3 py-2 text-right font-semibold tabular-nums">{money(item.amount)}</td>
                  </tr>
                ))}
                {purchase.items.length === 0 ? (
                  <tr>
                    <td className="border border-ebony-700 px-3 py-6 text-center text-ebony-600" colSpan={7}>
                      No items.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-5 md:grid-cols-[1fr_20rem]">
            <div className="flex min-h-40 flex-col justify-end text-sm font-semibold text-ebony-800">
              {purchase.notes ? <div className="rounded-md border border-ebony-200 px-3 py-2 text-xs">{purchase.notes}</div> : null}
            </div>

            <div className="overflow-hidden rounded-md border border-ebony-300 text-sm">
              <SummaryRow label="Total Weight" value={`${weight(purchase.totalWeight)} g`} />
              <SummaryRow label="Sub Total" value={money(purchase.subTotal)} />
              <SummaryRow label="Other Charges" value={money(purchase.otherCharges)} />
              <SummaryRow label="Total Amount" value={money(purchase.totalAmount)} strong />
              <SummaryRow label="Paid Amount" value={money(purchase.paidAmount)} />
              <SummaryRow label="Balance Due" value={money(purchase.balanceDue)} danger />
            </div>
          </div>

          <footer className="mt-12 flex justify-end">
            <div className="w-48 border-t border-ebony-800 pt-2 text-center text-sm font-semibold text-ebony-800">
              Authorized Signature
            </div>
          </footer>
        </section>
      </div>

      <AutoPrint enabled={printMode} />
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

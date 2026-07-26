import { PrintButton } from "@/components/app/PrintButton";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { prismaWithRetry } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

function weight(value: unknown) {
  const n = Number(value && typeof (value as any).toString === "function" ? (value as any).toString() : value ?? 0);
  if (!Number.isFinite(n)) return "0.000";
  return n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function noteDate(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(value);
}

export default async function GoldReceiptViewPage({ params }: { params: { grnNo: string } }) {
  const grnNo = decodeURIComponent(params.grnNo);
  const rows = await prismaWithRetry((p) =>
    p.goldReceipt.findMany({
      where: { grnNo },
      orderBy: [{ id: "asc" }],
      include: { customer: true, salesman: true }
    })
  );

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gold Received Note</CardTitle>
          <CardDescription>Not found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const header = rows[0];
  const totalGoldWeight = rows.reduce((sum, row) => sum + Number(row.goldWeight.toString()), 0);
  const total24KtWeight = rows.reduce((sum, row) => sum + Number(row.pureGoldWeight.toString()), 0);

  return (
    <div className="space-y-4 print:bg-white">
      <style>{`
        @media print {
          body { background: #fff !important; }
          body * { visibility: hidden; }
          .grn-print, .grn-print * { visibility: visible; }
          .grn-print {
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            box-shadow: none !important;
            border: 1px solid #111827 !important;
          }
          .grn-page-shell { padding: 0 !important; }
          @page { size: A4 portrait; margin: 12mm; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/gold?tab=customer"
          className="rounded-lg border border-ebony-300 bg-white px-5 py-2.5 text-sm font-semibold text-ebony-700 transition-all hover:bg-ebony-50"
        >
          Back to Gold Receipts
        </Link>
        <PrintButton />
      </div>

      <div className="grn-page-shell mx-auto max-w-5xl">
        <section className="grn-print rounded-xl border-2 border-ebony-800 bg-white p-6 shadow-sm">
          <header className="grid gap-4 border-b border-ebony-300 pb-4 md:grid-cols-[1fr_auto]">
            <div>
              <div className="text-4xl font-extrabold leading-none text-gold-700">Jewel Pack</div>
              <div className="mt-2 h-px w-80 max-w-full bg-ebony-200" />
              <div className="mt-2 text-xs font-semibold leading-5 text-ebony-700">
                No. 123 Main Street, Colombo
                <br />
                Tel: 011-2345678 | Email: info@jewelpack.lk
              </div>
            </div>

            <div className="min-w-64 text-sm">
              <div className="mb-3 text-right text-2xl font-extrabold tracking-wide text-ebony-900">
                GOLD RECEIVED NOTE
              </div>
              <div className="grid grid-cols-[6rem_1fr] gap-y-1 text-xs font-semibold text-ebony-800">
                <span>GRN No</span>
                <span>: {grnNo}</span>
                <span>Date</span>
                <span>: {noteDate(header.transactionDate)}</span>
                <span>Customer</span>
                <span>: {header.customer?.name ?? "-"}</span>
                <span>Mobile</span>
                <span>: {header.customer?.phone || "-"}</span>
                <span>Salesman</span>
                <span>: {header.salesman?.name || "-"}</span>
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
                  <th className="border border-ebony-700 px-3 py-2 text-right">Gold Wt (g)</th>
                  <th className="border border-ebony-700 px-3 py-2 text-right">24KT Wt (g)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="border border-ebony-700 px-3 py-2 text-center font-semibold">{index + 1}</td>
                    <td className="border border-ebony-700 px-3 py-2">{row.description}</td>
                    <td className="border border-ebony-700 px-3 py-2 text-center">{row.carat}</td>
                    <td className="border border-ebony-700 px-3 py-2 text-right tabular-nums">{weight(row.goldWeight)}</td>
                    <td className="border border-ebony-700 px-3 py-2 text-right font-semibold tabular-nums">
                      {weight(row.pureGoldWeight)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-ebony-50 font-extrabold">
                  <td className="border border-ebony-700 px-3 py-2 text-right" colSpan={3}>
                    Total
                  </td>
                  <td className="border border-ebony-700 px-3 py-2 text-right tabular-nums">{weight(totalGoldWeight)}</td>
                  <td className="border border-ebony-700 px-3 py-2 text-right tabular-nums">{weight(total24KtWeight)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {header.remarks ? (
            <div className="mt-4 rounded-md border border-ebony-200 px-3 py-2 text-xs text-ebony-700">
              {header.remarks}
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

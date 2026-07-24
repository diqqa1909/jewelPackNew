import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { prismaWithRetry } from "@/lib/prisma";
import { SalesTable } from "@/components/app/SalesTable";
import { buttonClassName } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (value && typeof (value as { toString(): string }).toString === "function") {
    const n = Number((value as { toString(): string }).toString());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export default async function SalesPage() {
  const sales = await prismaWithRetry((p) =>
    p.salesNTX.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { customer: true }
    })
  );
  const saleNos = sales.map((sale) => sale.saleNo);
  const accountTransactions = saleNos.length
    ? await prismaWithRetry((p) =>
        p.transaction.findMany({
          where: {
            referenceNumber: { in: saleNos },
            type: { in: ["INVOICE", "PAYMENT"] }
          },
          select: {
            referenceNumber: true,
            type: true,
            credit: true
          }
        })
      )
    : [];
  const rateSaleNos = new Set(
    accountTransactions
      .filter((tx) => tx.type === "INVOICE" && tx.referenceNumber)
      .map((tx) => tx.referenceNumber as string)
  );
  const paidBySaleNo = accountTransactions.reduce((map, payment) => {
    if (payment.type !== "PAYMENT") return map;
    const key = payment.referenceNumber ?? "";
    if (!key) return map;
    map.set(key, (map.get(key) ?? 0) + toNumber(payment.credit));
    return map;
  }, new Map<string, number>());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/sales/new"
          className={buttonClassName("primary", "px-5 py-2.5")}
        >
          New Invoice
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Invoices (header totals). Click &quot;New Invoice&quot; to add items.</CardDescription>
        </CardHeader>
        <CardContent>
          <SalesTable
            initial={sales.map((s) => {
              const grandTotal = toNumber(s.sellSubTotal);
              const isRateSale = rateSaleNos.has(s.saleNo);
              const paidAmount = paidBySaleNo.get(s.saleNo) ?? 0;
              return {
                id: s.id,
                saleNo: s.saleNo,
                salesType: isRateSale ? "Rate" : "Gold",
                transactionDate: new Date(s.transactionDate).toISOString().slice(0, 10),
                customerCode: s.customer.accountNumber ?? `CUST-${String(s.customerId).padStart(6, "0")}`,
                customerName: s.customer.name,
                totalItems: s.totalItems,
                totalQty: s.totalQty,
                totalGoldWeight: s.totalGoldWeight.toString(),
                grandTotal: grandTotal.toString(),
                paidAmount: isRateSale ? paidAmount.toString() : "0",
                balanceDue: isRateSale ? Math.max(0, grandTotal - paidAmount).toString() : "0"
              };
            })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

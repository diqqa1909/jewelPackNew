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
  const payments = saleNos.length
    ? await prismaWithRetry((p) =>
        p.transaction.findMany({
          where: {
            referenceNumber: { in: saleNos },
            type: "PAYMENT"
          },
          select: {
            referenceNumber: true,
            credit: true
          }
        })
      )
    : [];
  const paidBySaleNo = payments.reduce((map, payment) => {
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
              const paidAmount = paidBySaleNo.get(s.saleNo) ?? 0;
              return {
                id: s.id,
                saleNo: s.saleNo,
                transactionDate: new Date(s.transactionDate).toISOString().slice(0, 10),
                customerName: s.customer.name,
                totalItems: s.totalItems,
                totalQty: s.totalQty,
                totalGoldWeight: s.totalGoldWeight.toString(),
                grandTotal: grandTotal.toString(),
                paidAmount: paidAmount.toString(),
                balanceDue: Math.max(0, grandTotal - paidAmount).toString()
              };
            })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

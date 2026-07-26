import { SalesForm, type InitialSaleFormData } from "@/components/app/SalesForm";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { prismaWithRetry } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma";

export const dynamic = "force-dynamic";

function decimalKey(value: unknown) {
  return value && typeof (value as any).toString === "function" ? (value as any).toString() : String(value ?? "");
}

export default async function EditSalePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Invoice</CardTitle>
          <CardDescription>Invalid id.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const sale = await prismaWithRetry((p) =>
    p.salesNTX.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: [{ id: "asc" }],
          include: { purchase: true, stockMaster: true }
        },
        customer: true
      }
    })
  );

  if (!sale) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Invoice</CardTitle>
          <CardDescription>Not found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const txs = await prismaWithRetry((p) =>
    p.transaction.findMany({
      where: { referenceNumber: sale.saleNo, type: { in: ["INVOICE", "PAYMENT"] } },
      select: { type: true, credit: true, source: true }
    })
  );
  const isRateSale = txs.some((tx) => tx.type === "INVOICE");
  const paidAmount = txs
    .filter((tx) => tx.type === "PAYMENT")
    .reduce((sum, tx) => sum.plus(tx.credit), new Prisma.Decimal("0"));
  const paymentType = txs.find((tx) => tx.type === "PAYMENT")?.source ?? "Credit";

  const lines = Array.from(
    sale.items
      .reduce((map, item) => {
        const key = [item.subcategoryCode, item.carat ?? "", decimalKey(item.sellRatePer8g)].join("||");
        const current = map.get(key);
        if (!current) {
          map.set(key, {
            description: item.purchase?.subcategoryName || item.stockMaster?.subcategoryName || item.subcategoryCode,
            subcategoryCode: item.subcategoryCode,
            carat: item.carat ?? "",
            qty: String(item.qty ?? 0),
            goldWeight: item.goldWeight.toString(),
            stoneWeight: item.stoneWeight.toString(),
            sellRatePer8g: item.sellRatePer8g.toString()
          });
          return map;
        }
        current.qty = String(Number(current.qty) + Number(item.qty ?? 0));
        current.goldWeight = new Prisma.Decimal(current.goldWeight).plus(item.goldWeight).toString();
        current.stoneWeight = new Prisma.Decimal(current.stoneWeight).plus(item.stoneWeight).toString();
        return map;
      }, new Map<string, InitialSaleFormData["lines"][number]>())
      .values()
  );

  return (
    <SalesForm
      initialSale={{
        id: sale.id,
        saleNo: sale.saleNo,
        transactionDate: new Date(sale.transactionDate).toISOString().slice(0, 10),
        salesmanId: sale.salesmanId,
        customerId: sale.customerId,
        salesType: isRateSale ? "Rate" : "Gold",
        paymentType,
        paidAmount: paidAmount.toString(),
        remarks: sale.remarks,
        lines
      }}
    />
  );
}

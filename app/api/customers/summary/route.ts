import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const customerId = Number(url.searchParams.get("customerId"));
  if (!Number.isFinite(customerId)) return NextResponse.json({ error: "Invalid customerId" }, { status: 400 });

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const accountNumber = (customer.accountNumber ?? "").trim();
  if (!accountNumber) {
    return NextResponse.json({
      customer,
      summary: { debit: "0.00", credit: "0.00", balance: "0.00" },
      transactions: []
    });
  }

  const [agg, txs] = await Promise.all([
    prisma.transaction.aggregate({
      where: { accountNumber },
      _sum: { debit: true, credit: true }
    }),
    prisma.transaction.findMany({
      where: { accountNumber },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 50
    })
  ]);

  const debit = agg._sum.debit ?? new Prisma.Decimal("0");
  const credit = agg._sum.credit ?? new Prisma.Decimal("0");
  const balance = debit.minus(credit);

  return NextResponse.json({
    customer,
    summary: {
      debit: (agg._sum.debit?.toString() ?? "0.00"),
      credit: (agg._sum.credit?.toString() ?? "0.00"),
      balance: balance.toFixed(2)
    },
    transactions: txs.map((t) => ({
      id: t.id,
      date: new Date(t.date).toISOString().slice(0, 10),
      source: t.source,
      memo: t.memo,
      debit: t.debit.toString(),
      credit: t.credit.toString(),
      referenceNumber: t.referenceNumber,
      remarks: t.remarks
    }))
  });
}

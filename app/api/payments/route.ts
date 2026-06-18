import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function decimal(value: string | number | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return new Prisma.Decimal(trimmed === "" ? "0" : trimmed);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      customerId: number;
      amount: string;
      paymentDate: string;
      paymentType: string;
      referenceNumber: string;
      remarks: string;
    }>;

    const customerId = Number(body.customerId);
    if (!Number.isFinite(customerId)) {
      return NextResponse.json({ error: "Missing customer" }, { status: 400 });
    }

    const amount = decimal(body.amount);
    if (amount.lessThanOrEqualTo(new Prisma.Decimal("0"))) {
      return NextResponse.json({ error: "Enter a valid payment amount" }, { status: 400 });
    }

    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
    if (Number.isNaN(paymentDate.getTime())) {
      return NextResponse.json({ error: "Invalid payment date" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    const accountNumber = (customer?.accountNumber ?? "").trim();
    if (!customer || !accountNumber) {
      return NextResponse.json({ error: "Customer account not found" }, { status: 400 });
    }

    const agg = await prisma.transaction.aggregate({
      where: { accountNumber },
      _sum: { debit: true, credit: true }
    });
    const debit = agg._sum.debit ?? new Prisma.Decimal("0");
    const credit = agg._sum.credit ?? new Prisma.Decimal("0");
    const pending = debit.minus(credit);
    if (pending.lessThanOrEqualTo(new Prisma.Decimal("0"))) {
      return NextResponse.json({ error: "This customer has no pending balance" }, { status: 409 });
    }
    if (amount.greaterThan(pending)) {
      return NextResponse.json({ error: `Payment exceeds pending balance (${pending.toFixed(2)})` }, { status: 409 });
    }

    const referenceNumber = (body.referenceNumber ?? "").trim() || `PAY-${Date.now()}`;
    const paymentType = (body.paymentType ?? "Cash").trim() || "Cash";
    const transaction = await prisma.transaction.create({
      data: {
        date: paymentDate,
        source: paymentType.toUpperCase(),
        account: customer.name,
        memo: `Payment received from ${customer.name}`,
        debit: new Prisma.Decimal("0"),
        credit: amount,
        accountNumber,
        type: "PAYMENT",
        referenceNumber,
        remarks: (body.remarks ?? "").trim() || null
      }
    });

    return NextResponse.json({
      ok: true,
      transaction,
      balanceDue: pending.minus(amount).toFixed(2)
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to record payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type PurchaseLineInput = {
  description: string;
  karat?: string | null;
  weight: string;
  ratePerGram: string;
  makingPerPiece?: string | null;
};

function decimal(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return new Prisma.Decimal(trimmed === "" ? "0" : trimmed);
}

function nextPurchaseNo(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `PUR-${yyyy}${mm}${dd}-`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const preview = url.searchParams.get("preview") === "1";
  if (preview) {
    const dateRaw = (url.searchParams.get("purchaseDate") ?? "").trim();
    const date = dateRaw ? new Date(dateRaw) : new Date();
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const prefix = nextPurchaseNo(date);
    const last = await prisma.purchase.findFirst({
      where: { purchaseNo: { startsWith: prefix } },
      orderBy: { purchaseNo: "desc" }
    });
    const lastSeq = last?.purchaseNo ? Number(last.purchaseNo.slice(prefix.length)) : 0;
    const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
    const purchaseNo = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    return NextResponse.json({ purchaseNo });
  }

  const purchases = await prisma.purchase.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    include: { supplier: true, items: true }
  });

  return NextResponse.json({ purchases });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      purchaseDate: string;
      supplierId: number;
      purchaseNo: string;
      purchaseGold?: string | null;
      notes?: string | null;
      otherCharges?: string | null;
      paidAmount?: string | null;
      items: PurchaseLineInput[];
    }>;

    if (!body.purchaseDate) return NextResponse.json({ error: "Missing date" }, { status: 400 });
    const supplierId = Number(body.supplierId);
    if (!Number.isFinite(supplierId)) return NextResponse.json({ error: "Missing supplier" }, { status: 400 });

    const purchaseDate = new Date(body.purchaseDate);
    if (Number.isNaN(purchaseDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) return NextResponse.json({ error: "Invalid supplier" }, { status: 400 });

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return NextResponse.json({ error: "Add at least one row" }, { status: 400 });

    const normalized = items.map((item) => {
      const description = (item.description ?? "").trim();
      const karat = (item.karat ?? "").trim();
      const weight = decimal(item.weight);
      const ratePerGram = decimal(item.ratePerGram);
      const makingPerPiece = decimal(item.makingPerPiece ?? "0");
      if (!description) throw new Error("Missing description");
      if (weight.lessThanOrEqualTo(new Prisma.Decimal("0"))) throw new Error("Invalid weight");
      if (ratePerGram.lessThanOrEqualTo(new Prisma.Decimal("0"))) throw new Error("Invalid rate");
      return {
        description,
        karat: karat || null,
        weight,
        ratePerGram,
        makingPerPiece,
        amount: weight.mul(ratePerGram).plus(makingPerPiece)
      };
    });

    const totalWeight = normalized.reduce((sum, item) => sum.plus(item.weight), new Prisma.Decimal("0"));
    const subTotal = normalized.reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal("0"));
    const otherCharges = decimal(body.otherCharges ?? "0");
    const paidAmount = decimal(body.paidAmount ?? "0");
    const totalAmount = subTotal.plus(otherCharges);
    const balanceDue = totalAmount.minus(paidAmount);

    const result = await prisma.$transaction(async (tx) => {
      const prefix = nextPurchaseNo(purchaseDate);
      const last = await tx.purchase.findFirst({
        where: { purchaseNo: { startsWith: prefix } },
        orderBy: { purchaseNo: "desc" }
      });
      const lastSeq = last?.purchaseNo ? Number(last.purchaseNo.slice(prefix.length)) : 0;
      const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
      const purchaseNo = body.purchaseNo?.trim() || `${prefix}${String(nextSeq).padStart(4, "0")}`;

      const header = await tx.purchase.create({
        data: {
          purchaseNo,
          purchaseDate,
          supplierId,
          purchaseGold: (body.purchaseGold ?? "").trim() || null,
          totalItems: normalized.length,
          totalWeight,
          subTotal,
          otherCharges,
          totalAmount,
          paidAmount,
          balanceDue,
          notes: (body.notes ?? "").trim() || null,
          items: {
            create: normalized.map((item) => ({
              description: item.description,
              karat: item.karat,
              weight: item.weight,
              ratePerGram: item.ratePerGram,
              makingPerPiece: item.makingPerPiece,
              amount: item.amount
            }))
          }
        },
        include: { supplier: true, items: true }
      });

      return header;
    });

    return NextResponse.json({ ok: true, purchase: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to save purchase";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

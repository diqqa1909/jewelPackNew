import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type PurchasePayload = {
  transactionDate: string;
  location?: string;
  gsmCode: string;
  categoryCode: string;
  subcategoryCode: string;
  qty: string;
  description?: string;
  wastageYN: "Y" | "N";
  goldWeight: string;
  wastageMg?: string;
  labourCharges: string;
  otherCosts: string;
  remarks?: string;
};

const CARAT_VALUES = new Set(["18", "19", "20", "21", "22", "24"]);

function normalizeCarat(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/K(T)?$/, "");
}

function formatCarat(value: string) {
  return `${normalizeCarat(value)}K`;
}

function decimal(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return new Prisma.Decimal(trimmed === "" ? "0" : trimmed);
}

function nextPurchaseNo(date: Date) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `PUR-${yy}${mm}${dd}-`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const preview = url.searchParams.get("preview") === "1";
  if (preview) {
    const dateRaw = (url.searchParams.get("transactionDate") ?? "").trim();
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
    const body = (await req.json()) as Partial<PurchasePayload & { supplierId?: number }>;

    if (!body.transactionDate) return NextResponse.json({ error: "Missing date" }, { status: 400 });
    if (!body.gsmCode) return NextResponse.json({ error: "Missing goldsmith" }, { status: 400 });
    if (!body.categoryCode) return NextResponse.json({ error: "Missing category" }, { status: 400 });
    if (!body.subcategoryCode) return NextResponse.json({ error: "Missing subcategory" }, { status: 400 });

    const qty = Number(body.qty);
    if (!Number.isFinite(qty) || qty < 0) {
      return NextResponse.json({ error: "Invalid qty" }, { status: 400 });
    }

    const purchaseDate = new Date(body.transactionDate);
    if (Number.isNaN(purchaseDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const system = await prisma.system.findUnique({ where: { id: 1 } });
    const goldRatePer8g = system?.goldCostRatePer8g ?? new Prisma.Decimal("0");
    const wastageRatePerMg = system?.wastageRateMgPer8g ?? new Prisma.Decimal("0");

    const goldsmith = await prisma.goldsmith.findUnique({ where: { code: body.gsmCode } });
    const category = await prisma.category.findUnique({ where: { code: body.categoryCode } });
    const subcategory = await prisma.subcategory.findUnique({ where: { code: body.subcategoryCode } });
    if (!category) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    if (!subcategory) return NextResponse.json({ error: "Invalid subcategory" }, { status: 400 });
    const carat = normalizeCarat(subcategory.carat);
    if (!CARAT_VALUES.has(carat)) {
      return NextResponse.json(
        { error: `Carat is not set for subcategory ${subcategory.code}.` },
        { status: 400 }
      );
    }
    const caratLabel = formatCarat(carat);

    const goldWeight = decimal(body.goldWeight ?? "0");
    const wastageMg = decimal(body.wastageMg ?? "0");
    const goldCost = goldWeight.div(new Prisma.Decimal("8")).mul(goldRatePer8g);
    const wastageCost = body.wastageYN === "Y" ? wastageMg.mul(wastageRatePerMg) : new Prisma.Decimal("0");
    const labourCharges = decimal(body.labourCharges ?? "0");
    const otherCosts = decimal(body.otherCosts ?? "0");
    const totalCost = goldCost.plus(wastageCost).plus(labourCharges).plus(otherCosts);

    const result = await prisma.$transaction(async (tx) => {
      const prefix = nextPurchaseNo(purchaseDate);
      const last = await tx.purchase.findFirst({
        where: { purchaseNo: { startsWith: prefix } },
        orderBy: { purchaseNo: "desc" }
      });
      const lastSeq = last?.purchaseNo ? Number(last.purchaseNo.slice(prefix.length)) : 0;
      const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
      const purchaseNo = `${prefix}${String(nextSeq).padStart(4, "0")}`;

      const header = await tx.purchase.create({
        data: {
          purchaseNo,
          purchaseDate,
          location: (body.location ?? "").trim() || null,
          gsmCode: body.gsmCode,
          gsmName: goldsmith?.name ?? "",
          categoryCode: body.categoryCode,
          articleName: category.name,
          subcategoryCode: body.subcategoryCode,
          subcategoryName: subcategory.name,
          qty,
          description: (body.description ?? "").trim() || null,
          carat: caratLabel,
          wastageYN: body.wastageYN === "Y",
          goldWeight,
          goldCost,
          wastageMg,
          wastage: wastageCost,
          labourCharges,
          otherCosts,
          totalCost,
          remarks: (body.remarks ?? "").trim() || null,
          supplierId: body.supplierId == null ? null : Number(body.supplierId),
          purchaseGold: caratLabel,
          totalItems: qty,
          totalWeight: goldWeight,
          subTotal: totalCost,
          otherCharges: new Prisma.Decimal("0"),
          totalAmount: totalCost,
          paidAmount: new Prisma.Decimal("0"),
          balanceDue: totalCost,
          notes: (body.remarks ?? "").trim() || null
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

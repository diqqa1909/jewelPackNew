import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma";
import { NextResponse } from "next/server";

type ReceiptPayload = {
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

function decimal(value: string) {
  const trimmed = (value ?? "").trim();
  return new Prisma.Decimal(trimmed === "" ? "0" : trimmed);
}

function clampDecimalNonNegative(d: Prisma.Decimal) {
  return d.lessThan(new Prisma.Decimal("0")) ? new Prisma.Decimal("0") : d;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<ReceiptPayload>;

  if (!body.transactionDate || !body.gsmCode) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!body.categoryCode || body.qty == null) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!body.subcategoryCode) {
    return NextResponse.json({ error: "Missing subcategory." }, { status: 400 });
  }

  const qty = Number(body.qty);
  if (!Number.isFinite(qty) || qty < 0) {
    return NextResponse.json({ error: "Invalid qty." }, { status: 400 });
  }

  const system = await prisma.system.findUnique({ where: { id: 1 } });
  const goldRatePer8g = system?.goldCostRatePer8g ?? new Prisma.Decimal("0");

  const goldWeight = decimal(body.goldWeight ?? "0");
  const wastageMg = decimal(body.wastageMg ?? "0");

  const goldCost = goldWeight.div(new Prisma.Decimal("8")).mul(goldRatePer8g);
  const wastageCost =
    body.wastageYN === "Y" ? wastageMg.div(new Prisma.Decimal("8")).mul(goldRatePer8g) : new Prisma.Decimal("0");

  const labourCharges = decimal(body.labourCharges ?? "0");
  const otherCosts = decimal(body.otherCosts ?? "0");
  const totalCost = goldCost.plus(wastageCost).plus(labourCharges).plus(otherCosts);

  const gsm = await prisma.goldsmith.findUnique({ where: { code: body.gsmCode } });
  const category = await prisma.category.findUnique({ where: { code: body.categoryCode } });
  const subcategory = await prisma.subcategory.findUnique({ where: { code: body.subcategoryCode } });
  if (!category) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (!subcategory) {
    return NextResponse.json({ error: "Invalid subcategory." }, { status: 400 });
  }
  const carat = normalizeCarat(subcategory.carat);
  if (!CARAT_VALUES.has(carat)) {
    return NextResponse.json(
      { error: `Carat is not set for subcategory ${subcategory.code}.` },
      { status: 400 }
    );
  }
  const caratLabel = formatCarat(carat);

  const created = await prisma.purchase.create({
    data: {
      purchaseNo: `STK-${Date.now()}`,
      purchaseDate: new Date(body.transactionDate),
      location: (body.location ?? "").trim() || null,
      gsmCode: body.gsmCode,
      gsmName: gsm?.name ?? "",
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
      purchaseGold: caratLabel,
      totalItems: qty,
      totalWeight: goldWeight,
      subTotal: totalCost,
      otherCharges: new Prisma.Decimal("0"),
      totalAmount: totalCost,
      paidAmount: new Prisma.Decimal("0"),
      balanceDue: totalCost,
      remarks: (body.remarks ?? "").trim() || null
    }
  });

  return NextResponse.json({ ok: true, id: created.id });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const idRaw = url.searchParams.get("id");
  if (idRaw) {
    const id = Number(idRaw);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const row = await prisma.purchase.findUnique({ where: { id } });
    return NextResponse.json(
      row
        ? {
            row: {
              ...row,
              transactionDate: row.purchaseDate
            }
          }
        : { row: null }
    );
  }
  const rows = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    take: 200
  });
  return NextResponse.json({ rows });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await prisma.purchase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Partial<{
    id: number;
    transactionDate: string;
    location?: string | null;
    gsmCode: string;
    categoryCode: string;
    subcategoryCode: string;
    qty: number;
    description?: string | null;
    wastageYN: boolean;
    goldWeight: string;
    wastageMg: string;
    labourCharges: string;
    otherCosts: string;
    remarks?: string | null;
  }>;

  if (body.id == null || !Number.isFinite(Number(body.id))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  if (!body.subcategoryCode) {
    return NextResponse.json({ error: "Missing subcategory." }, { status: 400 });
  }
  if (!body.categoryCode) {
    return NextResponse.json({ error: "Missing category." }, { status: 400 });
  }

  const system = await prisma.system.findUnique({ where: { id: 1 } });
  const goldRatePer8g = system?.goldCostRatePer8g ?? new Prisma.Decimal("0");

  const goldWeight = body.goldWeight != null ? decimal(String(body.goldWeight)) : new Prisma.Decimal("0");
  const wastageMg = body.wastageMg != null ? decimal(String(body.wastageMg)) : new Prisma.Decimal("0");
  const goldCost = goldWeight.div(new Prisma.Decimal("8")).mul(goldRatePer8g);
  const wastageCost = body.wastageYN ? wastageMg.div(new Prisma.Decimal("8")).mul(goldRatePer8g) : new Prisma.Decimal("0");
  const labourCharges = body.labourCharges != null ? decimal(String(body.labourCharges)) : new Prisma.Decimal("0");
  const otherCosts = body.otherCosts != null ? decimal(String(body.otherCosts)) : new Prisma.Decimal("0");
  const totalCost = goldCost.plus(wastageCost).plus(labourCharges).plus(otherCosts);

  const gsm = body.gsmCode ? await prisma.goldsmith.findUnique({ where: { code: body.gsmCode } }) : null;
  const category = await prisma.category.findUnique({ where: { code: body.categoryCode } });
  const subcategory = await prisma.subcategory.findUnique({ where: { code: body.subcategoryCode } });
  if (!category) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (!subcategory) {
    return NextResponse.json({ error: "Invalid subcategory." }, { status: 400 });
  }
  const carat = normalizeCarat(subcategory.carat);
  if (!CARAT_VALUES.has(carat)) {
    return NextResponse.json(
      { error: `Carat is not set for subcategory ${subcategory.code}.` },
      { status: 400 }
    );
  }
  const caratLabel = formatCarat(carat);

  const existing = await prisma.purchase.findUnique({ where: { id: Number(body.id) } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.purchase.update({
    where: { id: Number(body.id) },
    data: {
      purchaseDate: body.transactionDate ? new Date(body.transactionDate) : undefined,
      location:
        body.location === undefined ? undefined : (String(body.location ?? "").trim() || null),
      gsmCode: body.gsmCode,
      gsmName: body.gsmCode ? gsm?.name ?? "" : undefined,
      categoryCode: body.categoryCode,
      articleName: category.name,
      subcategoryCode: body.subcategoryCode,
      subcategoryName: subcategory.name,
      qty: body.qty,
      description: body.description ?? undefined,
      carat: caratLabel,
      wastageYN: body.wastageYN,
      goldWeight,
      goldCost,
      wastageMg,
      wastage: wastageCost,
      labourCharges,
      otherCosts,
      totalCost,
      purchaseGold: caratLabel,
      totalItems: body.qty == null ? undefined : body.qty,
      totalWeight: body.goldWeight == null ? undefined : goldWeight,
      subTotal: totalCost,
      otherCharges: new Prisma.Decimal("0"),
      totalAmount: totalCost,
      paidAmount: existing.paidAmount ?? new Prisma.Decimal("0"),
      balanceDue: totalCost,
      remarks: body.remarks ?? undefined
    }
  });

  return NextResponse.json({
    ok: true,
    row: {
      ...updated,
      transactionDate: updated.purchaseDate
    }
  });
}

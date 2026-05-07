import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma";
import { NextResponse } from "next/server";

type ReceiptPayload = {
  transactionDate: string;
  location: string;
  gsmCode: string;
  categoryCode: string;
  subcategoryCode: string;
  qty: string;
  description?: string;
  carat?: string;
  wastageYN: "Y" | "N";
  goldWeight: string;
  wastageMg?: string;
  labourCharges: string;
  otherCosts: string;
  remarks?: string;
};

function decimal(value: string) {
  const trimmed = (value ?? "").trim();
  return new Prisma.Decimal(trimmed === "" ? "0" : trimmed);
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<ReceiptPayload>;

  if (!body.transactionDate || !body.location || !body.gsmCode) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!body.categoryCode || body.qty == null) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!body.subcategoryCode) {
    return NextResponse.json({ error: "Missing subcategory." }, { status: 400 });
  }
  if (!body.carat) {
    return NextResponse.json({ error: "Missing carat." }, { status: 400 });
  }

  const qty = Number(body.qty);
  if (!Number.isFinite(qty) || qty < 0) {
    return NextResponse.json({ error: "Invalid qty." }, { status: 400 });
  }

  const system = await prisma.system.findUnique({ where: { id: 1 } });
  const goldRatePer8g = system?.goldCostRatePer8g ?? new Prisma.Decimal("0");
  const wastageRatePerMg = system?.wastageRateMgPer8g ?? new Prisma.Decimal("0");

  const goldWeight = decimal(body.goldWeight ?? "0");
  const wastageMg = decimal(body.wastageMg ?? "0");

  const goldCost = goldWeight.div(new Prisma.Decimal("8")).mul(goldRatePer8g);
  const wastageCost =
    body.wastageYN === "Y" ? wastageMg.mul(wastageRatePerMg) : new Prisma.Decimal("0");

  const labourCharges = decimal(body.labourCharges ?? "0");
  const otherCosts = decimal(body.otherCosts ?? "0");
  const totalCost = goldCost.plus(wastageCost).plus(labourCharges).plus(otherCosts);

  const gsm = await prisma.goldsmith.findUnique({ where: { code: body.gsmCode } });
  const category = await prisma.category.findUnique({ where: { code: body.categoryCode } });
  const subcategory = await prisma.subcategory.findUnique({ where: { code: body.subcategoryCode } });

  const created = await prisma.stockMaster.create({
    data: {
      transactionDate: new Date(body.transactionDate),
      location: body.location,
      gsmCode: body.gsmCode,
      gsmName: gsm?.name ?? "",
      categoryCode: body.categoryCode,
      articleName: category?.name ?? "",
      subcategoryCode: body.subcategoryCode,
      subcategoryName: subcategory?.name ?? "",
      qty,
      description: (body.description ?? "").trim() || null,
      carat: (body.carat ?? "").trim() || null,
      wastageYN: body.wastageYN === "Y",
      goldWeight,
      goldCost,
      wastageMg,
      wastage: wastageCost,
      labourCharges,
      otherCosts,
      totalCost,
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
    const row = await prisma.stockMaster.findUnique({ where: { id } });
    return NextResponse.json({ row });
  }
  const rows = await prisma.stockMaster.findMany({
    orderBy: { createdAt: "desc" },
    take: 200
  });
  return NextResponse.json({ rows });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await prisma.stockMaster.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Partial<{
    id: number;
    transactionDate: string;
    location: string;
    gsmCode: string;
    categoryCode: string;
    subcategoryCode: string;
    qty: number;
    description?: string | null;
    carat?: string | null;
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

  const system = await prisma.system.findUnique({ where: { id: 1 } });
  const goldRatePer8g = system?.goldCostRatePer8g ?? new Prisma.Decimal("0");
  const wastageRatePerMg = system?.wastageRateMgPer8g ?? new Prisma.Decimal("0");

  const goldWeight = body.goldWeight != null ? decimal(String(body.goldWeight)) : new Prisma.Decimal("0");
  const wastageMg = body.wastageMg != null ? decimal(String(body.wastageMg)) : new Prisma.Decimal("0");
  const goldCost = goldWeight.div(new Prisma.Decimal("8")).mul(goldRatePer8g);
  const wastageCost = body.wastageYN ? wastageMg.mul(wastageRatePerMg) : new Prisma.Decimal("0");
  const labourCharges = body.labourCharges != null ? decimal(String(body.labourCharges)) : new Prisma.Decimal("0");
  const otherCosts = body.otherCosts != null ? decimal(String(body.otherCosts)) : new Prisma.Decimal("0");
  const totalCost = goldCost.plus(wastageCost).plus(labourCharges).plus(otherCosts);

  const gsm = body.gsmCode ? await prisma.goldsmith.findUnique({ where: { code: body.gsmCode } }) : null;
  const category = body.categoryCode ? await prisma.category.findUnique({ where: { code: body.categoryCode } }) : null;
  const subcategory = body.subcategoryCode
    ? await prisma.subcategory.findUnique({ where: { code: body.subcategoryCode } })
    : null;

  const updated = await prisma.stockMaster.update({
    where: { id: Number(body.id) },
    data: {
      transactionDate: body.transactionDate ? new Date(body.transactionDate) : undefined,
      location: body.location,
      gsmCode: body.gsmCode,
      gsmName: body.gsmCode ? gsm?.name ?? "" : undefined,
      categoryCode: body.categoryCode,
      articleName: body.categoryCode ? category?.name ?? "" : undefined,
      subcategoryCode: body.subcategoryCode,
      subcategoryName: body.subcategoryCode ? subcategory?.name ?? "" : undefined,
      qty: body.qty,
      description: body.description ?? undefined,
      carat: body.carat ?? undefined,
      wastageYN: body.wastageYN,
      goldWeight,
      goldCost,
      wastageMg,
      wastage: wastageCost,
      labourCharges,
      otherCosts,
      totalCost,
      remarks: body.remarks ?? undefined
    }
  });

  return NextResponse.json({ ok: true, row: updated });
}

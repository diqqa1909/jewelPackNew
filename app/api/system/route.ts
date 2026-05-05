import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma";
import { NextResponse } from "next/server";

type SystemPayload = {
  vatRate: string;
  nslRate: string;
  goldCostRatePer8g: string;
  wastageRateMgPer8g: string;
};

function decimal(value: string) {
  const trimmed = (value ?? "").trim();
  return new Prisma.Decimal(trimmed === "" ? "0" : trimmed);
}

export async function GET() {
  const row = await prisma.system.findUnique({ where: { id: 1 } });
  if (!row) return NextResponse.json({ ok: true, data: null });
  return NextResponse.json({
    ok: true,
    data: {
      vatRate: row.vatRate.toString(),
      nslRate: row.nslRate.toString(),
      goldCostRatePer8g: row.goldCostRatePer8g.toString(),
      wastageRateMgPer8g: row.wastageRateMgPer8g.toString()
    }
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<SystemPayload>;

  const updated = await prisma.system.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      vatRate: decimal(body.vatRate ?? "0"),
      nslRate: decimal(body.nslRate ?? "0"),
      goldCostRatePer8g: decimal(body.goldCostRatePer8g ?? "0"),
      wastageRateMgPer8g: decimal(body.wastageRateMgPer8g ?? "0")
    },
    update: {
      vatRate: decimal(body.vatRate ?? "0"),
      nslRate: decimal(body.nslRate ?? "0"),
      goldCostRatePer8g: decimal(body.goldCostRatePer8g ?? "0"),
      wastageRateMgPer8g: decimal(body.wastageRateMgPer8g ?? "0")
    }
  });

  return NextResponse.json({ ok: true, id: updated.id });
}

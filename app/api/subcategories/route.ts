import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categoryCode = (url.searchParams.get("categoryCode") ?? "").trim();
  const where = categoryCode ? { categoryCode } : undefined;
  const subcategories = await prisma.subcategory.findMany({
    where,
    orderBy: [{ categoryCode: "asc" }, { code: "asc" }]
  });
  return NextResponse.json({ subcategories });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<{
    name: string;
    categoryCode: string;
    imageUrl?: string | null;
    carat?: string | null;
  }>;
  const name = (body.name ?? "").trim();
  const categoryCode = (body.categoryCode ?? "").trim();
  const imageUrl = (body.imageUrl ?? null) ? String(body.imageUrl) : null;
  const caratRaw = (body.carat ?? null) ? String(body.carat) : "";
  const carat = caratRaw.trim();
  const caratValue = carat === "18K" || carat === "22K" ? carat : "";
  if (!name || !categoryCode) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!caratValue) {
    return NextResponse.json({ error: "Invalid carat. Use 18K or 22K." }, { status: 400 });
  }
  const code = `${categoryCode}-${name}`.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const subcategory = await prisma.subcategory.upsert({
    where: { code },
    create: { code, name, categoryCode, imageUrl, carat: caratValue },
    update: { name, categoryCode, imageUrl, carat: caratValue }
  });
  return NextResponse.json({ subcategory });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").trim();
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const stockCount = await prisma.stockMaster.count({ where: { subcategoryCode: code } });
  if (stockCount > 0) {
    return NextResponse.json(
      { error: `Unable to delete. Stock exists for subcategory ${code}.` },
      { status: 409 }
    );
  }

  await prisma.subcategory.delete({ where: { code } });
  return NextResponse.json({ ok: true });
}

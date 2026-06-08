import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const CARAT_VALUES = new Set(["18", "19", "20", "21", "22", "24"]);

function normalizeCarat(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/K(T)?$/, "");
}

function formatCarat(value: string) {
  return `${normalizeCarat(value)}K`;
}

function buildSubcategoryCode(categoryCode: string, name: string, carat: string) {
  return `${categoryCode}-${name}-${formatCarat(carat)}`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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
  const caratValue = normalizeCarat(body.carat ?? null);
  if (!name || !categoryCode) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!CARAT_VALUES.has(caratValue)) {
    return NextResponse.json({ error: "Invalid carat. Use 18K, 19K, 20K, 21K, 22K, or 24K." }, { status: 400 });
  }
  const caratLabel = formatCarat(caratValue);
  const code = buildSubcategoryCode(categoryCode, name, caratValue);
  const subcategory = await prisma.subcategory.upsert({
    where: { code },
    create: { code, name, categoryCode, imageUrl, carat: caratLabel },
    update: { name, categoryCode, imageUrl, carat: caratLabel }
  });
  return NextResponse.json({ subcategory });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Partial<{
    code: string;
    name: string;
    categoryCode: string;
    imageUrl?: string | null;
    carat?: string | null;
  }>;
  const code = (body.code ?? "").trim();
  const name = (body.name ?? "").trim();
  const categoryCode = (body.categoryCode ?? "").trim();
  const imageUrl = body.imageUrl === undefined ? undefined : (body.imageUrl ? String(body.imageUrl) : null);
  const caratValue = normalizeCarat(body.carat ?? null);

  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
  if (!name || !categoryCode) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!CARAT_VALUES.has(caratValue)) {
    return NextResponse.json({ error: "Invalid carat. Use 18K, 19K, 20K, 21K, 22K, or 24K." }, { status: 400 });
  }

  const existing = await prisma.subcategory.findUnique({ where: { code } });
  if (!existing) return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });

  const subcategory = await prisma.subcategory.update({
    where: { code },
    data: {
      name,
      categoryCode,
      ...(imageUrl === undefined ? {} : { imageUrl }),
      carat: formatCarat(caratValue)
    }
  });
  return NextResponse.json({ subcategory });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").trim();
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const purchaseCount = await prisma.purchase.count({ where: { subcategoryCode: code } });
  if (purchaseCount > 0) {
    return NextResponse.json(
      { error: `Unable to delete. Stock exists for subcategory ${code}.` },
      { status: 409 }
    );
  }

  await prisma.subcategory.delete({ where: { code } });
  return NextResponse.json({ ok: true });
}

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const CARAT_VALUES = new Set(["18", "19", "20", "21", "22", "24"]);

function normalizeCarat(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/K(T)?$/, "");
}

function formatCarat(value: string) {
  return `${normalizeCarat(value)}K`;
}

function codeTokens(value: string) {
  return value.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
}

function removeCategoryTokens(name: string, categoryName: string) {
  const nameTokens = codeTokens(name);
  const categoryTokens = codeTokens(categoryName);
  if (nameTokens.length === 0 || categoryTokens.length === 0) return nameTokens;

  const filtered: string[] = [];
  for (let index = 0; index < nameTokens.length; index += 1) {
    const matchesCategory = categoryTokens.every((token, offset) => nameTokens[index + offset] === token);
    if (matchesCategory) {
      index += categoryTokens.length - 1;
    } else {
      filtered.push(nameTokens[index]);
    }
  }
  return filtered;
}

function buildSubcategoryCode(categoryCode: string, name: string, categoryName: string, carat: string) {
  const subcategoryPart = removeCategoryTokens(name, categoryName).join("-");
  return [categoryCode, subcategoryPart, formatCarat(carat)]
    .filter(Boolean)
    .join("-")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function duplicateSubcategoryWhere(name: string, categoryCode: string, carat: string) {
  return {
    name: { equals: name, mode: "insensitive" as const },
    categoryCode,
    carat: formatCarat(carat)
  };
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
  const category = await prisma.category.findUnique({ where: { code: categoryCode } });
  if (!category) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  const caratLabel = formatCarat(caratValue);
  const code = buildSubcategoryCode(categoryCode, name, category.name, caratValue);
  const duplicateSubcategory = await prisma.subcategory.findFirst({
    where: {
      OR: [{ code }, duplicateSubcategoryWhere(name, categoryCode, caratValue)]
    }
  });
  if (duplicateSubcategory) {
    return NextResponse.json({ error: "Subcategory already exists" }, { status: 409 });
  }

  const subcategory = await prisma.subcategory.create({
    data: { code, name, categoryCode, imageUrl, carat: caratLabel }
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
  const imageUrl = body.imageUrl === undefined ? undefined : (body.imageUrl ? String(body.imageUrl) : null);

  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const existing = await prisma.subcategory.findUnique({ where: { code } });
  if (!existing) return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
  const caratValue = normalizeCarat(existing.carat);
  if (!CARAT_VALUES.has(caratValue)) {
    return NextResponse.json({ error: "Existing subcategory carat is invalid." }, { status: 400 });
  }

  const duplicateSubcategory = await prisma.subcategory.findFirst({
    where: {
      ...duplicateSubcategoryWhere(name, existing.categoryCode, caratValue),
      NOT: { code }
    }
  });
  if (duplicateSubcategory) {
    return NextResponse.json({ error: "Subcategory already exists" }, { status: 409 });
  }

  const subcategory = await prisma.subcategory.update({
    where: { code },
    data: {
      name,
      categoryCode: existing.categoryCode,
      ...(imageUrl === undefined ? {} : { imageUrl }),
      carat: existing.carat
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

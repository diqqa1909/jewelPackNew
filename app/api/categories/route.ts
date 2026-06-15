import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<{ code: string; name: string }>;
  const code = (body.code ?? "").trim();
  const name = (body.name ?? "").trim();
  if (!code || !name) return NextResponse.json({ error: "Missing code/name" }, { status: 400 });

  const duplicateName = await prisma.category.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      NOT: { code }
    }
  });
  if (duplicateName) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }

  const category = await prisma.category.upsert({
    where: { code },
    create: { code, name },
    update: { name }
  });
  return NextResponse.json({ category });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Partial<{ code: string; name: string }>;
  const code = (body.code ?? "").trim();
  const name = (body.name ?? "").trim();
  if (!code || !name) return NextResponse.json({ error: "Missing code/name" }, { status: 400 });

  const duplicateName = await prisma.category.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      NOT: { code }
    }
  });
  if (duplicateName) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }

  const category = await prisma.category.update({
    where: { code },
    data: { name }
  });
  return NextResponse.json({ category });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").trim();
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const purchaseCount = await prisma.purchase.count({ where: { categoryCode: code } });
  if (purchaseCount > 0) {
    return NextResponse.json(
      { error: `Unable to delete. Stock exists for category ${code}.` },
      { status: 409 }
    );
  }

  const subCount = await prisma.subcategory.count({ where: { categoryCode: code } });
  if (subCount > 0) {
    return NextResponse.json(
      { error: `Unable to delete. Subcategories exist under category ${code}.` },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { code } });
  return NextResponse.json({ ok: true });
}

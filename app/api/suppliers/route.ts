import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const suppliers = await prisma.supplier.findMany({ orderBy: [{ createdAt: "desc" }] });
  return NextResponse.json({ suppliers });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<{
    name: string;
    contact?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  }>;

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const supplier = await prisma.supplier.create({
    data: {
      name,
      contact: (body.contact ?? "").trim() || null,
      phone: (body.phone ?? "").trim() || null,
      email: (body.email ?? "").trim() || null,
      address: (body.address ?? "").trim() || null
    }
  });

  return NextResponse.json({ supplier });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Partial<{
    id: number;
    name: string;
    contact?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  }>;

  const id = Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name,
      contact: body.contact === undefined ? undefined : (String(body.contact ?? "").trim() || null),
      phone: body.phone === undefined ? undefined : (String(body.phone ?? "").trim() || null),
      email: body.email === undefined ? undefined : (String(body.email ?? "").trim() || null),
      address: body.address === undefined ? undefined : (String(body.address ?? "").trim() || null)
    }
  });

  return NextResponse.json({ supplier });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.supplier.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}


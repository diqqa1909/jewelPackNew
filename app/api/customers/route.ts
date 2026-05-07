import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const customers = await prisma.customer.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ customers });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<{
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  }>;

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const customer = await prisma.customer.create({
    data: {
      name,
      phone: (body.phone ?? "").trim() || null,
      email: (body.email ?? "").trim() || null,
      address: (body.address ?? "").trim() || null
    }
  });

  return NextResponse.json({ customer });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Partial<{
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  }>;
  const id = Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name,
      phone: body.phone === undefined ? undefined : (String(body.phone ?? "").trim() || null),
      email: body.email === undefined ? undefined : (String(body.email ?? "").trim() || null),
      address: body.address === undefined ? undefined : (String(body.address ?? "").trim() || null)
    }
  });
  return NextResponse.json({ customer });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const saleCount = await prisma.salesNTX.count({ where: { customerId: id } });
  if (saleCount > 0) {
    return NextResponse.json({ error: "Unable to delete. Sales exist for this customer." }, { status: 409 });
  }

  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}


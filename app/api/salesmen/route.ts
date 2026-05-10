import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const salesmen = await prisma.salesman.findMany({ orderBy: [{ code: "asc" }, { id: "asc" }] });
  return NextResponse.json({ salesmen });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<{ code: string; name: string }>;
  const code = (body.code ?? "").trim();
  const name = (body.name ?? "").trim();
  if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const salesman = await prisma.salesman.create({ data: { code, name } });
  return NextResponse.json({ salesman });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Partial<{ id: number; code: string; name: string }>;
  const id = Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const code = (body.code ?? "").trim();
  const name = (body.name ?? "").trim();
  if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const salesman = await prisma.salesman.update({ where: { id }, data: { code, name } });
  return NextResponse.json({ salesman });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const invoiceCount = await prisma.salesNTX.count({ where: { salesmanId: id } });
  if (invoiceCount > 0) {
    return NextResponse.json({ error: "Unable to delete. Invoices exist for this salesman." }, { status: 409 });
  }

  await prisma.salesman.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

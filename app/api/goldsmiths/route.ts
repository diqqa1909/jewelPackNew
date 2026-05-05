import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const goldsmiths = await prisma.goldsmith.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json({ goldsmiths });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<{ code: string; name: string }>;
  const code = (body.code ?? "").trim();
  const name = (body.name ?? "").trim();
  if (!code || !name) return NextResponse.json({ error: "Missing code/name" }, { status: 400 });

  const goldsmith = await prisma.goldsmith.upsert({
    where: { code },
    create: { code, name },
    update: { name }
  });
  return NextResponse.json({ goldsmith });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Partial<{ code: string; name: string }>;
  const code = (body.code ?? "").trim();
  const name = (body.name ?? "").trim();
  if (!code || !name) return NextResponse.json({ error: "Missing code/name" }, { status: 400 });

  const goldsmith = await prisma.goldsmith.update({
    where: { code },
    data: { name }
  });
  return NextResponse.json({ goldsmith });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").trim();
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
  await prisma.goldsmith.delete({ where: { code } });
  return NextResponse.json({ ok: true });
}


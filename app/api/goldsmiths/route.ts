import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const goldsmiths = await prisma.goldsmith.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json({ goldsmiths });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<{ code: string; name: string }>;
  const code = (body.code ?? "").trim().toUpperCase();
  const name = (body.name ?? "").trim();
  if (!code || !name) return NextResponse.json({ error: "Missing code/name" }, { status: 400 });

  const existing = await prisma.goldsmith.findFirst({
    where: { code: { equals: code, mode: "insensitive" } },
    select: { code: true }
  });
  if (existing) {
    return NextResponse.json({ error: `Goldsmith code ${code} already exists` }, { status: 409 });
  }

  try {
    const goldsmith = await prisma.$transaction(async (tx) => {
      const created = await tx.goldsmith.create({ data: { code, name } });
      const existingCreditor = await tx.supplier.findFirst({
        where: {
          OR: [
            { goldsmithCode: code },
            { name: { equals: name, mode: "insensitive" } },
            { accountNumber: `GSM-${code}` }
          ]
        },
        orderBy: { id: "asc" }
      });

      if (existingCreditor) {
        await tx.supplier.update({
          where: { id: existingCreditor.id },
          data: {
            name,
            contact: existingCreditor.contact ?? "Goldsmith",
            goldsmithCode: code,
            accountNumber: existingCreditor.accountNumber ?? `GSM-${code}`
          }
        });
      } else {
        await tx.supplier.create({
          data: {
            accountNumber: `GSM-${code}`,
            goldsmithCode: code,
            name,
            contact: "Goldsmith"
          }
        });
      }

      return created;
    });
    return NextResponse.json({ goldsmith }, { status: 201 });
  } catch (error) {
    // Keep the database constraint as the final guard against concurrent requests.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: `Goldsmith code ${code} already exists` }, { status: 409 });
    }
    throw error;
  }
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Partial<{ code: string; name: string }>;
  const code = (body.code ?? "").trim().toUpperCase();
  const name = (body.name ?? "").trim();
  if (!code || !name) return NextResponse.json({ error: "Missing code/name" }, { status: 400 });

  const goldsmith = await prisma.$transaction(async (tx) => {
    const updated = await tx.goldsmith.update({
      where: { code },
      data: { name }
    });

    const existingCreditor = await tx.supplier.findFirst({
      where: { OR: [{ goldsmithCode: code }, { accountNumber: `GSM-${code}` }] },
      orderBy: { id: "asc" }
    });

    if (existingCreditor) {
      await tx.supplier.update({
        where: { id: existingCreditor.id },
        data: {
          name,
          contact: existingCreditor.contact ?? "Goldsmith",
          goldsmithCode: code,
          accountNumber: existingCreditor.accountNumber ?? `GSM-${code}`
        }
      });
    } else {
      await tx.supplier.create({
        data: {
          accountNumber: `GSM-${code}`,
          goldsmithCode: code,
          name,
          contact: "Goldsmith"
        }
      });
    }

    return updated;
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

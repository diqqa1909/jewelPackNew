import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const CARATS = new Set(["18K", "19K", "20K", "21K", "22K", "24K"]);

function normalizeCarat(value: string | null | undefined) {
  const raw = (value ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/K(T)?$/, "");
  return raw ? `${raw}K` : "";
}

function decimal(value: string | number | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return new Prisma.Decimal(trimmed === "" ? "0" : trimmed);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      issueDate: string;
      goldsmithCode: string;
      carat: string;
      goldWeight: string;
      referenceNumber: string;
      remarks: string;
    }>;

    const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();
    if (Number.isNaN(issueDate.getTime())) {
      return NextResponse.json({ error: "Invalid issue date" }, { status: 400 });
    }

    const goldsmithCode = (body.goldsmithCode ?? "").trim();
    if (!goldsmithCode) return NextResponse.json({ error: "Missing goldsmith" }, { status: 400 });
    const goldsmith = await prisma.goldsmith.findUnique({ where: { code: goldsmithCode } });
    if (!goldsmith) return NextResponse.json({ error: "Invalid goldsmith" }, { status: 400 });

    const carat = normalizeCarat(body.carat);
    if (!CARATS.has(carat)) return NextResponse.json({ error: "Invalid carat" }, { status: 400 });

    const goldWeight = decimal(body.goldWeight);
    if (goldWeight.lessThanOrEqualTo(new Prisma.Decimal("0"))) {
      return NextResponse.json({ error: "Enter a valid gold weight" }, { status: 400 });
    }

    const issue = await prisma.goldIssue.create({
      data: {
        issueDate,
        goldsmithCode,
        carat,
        goldWeight,
        referenceNumber: (body.referenceNumber ?? "").trim() || null,
        remarks: (body.remarks ?? "").trim() || null
      },
      include: { goldsmith: true }
    });

    return NextResponse.json({ ok: true, issue });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to issue gold";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

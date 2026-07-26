import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { normalizeCarat } from "@/lib/inventory-balance";
import { NextResponse } from "next/server";

type GoldReceiptLineInput = {
  description?: string;
  carat?: string;
  goldWeight?: string;
};

const RECEIPT_CARATS = new Set(["18", "19", "20", "21", "22", "24"]);

function decimal(value: string) {
  const trimmed = (value ?? "").trim();
  return new Prisma.Decimal(trimmed === "" ? "0" : trimmed);
}

function grnParts(value: Date) {
  const yy = String(value.getFullYear()).slice(-2);
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `GRN-${yy}${mm}${dd}-`;
}

async function nextGrnNo(tx: Pick<typeof prisma, "goldReceipt">, txDate: Date) {
  const prefix = grnParts(txDate);
  const last = await tx.goldReceipt.findFirst({
    where: { grnNo: { startsWith: prefix } },
    orderBy: { grnNo: "desc" }
  });
  const lastSeq = last?.grnNo ? Number(last.grnNo.slice(prefix.length)) : 0;
  const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const preview = url.searchParams.get("preview") === "1";
  if (!preview) {
    const rows = await prisma.goldReceipt.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      include: { customer: true, salesman: true }
    });
    return NextResponse.json({ rows });
  }

  const dateRaw = (url.searchParams.get("transactionDate") ?? "").trim();
  const txDate = dateRaw ? new Date(dateRaw) : new Date();
  if (Number.isNaN(txDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  return NextResponse.json({ grnNo: await nextGrnNo(prisma, txDate) });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      transactionDate: string;
      customerId: number;
      salesmanId?: number | null;
      remarks?: string;
      items: GoldReceiptLineInput[];
    }>;

    if (!body.transactionDate) return NextResponse.json({ error: "Missing date" }, { status: 400 });
    const txDate = new Date(body.transactionDate);
    if (Number.isNaN(txDate.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

    const customerId = Number(body.customerId);
    if (!Number.isFinite(customerId)) return NextResponse.json({ error: "Missing customer" }, { status: 400 });

    const salesmanIdRaw = body.salesmanId ?? null;
    const salesmanId = salesmanIdRaw == null ? null : Number(salesmanIdRaw);
    if (salesmanIdRaw != null && !Number.isFinite(salesmanId)) {
      return NextResponse.json({ error: "Invalid salesman" }, { status: 400 });
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return NextResponse.json({ error: "Add at least one item" }, { status: 400 });

    const receiptRows = items.map((row) => {
      const description = (row.description ?? "").trim();
      if (!description) throw new Error("Missing description");
      const carat = normalizeCarat(row.carat);
      if (!RECEIPT_CARATS.has(carat)) throw new Error("Invalid karat");
      const goldWeight = decimal(String(row.goldWeight ?? "0"));
      if (goldWeight.lessThanOrEqualTo(new Prisma.Decimal("0"))) throw new Error("Invalid weight");
      const pureGoldWeight = goldWeight.mul(new Prisma.Decimal(carat)).div(new Prisma.Decimal("24"));
      return { description, carat, goldWeight, pureGoldWeight };
    });

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new Error("Invalid customer");
      if (salesmanId) {
        const salesman = await tx.salesman.findUnique({ where: { id: salesmanId } });
        if (!salesman) throw new Error("Invalid salesman");
      }

      const accountNumber = (customer.accountNumber ?? "").trim();
      if (!accountNumber) throw new Error("Customer account not found");

      const grnNo = await nextGrnNo(tx, txDate);
      const totalPureGoldWeight = receiptRows.reduce(
        (sum, row) => sum.plus(row.pureGoldWeight),
        new Prisma.Decimal("0")
      );

      await tx.goldReceipt.createMany({
        data: receiptRows.map((row) => ({
          grnNo,
          transactionDate: txDate,
          customerId,
          salesmanId: salesmanId || null,
          description: row.description,
          carat: row.carat,
          goldWeight: row.goldWeight,
          pureGoldWeight: row.pureGoldWeight,
          remarks: (body.remarks ?? "").trim() || null
        }))
      });

      await tx.transaction.create({
        data: {
          date: txDate,
          source: "GOLD",
          account: customer.name,
          memo: `Gold received for ${grnNo}`,
          debit: new Prisma.Decimal("0"),
          credit: new Prisma.Decimal("0"),
          goldIssued: new Prisma.Decimal("0"),
          goldReceived: totalPureGoldWeight,
          accountNumber,
          type: "GOLD_RECEIVED",
          referenceNumber: grnNo,
          remarks: (body.remarks ?? "").trim() || null
        }
      });

      return { grnNo };
    });

    return NextResponse.json({ ok: true, goldReceipt: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to save gold receipt.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma";
import { NextResponse } from "next/server";

type SaleLineInput = {
  subcategoryCode: string;
  carat: "" | "18K" | "22K";
  qty: number;
  goldWeight: string;
};

function decimal(value: string) {
  const trimmed = (value ?? "").trim();
  return new Prisma.Decimal(trimmed === "" ? "0" : trimmed);
}

function clampDecimalNonNegative(d: Prisma.Decimal) {
  return d.lessThan(new Prisma.Decimal("0")) ? new Prisma.Decimal("0") : d;
}

export async function GET() {
  const sales = await prisma.salesNTX.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { customer: true }
  });
  return NextResponse.json({ sales });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      transactionDate: string;
      customerId: number;
      remarks?: string;
      sellRatePer8g?: string;
      items: SaleLineInput[];
    }>;

    if (!body.transactionDate) return NextResponse.json({ error: "Missing date" }, { status: 400 });
    const customerId = Number(body.customerId);
    if (!Number.isFinite(customerId)) return NextResponse.json({ error: "Missing customer" }, { status: 400 });
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return NextResponse.json({ error: "Add at least one item" }, { status: 400 });

    const txDate = new Date(body.transactionDate);
    if (Number.isNaN(txDate.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return NextResponse.json({ error: "Invalid customer" }, { status: 400 });

    const sellRatePer8g = decimal(String(body.sellRatePer8g ?? "0"));

    // Normalize + validate client rows (aggregate same subcategory+carat)
    const normalized: Array<{
      subcategoryCode: string;
      carat: string | null;
      qty: number;
      goldWeight: Prisma.Decimal;
    }> = [];
    for (const row of items) {
      const subcategoryCode = (row.subcategoryCode ?? "").trim();
      if (!subcategoryCode) return NextResponse.json({ error: "Missing subcategory" }, { status: 400 });
      const qty = Number(row.qty);
      if (!Number.isFinite(qty) || qty <= 0) return NextResponse.json({ error: "Invalid qty" }, { status: 400 });
      const weight = decimal(String(row.goldWeight ?? "0"));
      if (weight.lessThanOrEqualTo(new Prisma.Decimal("0")))
        return NextResponse.json({ error: "Invalid weight" }, { status: 400 });
      const carat = (row.carat ?? "").trim();
      const caratValue = carat === "18K" || carat === "22K" ? carat : "";
      normalized.push({ subcategoryCode, carat: caratValue || null, qty, goldWeight: weight });
    }

    const aggregated = new Map<
      string,
      { subcategoryCode: string; carat: string | null; qty: number; goldWeight: Prisma.Decimal }
    >();
    for (const r of normalized) {
      const key = `${r.subcategoryCode}||${r.carat ?? ""}`;
      const prev = aggregated.get(key);
      if (!prev) aggregated.set(key, { ...r });
      else
        aggregated.set(key, {
          ...prev,
          qty: prev.qty + r.qty,
          goldWeight: prev.goldWeight.plus(r.goldWeight)
        });
    }
    const requested = Array.from(aggregated.values());

    const result = await prisma.$transaction(async (tx) => {
    // Generate sale number (date-based)
    const yyyy = txDate.getFullYear();
    const mm = String(txDate.getMonth() + 1).padStart(2, "0");
    const dd = String(txDate.getDate()).padStart(2, "0");
    const prefix = `SAL-${yyyy}${mm}${dd}-`;
    const last = await tx.salesNTX.findFirst({
      where: { saleNo: { startsWith: prefix } },
      orderBy: { saleNo: "desc" }
    });
    const lastSeq = last?.saleNo ? Number(last.saleNo.slice(prefix.length)) : 0;
    const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
    const saleNo = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    const createdHeader = await tx.salesNTX.create({
      data: {
        saleNo,
        transactionDate: txDate,
        customerId,
        totalItems: 0,
        totalQty: 0,
        totalGoldWeight: new Prisma.Decimal("0"),
        totalCost: new Prisma.Decimal("0"),
        sellRatePer8g,
        sellSubTotal: new Prisma.Decimal("0"),
        remarks: (body.remarks ?? "").trim() || null
      }
    });

    let headerTotalQty = 0;
    let headerTotalItems = 0;
    let headerTotalWeight = new Prisma.Decimal("0");
    let headerTotalCost = new Prisma.Decimal("0");
    let headerSellSubTotal = new Prisma.Decimal("0");

    for (const reqLine of requested) {
      // FIFO allocate from StockMaster balances
      const receipts = await tx.stockMaster.findMany({
        where: {
          subcategoryCode: reqLine.subcategoryCode,
          carat: reqLine.carat ?? undefined,
          balanceQty: { gt: 0 }
        },
        orderBy: [{ transactionDate: "asc" }, { id: "asc" }]
      });
      if (receipts.length === 0) {
        throw new Error(`No stock available for ${reqLine.subcategoryCode}${reqLine.carat ? ` (${reqLine.carat})` : ""}`);
      }

      let remainingQty = reqLine.qty;
      let remainingWeight = reqLine.goldWeight;

      for (const r of receipts) {
        if (remainingQty <= 0) break;
        if (remainingWeight.lessThanOrEqualTo(new Prisma.Decimal("0"))) break;

        const takeQty = Math.min(remainingQty, r.balanceQty);

        // Allocate weight proportionally by qty from this receipt.
        const receiptBalanceQty = new Prisma.Decimal(String(r.balanceQty));
        const qtyRatio = receiptBalanceQty.equals(new Prisma.Decimal("0"))
          ? new Prisma.Decimal("0")
          : new Prisma.Decimal(String(takeQty)).div(receiptBalanceQty);
        const takeWeight = clampDecimalNonNegative(r.balanceGoldWeight.mul(qtyRatio));

        const effectiveWeight = takeWeight.greaterThan(remainingWeight) ? remainingWeight : takeWeight;

        const perGramCost = r.balanceGoldWeight.equals(new Prisma.Decimal("0"))
          ? new Prisma.Decimal("0")
          : r.balanceCost.div(r.balanceGoldWeight);
        const takeCost = effectiveWeight.mul(perGramCost);
        const lineSellCost = effectiveWeight.div(new Prisma.Decimal("8")).mul(sellRatePer8g);

        await tx.sale.create({
          data: {
            salesNTXId: createdHeader.id,
            stockMasterId: r.id,
            categoryCode: r.categoryCode,
            subcategoryCode: r.subcategoryCode,
            carat: r.carat,
            qty: takeQty,
            goldWeight: effectiveWeight,
            cost: takeCost,
            sellCost: lineSellCost
          }
        });

        const nextSoldQty = (r.soldQty ?? 0) + takeQty;
        const nextBalanceQty = Math.max(0, r.balanceQty - takeQty);
        const nextSoldWeight = r.soldGoldWeight.plus(effectiveWeight);
        const nextBalanceWeight = clampDecimalNonNegative(r.balanceGoldWeight.minus(effectiveWeight));
        const nextSoldCost = r.soldCost.plus(takeCost);
        const nextBalanceCost = clampDecimalNonNegative(r.balanceCost.minus(takeCost));

        await tx.stockMaster.update({
          where: { id: r.id },
          data: {
            soldQty: nextSoldQty,
            balanceQty: nextBalanceQty,
            soldGoldWeight: nextSoldWeight,
            balanceGoldWeight: nextBalanceWeight,
            soldCost: nextSoldCost,
            balanceCost: nextBalanceCost
          }
        });

        remainingQty -= takeQty;
        remainingWeight = clampDecimalNonNegative(remainingWeight.minus(effectiveWeight));

        headerTotalQty += takeQty;
        headerTotalItems += 1;
        headerTotalWeight = headerTotalWeight.plus(effectiveWeight);
        headerTotalCost = headerTotalCost.plus(takeCost);
        headerSellSubTotal = headerSellSubTotal.plus(lineSellCost);
      }

      if (remainingQty > 0 || remainingWeight.greaterThan(new Prisma.Decimal("0"))) {
        throw new Error(`Insufficient stock for ${reqLine.subcategoryCode}${reqLine.carat ? ` (${reqLine.carat})` : ""}`);
      }
    }

    const updatedHeader = await tx.salesNTX.update({
      where: { id: createdHeader.id },
      data: {
        totalItems: headerTotalItems,
        totalQty: headerTotalQty,
        totalGoldWeight: headerTotalWeight,
        totalCost: headerTotalCost,
        sellSubTotal: headerSellSubTotal
      }
    });

    return { header: updatedHeader };
    });

    return NextResponse.json({ ok: true, sale: result.header });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Unable to save sale. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma";
import { getInventoryBalanceRows, normalizeCarat } from "@/lib/inventory-balance";
import { NextResponse } from "next/server";

type SaleLineInput = {
  subcategoryCode: string;
  qty: number;
  goldWeight: string;
  sellRatePer8g: string;
};

function decimal(value: string) {
  const trimmed = (value ?? "").trim();
  return new Prisma.Decimal(trimmed === "" ? "0" : trimmed);
}

function clampDecimalNonNegative(d: Prisma.Decimal) {
  return d.lessThan(new Prisma.Decimal("0")) ? new Prisma.Decimal("0") : d;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const preview = url.searchParams.get("preview") === "1";
  if (preview) {
    const dateRaw = (url.searchParams.get("transactionDate") ?? "").trim();
    const txDate = dateRaw ? new Date(dateRaw) : new Date();
    if (Number.isNaN(txDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const yy = String(txDate.getFullYear()).slice(-2);
    const mm = String(txDate.getMonth() + 1).padStart(2, "0");
    const dd = String(txDate.getDate()).padStart(2, "0");
    const prefix = `SAL-${yy}${mm}${dd}-`;
    const last = await prisma.salesNTX.findFirst({
      where: { saleNo: { startsWith: prefix } },
      orderBy: { saleNo: "desc" }
    });
    const lastSeq = last?.saleNo ? Number(last.saleNo.slice(prefix.length)) : 0;
    const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
    const saleNo = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    return NextResponse.json({ saleNo });
  }

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
      salesmanId?: number | null;
      remarks?: string;
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

    const salesmanIdRaw = body.salesmanId ?? null;
    const salesmanId = salesmanIdRaw == null ? null : Number(salesmanIdRaw);
    if (salesmanIdRaw != null && !Number.isFinite(salesmanId)) {
      return NextResponse.json({ error: "Invalid salesman" }, { status: 400 });
    }
    if (salesmanId) {
      const exists = await prisma.salesman.findUnique({ where: { id: salesmanId } });
      if (!exists) return NextResponse.json({ error: "Invalid salesman" }, { status: 400 });
    }

    // Normalize + validate client rows (aggregate same subcategory+carat)
    const normalized: Array<{
      subcategoryCode: string;
      qty: number;
      goldWeight: Prisma.Decimal;
      sellRatePer8g: Prisma.Decimal;
    }> = [];
    for (const row of items) {
      const subcategoryCode = (row.subcategoryCode ?? "").trim();
      if (!subcategoryCode) return NextResponse.json({ error: "Missing subcategory" }, { status: 400 });
      const qty = Number(row.qty);
      if (!Number.isFinite(qty) || qty <= 0) return NextResponse.json({ error: "Invalid qty" }, { status: 400 });
      const weight = decimal(String(row.goldWeight ?? "0"));
      if (weight.lessThanOrEqualTo(new Prisma.Decimal("0")))
        return NextResponse.json({ error: "Invalid weight" }, { status: 400 });
      const rate = decimal(String(row.sellRatePer8g ?? "0"));
      if (rate.lessThanOrEqualTo(new Prisma.Decimal("0")))
        return NextResponse.json({ error: "Invalid sell rate" }, { status: 400 });
      normalized.push({ subcategoryCode, qty, goldWeight: weight, sellRatePer8g: rate });
    }

    const aggregated = new Map<
      string,
      { subcategoryCode: string; qty: number; goldWeight: Prisma.Decimal; sellRatePer8g: Prisma.Decimal }
    >();
    for (const r of normalized) {
      const key = `${r.subcategoryCode}||${r.sellRatePer8g.toString()}`;
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
    const availableRows = await getInventoryBalanceRows(tx as any);
    const availableMap = new Map(
      availableRows.map((row) => [`${row.subcategoryCode}||${normalizeCarat(row.carat)}`, row] as const)
    );

    // Generate sale number (date-based)
    const yy = String(txDate.getFullYear()).slice(-2);
    const mm = String(txDate.getMonth() + 1).padStart(2, "0");
    const dd = String(txDate.getDate()).padStart(2, "0");
    const prefix = `SAL-${yy}${mm}${dd}-`;
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
        salesmanId: salesmanId || null,
        totalItems: 0,
        totalQty: 0,
        totalGoldWeight: new Prisma.Decimal("0"),
        totalCost: new Prisma.Decimal("0"),
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
      const sub = await tx.subcategory.findUnique({ where: { code: reqLine.subcategoryCode } });
      const subCarat = normalizeCarat(sub?.carat);
      const subRows = availableRows.filter((row) => row.subcategoryCode === reqLine.subcategoryCode);
      const carat =
        subCarat ||
        (subRows.length === 1 ? normalizeCarat(subRows[0].carat) : "");

      if (!carat) {
        throw new Error(
          `Carat not set for subcategory ${reqLine.subcategoryCode}. Please set it in Subcategories.`
        );
      }

      const available = availableMap.get(`${reqLine.subcategoryCode}||${carat}`);
      const fallbackQty = subRows.reduce((sum, row) => sum + row.balanceQty, 0);
      const fallbackWeight = subRows.reduce((sum, row) => sum + Number(row.balanceGoldWeight ?? 0), 0);
      const effectiveQty = available?.balanceQty ?? fallbackQty;
      const effectiveWeight = available?.balanceGoldWeight ?? String(fallbackWeight);

      if (effectiveQty <= 0 || Number(effectiveWeight) <= 0) {
        throw new Error(`No stock available for ${reqLine.subcategoryCode}${carat ? ` (${carat})` : ""}`);
      }
      if (reqLine.qty > effectiveQty) {
        throw new Error(`Insufficient stock for ${reqLine.subcategoryCode}${carat ? ` (${carat})` : ""}`);
      }
      if (reqLine.goldWeight.greaterThan(new Prisma.Decimal(String(effectiveWeight)))) {
        throw new Error(`Insufficient stock for ${reqLine.subcategoryCode}${carat ? ` (${carat})` : ""}`);
      }

      // FIFO allocate from purchase rows. Qty and weight are allowed to move
      // independently because a sale can be for any partial weight/qty.
      const receipts = await tx.purchase.findMany({
        where: {
          subcategoryCode: reqLine.subcategoryCode
        },
        orderBy: [{ purchaseDate: "asc" }, { id: "asc" }]
      });
      const matchingReceipts = receipts.filter((row) => normalizeCarat(row.carat) === carat);
      if (matchingReceipts.length === 0) {
        throw new Error(`No stock available for ${reqLine.subcategoryCode}${carat ? ` (${carat})` : ""}`);
      }

      const receiptIds = matchingReceipts.map((r) => r.id);
      const existingSales = receiptIds.length
        ? await tx.sale.findMany({
            where: { purchaseId: { in: receiptIds } },
            select: { purchaseId: true, qty: true, goldWeight: true }
          })
        : [];
      const soldByPurchase = new Map<number, { qty: number; weight: Prisma.Decimal }>();
      for (const sale of existingSales) {
        if (sale.purchaseId == null) continue;
        const current = soldByPurchase.get(sale.purchaseId) ?? {
          qty: 0,
          weight: new Prisma.Decimal("0")
        };
        current.qty += sale.qty ?? 0;
        current.weight = current.weight.plus(sale.goldWeight ?? new Prisma.Decimal("0"));
        soldByPurchase.set(sale.purchaseId, current);
      }

      let remainingQty = reqLine.qty;
      let remainingWeight = reqLine.goldWeight;

      for (const r of matchingReceipts) {
        if (remainingQty <= 0 && remainingWeight.lessThanOrEqualTo(new Prisma.Decimal("0"))) break;

        const alreadySold = soldByPurchase.get(r.id) ?? { qty: 0, weight: new Prisma.Decimal("0") };
        const availableQtyFromReceipt = Math.max(0, Number(r.qty ?? 0) - alreadySold.qty);
        const receiptWeight = r.goldWeight ?? new Prisma.Decimal("0");
        const availableWeightFromReceipt = clampDecimalNonNegative(receiptWeight.minus(alreadySold.weight));
        if (availableQtyFromReceipt <= 0 && availableWeightFromReceipt.lessThanOrEqualTo(new Prisma.Decimal("0"))) {
          continue;
        }

        const takeQty = remainingQty > 0 ? Math.min(remainingQty, availableQtyFromReceipt) : 0;
        const effectiveWeight = remainingWeight.lessThanOrEqualTo(new Prisma.Decimal("0"))
          ? new Prisma.Decimal("0")
          : availableWeightFromReceipt.greaterThan(remainingWeight)
            ? remainingWeight
            : availableWeightFromReceipt;

        if (takeQty <= 0 && effectiveWeight.lessThanOrEqualTo(new Prisma.Decimal("0"))) {
          continue;
        }

        const perGramCost = receiptWeight.equals(new Prisma.Decimal("0"))
          ? new Prisma.Decimal("0")
          : (r.totalCost ?? new Prisma.Decimal("0")).div(receiptWeight);
        const takeCost = effectiveWeight.mul(perGramCost);
        const lineSellCost = effectiveWeight.div(new Prisma.Decimal("8")).mul(reqLine.sellRatePer8g);

        await tx.sale.create({
          data: {
            salesNTXId: createdHeader.id,
            purchaseId: r.id,
            stockMasterId: null,
            subcategoryCode: r.subcategoryCode ?? reqLine.subcategoryCode,
            carat,
            qty: takeQty,
            goldWeight: effectiveWeight,
            cost: takeCost,
            sellRatePer8g: reqLine.sellRatePer8g,
            sellCost: lineSellCost
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
        throw new Error(`Insufficient stock for ${reqLine.subcategoryCode}${carat ? ` (${carat})` : ""}`);
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

    // Post invoice amount to customer account (debit)
    const acct = (customer.accountNumber ?? "").trim();
    if (acct) {
      await tx.transaction.create({
        data: {
          date: txDate,
          source: "INV",
          account: customer.name,
          memo: updatedHeader.saleNo,
          debit: headerSellSubTotal,
          credit: new Prisma.Decimal("0"),
          accountNumber: acct,
          type: "INVOICE",
          referenceNumber: updatedHeader.saleNo,
          remarks: (body.remarks ?? "").trim() || null
        }
      });
    }

    return { header: updatedHeader };
    });

    return NextResponse.json({ ok: true, sale: result.header });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Unable to save sale. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

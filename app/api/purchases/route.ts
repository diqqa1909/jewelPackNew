import { Prisma } from "@/lib/generated/prisma";
import { POSTING_SOURCE, deleteDoubleEntryPosting, postPurchaseDoubleEntry } from "@/lib/double-entry";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type PurchasePayload = {
  purchaseType?: "Gold" | "Rate";
  transactionDate: string;
  location?: string;
  gsmCode: string;
  supplierId?: number | null;
  categoryCode: string;
  articleName?: string;
  subcategoryCode: string;
  qty: string;
  description?: string;
  wastageYN: "Y" | "N";
  goldWeight: string;
  wastageMg?: string;
  labourCharges: string;
  remarks?: string;
  items?: PurchaseLinePayload[];
};

type PurchaseLinePayload = Omit<
  PurchasePayload,
  "transactionDate" | "location" | "gsmCode" | "supplierId" | "purchaseType" | "remarks" | "items"
>;

type NormalizedPurchaseLine = {
  line: PurchaseLinePayload;
  category: { name: string };
  subcategory: { name: string };
  caratLabel: string;
  qty: number;
  goldWeight: Prisma.Decimal;
  goldCost: Prisma.Decimal;
  wastageEnabled: boolean;
  wastageMg: Prisma.Decimal;
  wastageCost: Prisma.Decimal;
  labourCharges: Prisma.Decimal;
  totalCost: Prisma.Decimal;
};

const CARAT_VALUES = new Set(["18", "19", "20", "21", "22", "24"]);

function normalizeCarat(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/K(T)?$/, "");
}

function formatCarat(value: string) {
  return `${normalizeCarat(value)}K`;
}

function decimal(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return new Prisma.Decimal(trimmed === "" ? "0" : trimmed);
}

function isWastageEnabled(value: unknown) {
  return value === true || value === "Y";
}

function normalizePurchaseType(value: unknown) {
  return value === "Rate" ? "Rate" : "Gold";
}

function wastageWeightForCost(purchaseType: string, wastageMg: Prisma.Decimal) {
  return purchaseType === "Gold" ? wastageMg.div(new Prisma.Decimal("1000")) : wastageMg;
}

function purchaseAccount({
  supplierId,
  supplierAccountNumber,
  supplierName,
  goldsmithCode,
  goldsmithName
}: {
  supplierId?: number | null;
  supplierAccountNumber?: string | null;
  supplierName?: string | null;
  goldsmithCode?: string | null;
  goldsmithName?: string | null;
}) {
  if (supplierId) {
    return {
      account: supplierName?.trim() || `Supplier #${supplierId}`,
      accountNumber: supplierAccountNumber ?? `SUP-${String(supplierId).padStart(4, "0")}`
    };
  }
  const code = (goldsmithCode ?? "").trim();
  return {
    account: goldsmithName?.trim() || code || "Goldsmith",
    accountNumber: code ? `GSM-${code}` : null
  };
}

function nextPurchaseNo(date: Date) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `PUR-${yy}${mm}${dd}-`;
}

function purchaseSeq(purchaseNo: string | null | undefined, prefix: string) {
  const match = (purchaseNo ?? "").slice(prefix.length).match(/^\d+/);
  const seq = match ? Number(match[0]) : 0;
  return Number.isFinite(seq) ? seq : 0;
}

function linePayloads(body: Partial<Omit<PurchasePayload, "wastageYN"> & { wastageYN?: "Y" | "N" | boolean }>) {
  return Array.isArray(body.items) && body.items.length > 0
    ? body.items
    : [
        {
          categoryCode: body.categoryCode ?? "",
          articleName: body.articleName,
          subcategoryCode: body.subcategoryCode ?? "",
          qty: body.qty ?? "0",
          description: body.description,
          wastageYN: (body.wastageYN ?? "N") as "Y" | "N",
          goldWeight: body.goldWeight ?? "0",
          wastageMg: body.wastageMg,
          labourCharges: body.labourCharges ?? "0",
        }
      ];
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const preview = url.searchParams.get("preview") === "1";
  if (preview) {
    const dateRaw = (url.searchParams.get("transactionDate") ?? "").trim();
    const date = dateRaw ? new Date(dateRaw) : new Date();
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const prefix = nextPurchaseNo(date);
    const last = await prisma.purchase.findFirst({
      where: { purchaseNo: { startsWith: prefix } },
      orderBy: { purchaseNo: "desc" }
    });
    const lastSeq = purchaseSeq(last?.purchaseNo, prefix);
    const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
    const purchaseNo = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    return NextResponse.json({ purchaseNo });
  }

  const purchases = await prisma.purchase.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    include: { supplier: true, items: true }
  });

  return NextResponse.json({ purchases });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<PurchasePayload & { supplierId?: number }>;

    if (!body.transactionDate) return NextResponse.json({ error: "Missing date" }, { status: 400 });
    if (!body.gsmCode) return NextResponse.json({ error: "Missing goldsmith" }, { status: 400 });
    const purchaseDate = new Date(body.transactionDate);
    if (Number.isNaN(purchaseDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const system = await prisma.system.findUnique({ where: { id: 1 } });
    const goldRatePer8g = system?.goldCostRatePer8g ?? new Prisma.Decimal("0");

    const supplierId = body.supplierId == null ? null : Number(body.supplierId);
    const supplier = supplierId ? await prisma.supplier.findUnique({ where: { id: supplierId } }) : null;
    const goldsmith = body.gsmCode ? await prisma.goldsmith.findUnique({ where: { code: body.gsmCode } }) : null;
    const selectedGoldsmithName = goldsmith?.name ?? supplier?.name ?? "";
    const purchaseType = normalizePurchaseType(body.purchaseType);
    const lines: NormalizedPurchaseLine[] = [];
    for (const line of linePayloads(body)) {
      if (!line.categoryCode) return NextResponse.json({ error: "Missing category" }, { status: 400 });
      if (!line.subcategoryCode) return NextResponse.json({ error: "Missing subcategory" }, { status: 400 });
      const qty = Number(line.qty);
      if (!Number.isFinite(qty) || qty < 0) return NextResponse.json({ error: "Invalid qty" }, { status: 400 });
      const category = await prisma.category.findUnique({ where: { code: line.categoryCode } });
      const subcategory = await prisma.subcategory.findUnique({ where: { code: line.subcategoryCode } });
      if (!category) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      if (!subcategory) return NextResponse.json({ error: "Invalid subcategory" }, { status: 400 });
      const carat = normalizeCarat(subcategory.carat);
      if (!CARAT_VALUES.has(carat)) {
        return NextResponse.json({ error: `Carat is not set for subcategory ${subcategory.code}.` }, { status: 400 });
      }
      const caratLabel = formatCarat(carat);
      const goldWeight = decimal(line.goldWeight ?? "0");
      const wastageMg = decimal(line.wastageMg ?? "0");
      const goldCost = goldWeight.div(new Prisma.Decimal("8")).mul(goldRatePer8g);
      const wastageEnabled = isWastageEnabled(line.wastageYN);
      const wastageCost = wastageEnabled
        ? wastageWeightForCost(purchaseType, wastageMg).div(new Prisma.Decimal("8")).mul(goldRatePer8g)
        : new Prisma.Decimal("0");
      const labourCharges = decimal(line.labourCharges ?? "0");
      const totalCost = goldCost.plus(wastageCost).plus(labourCharges);
      lines.push({ line, category, subcategory, caratLabel, qty, goldWeight, goldCost, wastageEnabled, wastageMg, wastageCost, labourCharges, totalCost });
    }
    if (lines.length === 0) return NextResponse.json({ error: "Add at least one item" }, { status: 400 });
    const groupTotalCost = lines.reduce((sum, row) => sum.plus(row.totalCost), new Prisma.Decimal("0"));
    const groupQty = lines.reduce((sum, row) => sum + row.qty, 0);
    const groupGoldWeight = lines.reduce((sum, row) => sum.plus(row.goldWeight), new Prisma.Decimal("0"));

    const result = await prisma.$transaction(async (tx) => {
      const prefix = nextPurchaseNo(purchaseDate);
      const last = await tx.purchase.findFirst({
        where: { purchaseNo: { startsWith: prefix } },
        orderBy: { purchaseNo: "desc" }
      });
      const lastSeq = purchaseSeq(last?.purchaseNo, prefix);
      const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
      const purchaseGroupNo = `${prefix}${String(nextSeq).padStart(4, "0")}`;
      let firstPurchase: any = null;

      for (const [index, row] of lines.entries()) {
        const purchaseNo = lines.length === 1 ? purchaseGroupNo : `${purchaseGroupNo}-${String(index + 1).padStart(2, "0")}`;
        const created = await tx.purchase.create({
          data: {
          purchaseNo,
          purchaseGroupNo,
          purchaseDate,
          purchaseType,
          location: (body.location ?? "").trim() || null,
          gsmCode: body.gsmCode,
          gsmName: selectedGoldsmithName,
          categoryCode: row.line.categoryCode,
          articleName: row.category.name,
          subcategoryCode: row.line.subcategoryCode,
          subcategoryName: row.subcategory.name,
          qty: row.qty,
          description: (row.line.description ?? "").trim() || null,
          carat: row.caratLabel,
          wastageYN: row.wastageEnabled,
          goldWeight: row.goldWeight,
          goldCost: row.goldCost,
          wastageMg: row.wastageMg,
          wastage: row.wastageCost,
          labourCharges: row.labourCharges,
          otherCosts: new Prisma.Decimal("0"),
          totalCost: row.totalCost,
          remarks: (body.remarks ?? "").trim() || null,
          supplierId,
          purchaseGold: row.caratLabel,
          totalItems: groupQty,
          totalWeight: groupGoldWeight,
          subTotal: groupTotalCost,
          otherCharges: new Prisma.Decimal("0"),
          totalAmount: groupTotalCost,
          paidAmount: new Prisma.Decimal("0"),
          balanceDue: groupTotalCost,
          notes: (body.remarks ?? "").trim() || null
        },
        include: { supplier: true, items: true }
      });
        if (!firstPurchase) firstPurchase = created;
      }

      const account = purchaseAccount({
        supplierId,
        supplierAccountNumber: supplier?.accountNumber,
        supplierName: supplier?.name,
        goldsmithCode: body.gsmCode,
        goldsmithName: selectedGoldsmithName
      });
      const purchaseTransaction = await tx.transaction.create({
        data: {
          date: purchaseDate,
          source: POSTING_SOURCE.PURCHASES,
          account: account.account,
          memo: purchaseGroupNo,
          debit: new Prisma.Decimal("0"),
          credit: groupTotalCost,
          goldIssued: new Prisma.Decimal("0"),
          goldReceived: new Prisma.Decimal("0"),
          accountNumber: account.accountNumber,
          type: "PURCHASE",
          referenceNumber: purchaseGroupNo,
          remarks: (body.remarks ?? "").trim() || null
        }
      });
      await postPurchaseDoubleEntry(tx, {
        purchaseGroupNo,
        purchaseTransactionId: purchaseTransaction.id,
        date: purchaseDate,
        amount: groupTotalCost,
        memo: purchaseGroupNo,
        remarks: (body.remarks ?? "").trim() || null
      });

      return firstPurchase;
    });

    return NextResponse.json({ ok: true, purchase: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to save purchase";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as Partial<
      Omit<PurchasePayload, "wastageYN"> & { id?: number; supplierId?: number; wastageYN?: "Y" | "N" | boolean }
    >;
    const id = Number(body.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Missing purchase id" }, { status: 400 });

    if (!body.transactionDate) return NextResponse.json({ error: "Missing date" }, { status: 400 });
    if (!body.gsmCode) return NextResponse.json({ error: "Missing goldsmith" }, { status: 400 });
    const existing = await prisma.purchase.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    const purchaseGroupNo = existing.purchaseGroupNo ?? existing.purchaseNo;
    const existingRows = await prisma.purchase.findMany({
      where: { OR: [{ purchaseGroupNo }, { purchaseNo: purchaseGroupNo }] },
      orderBy: [{ id: "asc" }]
    });
    const existingIds = existingRows.map((row) => row.id);
    const linkedSales = await prisma.sale.count({ where: { purchaseId: { in: existingIds } } });
    if (linkedSales > 0) {
      return NextResponse.json(
        { error: "This purchase has sales linked to it, so grouped purchase rows cannot be edited." },
        { status: 409 }
      );
    }

    const purchaseDate = new Date(body.transactionDate);
    if (Number.isNaN(purchaseDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const system = await prisma.system.findUnique({ where: { id: 1 } });
    const goldRatePer8g = system?.goldCostRatePer8g ?? new Prisma.Decimal("0");

    const supplierId = body.supplierId === undefined ? existing.supplierId : body.supplierId == null ? null : Number(body.supplierId);
    const supplier = supplierId ? await prisma.supplier.findUnique({ where: { id: supplierId } }) : null;
    const goldsmith = body.gsmCode ? await prisma.goldsmith.findUnique({ where: { code: body.gsmCode } }) : null;
    const selectedGoldsmithName = goldsmith?.name ?? supplier?.name ?? "";
    const purchaseType = normalizePurchaseType(body.purchaseType);
    const lines: NormalizedPurchaseLine[] = [];
    for (const line of linePayloads(body)) {
      if (!line.categoryCode) return NextResponse.json({ error: "Missing category" }, { status: 400 });
      if (!line.subcategoryCode) return NextResponse.json({ error: "Missing subcategory" }, { status: 400 });
      const qty = Number(line.qty);
      if (!Number.isFinite(qty) || qty < 0) return NextResponse.json({ error: "Invalid qty" }, { status: 400 });
      const category = await prisma.category.findUnique({ where: { code: line.categoryCode } });
      const subcategory = await prisma.subcategory.findUnique({ where: { code: line.subcategoryCode } });
      if (!category) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      if (!subcategory) return NextResponse.json({ error: "Invalid subcategory" }, { status: 400 });
      const carat = normalizeCarat(subcategory.carat);
      if (!CARAT_VALUES.has(carat)) {
        return NextResponse.json({ error: `Carat is not set for subcategory ${subcategory.code}.` }, { status: 400 });
      }
      const caratLabel = formatCarat(carat);
      const goldWeight = decimal(line.goldWeight ?? "0");
      const wastageMg = decimal(line.wastageMg ?? "0");
      const goldCost = goldWeight.div(new Prisma.Decimal("8")).mul(goldRatePer8g);
      const wastageEnabled = isWastageEnabled(line.wastageYN);
      const wastageCost = wastageEnabled
        ? wastageWeightForCost(purchaseType, wastageMg).div(new Prisma.Decimal("8")).mul(goldRatePer8g)
        : new Prisma.Decimal("0");
      const labourCharges = decimal(line.labourCharges ?? "0");
      const totalCost = goldCost.plus(wastageCost).plus(labourCharges);
      lines.push({ line, category, subcategory, caratLabel, qty, goldWeight, goldCost, wastageEnabled, wastageMg, wastageCost, labourCharges, totalCost });
    }
    if (lines.length === 0) return NextResponse.json({ error: "Add at least one item" }, { status: 400 });
    const groupTotalCost = lines.reduce((sum, row) => sum.plus(row.totalCost), new Prisma.Decimal("0"));
    const groupQty = lines.reduce((sum, row) => sum + row.qty, 0);
    const groupGoldWeight = lines.reduce((sum, row) => sum.plus(row.goldWeight), new Prisma.Decimal("0"));

    const purchase = await prisma.$transaction(async (tx) => {
      await tx.purchase.deleteMany({ where: { id: { in: existingIds } } });
      let firstPurchase: any = null;
      for (const [index, row] of lines.entries()) {
        const purchaseNo = lines.length === 1 ? purchaseGroupNo : `${purchaseGroupNo}-${String(index + 1).padStart(2, "0")}`;
        const created = await tx.purchase.create({
          data: {
            purchaseNo,
            purchaseGroupNo,
            purchaseDate,
            purchaseType,
            location: (body.location ?? "").trim() || null,
            gsmCode: body.gsmCode,
            gsmName: selectedGoldsmithName,
            categoryCode: row.line.categoryCode,
            articleName: row.category.name,
            subcategoryCode: row.line.subcategoryCode,
            subcategoryName: row.subcategory.name,
            qty: row.qty,
            description: (row.line.description ?? "").trim() || null,
            carat: row.caratLabel,
            wastageYN: row.wastageEnabled,
            goldWeight: row.goldWeight,
            goldCost: row.goldCost,
            wastageMg: row.wastageMg,
            wastage: row.wastageCost,
            labourCharges: row.labourCharges,
            otherCosts: new Prisma.Decimal("0"),
            totalCost: row.totalCost,
            remarks: (body.remarks ?? "").trim() || null,
            supplierId,
            purchaseGold: row.caratLabel,
            totalItems: groupQty,
            totalWeight: groupGoldWeight,
            subTotal: groupTotalCost,
            otherCharges: new Prisma.Decimal("0"),
            totalAmount: groupTotalCost,
            balanceDue: groupTotalCost.minus(existing.paidAmount ?? new Prisma.Decimal("0")),
            notes: (body.remarks ?? "").trim() || null
          },
          include: { supplier: true, items: true }
        });
        if (!firstPurchase) firstPurchase = created;
      }
      await tx.transaction.deleteMany({
        where: {
          referenceNumber: purchaseGroupNo,
          type: "PURCHASE"
        }
      });
      await deleteDoubleEntryPosting(tx, `P:${purchaseGroupNo}:PURCHASE`);
      const account = purchaseAccount({
        supplierId,
        supplierAccountNumber: supplier?.accountNumber,
        supplierName: supplier?.name,
        goldsmithCode: body.gsmCode,
        goldsmithName: selectedGoldsmithName
      });
      const purchaseTransaction = await tx.transaction.create({
        data: {
          date: purchaseDate,
          source: POSTING_SOURCE.PURCHASES,
          account: account.account,
          memo: purchaseGroupNo,
          debit: new Prisma.Decimal("0"),
          credit: groupTotalCost,
          goldIssued: new Prisma.Decimal("0"),
          goldReceived: new Prisma.Decimal("0"),
          accountNumber: account.accountNumber,
          type: "PURCHASE",
          referenceNumber: purchaseGroupNo,
          remarks: (body.remarks ?? "").trim() || null
        }
      });
      await postPurchaseDoubleEntry(tx, {
        purchaseGroupNo,
        purchaseTransactionId: purchaseTransaction.id,
        date: purchaseDate,
        amount: groupTotalCost,
        memo: purchaseGroupNo,
        remarks: (body.remarks ?? "").trim() || null
      });
      return firstPurchase;
    });

    return NextResponse.json({ ok: true, purchase });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to update purchase";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid purchase id" }, { status: 400 });

    const purchase = await prisma.purchase.findUnique({ where: { id } });
    if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });

    const purchaseGroupNo = purchase.purchaseGroupNo ?? purchase.purchaseNo;
    const rows = await prisma.purchase.findMany({
      where: { OR: [{ purchaseGroupNo }, { purchaseNo: purchaseGroupNo }] },
      select: { id: true }
    });
    const ids = rows.length ? rows.map((row) => row.id) : [purchase.id];

    const linkedSales = await prisma.sale.count({ where: { purchaseId: { in: ids } } });
    if (linkedSales > 0) {
      return NextResponse.json(
        { error: "Unable to delete. Sales are linked to this purchase." },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({ where: { purchaseId: { in: ids } } });
      await tx.transaction.deleteMany({
        where: {
          referenceNumber: purchaseGroupNo,
          type: "PURCHASE"
        }
      });
      await deleteDoubleEntryPosting(tx, `P:${purchaseGroupNo}:PURCHASE`);
      await tx.purchase.deleteMany({ where: { id: { in: ids } } });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to delete purchase";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

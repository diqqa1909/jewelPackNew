import { Prisma } from "@/lib/generated/prisma";
import { buildInventorySummary } from "@/lib/inventory-summary";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ReportType =
  | "daily-summary"
  | "monthly-summary"
  | "sales-detail"
  | "sales-analysis"
  | "purchase-detail"
  | "stock-valuation"
  | "stock-movement"
  | "profit-loss"
  | "customer-outstanding"
  | "supplier-outstanding"
  | "goldsmith-pending"
  | "payments"
  | "cashbook";

type ColumnType = "text" | "number" | "currency" | "weight" | "date" | "percent";
type Column = { key: string; label: string; type?: ColumnType };
type Row = Record<string, string | number | null>;

const REPORT_TITLES: Record<ReportType, string> = {
  "daily-summary": "Daily Summary",
  "monthly-summary": "Monthly Summary",
  "sales-detail": "Sales Detail",
  "sales-analysis": "Sales Analysis",
  "purchase-detail": "Purchase Detail",
  "stock-valuation": "Stock Valuation",
  "stock-movement": "Stock Movement",
  "profit-loss": "Profit & Loss",
  "customer-outstanding": "Customer Outstanding",
  "supplier-outstanding": "Supplier Outstanding",
  "goldsmith-pending": "Goldsmith Pending Jobs",
  payments: "Payments",
  cashbook: "Cashbook"
};

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value && typeof (value as any).toString === "function") {
    const n = Number((value as any).toString());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function dateOnly(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function parseDate(value: string, endOfDay = false) {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "invalid" as const;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

function sumRows(rows: Row[], keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, rows.reduce((sum, row) => sum + toNumber(row[key]), 0)]));
}

function reportResponse({
  type,
  columns,
  rows,
  totals = {},
  chartKey,
  chartLabelKey = "label",
  appliedFilters = []
}: {
  type: ReportType;
  columns: Column[];
  rows: Row[];
  totals?: Record<string, number>;
  chartKey?: string;
  chartLabelKey?: string;
  appliedFilters?: string[];
}) {
  return NextResponse.json({
    type,
    title: REPORT_TITLES[type],
    columns,
    rows,
    totals,
    chartKey,
    chartLabelKey,
    appliedFilters
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = ((url.searchParams.get("type") ?? "daily-summary").trim() || "daily-summary") as ReportType;
  if (!Object.prototype.hasOwnProperty.call(REPORT_TITLES, type)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }

  const fromRaw = (url.searchParams.get("dateFrom") ?? "").trim();
  const toRaw = (url.searchParams.get("dateTo") ?? "").trim();
  const categoryCode = (url.searchParams.get("categoryCode") ?? "").trim();
  const subcategoryCode = (url.searchParams.get("subcategoryCode") ?? "").trim();
  const customerIdRaw = (url.searchParams.get("customerId") ?? "").trim();
  const supplierIdRaw = (url.searchParams.get("supplierId") ?? "").trim();
  const salesmanIdRaw = (url.searchParams.get("salesmanId") ?? "").trim();
  const goldsmithCode = (url.searchParams.get("goldsmithCode") ?? "").trim();
  const groupBy = (url.searchParams.get("groupBy") ?? "category").trim();

  const dateFrom = parseDate(fromRaw);
  const dateTo = parseDate(toRaw, true);
  if (dateFrom === "invalid") return NextResponse.json({ error: "Invalid dateFrom" }, { status: 400 });
  if (dateTo === "invalid") return NextResponse.json({ error: "Invalid dateTo" }, { status: 400 });

  const customerId = customerIdRaw ? Number(customerIdRaw) : null;
  const supplierId = supplierIdRaw ? Number(supplierIdRaw) : null;
  const salesmanId = salesmanIdRaw ? Number(salesmanIdRaw) : null;
  if (customerIdRaw && !Number.isFinite(customerId)) return NextResponse.json({ error: "Invalid customerId" }, { status: 400 });
  if (supplierIdRaw && !Number.isFinite(supplierId)) return NextResponse.json({ error: "Invalid supplierId" }, { status: 400 });
  if (salesmanIdRaw && !Number.isFinite(salesmanId)) return NextResponse.json({ error: "Invalid salesmanId" }, { status: 400 });

  const appliedFilters = [
    fromRaw ? `From ${fromRaw}` : "",
    toRaw ? `To ${toRaw}` : "",
    categoryCode ? `Category ${categoryCode}` : "",
    subcategoryCode ? `Subcategory ${subcategoryCode}` : "",
    customerId ? `Customer #${customerId}` : "",
    supplierId ? `Supplier #${supplierId}` : "",
    salesmanId ? `Salesman #${salesmanId}` : "",
    goldsmithCode ? `Goldsmith ${goldsmithCode}` : ""
  ].filter(Boolean);

  const saleDateWhere = dateFrom || dateTo ? { transactionDate: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {};
  const purchaseDateWhere = dateFrom || dateTo ? { purchaseDate: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {};
  const txDateWhere = dateFrom || dateTo ? { date: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {};

  if (type === "daily-summary" || type === "monthly-summary") {
    const now = new Date();
    const periodFrom =
      type === "daily-summary" ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodTo = new Date(now);
    const [salesAgg, purchasesAgg, paymentsAgg, supplierAgg, sales, purchases] = await Promise.all([
      prisma.salesNTX.aggregate({ where: { transactionDate: { gte: dateFrom ?? periodFrom, lte: dateTo ?? periodTo } }, _sum: { sellSubTotal: true, totalCost: true }, _count: { _all: true } }),
      prisma.purchase.aggregate({ where: { purchaseDate: { gte: dateFrom ?? periodFrom, lte: dateTo ?? periodTo } }, _sum: { totalAmount: true, goldWeight: true, balanceDue: true }, _count: { _all: true } }),
      prisma.transaction.aggregate({ where: { ...txDateWhere, type: "PAYMENT" }, _sum: { credit: true }, _count: { _all: true } }),
      prisma.purchase.aggregate({ where: { balanceDue: { gt: 0 } }, _sum: { balanceDue: true }, _count: { _all: true } }),
      prisma.salesNTX.findMany({ where: { transactionDate: { gte: dateFrom ?? periodFrom, lte: dateTo ?? periodTo } }, select: { transactionDate: true, sellSubTotal: true } }),
      prisma.purchase.findMany({ where: { purchaseDate: { gte: dateFrom ?? periodFrom, lte: dateTo ?? periodTo } }, select: { purchaseDate: true, totalAmount: true } })
    ]);
    const dayMap = new Map<string, Row>();
    for (const s of sales) {
      const day = dateOnly(s.transactionDate);
      const row = dayMap.get(day) ?? { label: day, sales: 0, purchases: 0 };
      row.sales = toNumber(row.sales) + toNumber(s.sellSubTotal);
      dayMap.set(day, row);
    }
    for (const p of purchases) {
      const day = dateOnly(p.purchaseDate);
      const row = dayMap.get(day) ?? { label: day, sales: 0, purchases: 0 };
      row.purchases = toNumber(row.purchases) + toNumber(p.totalAmount);
      dayMap.set(day, row);
    }
    const rows = Array.from(dayMap.values()).sort((a, b) => String(a.label).localeCompare(String(b.label)));
    return reportResponse({
      type,
      columns: [
        { key: "label", label: "Date", type: "date" },
        { key: "sales", label: "Sales", type: "currency" },
        { key: "purchases", label: "Purchases", type: "currency" }
      ],
      rows,
      totals: {
        sales: toNumber(salesAgg._sum.sellSubTotal),
        purchases: toNumber(purchasesAgg._sum.totalAmount),
        grossProfit: toNumber(salesAgg._sum.sellSubTotal) - toNumber(salesAgg._sum.totalCost),
        payments: toNumber(paymentsAgg._sum.credit),
        supplierOutstanding: toNumber(supplierAgg._sum.balanceDue),
        salesCount: salesAgg._count._all,
        purchaseCount: purchasesAgg._count._all,
        goldPurchased: toNumber(purchasesAgg._sum.goldWeight)
      },
      chartKey: "sales",
      appliedFilters: appliedFilters.length ? appliedFilters : [type === "daily-summary" ? "Today" : "This month"]
    });
  }

  if (type === "sales-detail") {
    const rows = await prisma.salesNTX.findMany({
      where: { ...saleDateWhere, ...(customerId ? { customerId } : {}), ...(salesmanId ? { salesmanId } : {}) },
      include: { customer: true, salesman: true },
      orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
      take: 5000
    });
    const mapped = rows.map((s) => ({
      date: dateOnly(s.transactionDate),
      saleNo: s.saleNo,
      customer: s.customer.name,
      salesman: s.salesman?.name ?? "",
      items: s.totalItems,
      qty: s.totalQty,
      weight: toNumber(s.totalGoldWeight),
      cost: toNumber(s.totalCost),
      amount: toNumber(s.sellSubTotal),
      profit: toNumber(s.sellSubTotal) - toNumber(s.totalCost)
    }));
    return reportResponse({
      type,
      columns: [
        { key: "date", label: "Date", type: "date" },
        { key: "saleNo", label: "Invoice" },
        { key: "customer", label: "Customer" },
        { key: "salesman", label: "Salesman" },
        { key: "qty", label: "Qty", type: "number" },
        { key: "weight", label: "Weight", type: "weight" },
        { key: "amount", label: "Amount", type: "currency" },
        { key: "profit", label: "Profit", type: "currency" }
      ],
      rows: mapped,
      totals: sumRows(mapped, ["qty", "weight", "amount", "cost", "profit"]),
      chartKey: "amount",
      appliedFilters
    });
  }

  if (type === "sales-analysis" || type === "profit-loss") {
    const lines = await prisma.sale.findMany({
      where: {
        ...(Object.keys(saleDateWhere).length || customerId || salesmanId
          ? { salesNTX: { ...saleDateWhere, ...(customerId ? { customerId } : {}), ...(salesmanId ? { salesmanId } : {}) } }
          : {}),
        ...(subcategoryCode ? { subcategoryCode } : {}),
        ...(categoryCode ? { purchase: { categoryCode } } : {})
      },
      include: { salesNTX: { include: { customer: true, salesman: true } }, purchase: true },
      take: 5000
    });
    const map = new Map<string, Row>();
    for (const line of lines) {
      const key =
        groupBy === "customer"
          ? `C:${line.salesNTX.customerId}`
          : groupBy === "salesman"
            ? `S:${line.salesNTX.salesmanId ?? 0}`
            : groupBy === "subcategory"
              ? `SUB:${line.subcategoryCode}`
              : `CAT:${line.purchase?.categoryCode ?? ""}`;
      const label =
        groupBy === "customer"
          ? line.salesNTX.customer.name
          : groupBy === "salesman"
            ? line.salesNTX.salesman?.name ?? "(No salesman)"
            : groupBy === "subcategory"
              ? line.subcategoryCode
              : line.purchase?.categoryCode ?? "";
      const current = map.get(key) ?? { label, invoices: 0, qty: 0, weight: 0, amount: 0, cost: 0, profit: 0, profitPct: 0 };
      current.invoices = toNumber(current.invoices) + 1;
      current.qty = toNumber(current.qty) + line.qty;
      current.weight = toNumber(current.weight) + toNumber(line.goldWeight);
      current.amount = toNumber(current.amount) + toNumber(line.sellCost);
      current.cost = toNumber(current.cost) + toNumber(line.cost);
      current.profit = toNumber(current.amount) - toNumber(current.cost);
      current.profitPct = toNumber(current.amount) > 0 ? (toNumber(current.profit) / toNumber(current.amount)) * 100 : 0;
      map.set(key, current);
    }
    const rows = Array.from(map.values()).sort((a, b) => toNumber(b.amount) - toNumber(a.amount));
    return reportResponse({
      type,
      columns: [
        { key: "label", label: "Group" },
        { key: "invoices", label: "Lines", type: "number" },
        { key: "qty", label: "Qty", type: "number" },
        { key: "weight", label: "Weight", type: "weight" },
        { key: "amount", label: "Sales", type: "currency" },
        { key: "cost", label: "Cost", type: "currency" },
        { key: "profit", label: "Profit", type: "currency" },
        { key: "profitPct", label: "Profit %", type: "percent" }
      ],
      rows,
      totals: sumRows(rows, ["invoices", "qty", "weight", "amount", "cost", "profit"]),
      chartKey: type === "profit-loss" ? "profit" : "amount",
      appliedFilters: [...appliedFilters, `Group ${groupBy}`]
    });
  }

  if (type === "purchase-detail") {
    const purchases = await prisma.purchase.findMany({
      where: {
        ...purchaseDateWhere,
        ...(supplierId ? { supplierId } : {}),
        ...(goldsmithCode ? { gsmCode: goldsmithCode } : {}),
        ...(categoryCode ? { categoryCode } : {}),
        ...(subcategoryCode ? { subcategoryCode } : {})
      },
      include: { supplier: true },
      orderBy: [{ purchaseDate: "desc" }, { id: "desc" }],
      take: 5000
    });
    const rows = purchases.map((p) => ({
      date: dateOnly(p.purchaseDate),
      purchaseNo: p.purchaseNo,
      supplier: p.supplier?.name ?? "",
      goldsmith: p.gsmName ?? p.gsmCode ?? "",
      category: p.articleName ?? p.categoryCode ?? "",
      subcategory: p.subcategoryName ?? p.subcategoryCode ?? "",
      qty: p.qty,
      weight: toNumber(p.goldWeight),
      amount: toNumber(p.totalAmount),
      paid: toNumber(p.paidAmount),
      balance: toNumber(p.balanceDue)
    }));
    return reportResponse({
      type,
      columns: [
        { key: "date", label: "Date", type: "date" },
        { key: "purchaseNo", label: "Purchase No" },
        { key: "supplier", label: "Supplier" },
        { key: "goldsmith", label: "Goldsmith" },
        { key: "subcategory", label: "Item" },
        { key: "qty", label: "Qty", type: "number" },
        { key: "weight", label: "Weight", type: "weight" },
        { key: "amount", label: "Amount", type: "currency" },
        { key: "balance", label: "Balance", type: "currency" }
      ],
      rows,
      totals: sumRows(rows, ["qty", "weight", "amount", "paid", "balance"]),
      chartKey: "amount",
      appliedFilters
    });
  }

  if (type === "stock-valuation" || type === "stock-movement") {
    const [categories, subcategories, purchases, sales] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.subcategory.findMany({ orderBy: [{ categoryCode: "asc" }, { code: "asc" }] }),
      prisma.purchase.findMany({ select: { id: true, categoryCode: true, articleName: true, subcategoryCode: true, subcategoryName: true, carat: true, qty: true, goldWeight: true, totalCost: true } }),
      prisma.sale.findMany({ select: { purchaseId: true, subcategoryCode: true, carat: true, qty: true, goldWeight: true, cost: true } })
    ]);
    const { subcategoryRows } = buildInventorySummary({ categories, subcategories, purchases, sales });
    const costBySub = new Map<string, { purchasedCost: number; soldCost: number }>();
    for (const p of purchases) {
      const key = `${p.subcategoryCode ?? ""}||${(p.carat ?? "").replace(/K$/i, "")}`;
      const current = costBySub.get(key) ?? { purchasedCost: 0, soldCost: 0 };
      current.purchasedCost += toNumber(p.totalCost);
      costBySub.set(key, current);
    }
    for (const s of sales) {
      const key = `${s.subcategoryCode ?? ""}||${(s.carat ?? "").replace(/K$/i, "")}`;
      const current = costBySub.get(key) ?? { purchasedCost: 0, soldCost: 0 };
      current.soldCost += toNumber(s.cost);
      costBySub.set(key, current);
    }
    const rows = subcategoryRows
      .filter((r) => (!categoryCode || r.categoryCode === categoryCode) && (!subcategoryCode || r.subcategoryCode === subcategoryCode))
      .map((r) => {
        const cost = costBySub.get(`${r.subcategoryCode}||${r.carat}`) ?? { purchasedCost: 0, soldCost: 0 };
        return {
          label: `${r.subcategoryName}${r.carat ? ` ${r.carat}K` : ""}`,
          category: r.categoryName,
          purchasedQty: r.purchasedQty,
          soldQty: r.soldQty,
          availableQty: r.availableQty,
          purchasedWeight: r.purchasedGoldWeight,
          soldWeight: r.soldGoldWeight,
          availableWeight: r.availableGoldWeight,
          value: Math.max(0, cost.purchasedCost - cost.soldCost)
        };
      })
      .sort((a, b) => toNumber(b.value) - toNumber(a.value));
    return reportResponse({
      type,
      columns:
        type === "stock-valuation"
          ? [
              { key: "label", label: "Item" },
              { key: "category", label: "Category" },
              { key: "availableQty", label: "Available Qty", type: "number" },
              { key: "availableWeight", label: "Available Weight", type: "weight" },
              { key: "value", label: "Stock Value", type: "currency" }
            ]
          : [
              { key: "label", label: "Item" },
              { key: "purchasedQty", label: "Purchased", type: "number" },
              { key: "soldQty", label: "Sold", type: "number" },
              { key: "availableQty", label: "Available", type: "number" },
              { key: "purchasedWeight", label: "Purchased Weight", type: "weight" },
              { key: "soldWeight", label: "Sold Weight", type: "weight" },
              { key: "availableWeight", label: "Available Weight", type: "weight" }
            ],
      rows,
      totals: sumRows(rows, ["purchasedQty", "soldQty", "availableQty", "purchasedWeight", "soldWeight", "availableWeight", "value"]),
      chartKey: type === "stock-valuation" ? "value" : "availableWeight",
      appliedFilters
    });
  }

  if (type === "customer-outstanding") {
    const [customers, transactions] = await Promise.all([
      prisma.customer.findMany({ where: { accountNumber: { not: null }, ...(customerId ? { id: customerId } : {}) }, orderBy: { name: "asc" } }),
      prisma.transaction.findMany({ where: { accountNumber: { not: null } }, select: { accountNumber: true, debit: true, credit: true } })
    ]);
    const txByAccount = transactions.reduce((map, tx) => {
      const account = (tx.accountNumber ?? "").trim();
      map.set(account, (map.get(account) ?? 0) + toNumber(tx.debit) - toNumber(tx.credit));
      return map;
    }, new Map<string, number>());
    const rows = customers
      .map((c) => ({ customer: c.name, accountNumber: c.accountNumber ?? "", phone: c.phone ?? "", balance: txByAccount.get((c.accountNumber ?? "").trim()) ?? 0 }))
      .filter((r) => r.balance !== 0)
      .sort((a, b) => b.balance - a.balance);
    return reportResponse({
      type,
      columns: [
        { key: "customer", label: "Customer" },
        { key: "accountNumber", label: "Account" },
        { key: "phone", label: "Phone" },
        { key: "balance", label: "Balance", type: "currency" }
      ],
      rows,
      totals: sumRows(rows, ["balance"]),
      chartKey: "balance",
      appliedFilters
    });
  }

  if (type === "supplier-outstanding") {
    const purchases = await prisma.purchase.findMany({
      where: { balanceDue: { gt: new Prisma.Decimal("0") }, ...(supplierId ? { supplierId } : {}) },
      include: { supplier: true },
      orderBy: [{ purchaseDate: "desc" }],
      take: 5000
    });
    const rows = purchases.map((p) => ({ date: dateOnly(p.purchaseDate), purchaseNo: p.purchaseNo, supplier: p.supplier?.name ?? "No supplier", amount: toNumber(p.totalAmount), paid: toNumber(p.paidAmount), balance: toNumber(p.balanceDue) }));
    return reportResponse({
      type,
      columns: [
        { key: "date", label: "Date", type: "date" },
        { key: "purchaseNo", label: "Purchase No" },
        { key: "supplier", label: "Supplier" },
        { key: "amount", label: "Amount", type: "currency" },
        { key: "paid", label: "Paid", type: "currency" },
        { key: "balance", label: "Balance", type: "currency" }
      ],
      rows,
      totals: sumRows(rows, ["amount", "paid", "balance"]),
      chartKey: "balance",
      appliedFilters
    });
  }

  if (type === "goldsmith-pending") {
    const [purchases, sales] = await Promise.all([
      prisma.purchase.findMany({ where: { ...(goldsmithCode ? { gsmCode: goldsmithCode } : {}) }, select: { id: true, gsmCode: true, gsmName: true, subcategoryName: true, qty: true, goldWeight: true } }),
      prisma.sale.findMany({ select: { purchaseId: true, qty: true, goldWeight: true } })
    ]);
    const soldByPurchase = sales.reduce((map, sale) => {
      if (sale.purchaseId == null) return map;
      const current = map.get(sale.purchaseId) ?? { qty: 0, weight: 0 };
      current.qty += sale.qty;
      current.weight += toNumber(sale.goldWeight);
      map.set(sale.purchaseId, current);
      return map;
    }, new Map<number, { qty: number; weight: number }>());
    const map = new Map<string, Row>();
    for (const p of purchases) {
      const sold = soldByPurchase.get(p.id) ?? { qty: 0, weight: 0 };
      const pendingQty = Math.max(0, p.qty - sold.qty);
      const pendingWeight = Math.max(0, toNumber(p.goldWeight) - sold.weight);
      if (pendingQty <= 0 && pendingWeight <= 0) continue;
      const key = p.gsmCode ?? p.gsmName ?? "No goldsmith";
      const row = map.get(key) ?? { label: p.gsmName ?? key, pendingQty: 0, pendingWeight: 0, jobs: 0 };
      row.jobs = toNumber(row.jobs) + 1;
      row.pendingQty = toNumber(row.pendingQty) + pendingQty;
      row.pendingWeight = toNumber(row.pendingWeight) + pendingWeight;
      map.set(key, row);
    }
    const rows = Array.from(map.values()).sort((a, b) => toNumber(b.pendingWeight) - toNumber(a.pendingWeight));
    return reportResponse({
      type,
      columns: [
        { key: "label", label: "Goldsmith" },
        { key: "jobs", label: "Open Jobs", type: "number" },
        { key: "pendingQty", label: "Pending Qty", type: "number" },
        { key: "pendingWeight", label: "Gold Given", type: "weight" }
      ],
      rows,
      totals: sumRows(rows, ["jobs", "pendingQty", "pendingWeight"]),
      chartKey: "pendingWeight",
      appliedFilters
    });
  }

  if (type === "payments" || type === "cashbook") {
    const transactions = await prisma.transaction.findMany({
      where: { ...txDateWhere, ...(type === "payments" ? { type: "PAYMENT" } : {}) },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 5000
    });
    const rows = transactions.map((t) => ({
      date: dateOnly(t.date),
      source: t.source ?? "",
      account: t.account ?? "",
      memo: t.memo ?? "",
      reference: t.referenceNumber ?? "",
      debit: toNumber(t.debit),
      credit: toNumber(t.credit),
      bankDebit: toNumber(t.bankDebit),
      bankCredit: toNumber(t.bankCredit),
      balance: toNumber(t.debit) - toNumber(t.credit) + toNumber(t.bankDebit) - toNumber(t.bankCredit)
    }));
    return reportResponse({
      type,
      columns:
        type === "payments"
          ? [
              { key: "date", label: "Date", type: "date" },
              { key: "account", label: "Customer" },
              { key: "source", label: "Mode" },
              { key: "reference", label: "Reference" },
              { key: "credit", label: "Amount", type: "currency" }
            ]
          : [
              { key: "date", label: "Date", type: "date" },
              { key: "source", label: "Source" },
              { key: "account", label: "Account" },
              { key: "memo", label: "Memo" },
              { key: "debit", label: "Debit", type: "currency" },
              { key: "credit", label: "Credit", type: "currency" },
              { key: "bankDebit", label: "Bank Debit", type: "currency" },
              { key: "bankCredit", label: "Bank Credit", type: "currency" }
            ],
      rows,
      totals: sumRows(rows, ["debit", "credit", "bankDebit", "bankCredit", "balance"]),
      chartKey: type === "payments" ? "credit" : "balance",
      appliedFilters
    });
  }
}

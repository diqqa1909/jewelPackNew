import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type GroupBy = "category" | "subcategory" | "customer" | "salesman";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateFromRaw = (url.searchParams.get("dateFrom") ?? "").trim();
  const dateToRaw = (url.searchParams.get("dateTo") ?? "").trim();
  const groupBy = (url.searchParams.get("groupBy") ?? "category").trim() as GroupBy;
  const categoryCode = (url.searchParams.get("categoryCode") ?? "").trim();
  const subcategoryCode = (url.searchParams.get("subcategoryCode") ?? "").trim();
  const customerIdRaw = (url.searchParams.get("customerId") ?? "").trim();
  const salesmanIdRaw = (url.searchParams.get("salesmanId") ?? "").trim();

  const customerId = customerIdRaw ? Number(customerIdRaw) : null;
  const salesmanId = salesmanIdRaw ? Number(salesmanIdRaw) : null;
  if (customerIdRaw && !Number.isFinite(customerId)) return NextResponse.json({ error: "Invalid customerId" }, { status: 400 });
  if (salesmanIdRaw && !Number.isFinite(salesmanId)) return NextResponse.json({ error: "Invalid salesmanId" }, { status: 400 });

  const dateFrom = dateFromRaw ? new Date(dateFromRaw) : null;
  const dateTo = dateToRaw ? new Date(dateToRaw) : null;
  if (dateFromRaw && Number.isNaN(dateFrom!.getTime())) return NextResponse.json({ error: "Invalid dateFrom" }, { status: 400 });
  if (dateToRaw && Number.isNaN(dateTo!.getTime())) return NextResponse.json({ error: "Invalid dateTo" }, { status: 400 });

  const whereHeader: any = {};
  if (dateFrom || dateTo) {
    whereHeader.transactionDate = {};
    if (dateFrom) whereHeader.transactionDate.gte = dateFrom;
    if (dateTo) whereHeader.transactionDate.lte = dateTo;
  }
  if (customerId) whereHeader.customerId = customerId;
  if (salesmanId) whereHeader.salesmanId = salesmanId;

  // Fetch invoice lines with stockMaster (contains category/subcategory) and header dims.
  const lines = await prisma.sale.findMany({
    where: {
      ...(Object.keys(whereHeader).length ? { salesNTX: whereHeader } : {}),
      ...(subcategoryCode ? { subcategoryCode } : {}),
      ...(categoryCode ? { stockMaster: { categoryCode } } : {})
    },
    include: {
      salesNTX: { include: { customer: true, salesman: true } },
      stockMaster: true
    },
    take: 5000,
    orderBy: [{ id: "desc" }]
  });

  const keyOf = (l: typeof lines[number]) => {
    switch (groupBy) {
      case "customer":
        return `CUST:${l.salesNTX.customerId}`;
      case "salesman":
        return `SAL:${l.salesNTX.salesmanId ?? 0}`;
      case "subcategory":
        return `SUB:${l.subcategoryCode}`;
      case "category":
      default:
        return `CAT:${l.stockMaster.categoryCode}`;
    }
  };

  const labelOf = (l: typeof lines[number]) => {
    switch (groupBy) {
      case "customer":
        return l.salesNTX.customer.name;
      case "salesman":
        return l.salesNTX.salesman?.name ?? "(No salesman)";
      case "subcategory":
        return l.subcategoryCode;
      case "category":
      default:
        return l.stockMaster.categoryCode;
    }
  };

  const map = new Map<
    string,
    { key: string; label: string; invoices: Set<number>; qty: number; weight: number; amount: number; cost: number }
  >();
  for (const l of lines) {
    const key = keyOf(l);
    const prev =
      map.get(key) ?? { key, label: labelOf(l), invoices: new Set<number>(), qty: 0, weight: 0, amount: 0, cost: 0 };
    prev.invoices.add(l.salesNTXId);
    prev.qty += l.qty ?? 0;
    prev.weight += Number(l.goldWeight.toString());
    prev.amount += Number(l.sellCost.toString());
    prev.cost += Number(l.cost.toString());
    map.set(key, prev);
  }

  const rows = Array.from(map.values())
    .map((r) => ({
      key: r.key,
      label: r.label,
      invoices: r.invoices.size,
      qty: r.qty,
      weight: r.weight,
      amount: r.amount,
      cost: r.cost,
      profit: r.amount - r.cost,
      profitPct: r.amount > 0 ? ((r.amount - r.cost) / r.amount) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  return NextResponse.json({ rows });
}

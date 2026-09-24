import { GoldsmithsTable } from "@/components/app/GoldsmithsTable";
import { purchaseGoldCredit24Kt, to24KtWeight } from "@/lib/gold-weight";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SupplierGoldsmithRow = {
  id?: number;
  code: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
  accountNumber: string;
  rowType: "goldsmith" | "supplier";
  goldDr: number;
  goldCr: number;
  goldBl: number;
  cashDr: number;
  cashCr: number;
  cashBl: number;
};

export default async function GoldsmithsPage() {
  const [goldsmiths, suppliers, goldIssues, purchases] = await Promise.all([
    prismaWithRetry((p) => p.goldsmith.findMany({ orderBy: { code: "asc" } })),
    prismaWithRetry((p) =>
      p.supplier.findMany({
        orderBy: [{ accountNumber: "asc" }, { name: "asc" }],
        select: {
          id: true,
          accountNumber: true,
          goldsmithCode: true,
          name: true,
          contact: true,
          phone: true,
          email: true,
          address: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ),
    prismaWithRetry((p) => p.goldIssue.findMany({ select: { goldsmithCode: true, issueType: true, carat: true, goldWeight: true, cashAmount: true } })),
    prismaWithRetry((p) =>
      p.purchase.findMany({
        where: { OR: [{ gsmCode: { not: null } }, { supplierId: { not: null } }] },
        select: {
          supplierId: true,
          gsmCode: true,
          purchaseType: true,
          goldWeight: true,
          wastageMg: true,
          carat: true,
          labourCharges: true,
          totalCost: true,
          paidAmount: true
        }
      })
    )
  ]);

  const balances = new Map<string, { goldDr: number; goldCr: number; cashDr: number; cashCr: number }>();
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  for (const issue of goldIssues) {
    const current = balances.get(issue.goldsmithCode) ?? { goldDr: 0, goldCr: 0, cashDr: 0, cashCr: 0 };
    if ((issue.issueType ?? "GOLD") === "CASH") {
      current.cashDr += Number(issue.cashAmount);
    } else {
      current.goldDr += to24KtWeight(issue.goldWeight, issue.carat);
    }
    balances.set(issue.goldsmithCode, current);
  }
  for (const purchase of purchases) {
    const supplier = purchase.supplierId ? supplierById.get(purchase.supplierId) : null;
    const balanceKey = supplier?.goldsmithCode ?? (supplier ? `SUPPLIER-${supplier.id}` : purchase.gsmCode);
    if (!balanceKey) continue;

    const current = balances.get(balanceKey) ?? { goldDr: 0, goldCr: 0, cashDr: 0, cashCr: 0 };
    current.cashDr += Number(purchase.paidAmount);
    if (purchase.purchaseType.trim().toLowerCase() === "rate") {
      current.cashCr += Number(purchase.totalCost);
    } else if (supplier?.goldsmithCode || (!supplier && purchase.gsmCode)) {
      current.goldCr += purchaseGoldCredit24Kt(purchase.goldWeight, purchase.wastageMg, purchase.carat);
      current.cashCr += Number(purchase.labourCharges);
    } else {
      current.cashCr += Number(purchase.totalCost);
    }
    balances.set(balanceKey, current);
  }

  const goldsmithCodes = new Set(goldsmiths.map((goldsmith) => goldsmith.code));
  const rows: SupplierGoldsmithRow[] = goldsmiths.map((goldsmith) => {
    const values = balances.get(goldsmith.code) ?? { goldDr: 0, goldCr: 0, cashDr: 0, cashCr: 0 };
    return {
      ...goldsmith,
      id: undefined,
      contact: null,
      phone: null,
      email: null,
      address: null,
      accountNumber: `GSM-${goldsmith.code}`,
      rowType: "goldsmith" as const,
      ...values,
      goldBl: values.goldDr - values.goldCr,
      cashBl: values.cashCr - values.cashDr
    };
  });

  for (const supplier of suppliers) {
    if (supplier.goldsmithCode && goldsmithCodes.has(supplier.goldsmithCode)) continue;
    const code = supplier.accountNumber ?? `SUP-${String(supplier.id).padStart(4, "0")}`;
    const values = balances.get(`SUPPLIER-${supplier.id}`) ?? { goldDr: 0, goldCr: 0, cashDr: 0, cashCr: 0 };
    rows.push({
      id: supplier.id,
      code,
      name: supplier.name,
      contact: supplier.contact,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      accountNumber: code,
      rowType: "supplier" as const,
      goldDr: values.goldDr,
      goldCr: values.goldCr,
      goldBl: values.goldDr - values.goldCr,
      cashDr: values.cashDr,
      cashCr: values.cashCr,
      cashBl: values.cashCr - values.cashDr
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code));

  return <GoldsmithsTable initial={rows} />;
}

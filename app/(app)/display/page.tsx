import { AccountDisplayClient, type DisplayAccount, type DisplayTransaction } from "@/components/app/AccountDisplayClient";
import { accountChartCode } from "@/lib/account-chart";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (value && typeof (value as { toString(): string }).toString === "function") {
    const n = Number((value as { toString(): string }).toString());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function dateValue(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

export default async function DisplayPage() {
  const [customers, suppliers, goldsmiths, ledgerAccounts, chartRows, transactions, doubleTransactions, mappings, purchases, sales] = await Promise.all([
    prismaWithRetry((p) =>
      p.customer.findMany({
        where: { accountNumber: { not: null } },
        orderBy: [{ accountNumber: "asc" }, { name: "asc" }],
        take: 1000,
        select: { id: true, accountNumber: true, name: true, phone: true }
      })
    ),
    prismaWithRetry((p) =>
      p.supplier.findMany({
        orderBy: [{ accountNumber: "asc" }, { name: "asc" }],
        take: 1000,
        select: { id: true, accountNumber: true, goldsmithCode: true, name: true, phone: true, contact: true }
      })
    ),
    prismaWithRetry((p) => p.goldsmith.findMany({ select: { code: true } })),
    prismaWithRetry((p) =>
      p.generalLedgerAccount.findMany({
        orderBy: [{ accountNumber: "asc" }, { name: "asc" }],
        take: 1000,
        select: { id: true, accountNumber: true, name: true }
      })
    ),
    prismaWithRetry((p) =>
      p.chart.findMany({
        orderBy: [{ rangeStart: "asc" }],
        select: { code: true, name: true, rangeStart: true, rangeEnd: true }
      })
    ),
    prismaWithRetry((p) =>
      p.transaction.findMany({
        where: { accountNumber: { not: null } },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 5000,
        select: {
          id: true,
          date: true,
          referenceNumber: true,
          memo: true,
          remarks: true,
          source: true,
          type: true,
          accountNumber: true,
          debit: true,
          credit: true
        }
      })
    ),
    prismaWithRetry((p) =>
      p.doubleTransaction.findMany({
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 10000,
        select: {
          id: true,
          postingKey: true,
          date: true,
          referenceNumber: true,
          memo: true,
          remarks: true,
          source: true,
          type: true,
          accountNumber: true,
          debit: true,
          credit: true
        }
      })
    ),
    prismaWithRetry((p) =>
      p.systemAccountMapping.findMany({
        where: { key: { in: ["SALES_ACCOUNT", "PURCHASES_ACCOUNT", "DEBTORS_CONTROL_ACCOUNT", "CREDITORS_CONTROL_ACCOUNT"] } },
        include: { account: true }
      })
    ),
    prismaWithRetry((p) =>
      p.purchase.findMany({
        select: { purchaseGroupNo: true, purchaseNo: true, purchaseDate: true, totalCost: true, remarks: true }
      })
    ),
    prismaWithRetry((p) =>
      p.salesNTX.findMany({
        select: { saleNo: true, transactionDate: true, sellSubTotal: true, remarks: true }
      })
    )
  ]);

  const totalsByAccount = transactions.reduce((map, tx) => {
    const accountNumber = (tx.accountNumber ?? "").trim();
    if (!accountNumber) return map;
    const totals = map.get(accountNumber) ?? { debit: 0, credit: 0 };
    totals.debit += toNumber(tx.debit);
    totals.credit += toNumber(tx.credit);
    map.set(accountNumber, totals);
    return map;
  }, new Map<string, { debit: number; credit: number }>());

  function balance(accountNumber: string) {
    const totals = totalsByAccount.get(accountNumber) ?? { debit: 0, credit: 0 };
    return totals.debit - totals.credit;
  }

  const ledgerAccountByNumber = new Map(ledgerAccounts.map((account) => [account.accountNumber, account]));
  const mappingByKey = new Map(mappings.map((mapping) => [mapping.key, mapping.account]));
  const salesAccount = mappingByKey.get("SALES_ACCOUNT");
  const purchasesAccount = mappingByKey.get("PURCHASES_ACCOUNT");
  const debtorsAccount = mappingByKey.get("DEBTORS_CONTROL_ACCOUNT");
  const creditorsAccount = mappingByKey.get("CREDITORS_CONTROL_ACCOUNT");
  const customerAccounts = new Set(customers.map((customer) => (customer.accountNumber ?? "").trim()).filter(Boolean));
  const supplierAccounts = new Set(
    suppliers
      .flatMap((supplier) => [
        (supplier.accountNumber ?? "").trim(),
        `SUP-${String(supplier.id).padStart(4, "0")}`,
        supplier.goldsmithCode ? `GSM-${supplier.goldsmithCode.trim()}` : ""
      ])
      .filter(Boolean)
  );
  const goldsmithAccounts = new Set(goldsmiths.map((goldsmith) => `GSM-${goldsmith.code.trim()}`));

  function glAccountForDisplay(accountNumber: string) {
    const trimmed = accountNumber.trim();
    const ledgerAccount = ledgerAccountByNumber.get(trimmed);
    if (ledgerAccount) return ledgerAccount;
    if (customerAccounts.has(trimmed)) return debtorsAccount ?? null;
    if (supplierAccounts.has(trimmed) || goldsmithAccounts.has(trimmed)) return creditorsAccount ?? null;
    return null;
  }

  const glTransactions: DisplayTransaction[] = [];
  function addGlTransaction({
    id,
    account,
    date,
    referenceNumber,
    memo,
    source,
    type,
    debit,
    credit
  }: {
    id: number;
    account: { accountNumber: string; name: string } | null | undefined;
    date: Date | string | null | undefined;
    referenceNumber: string | null;
    memo: string | null;
    source: string | null;
    type: string | null;
    debit: unknown;
    credit: unknown;
  }) {
    if (!account) return;
    glTransactions.push({
      id,
      date: dateValue(date) ?? "",
      referenceNumber,
      memo,
      source,
      type,
      accountNumber: account.accountNumber,
      debit: toNumber(debit),
      credit: toNumber(credit)
    });
  }

  for (const tx of doubleTransactions) {
    addGlTransaction({
      id: tx.id,
      account: glAccountForDisplay(tx.accountNumber),
      date: tx.date,
      referenceNumber: tx.referenceNumber,
      memo: tx.memo ?? tx.remarks,
      source: tx.source,
      type: tx.type,
      debit: tx.debit,
      credit: tx.credit
    });
  }

  const postedKeys = new Set(doubleTransactions.map((tx) => tx.postingKey));
  const purchaseTotalsByGroup = purchases.reduce((map, purchase) => {
    const key = purchase.purchaseGroupNo ?? purchase.purchaseNo;
    const current = map.get(key) ?? { amount: 0, date: purchase.purchaseDate };
    current.amount += toNumber(purchase.totalCost);
    if (purchase.purchaseDate < current.date) current.date = purchase.purchaseDate;
    map.set(key, current);
    return map;
  }, new Map<string, { amount: number; date: Date }>());
  let syntheticId = -1;
  for (const [purchaseGroupNo, row] of purchaseTotalsByGroup.entries()) {
    if (postedKeys.has(`P:${purchaseGroupNo}:PURCHASE`)) continue;
    addGlTransaction({
      id: syntheticId--,
      account: purchasesAccount,
      date: row.date,
      referenceNumber: purchaseGroupNo,
      memo: purchaseGroupNo,
      source: "P",
      type: "PURCHASE",
      debit: row.amount,
      credit: 0
    });
    addGlTransaction({
      id: syntheticId--,
      account: creditorsAccount,
      date: row.date,
      referenceNumber: purchaseGroupNo,
      memo: purchaseGroupNo,
      source: "P",
      type: "PURCHASE",
      debit: 0,
      credit: row.amount
    });
  }
  for (const sale of sales) {
    if (postedKeys.has(`S:${sale.saleNo}:INVOICE`)) continue;
    const amount = toNumber(sale.sellSubTotal);
    addGlTransaction({
      id: syntheticId--,
      account: debtorsAccount,
      date: sale.transactionDate,
      referenceNumber: sale.saleNo,
      memo: sale.saleNo,
      source: "S",
      type: "INVOICE",
      debit: amount,
      credit: 0
    });
    addGlTransaction({
      id: syntheticId--,
      account: salesAccount,
      date: sale.transactionDate,
      referenceNumber: sale.saleNo,
      memo: sale.saleNo,
      source: "S",
      type: "SALE_REVENUE",
      debit: 0,
      credit: amount
    });
  }

  const glTotalsByAccount = glTransactions.reduce((map, tx) => {
    const totals = map.get(tx.accountNumber) ?? { debit: 0, credit: 0 };
    totals.debit += tx.debit;
    totals.credit += tx.credit;
    map.set(tx.accountNumber, totals);
    return map;
  }, new Map<string, { debit: number; credit: number }>());

  function glBalance(accountNumber: string) {
    const totals = glTotalsByAccount.get(accountNumber) ?? { debit: 0, credit: 0 };
    return totals.debit - totals.credit;
  }

  const chartByCode = new Map(chartRows.map((row) => [row.code, row]));

  const accounts: DisplayAccount[] = [
    ...customers.map((account) => {
      const accountNumber = account.accountNumber ?? "";
      return {
        key: `DR-${account.id}`,
        kind: "DR" as const,
        accountNumber,
        name: account.name,
        detail: account.phone,
        balance: balance(accountNumber)
      };
    }),
    ...suppliers.map((account) => {
      const accountNumber = account.accountNumber ?? `SUP-${String(account.id).padStart(4, "0")}`;
      return {
        key: `CR-${account.id}`,
        kind: "CR" as const,
        accountNumber,
        name: account.name,
        detail: account.phone ?? account.contact,
        balance: balance(accountNumber)
      };
    }),
    ...ledgerAccounts.map((account) => {
      const chart = chartByCode.get(accountChartCode(account.accountNumber) ?? "");
      return {
        key: `GL-${account.id}`,
        kind: "GL" as const,
        accountNumber: account.accountNumber,
        name: account.name,
        detail: chart ? `${chart.name} (${chart.rangeStart}-${chart.rangeEnd})` : "General Ledger",
        balance: glBalance(account.accountNumber)
      };
    })
  ];

  const displayTransactions: DisplayTransaction[] = transactions.map((tx) => ({
    id: tx.id,
    date: dateValue(tx.date) ?? "",
    referenceNumber: tx.referenceNumber,
    memo: tx.memo ?? tx.remarks,
    source: tx.source,
    type: tx.type,
    accountNumber: tx.accountNumber ?? "",
    debit: toNumber(tx.debit),
    credit: toNumber(tx.credit)
  }));

  return <AccountDisplayClient accounts={accounts} transactions={[...displayTransactions, ...glTransactions]} />;
}

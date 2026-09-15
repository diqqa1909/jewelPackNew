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
  const [customers, suppliers, ledgerAccounts, chartRows, transactions] = await Promise.all([
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
        select: { id: true, accountNumber: true, name: true, phone: true, contact: true }
      })
    ),
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
        balance: balance(account.accountNumber)
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

  return <AccountDisplayClient accounts={accounts} transactions={displayTransactions} />;
}

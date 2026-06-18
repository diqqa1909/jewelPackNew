import { PaymentsClient, type PaymentCustomerRow } from "@/components/app/PaymentsClient";
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

export default async function PaymentsPage() {
  const [customers, transactions] = await Promise.all([
    prismaWithRetry((p) =>
      p.customer.findMany({
        where: { accountNumber: { not: null } },
        orderBy: { name: "asc" },
        select: {
          id: true,
          accountNumber: true,
          name: true,
          phone: true
        }
      })
    ),
    prismaWithRetry((p) =>
      p.transaction.findMany({
        where: { accountNumber: { not: null } },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        select: {
          date: true,
          debit: true,
          credit: true,
          accountNumber: true,
          type: true
        }
      })
    )
  ]);

  const txByAccount = transactions.reduce(
    (map, tx) => {
      const accountNumber = (tx.accountNumber ?? "").trim();
      if (!accountNumber) return map;
      const current = map.get(accountNumber) ?? {
        totalDebit: 0,
        totalCredit: 0,
        lastInvoiceDate: null as string | null,
        lastPaymentDate: null as string | null
      };
      current.totalDebit += toNumber(tx.debit);
      current.totalCredit += toNumber(tx.credit);
      const isoDate = dateValue(tx.date);
      if ((tx.type ?? "").toUpperCase() === "INVOICE" && isoDate && !current.lastInvoiceDate) {
        current.lastInvoiceDate = isoDate;
      }
      if ((tx.type ?? "").toUpperCase() === "PAYMENT" && isoDate && !current.lastPaymentDate) {
        current.lastPaymentDate = isoDate;
      }
      map.set(accountNumber, current);
      return map;
    },
    new Map<
      string,
      {
        totalDebit: number;
        totalCredit: number;
        lastInvoiceDate: string | null;
        lastPaymentDate: string | null;
      }
    >()
  );

  const rows: PaymentCustomerRow[] = customers
    .map((customer) => {
      const accountNumber = (customer.accountNumber ?? "").trim();
      const totals = txByAccount.get(accountNumber) ?? {
        totalDebit: 0,
        totalCredit: 0,
        lastInvoiceDate: null,
        lastPaymentDate: null
      };
      return {
        id: customer.id,
        accountNumber,
        name: customer.name,
        phone: customer.phone,
        totalDebit: totals.totalDebit,
        totalCredit: totals.totalCredit,
        balanceDue: Math.max(0, totals.totalDebit - totals.totalCredit),
        lastInvoiceDate: totals.lastInvoiceDate,
        lastPaymentDate: totals.lastPaymentDate
      };
    })
    .filter((row) => row.accountNumber && row.balanceDue > 0)
    .sort((a, b) => b.balanceDue - a.balanceDue || a.name.localeCompare(b.name));

  return <PaymentsClient initialRows={rows} />;
}

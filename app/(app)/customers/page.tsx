import { CustomersTable } from "@/components/app/CustomersTable";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  if (value && typeof value === "object" && "toString" in value) return Number(value.toString());
  return Number(value ?? 0) || 0;
}

export default async function CustomersPage() {
  const customers = await prismaWithRetry((p) => p.customer.findMany({ orderBy: { createdAt: "desc" } }));
  const accountNumbers = customers.map((customer) => customer.accountNumber).filter((value): value is string => Boolean(value));
  const balanceRows = accountNumbers.length
    ? await prismaWithRetry((p) =>
        p.transaction.groupBy({
          by: ["accountNumber"],
          where: { accountNumber: { in: accountNumbers } },
          _sum: {
            debit: true,
            credit: true,
            goldIssued: true,
            goldReceived: true
          }
        })
      )
    : [];
  const balancesByAccount = new Map(
    balanceRows.map((row) => {
      const cashBalance = toNumber(row._sum.debit) - toNumber(row._sum.credit);
      const goldBalance = toNumber(row._sum.goldIssued) - toNumber(row._sum.goldReceived);
      return [
        row.accountNumber ?? "",
        {
          cashBalance: cashBalance.toFixed(2),
          goldBalance: goldBalance.toFixed(3)
        }
      ] as const;
    })
  );
  const directoryRows = customers.map((customer) => ({
    ...customer,
    cashBalance: balancesByAccount.get(customer.accountNumber ?? "")?.cashBalance ?? "0.00",
    goldBalance: balancesByAccount.get(customer.accountNumber ?? "")?.goldBalance ?? "0.000"
  }));

  return <CustomersTable initial={directoryRows} />;
}

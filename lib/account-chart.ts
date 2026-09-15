import type { PrismaClient } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";

export function numericAccountNumber(accountNumber: string | null | undefined) {
  const value = (accountNumber ?? "").trim();
  if (!/^\d{4}$/.test(value)) return null;
  return Number(value);
}

export function accountChartCode(accountNumber: string | null | undefined) {
  const value = (accountNumber ?? "").trim();
  if (!/^\d{4}$/.test(value)) return null;
  return `${value[0]}-${value[1]}`;
}

export async function chartForAccountNumber(
  accountNumber: string | null | undefined,
  client: Pick<PrismaClient, "chart"> = prisma
) {
  const number = numericAccountNumber(accountNumber);
  if (number === null) return null;
  return client.chart.findFirst({
    where: {
      rangeStart: { lte: number },
      rangeEnd: { gte: number }
    }
  });
}

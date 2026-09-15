import { accountChartCode } from "@/lib/account-chart";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const accountNumber = (url.searchParams.get("accountNumber") ?? "").trim();

  if (accountNumber) {
    const code = accountChartCode(accountNumber);
    if (!code) return NextResponse.json({ chart: null });
    const chart = await prisma.chart.findUnique({ where: { code } });
    return NextResponse.json({ chart });
  }

  const chart = await prisma.chart.findMany({ orderBy: [{ rangeStart: "asc" }, { rangeEnd: "asc" }] });
  return NextResponse.json({ chart });
}

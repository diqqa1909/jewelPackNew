import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = await prisma.stockMaster.groupBy({
    by: ["subcategoryCode", "carat"],
    _sum: { balanceQty: true, balanceGoldWeight: true, balanceCost: true }
  });

  return NextResponse.json({
    rows: rows.map((r) => ({
      subcategoryCode: r.subcategoryCode,
      carat: r.carat ?? "",
      balanceQty: r._sum.balanceQty ?? 0,
      balanceGoldWeight: r._sum.balanceGoldWeight?.toString() ?? "0",
      balanceCost: r._sum.balanceCost?.toString() ?? "0"
    }))
  });
}


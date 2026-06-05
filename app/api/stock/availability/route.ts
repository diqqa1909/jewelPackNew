import { prisma } from "@/lib/prisma";
import { getInventoryBalanceRows } from "@/lib/inventory-balance";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await getInventoryBalanceRows(prisma);
  return NextResponse.json({
    rows: rows.map((r) => ({
      subcategoryCode: r.subcategoryCode,
      carat: r.carat ?? "",
      balanceQty: Math.max(0, r.balanceQty),
      balanceGoldWeight: Math.max(0, Number(r.balanceGoldWeight)).toString(),
      balanceCost: "0"
    }))
  });
}

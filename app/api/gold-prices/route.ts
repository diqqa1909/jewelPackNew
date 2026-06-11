import { fetchGoldPrices } from "@/lib/goldPrices";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const result = await fetchGoldPrices();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

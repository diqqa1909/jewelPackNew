function toNumber(value: unknown) {
  const n = Number(value && typeof (value as any).toString === "function" ? (value as any).toString() : value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function karatValue(carat: string | null | undefined) {
  return Number.parseFloat(carat ?? "") || 0;
}

export function to24KtWeight(goldWeight: unknown, carat: string | null | undefined) {
  return (toNumber(goldWeight) / 24) * karatValue(carat);
}

export function purchaseGoldCredit24Kt(goldWeight: unknown, wastageMg: unknown, carat: string | null | undefined) {
  return ((toNumber(goldWeight) + toNumber(wastageMg) / 1000) / 24) * karatValue(carat);
}

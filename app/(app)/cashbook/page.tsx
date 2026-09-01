import { CashbookClient } from "@/components/app/CashbookClient";

export const dynamic = "force-dynamic";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function CashbookPage() {
  return <CashbookClient initialDate={todayISO()} />;
}

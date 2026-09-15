import { BankingClient } from "@/components/app/BankingClient";

export const dynamic = "force-dynamic";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function BankingPage() {
  return <BankingClient initialDate={todayISO()} />;
}

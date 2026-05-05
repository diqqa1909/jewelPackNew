import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const reportCards = [
  { title: "Sales Summary", desc: "Revenue, invoices, and AOV by period." },
  { title: "Stock Valuation", desc: "Inventory value by category and purity." },
  { title: "Profit & Loss", desc: "COGS, margin, and expenses overview." },
  { title: "Customer Aging", desc: "Outstanding receivables buckets." }
];

export default function ReportsPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {reportCards.map((r) => (
        <Card key={r.title}>
          <CardHeader>
            <CardTitle>{r.title}</CardTitle>
            <CardDescription>{r.desc}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <button
              type="button"
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              View Report
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


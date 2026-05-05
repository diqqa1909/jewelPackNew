import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const kpis = [
  { label: "On-hand Items", value: "1,284", note: "Across 38 categories" },
  { label: "Low Stock", value: "23", note: "Reorder recommended" },
  { label: "Sales (30d)", value: "LKR 4.82M", note: "Invoices: 214" },
  { label: "Gross Margin", value: "18.6%", note: "Last 30 days" }
];

const recentSales = [
  { id: "INV-10421", customer: "Nimal Jewellery", amount: "LKR 184,500", status: "Paid" },
  { id: "INV-10420", customer: "Ashan Perera", amount: "LKR 92,000", status: "Pending" },
  { id: "INV-10419", customer: "Sahana Gems", amount: "LKR 318,250", status: "Paid" },
  { id: "INV-10418", customer: "Malithi Silva", amount: "LKR 41,000", status: "Partial" }
];

function getStatusBadgeStyles(status: string) {
  switch (status) {
    case "Paid":
      return "bg-green-100 text-green-800 ring-green-300 border-green-300";
    case "Pending":
      return "bg-amber-100 text-amber-800 ring-amber-300 border-amber-300";
    case "Partial":
      return "bg-blue-100 text-blue-800 ring-blue-300 border-blue-300";
    default:
      return "bg-gray-100 text-gray-700 ring-gray-300 border-gray-300";
  }
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <CardTitle className="text-sm">{kpi.label}</CardTitle>
              <CardDescription>{kpi.note}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold tracking-tight text-ebony-900">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>Latest invoices and payment status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-ebony-100">
              <table className="w-full text-sm">
                <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
                  <tr>
                    <th className="px-5 py-4">Invoice</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ebony-100">
                  {recentSales.map((row) => (
                    <tr key={row.id} className="bg-white hover:bg-ebony-50 transition-colors">
                      <td className="px-5 py-4 font-semibold text-ebony-900">{row.id}</td>
                      <td className="px-5 py-4 text-ebony-700">{row.customer}</td>
                      <td className="px-5 py-4 text-ebony-700 font-medium">{row.amount}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 border ${getStatusBadgeStyles(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today</CardTitle>
            <CardDescription>Quick operational checklist.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Verify gold price updates",
              "Reconcile cash counter",
              "Review low-stock alerts",
              "Follow up pending invoices"
            ].map((t) => (
              <div
                key={t}
                className="flex items-center justify-between rounded-lg border border-ebony-100 bg-white hover:bg-ebony-50 px-4 py-3 text-sm transition-all"
              >
                <span className="font-medium text-ebony-700">{t}</span>
                <span className="text-xs font-semibold text-gold-600">Open</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

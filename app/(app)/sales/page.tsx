import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const invoices = [
  { id: "INV-10421", date: "2026-05-03", customer: "Nimal Jewellery", total: "LKR 184,500", status: "Paid" },
  { id: "INV-10420", date: "2026-05-02", customer: "Ashan Perera", total: "LKR 92,000", status: "Pending" },
  { id: "INV-10419", date: "2026-05-01", customer: "Sahana Gems", total: "LKR 318,250", status: "Paid" }
];

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sales</CardTitle>
          <CardDescription>Invoices, payments, and outstanding balances.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoices.map((row) => (
                  <tr key={row.id} className="bg-white">
                    <td className="px-4 py-3 font-medium">{row.id}</td>
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3">{row.customer}</td>
                    <td className="px-4 py-3">{row.total}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
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
    </div>
  );
}


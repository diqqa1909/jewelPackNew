import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const purchases = [
  { id: "PO-00821", supplier: "Swarna Metals", date: "2026-05-01", total: "LKR 1,240,000", status: "Received" },
  { id: "PO-00820", supplier: "GemHub (Pvt) Ltd", date: "2026-04-29", total: "LKR 520,000", status: "Pending" }
];

export default function PurchasesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchases</CardTitle>
        <CardDescription>Supplier orders, receipts, and cost tracking.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">PO</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {purchases.map((row) => (
                <tr key={row.id} className="bg-white">
                  <td className="px-4 py-3 font-medium">{row.id}</td>
                  <td className="px-4 py-3">{row.supplier}</td>
                  <td className="px-4 py-3">{row.date}</td>
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
  );
}


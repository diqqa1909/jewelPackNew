import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const customers = [
  { name: "Nimal Jewellery", phone: "+94 77 123 4567", balance: "LKR 0" },
  { name: "Ashan Perera", phone: "+94 71 456 7890", balance: "LKR 92,000" },
  { name: "Sahana Gems", phone: "+94 75 222 1111", balance: "LKR 0" }
];

export default function CustomersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customers</CardTitle>
        <CardDescription>Contacts and outstanding balances.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {customers.map((row) => (
                <tr key={row.name} className="bg-white">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{row.phone}</td>
                  <td className="px-4 py-3">{row.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}


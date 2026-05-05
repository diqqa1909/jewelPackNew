import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const suppliers = [
  { name: "Swarna Metals", contact: "Kasun", phone: "+94 76 555 6666" },
  { name: "GemHub (Pvt) Ltd", contact: "Shanika", phone: "+94 11 234 5678" }
];

export default function SuppliersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suppliers</CardTitle>
        <CardDescription>Vendor directory for metals and gemstones.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border border-ebony-100">
          <table className="w-full text-sm">
            <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
              <tr>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Contact</th>
                <th className="px-5 py-4">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {suppliers.map((row) => (
                <tr key={row.name} className="bg-white hover:bg-ebony-50 transition-colors">
                  <td className="px-5 py-4 font-semibold text-ebony-900">{row.name}</td>
                  <td className="px-5 py-4 text-ebony-700">{row.contact}</td>
                  <td className="px-5 py-4 text-ebony-700">{row.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}


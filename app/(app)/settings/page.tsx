import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
          <CardDescription>Store identity and invoice details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Shop Name", placeholder: "JewelPack Store" },
            { label: "Phone", placeholder: "+94 77 000 0000" },
            { label: "Address", placeholder: "No. 12, Main Street" },
            { label: "Currency", placeholder: "LKR" }
          ].map((f) => (
            <label key={f.label} className="space-y-1 text-sm">
              <div className="font-medium text-slate-700">{f.label}</div>
              <input
                placeholder={f.placeholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-brand-200 focus:ring-2"
              />
            </label>
          ))}
          <div className="md:col-span-2 flex items-center justify-end">
            <button
              type="button"
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Save Settings
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing Rules</CardTitle>
          <CardDescription>Configure making charges and discounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Default Making Charge", placeholder: "0" },
            { label: "Default Discount (%)", placeholder: "0" },
            { label: "Tax/VAT (%)", placeholder: "0" }
          ].map((f) => (
            <label key={f.label} className="block space-y-1 text-sm">
              <div className="font-medium text-slate-700">{f.label}</div>
              <input
                placeholder={f.placeholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-brand-200 focus:ring-2"
              />
            </label>
          ))}
          <div className="pt-2">
            <button
              type="button"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Update Rules
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


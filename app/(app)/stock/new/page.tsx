import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default function NewStockPage() {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Add Stock Item</CardTitle>
        <CardDescription>UI-only placeholder form (connect to DB later).</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2">
          {[
            { label: "SKU", placeholder: "RNG-18K-0021" },
            { label: "Item Name", placeholder: "18K Ring - Classic" },
            { label: "Category", placeholder: "Rings" },
            { label: "Purity", placeholder: "18K" },
            { label: "Weight (g)", placeholder: "4.25" },
            { label: "On-hand Qty", placeholder: "10" },
            { label: "Cost Price", placeholder: "72500" },
            { label: "Selling Price", placeholder: "89000" }
          ].map((f) => (
            <label key={f.label} className="space-y-1 text-sm">
              <div className="font-medium text-slate-700">{f.label}</div>
              <input
                placeholder={f.placeholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-brand-200 focus:ring-2"
              />
            </label>
          ))}
          <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Save Item
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


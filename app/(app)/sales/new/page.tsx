import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default function NewSalePage() {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Create Sale</CardTitle>
        <CardDescription>UI-only placeholder for invoice creation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Customer", placeholder: "Select customer..." },
            { label: "Invoice Date", placeholder: "2026-05-03" },
            { label: "Payment Type", placeholder: "Cash / Card / Bank" },
            { label: "Discount", placeholder: "0" }
          ].map((f) => (
            <label key={f.label} className="space-y-1 text-sm">
              <div className="font-medium text-slate-700">{f.label}</div>
              <input
                placeholder={f.placeholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-brand-200 focus:ring-2"
              />
            </label>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold">Items</div>
          <div className="mt-2 text-sm text-slate-600">
            Add invoice line-items (SKU, qty, weight, making charges, etc.).
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
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
            Save Invoice
          </button>
        </div>
      </CardContent>
    </Card>
  );
}


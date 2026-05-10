import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";

export default function ReportsPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Sales Analysis</CardTitle>
          <CardDescription>By category, subcategory, customer, and salesman.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Link
            href="/reports/sales-analysis"
            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Open Report
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

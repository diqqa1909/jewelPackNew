import Link from "next/link";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  FileText,
  Gem,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Truck,
  Users
} from "lucide-react";

const reports = [
  {
    label: "Sales Report",
    href: "/reports/sales-analysis",
    icon: ReceiptText,
    tone: "emerald"
  },
  {
    label: "Purchase Report",
    href: "/purchases",
    icon: FileText,
    tone: "violet"
  },
  {
    label: "Stock Report",
    href: "/stock",
    icon: ClipboardList,
    tone: "rose"
  },
  {
    label: "Stock Valuation",
    href: "/stock",
    icon: Boxes,
    tone: "indigo"
  },
  {
    label: "Profit & Loss",
    href: "/reports/sales-analysis?groupBy=category",
    icon: BarChart3,
    tone: "green"
  },
  {
    label: "Customer Outstanding",
    href: "/customers",
    icon: Users,
    tone: "purple"
  },
  {
    label: "Supplier Outstanding",
    href: "/suppliers",
    icon: Truck,
    tone: "orange"
  },
  {
    label: "Gold Movement Report",
    href: "/goldsmiths",
    icon: Gem,
    tone: "fuchsia"
  },
  {
    label: "Daily Summary",
    href: "/dashboard",
    icon: PackageCheck,
    tone: "sky"
  },
  {
    label: "Monthly Summary",
    href: "/dashboard",
    icon: CalendarDays,
    tone: "blue"
  }
] as const;

const toneClasses = {
  emerald: "bg-emerald-50 text-emerald-700",
  violet: "bg-violet-50 text-violet-700",
  rose: "bg-rose-50 text-rose-700",
  indigo: "bg-indigo-50 text-indigo-700",
  green: "bg-green-50 text-green-700",
  purple: "bg-purple-50 text-purple-700",
  orange: "bg-orange-50 text-orange-700",
  fuchsia: "bg-fuchsia-50 text-fuchsia-700",
  sky: "bg-sky-50 text-sky-700",
  blue: "bg-blue-50 text-blue-700"
};

export default function ReportsPage() {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.label}
              href={report.href}
              className="group flex min-h-36 flex-col justify-between rounded-lg border border-ebony-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <span
                className={`grid h-12 w-12 place-items-center rounded-lg ${toneClasses[report.tone]} transition-transform group-hover:scale-105`}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="mt-6 text-base font-extrabold leading-tight text-ebony-900">{report.label}</span>
            </Link>
          );
        })}
      </section>

      <div className="rounded-lg border border-ebony-100 bg-white px-4 py-3 text-xs font-semibold text-ebony-500 shadow-sm">
        Reports use the available modules in this app. Sales and profit reports open the report generator; stock,
        customer, supplier, and gold movement reports open their live operational views.
      </div>
    </div>
  );
}

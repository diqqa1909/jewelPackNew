import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { prismaWithRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const term = q.slice(0, 80);

  if (!term) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Type a query in the top bar to search.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const [customers, invoices, stockGroups, suppliers] = await Promise.all([
    prismaWithRetry((p) =>
      p.customer.findMany({
        where: { name: { contains: term, mode: "insensitive" } },
        orderBy: { name: "asc" },
        take: 10
      })
    ),
    prismaWithRetry((p) =>
      p.salesNTX.findMany({
        where: { saleNo: { contains: term, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { customer: true }
      })
    ),
    prismaWithRetry((p) =>
      p.stockMaster.groupBy({
        by: ["subcategoryCode", "subcategoryName"],
        where: {
          OR: [
            { subcategoryCode: { contains: term, mode: "insensitive" } },
            { subcategoryName: { contains: term, mode: "insensitive" } },
            { articleName: { contains: term, mode: "insensitive" } }
          ]
        },
        _sum: { balanceQty: true, balanceGoldWeight: true },
        take: 10
      })
    ),
    prismaWithRetry((p) =>
      p.supplier.findMany({
        where: { name: { contains: term, mode: "insensitive" } },
        orderBy: { name: "asc" },
        take: 10
      })
    )
  ]);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>Matches for “{term}”.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {customers.map((c) => (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="font-semibold text-ebony-900 hover:underline">
                  {c.name}
                </Link>
                <div className="text-xs text-ebony-600">{c.phone ?? c.email ?? "—"}</div>
              </li>
            ))}
            {customers.length === 0 ? <li className="text-ebony-600">No customer matches.</li> : null}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Search by invoice no.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link href={`/sales/${inv.id}`} className="font-semibold text-ebony-900 hover:underline">
                  {inv.saleNo}
                </Link>
                <div className="text-xs text-ebony-600">{inv.customer.name}</div>
              </li>
            ))}
            {invoices.length === 0 ? <li className="text-ebony-600">No invoice matches.</li> : null}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock</CardTitle>
          <CardDescription>Subcategories / articles.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {stockGroups.map((s) => (
              <li key={`${s.subcategoryCode}:${s.subcategoryName}`}>
                <Link href="/stock" className="font-semibold text-ebony-900 hover:underline">
                  {s.subcategoryCode} — {s.subcategoryName}
                </Link>
                <div className="text-xs text-ebony-600">
                  Balance qty: {s._sum.balanceQty ?? 0}
                </div>
              </li>
            ))}
            {stockGroups.length === 0 ? <li className="text-ebony-600">No stock matches.</li> : null}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suppliers</CardTitle>
          <CardDescription>Matches by name.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {suppliers.map((s) => (
              <li key={s.id}>
                <Link href="/suppliers" className="font-semibold text-ebony-900 hover:underline">
                  {s.name}
                </Link>
                <div className="text-xs text-ebony-600">{s.phone ?? s.email ?? "—"}</div>
              </li>
            ))}
            {suppliers.length === 0 ? <li className="text-ebony-600">No supplier matches.</li> : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}


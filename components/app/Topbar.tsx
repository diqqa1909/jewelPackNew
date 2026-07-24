"use client";

import { buttonClassName } from "@/components/ui/Button";
import { navItems } from "@/lib/nav";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Bell, Search, UserCircle2 } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

function titleFromPath(pathname: string) {
  const exact = navItems.find((n) => n.href === pathname);
  if (exact) return exact.label;
  const byPrefix = navItems
    .filter((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return byPrefix?.label ?? "JewelPack";
}

export function Topbar({ sidebarToggle }: { sidebarToggle?: ReactNode }) {
  const pathname = usePathname();
  const title = titleFromPath(pathname);
  const router = useRouter();
  const showBack = pathname.split("/").filter(Boolean).length > 1;
  const [q, setQ] = useState("");
  const todayLabel = useMemo(() => {
    const d = new Date();
    const dd = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    return dd;
  }, []);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <header className="flex min-h-11 items-center justify-between gap-3 border-b border-ebony-100 bg-white px-3 py-2 md:gap-4 md:px-4 md:py-2">
      <div className="flex items-center gap-2">
        {sidebarToggle}
        {showBack && (
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ebony-200 bg-white text-ebony-700 shadow-sm transition-colors hover:bg-ebony-50"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4 text-current" aria-hidden="true" />
          </button>
        )}
        <div>
          <h1 className="items-center justify-center text-sm font-semibold tracking-tight text-ebony-900 md:text-base">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ebony-200 bg-white text-ebony-700 shadow-sm transition-colors hover:bg-ebony-50"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="h-4 w-4 text-current" aria-hidden="true" />
        </button>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <form onSubmit={submitSearch} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ebony-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customers, stock, invoices..."
            className="w-[260px] rounded-md border border-ebony-200 bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          />
        </form>
        <div className="text-[10px] font-semibold text-ebony-600 tabular-nums">{todayLabel}</div>
        <button
          type="button"
          className={buttonClassName("secondary", "px-2.5 py-1.5 text-xs shadow-sm")}
          aria-label="User menu"
          title="User menu"
        >
          <UserCircle2 className="h-5 w-5 text-ebony-600" />
          <span>Admin</span>
        </button>
      </div>
    </header>
  );
}

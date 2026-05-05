"use client";

import { navItems } from "@/lib/nav";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

function titleFromPath(pathname: string) {
  const found = navItems.find((n) => n.href === pathname);
  return found?.label ?? "JewelPack";
}

export function Topbar() {
  const pathname = usePathname();
  const title = titleFromPath(pathname);
  const router = useRouter();
  const showBack = pathname.split("/").filter(Boolean).length > 1;

  return (
    <header className="flex items-center justify-between gap-6 border-b border-ebony-100 bg-white px-8 py-5">
      <div className="flex items-start gap-3">
        {showBack && (
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-ebony-200 bg-white text-ebony-800 shadow-sm transition-all hover:bg-ebony-50"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ebony-900">{title}</h1>
          <p className="text-sm text-ebony-600">
            Manage your jewelry inventory and sales operations.
          </p>
        </div>
      </div>

      <div className="hidden md:block" />
    </header>
  );
}

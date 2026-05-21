"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navSections } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActivePath(currentPath: string, href: string) {
  if (href === "/dashboard") return currentPath === "/dashboard";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function Sidebar({
  onNavigate
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="h-full w-72 overflow-y-auto overscroll-contain border-r border-ebony-100 bg-white">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-ebony-100">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-gold-600 text-white shadow-sm font-bold text-lg tracking-tight">
          JP
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-ebony-900">JewelPack</div>
          <div className="text-xs text-ebony-500">Jewellery Suite</div>
        </div>
      </div>

      <nav className="px-4 py-6 space-y-6">
        <div>
          {navSections.map((section) => (
            <div key={section.label} className="pb-4">
              <div className="px-3 pb-3 text-xs font-bold uppercase tracking-widest text-ebony-600 border-b border-ebony-100">
                {section.label}
              </div>
              <ul className="space-y-2 pt-3">
                {section.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                          active ? "bg-gold-600 text-white shadow-sm" : "text-ebony-700 hover:bg-ebony-50"
                        )}
                      >
                        <Icon className={cn("h-5 w-5", active ? "text-white" : "text-ebony-500")} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-ebony-100 px-6 py-4 bg-ebony-50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ebony-700">Workspace</span>
          <span className="rounded-lg bg-gold-600 px-2.5 py-1 text-xs font-semibold text-white">
            Main
          </span>
        </div>
      </div>
    </aside>
  );
}

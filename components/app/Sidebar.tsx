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
    <aside className="h-full w-56 overflow-y-auto overscroll-contain border-r border-ebony-100 bg-white">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-ebony-100">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-gold-600 text-white shadow-sm font-bold text-sm tracking-tight">
          JP
        </div>
        <div className="leading-tight">
          <div className="text-xs font-semibold tracking-tight text-ebony-900">JewelPack</div>
          <div className="text-[10px] text-ebony-500">Jewellery Suite</div>
        </div>
      </div>

      <nav className="px-2.5 py-3 space-y-3">
        <div>
          {navSections.map((section) => (
            <div key={section.label} className="pb-2">
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-ebony-600 border-b border-ebony-100">
                {section.label}
              </div>
              <ul className="space-y-1 pt-1.5">
                {section.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
                          active ? "bg-gold-600 text-white shadow-sm" : "text-ebony-700 hover:bg-ebony-50"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", active ? "text-white" : "text-ebony-500")} />
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

      <div className="border-t border-ebony-100 px-4 py-2.5 bg-ebony-50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-ebony-700">Workspace</span>
          <span className="rounded-md bg-gold-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            Main
          </span>
        </div>
      </div>
    </aside>
  );
}

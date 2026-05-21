"use client";

import { Sidebar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { buttonClassName } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <ToastProvider>
      <div className="jp-surface h-screen overflow-hidden">
        <div className="mx-auto grid h-screen max-w-[1400px] grid-cols-1 md:grid-cols-[auto_1fr]">
        <div
          className={cn(
            "hidden h-screen overflow-hidden transition-[width] duration-200 md:block",
            sidebarOpen ? "w-72" : "w-0"
          )}
        >
          <Sidebar />
        </div>

        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="shrink-0 flex items-stretch">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={buttonClassName("secondary", "rounded-none border-b-0 px-4 md:hidden")}
              aria-label="Open menu"
              title="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <Topbar
                sidebarToggle={
                  <button
                    type="button"
                    onClick={() => setSidebarOpen((value) => !value)}
                    className={buttonClassName("secondary", "hidden h-10 w-10 shrink-0 px-0 py-0 shadow-sm md:inline-flex")}
                    aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                    title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                }
              />
            </div>
          </div>

          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile drawer */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
            open ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        <div
          className={cn(
            "fixed left-0 top-0 z-50 h-full w-[18rem] transition-transform duration-200 md:hidden",
            open ? "translate-x-0" : "-translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="flex h-full flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-ebony-100 px-4 py-3">
              <div className="text-sm font-semibold text-ebony-900">Menu</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={buttonClassName("secondary", "h-9 w-9 px-0 py-0")}
                aria-label="Close menu"
                title="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <Sidebar onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}

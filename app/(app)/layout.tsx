import { Sidebar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";
import type React from "react";

export default function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="jp-surface h-screen">
      <div className="grid h-full grid-cols-[18rem_1fr]">
        <Sidebar />
        <div className="flex h-full min-w-0 flex-col">
          <Topbar />
          <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

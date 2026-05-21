"use client";

import { Printer } from "lucide-react";
import { buttonClassName } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={buttonClassName("primary", "print:hidden")}
    >
      <Printer className="h-4 w-4" />
      Print Invoice
    </button>
  );
}

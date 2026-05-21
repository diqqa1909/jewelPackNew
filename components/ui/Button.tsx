import type React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-gold-600 text-white shadow-sm hover:bg-gold-700",
  secondary: "border border-ebony-200 bg-white text-ebony-800 hover:bg-ebony-50"
};

export function buttonClassName(variant: ButtonVariant = "secondary", className?: string) {
  return cn(base, variants[variant], className);
}

export function Button({
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}


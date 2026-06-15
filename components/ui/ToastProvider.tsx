"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
};

type ToastInput = {
  title: string;
  description?: string;
  type?: ToastType;
};

type ToastContextValue = {
  notify: (toast: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function id() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [closingToastIds, setClosingToastIds] = useState<Set<string>>(() => new Set());

  const remove = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
    setClosingToastIds((prev) => {
      if (!prev.has(toastId)) return prev;
      const next = new Set(prev);
      next.delete(toastId);
      return next;
    });
  }, []);

  const dismiss = useCallback((toastId: string) => {
    setClosingToastIds((prev) => {
      if (prev.has(toastId)) return prev;
      const next = new Set(prev);
      next.add(toastId);
      return next;
    });
    window.setTimeout(() => remove(toastId), 220);
  }, [remove]);

  const notify = useCallback((toast: ToastInput) => {
    const next = { id: id(), type: toast.type ?? "info", title: toast.title, description: toast.description };
    setToasts((prev) => [next, ...prev].slice(0, 5));
    window.setTimeout(() => dismiss(next.id), 4200);
  }, [dismiss]);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<ToastInput>).detail;
      if (detail?.title) notify(detail);
    }
    window.addEventListener("jewelpack:toast", onToast);
    return () => window.removeEventListener("jewelpack:toast", onToast);
  }, [notify]);

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (title, description) => notify({ title, description, type: "success" }),
      error: (title, description) => notify({ title, description, type: "error" }),
      info: (title, description) => notify({ title, description, type: "info" })
    }),
    [notify]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-3 print:hidden">
        {toasts.map((toast) => {
          const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? XCircle : Info;
          const isClosing = closingToastIds.has(toast.id);
          const tone =
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : toast.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-indigo-200 bg-indigo-50 text-indigo-800";
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${
                isClosing ? "animate-toast-slide-out" : "animate-toast-slide-in"
              } ${tone}`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold">{toast.title}</div>
                {toast.description ? <div className="mt-0.5 text-sm opacity-85">{toast.description}</div> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md opacity-70 hover:bg-white/70 hover:opacity-100"
                aria-label="Dismiss notification"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

export function dispatchToast(toast: ToastInput) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("jewelpack:toast", { detail: toast }));
}

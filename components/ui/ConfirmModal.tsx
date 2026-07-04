"use client";

import { AlertTriangle, type LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type ConfirmTone = "warning" | "danger";

const toneClass: Record<ConfirmTone, { icon: string; confirm: string }> = {
  warning: {
    icon: "bg-amber-50 text-amber-700",
    confirm: "bg-gold-600 text-white hover:bg-gold-700"
  },
  danger: {
    icon: "bg-red-50 text-red-700",
    confirm: "bg-red-600 text-white hover:bg-red-700"
  }
};

type ConfirmModalProps = {
  open: boolean;
  title?: string;
  message: React.ReactNode;
  details?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: ConfirmTone;
  icon?: LucideIcon;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  open,
  title = "Confirm Action",
  message,
  details,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  tone = "warning",
  icon: Icon = AlertTriangle,
  onCancel,
  onConfirm
}: ConfirmModalProps) {
  const classes = toneClass[tone];

  return (
    <Modal open={open} onClose={busy ? () => undefined : onCancel} title={title} className="mx-auto max-w-md">
      <div className="space-y-5">
        <div className="flex gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${classes.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-ebony-900">{message}</p>
            {details ? <p className="text-sm leading-6 text-ebony-600">{details}</p> : null}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-ebony-200 bg-white px-4 py-2 text-sm font-semibold text-ebony-700 hover:bg-ebony-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${classes.confirm}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

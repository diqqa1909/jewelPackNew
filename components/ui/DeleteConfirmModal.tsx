"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type DeleteConfirmModalProps = {
  open: boolean;
  itemLabel: string;
  title?: string;
  description?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmModal({
  open,
  itemLabel,
  title = "Confirm Delete",
  description = "This action cannot be undone.",
  busy = false,
  onCancel,
  onConfirm
}: DeleteConfirmModalProps) {
  return (
    <Modal open={open} onClose={busy ? () => undefined : onCancel} title={title} className="mx-auto max-w-md">
      <div className="space-y-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-ebony-900">Delete {itemLabel || "this record"}?</p>
            <p className="text-sm leading-6 text-ebony-600">{description}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-ebony-200 bg-white px-4 py-2 text-sm font-semibold text-ebony-700 hover:bg-ebony-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

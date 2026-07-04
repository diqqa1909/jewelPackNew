"use client";

import { Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

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
    <ConfirmModal
      open={open}
      title={title}
      message={`Delete ${itemLabel || "this record"}?`}
      details={description}
      confirmLabel={busy ? "Deleting..." : "Delete"}
      busy={busy}
      tone="danger"
      icon={Trash2}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { useToast } from "@/components/ui/ToastProvider";

type PurchaseDeleteButtonProps = {
  purchaseId: number;
  purchaseNo: string;
  redirectTo?: string;
  className?: string;
};

export function PurchaseDeleteButton({
  purchaseId,
  purchaseNo,
  redirectTo,
  className
}: PurchaseDeleteButtonProps) {
  const router = useRouter();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/purchases?id=${purchaseId}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Delete failed");

      setConfirmOpen(false);
      toast.success("Purchase deleted");
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed";
      toast.error("Unable to delete purchase", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={busy}
        className={
          className ??
          "inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        }
        aria-label={`Delete purchase ${purchaseNo}`}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <DeleteConfirmModal
        open={confirmOpen}
        itemLabel={`purchase ${purchaseNo}`}
        description="This will delete the full purchase receipt group. This action cannot be undone."
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void remove()}
      />
    </>
  );
}

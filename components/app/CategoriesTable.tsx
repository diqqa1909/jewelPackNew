"use client";

import type { Category } from "@/lib/generated/prisma";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { useToast } from "@/components/ui/ToastProvider";
import { useMemo, useState } from "react";
import { buttonClassName } from "@/components/ui/Button";

type Props = { initial: Category[] };

export function CategoriesTable({ initial }: Props) {
  const toast = useToast();
  const [rows, setRows] = useState<Category[]>(initial);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const canAdd = useMemo(() => code.trim() !== "" && name.trim() !== "" && !busy, [busy, code, name]);
  const isEditing = useMemo(() => rows.some((r) => r.code === code.trim()), [code, rows]);

  async function add() {
    if (!canAdd) return;
    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, name })
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { category: Category };
      setRows((prev) => [...prev.filter((r) => r.code !== data.category.code), data.category].sort((a, b) => a.code.localeCompare(b.code)));
      setCode("");
      setName("");
      toast.success(isEditing ? "Category updated" : "Category added");
    } catch (e) {
      toast.error("Unable to save category", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(targetCode: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/categories?code=${encodeURIComponent(targetCode)}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(msg?.error ?? "Failed");
      }
      setRows((prev) => prev.filter((r) => r.code !== targetCode));
      setDeleteTarget(null);
      toast.success("Category deleted");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to delete";
      setError(message);
      toast.error("Unable to delete category", message);
    } finally {
      setBusy(false);
    }
  }

  async function update(targetCode: string, nextName: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: targetCode, name: nextName })
      });
      if (!res.ok) throw new Error("Failed");
      setRows((prev) => prev.map((r) => (r.code === targetCode ? { ...r, name: nextName } : r)));
      toast.success("Category updated");
    } catch (e) {
      toast.error("Unable to update category", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid gap-3 rounded-lg border border-ebony-200 bg-white p-4 md:grid-cols-[12rem_1fr_auto]">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Category Code"
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category Name"
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
        />
        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          className={buttonClassName("primary", "px-5 py-2.5")}
        >
          {isEditing ? "Save" : "Add"}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-ebony-100">
        <table className="w-full text-sm">
          <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
            <tr>
              <th className="px-5 py-4">Code</th>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ebony-100">
            {rows.map((r) => (
              <tr key={r.code} className="bg-white">
                <td className="px-5 py-4 font-semibold text-ebony-900">{r.code}</td>
                <td className="px-5 py-4 text-ebony-700">{r.name}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setCode(r.code);
                      setName(r.name);
                    }}
                    disabled={busy}
                    className={buttonClassName("secondary", "px-4 py-2 text-xs")}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(r)}
                    disabled={busy}
                    className={buttonClassName("secondary", "ml-2 px-4 py-2 text-xs text-red-700")}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={3}>
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DeleteConfirmModal
        open={deleteTarget !== null}
        itemLabel={deleteTarget?.code ?? "this category"}
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void remove(deleteTarget.code);
        }}
      />
    </div>
  );
}

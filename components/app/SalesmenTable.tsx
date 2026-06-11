"use client";

import { buttonClassName } from "@/components/ui/Button";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";
import { Edit3, Plus, Search, Trash2, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type SalesmanRowNoTags = { id: number; code: string; name: string };

export function SalesmenTable({ initial }: { initial: SalesmanRowNoTags[] }) {
  const toast = useToast();
  const [rows, setRows] = useState<SalesmanRowNoTags[]>(initial);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SalesmanRowNoTags | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [query, setQuery] = useState("");

  const canSave = useMemo(() => code.trim() !== "" && name.trim() !== "" && !busy, [busy, code, name]);
  const filteredSalesmen = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => row.code.toLowerCase().includes(term) || row.name.toLowerCase().includes(term));
  }, [query, rows]);

  useEffect(() => {
    if (!isAddModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        setIsAddModalOpen(false);
        reset();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [busy, isAddModalOpen]);

  function reset() {
    setEditingId(null);
    setCode("");
    setName("");
  }

  function openAddModal() {
    reset();
    setError("");
    setIsAddModalOpen(true);
  }

  function openEditModal(row: SalesmanRowNoTags) {
    setEditingId(row.id);
    setCode(row.code);
    setName(row.name);
    setError("");
    setIsAddModalOpen(true);
  }

  function closeModal() {
    if (busy) return;
    setIsAddModalOpen(false);
    reset();
  }

  function getInitials(value: string) {
    const initials = value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    return initials || "S";
  }

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/salesmen", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          code,
          name
        })
      });
      const json = (await res.json().catch(() => null)) as { error?: string; salesman?: SalesmanRowNoTags } | null;
      if (!res.ok) throw new Error(json?.error ?? "Save failed");
      const saved = json?.salesman;
      if (!saved) throw new Error("Save failed");
      setRows((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(editingId ? "Salesman updated" : "Salesman added");
      reset();
      setIsAddModalOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Save failed";
      setError(message);
      toast.error("Unable to save salesman", message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/salesmen?id=${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) reset();
      setDeleteTarget(null);
      toast.success("Salesman deleted");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed";
      setError(message);
      toast.error("Unable to delete salesman", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-lg border border-ebony-100 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ebony-950">Salesmen</h1>
          <p className="mt-1 text-sm font-medium text-ebony-600">
            Create, manage, and track jewellery sales representatives.
          </p>
        </div>
        <button type="button" onClick={openAddModal} className={buttonClassName("primary", "h-10 px-4")}>
          <Plus className="h-4 w-4" />
          Add Salesman
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Salesmen", value: rows.length.toLocaleString("en-US"), meta: "Profiles created" },
          { label: "Active Salesmen", value: rows.length.toLocaleString("en-US"), meta: "Ready for invoices" },
          { label: "Sales This Month", value: "LKR 0", meta: "Sales tracking placeholder" },
          { label: "Commission Pending", value: "LKR 0", meta: "Commission placeholder" }
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-ebony-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-bold uppercase tracking-wide text-ebony-500">{stat.label}</div>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-50 text-gold-700">
                <Users className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 text-xl font-extrabold tracking-tight text-ebony-950">{stat.value}</div>
            <div className="mt-1 text-xs font-semibold text-ebony-500">{stat.meta}</div>
          </div>
        ))}
      </div>

      {error && !isAddModalOpen && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-ebony-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-ebony-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-ebony-950">Salesman Directory</h2>
            <p className="mt-1 text-xs font-semibold text-ebony-500">{filteredSalesmen.length} records shown</p>
          </div>
          <label className="relative w-full sm:max-w-sm">
            <span className="sr-only">Search salesmen</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ebony-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by salesman code or name..."
              className="h-10 w-full rounded-lg border border-ebony-200 bg-white pl-9 pr-3 text-sm font-medium text-ebony-900 outline-none placeholder:text-ebony-400 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-gold-50 text-gold-700">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-extrabold text-ebony-950">No salesmen yet</h3>
            <p className="mt-2 max-w-md text-sm font-medium leading-6 text-ebony-600">
              Add your first salesman to start tracking sales and commissions.
            </p>
            <button type="button" onClick={openAddModal} className={buttonClassName("primary", "mt-5 h-10 px-4")}>
              <Plus className="h-4 w-4" />
              Add Salesman
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
                <tr>
                  <th className="px-5 py-3">Salesman</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {filteredSalesmen.map((r) => (
                  <tr key={r.id} className="bg-white transition hover:bg-gold-50/30">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ebony-900 text-xs font-extrabold text-white">
                          {getInitials(r.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-bold text-ebony-950">{r.name}</div>
                          <div className="mt-0.5 text-xs font-semibold text-ebony-500">{r.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold tabular-nums text-ebony-900">{r.code}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        Active
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(r)}
                          disabled={busy}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ebony-200 bg-white text-ebony-700 hover:bg-ebony-50 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Edit ${r.name}`}
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(r)}
                          disabled={busy}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Delete ${r.name}`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSalesmen.length === 0 && (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm font-medium text-ebony-600" colSpan={4}>
                      No salesmen match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto p-4 sm:p-6">
          <button
            type="button"
            className="fixed inset-0 h-full w-full cursor-default bg-ebony-950/50"
            onClick={closeModal}
            aria-label="Close modal overlay"
          />
          <div className="relative mx-auto flex min-h-full w-full max-w-lg items-center justify-center py-4">
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="salesman-modal-title"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
              className="relative w-full overflow-hidden rounded-lg border border-ebony-100 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-ebony-100 px-5 py-4">
                <div>
                  <h2 id="salesman-modal-title" className="text-lg font-extrabold text-ebony-950">
                    {editingId ? "Edit Salesman" : "Add Salesman"}
                  </h2>
                  <p className="mt-1 text-sm font-medium leading-6 text-ebony-600">
                    Create a new salesman profile for sales tracking and commission records.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={busy}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ebony-200 bg-white text-ebony-700 hover:bg-ebony-50 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Close modal"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[calc(100vh-13rem)] space-y-4 overflow-y-auto px-5 py-5">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                <label className="block">
                  <span className="text-xs font-bold text-ebony-800">Salesman Code *</span>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    style={{ textTransform: "uppercase" }}
                    className="mt-2 h-11 w-full rounded-lg border border-ebony-200 bg-white px-4 text-sm font-semibold text-ebony-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                    autoFocus
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-ebony-800">Salesman Name *</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-ebony-200 bg-white px-4 text-sm font-semibold text-ebony-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-ebony-100 px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={busy}
                  className={cn(buttonClassName("secondary", "h-10 px-4"), "justify-center")}
                >
                  Cancel
                </button>
                <button type="submit" disabled={!canSave} className={cn(buttonClassName("primary", "h-10 px-4"), "justify-center")}>
                  {busy ? "Saving..." : "Save Salesman"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        open={deleteTarget !== null}
        itemLabel={deleteTarget ? `${deleteTarget.code} - ${deleteTarget.name}` : "this salesman"}
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void remove(deleteTarget.id);
        }}
      />
    </div>
  );
}

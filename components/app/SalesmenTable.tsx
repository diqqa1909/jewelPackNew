"use client";

import { useToast } from "@/components/ui/ToastProvider";
import { useMemo, useState } from "react";
import { buttonClassName } from "@/components/ui/Button";

type SalesmanRow = { id: number; code: string; name: string; tags: string[] };
type SalesmanRowNoTags = { id: number; code: string; name: string };

export function SalesmenTable({ initial }: { initial: SalesmanRowNoTags[] }) {
  const toast = useToast();
  const [rows, setRows] = useState<SalesmanRowNoTags[]>(initial);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSave = useMemo(() => code.trim() !== "" && name.trim() !== "" && !busy, [busy, code, name]);

  function reset() {
    setEditingId(null);
    setCode("");
    setName("");
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
    } catch (e) {
      const message = e instanceof Error ? e.message : "Save failed";
      setError(message);
      toast.error("Unable to save salesman", message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    const ok = confirm("Delete this salesman?");
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/salesmen?id=${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) reset();
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
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 rounded-lg border border-ebony-200 bg-white p-4 md:grid-cols-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Salesman Code *"
          style={{ textTransform: "uppercase" }}
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Salesman Name *"
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
        />

        <div className="md:col-span-2 flex items-center justify-end gap-2">
          {editingId && (
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className={buttonClassName("secondary", "px-5 py-2.5")}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={!canSave}
            className={buttonClassName("primary", "px-5 py-2.5")}
          >
            {editingId ? "Save" : "Add"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-ebony-100 bg-white">
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
              <tr key={r.id} className="bg-white">
                <td className="px-5 py-4 font-semibold text-ebony-900 tabular-nums">{r.code}</td>
                <td className="px-5 py-4 font-semibold text-ebony-900">{r.name}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(r.id);
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
                    onClick={() => void remove(r.id)}
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
                  No salesmen yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import type { Supplier } from "@/lib/generated/prisma";
import { useMemo, useState } from "react";

type Props = { initial: Supplier[] };

export function SuppliersTable({ initial }: Props) {
  const [rows, setRows] = useState<Supplier[]>(initial);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSave = useMemo(() => name.trim() !== "" && !busy, [busy, name]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setContact("");
    setPhone("");
    setEmail("");
    setAddress("");
  }

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/suppliers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editingId, name, contact, phone, email, address })
      });
      const json = (await res.json().catch(() => null)) as { error?: string; supplier?: Supplier } | null;
      if (!res.ok) throw new Error(json?.error ?? "Save failed");
      if (!json?.supplier) throw new Error("Save failed");
      setRows((prev) => [json.supplier!, ...prev.filter((r) => r.id !== json.supplier!.id)].sort((a, b) => b.id - a.id));
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    const ok = confirm("Delete this supplier?");
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/suppliers?id=${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Supplier Name *"
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
        />
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Contact"
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address"
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20 md:col-span-2"
        />

        <div className="md:col-span-2 flex items-center justify-end gap-2">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={busy}
              className="rounded-lg border border-ebony-300 bg-white px-5 py-2.5 text-sm font-semibold text-ebony-700 hover:bg-ebony-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={!canSave}
            className="rounded-lg bg-gold-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editingId ? "Save" : "Add"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-ebony-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
            <tr>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Contact</th>
              <th className="px-5 py-4">Phone</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Address</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ebony-100">
            {rows.map((r) => (
              <tr key={r.id} className="bg-white">
                <td className="px-5 py-4 font-semibold text-ebony-900">{r.name}</td>
                <td className="px-5 py-4 text-ebony-700">{r.contact ?? "â€”"}</td>
                <td className="px-5 py-4 text-ebony-700">{r.phone ?? "â€”"}</td>
                <td className="px-5 py-4 text-ebony-700">{r.email ?? "â€”"}</td>
                <td className="px-5 py-4 text-ebony-700">{r.address ?? "â€”"}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(r.id);
                      setName(r.name);
                      setContact(r.contact ?? "");
                      setPhone(r.phone ?? "");
                      setEmail(r.email ?? "");
                      setAddress(r.address ?? "");
                    }}
                    disabled={busy}
                    className="rounded-lg border border-ebony-200 bg-white px-4 py-2 text-xs font-semibold text-ebony-700 hover:bg-ebony-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(r.id)}
                    disabled={busy}
                    className="ml-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={6}>
                  No suppliers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


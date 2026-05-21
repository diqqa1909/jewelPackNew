"use client";

import type { Customer } from "@/lib/generated/prisma";
import { useToast } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { buttonClassName } from "@/components/ui/Button";

type Props = { initial: Customer[] };

export function CustomersTable({ initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<Customer[]>(initial);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSave = useMemo(() => name.trim() !== "" && !busy, [busy, name]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
  }

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/customers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editingId, name, phone, email, address })
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(msg?.error ?? "Save failed");
      }
      const json = (await res.json()) as { customer: Customer };
      setRows((prev) => [json.customer, ...prev.filter((r) => r.id !== json.customer.id)].sort((a, b) => b.id - a.id));
      toast.success(editingId ? "Customer updated" : "Customer added");
      resetForm();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Save failed";
      setError(message);
      toast.error("Unable to save customer", message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    const ok = confirm("Delete this customer?");
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(msg?.error ?? "Delete failed");
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) resetForm();
      toast.success("Customer deleted");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delete failed";
      setError(message);
      toast.error("Unable to delete customer", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-3 rounded-lg border border-ebony-200 bg-white p-4 md:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Customer Name *"
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
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
        />

        <div className="md:col-span-2 flex items-center justify-end gap-2">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
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
              <th className="px-5 py-4">Account #</th>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Phone</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Address</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ebony-100">
            {rows.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer bg-white hover:bg-cream-50/60 transition-colors"
                onClick={() => router.push(`/customers/${r.id}`)}
                title="View account summary"
              >
                <td className="px-5 py-4 font-semibold text-ebony-900 tabular-nums">{r.accountNumber ?? "â€”"}</td>
                <td className="px-5 py-4 font-semibold text-ebony-900">{r.name}</td>
                <td className="px-5 py-4 text-ebony-700">{r.phone ?? "â€”"}</td>
                <td className="px-5 py-4 text-ebony-700">{r.email ?? "â€”"}</td>
                <td className="px-5 py-4 text-ebony-700">{r.address ?? "â€”"}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(r.id);
                      setName(r.name);
                      setPhone(r.phone ?? "");
                      setEmail(r.email ?? "");
                      setAddress(r.address ?? "");
                    }}
                    disabled={busy}
                    className={buttonClassName("secondary", "px-4 py-2 text-xs")}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void remove(r.id);
                    }}
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
                <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={6}>
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

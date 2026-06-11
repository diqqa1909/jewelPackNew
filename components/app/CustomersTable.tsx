"use client";

import type { Customer } from "@/lib/generated/prisma";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { useToast } from "@/components/ui/ToastProvider";
import { buttonClassName } from "@/components/ui/Button";
import { Edit3, Plus, Search, Trash2, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const canSave = useMemo(() => name.trim() !== "" && !busy, [busy, name]);

  const filteredCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((customer) =>
      [customer.name, customer.phone, customer.email, customer.address, customer.accountNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [rows, searchTerm]);

  const newThisMonth = useMemo(() => {
    const now = new Date();
    return rows.filter((customer) => {
      const createdAt = new Date(customer.createdAt);
      return createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth();
    }).length;
  }, [rows]);

  const stats = [
    { label: "Total Customers", value: rows.length },
    { label: "Active Customers", value: rows.length },
    { label: "Credit Customers", value: 0 },
    { label: "New This Month", value: newThisMonth }
  ];

  function resetForm() {
    setEditingId(null);
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
  }

  function openCreateForm() {
    resetForm();
    setError("");
    setIsCustomerModalOpen(true);
  }

  function cancelForm() {
    resetForm();
    setError("");
    setIsCustomerModalOpen(false);
  }

  function editCustomer(customer: Customer) {
    setEditingId(customer.id);
    setName(customer.name);
    setPhone(customer.phone ?? "");
    setEmail(customer.email ?? "");
    setAddress(customer.address ?? "");
    setError("");
    setIsCustomerModalOpen(true);
  }

  function getInitials(customerName: string) {
    const parts = customerName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) ?? "C").toUpperCase();
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
      setIsCustomerModalOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Save failed";
      setError(message);
      toast.error("Unable to save customer", message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(msg?.error ?? "Delete failed");
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) {
        resetForm();
        setIsCustomerModalOpen(false);
      }
      setDeleteTarget(null);
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-ebony-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ebony-900">Customers</h1>
          <p className="mt-1 text-sm text-ebony-600">Manage customer profiles, contact details, and invoice history.</p>
        </div>
        <button type="button" onClick={openCreateForm} className={buttonClassName("primary", "shrink-0 px-4 py-2.5")}>
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <CustomerModal
        open={isCustomerModalOpen}
        editing={editingId !== null}
        busy={busy}
        canSave={canSave}
        name={name}
        phone={phone}
        email={email}
        address={address}
        onNameChange={setName}
        onPhoneChange={setPhone}
        onEmailChange={setEmail}
        onAddressChange={setAddress}
        onClose={cancelForm}
        onSave={() => void save()}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-ebony-100 bg-white px-5 py-4 shadow-card">
            <div className="text-xs font-semibold uppercase tracking-wide text-ebony-500">{stat.label}</div>
            <div className="mt-2 text-2xl font-bold text-ebony-900">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-ebony-100 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-ebony-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-ebony-900">Customer Directory</h2>
            <p className="mt-1 text-sm text-ebony-600">{filteredCustomers.length} shown</p>
          </div>
          <label className="relative block w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ebony-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, email, or account number..."
              className="w-full rounded-md border border-ebony-200 bg-white py-2.5 pl-9 pr-3 text-sm text-ebony-900 outline-none transition placeholder:text-ebony-400 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-50 text-gold-700">
              <UserPlus className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-ebony-900">No customers yet</h3>
            <p className="mt-1 max-w-sm text-sm text-ebony-600">Add your first customer to start creating invoices.</p>
            <button type="button" onClick={openCreateForm} className={buttonClassName("primary", "mt-5 px-4 py-2.5")}>
              <Plus className="h-4 w-4" />
              Add Customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-sm">
              <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-600">
                <tr>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Phone</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Address</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {filteredCustomers.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer bg-white transition-colors hover:bg-cream-50/70"
                    onClick={() => router.push(`/customers/${r.id}`)}
                    title="View account summary"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-100 bg-gold-50 text-sm font-bold text-gold-800">
                          {getInitials(r.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ebony-900">{r.name}</div>
                          <div className="mt-0.5 text-xs font-medium text-ebony-500 tabular-nums">
                            {r.accountNumber ?? "-"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-ebony-700">{r.phone ?? "-"}</td>
                    <td className="px-5 py-4 text-ebony-700">{r.email ?? "-"}</td>
                    <td className="max-w-[260px] px-5 py-4 text-ebony-700">
                      <span className="line-clamp-2">{r.address ?? "-"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Active
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            editCustomer(r);
                          }}
                          disabled={busy}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ebony-200 bg-white text-ebony-700 transition hover:bg-ebony-50 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Edit ${r.name}`}
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(r);
                          }}
                          disabled={busy}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Delete ${r.name}`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-ebony-600" colSpan={6}>
                      No customers match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        open={deleteTarget !== null}
        itemLabel={deleteTarget?.name ?? "this customer"}
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void remove(deleteTarget.id);
        }}
      />
    </div>
  );
}

function CustomerModal({
  open,
  editing,
  busy,
  canSave,
  name,
  phone,
  email,
  address,
  onNameChange,
  onPhoneChange,
  onEmailChange,
  onAddressChange,
  onClose,
  onSave
}: {
  open: boolean;
  editing: boolean;
  busy: boolean;
  canSave: boolean;
  name: string;
  phone: string;
  email: string;
  address: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const title = editing ? "Edit Customer" : "Add Customer";
  const subtitle = editing
    ? "Update customer profile details for invoices and records."
    : "Create a new customer profile for invoices and records.";
  const titleId = editing ? "edit-customer-modal-title" : "add-customer-modal-title";

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto px-4 py-6 sm:px-6">
      <div className="fixed inset-0 bg-ebony-900/55" onClick={onClose} aria-hidden="true" />
      <div className="relative flex min-h-full items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative w-full max-w-xl overflow-hidden rounded-xl border border-ebony-100 bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-ebony-100 px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-bold text-ebony-900">
                {title}
              </h2>
              <p className="mt-1 text-sm text-ebony-600">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ebony-200 bg-white text-ebony-700 transition hover:bg-ebony-50"
              aria-label="Close modal"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSave();
            }}
          >
            <div className="grid max-h-[calc(100vh-13rem)] gap-4 overflow-y-auto p-5 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-ebony-600">Customer Name *</span>
                <input
                  value={name}
                  onChange={(event) => onNameChange(event.target.value)}
                  autoFocus
                  className="w-full rounded-md border border-ebony-200 bg-white px-3.5 py-2.5 text-sm text-ebony-900 outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-ebony-600">Phone</span>
                <input
                  value={phone}
                  onChange={(event) => onPhoneChange(event.target.value)}
                  className="w-full rounded-md border border-ebony-200 bg-white px-3.5 py-2.5 text-sm text-ebony-900 outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-ebony-600">Email</span>
                <input
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  type="email"
                  className="w-full rounded-md border border-ebony-200 bg-white px-3.5 py-2.5 text-sm text-ebony-900 outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-ebony-600">Address</span>
                <input
                  value={address}
                  onChange={(event) => onAddressChange(event.target.value)}
                  className="w-full rounded-md border border-ebony-200 bg-white px-3.5 py-2.5 text-sm text-ebony-900 outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-ebony-100 bg-ebony-50/40 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className={buttonClassName("secondary", "w-full px-4 py-2.5 sm:w-auto")}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className={buttonClassName("primary", "w-full px-4 py-2.5 sm:w-auto")}
              >
                {busy ? "Saving..." : "Save Customer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

export function UsersClient() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user"
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = (await res.json()) as { users: User[] };
      setUsers(data.users);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  function openModal(user?: User) {
    if (user) {
      setEditingId(user.id);
      setFormData({ name: user.name || "", email: user.email || "", password: "", role: user.role });
    } else {
      setEditingId(null);
      setFormData({ name: "", email: "", password: "", role: "user" });
    }
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formData.name || !formData.email || (!editingId && !formData.password)) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const method = editingId ? "PATCH" : "POST";
      const body = editingId
        ? { id: editingId, name: formData.name, role: formData.role, password: formData.password || undefined }
        : { name: formData.name, email: formData.email, password: formData.password, role: formData.role };

      const res = await fetch("/api/users", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success(editingId ? "User updated" : "User created");
      setModalOpen(false);
      await loadUsers();
    } catch (error) {
      toast.error("Failed to save user");
    }
  }

  async function handleDelete(userId: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("User deleted");
      setDeleteTarget(null);
      await loadUsers();
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users & Roles</CardTitle>
              <CardDescription>Manage application users and their roles</CardDescription>
            </div>
            <button
              onClick={() => openModal()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Add User
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-ebony-600">Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-ebony-600">No users yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ebony-200">
                    <th className="px-4 py-3 text-left font-semibold text-ebony-700">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-ebony-700">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-ebony-700">Role</th>
                    <th className="px-4 py-3 text-left font-semibold text-ebony-700">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-ebony-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-ebony-100 hover:bg-ebony-50">
                      <td className="px-4 py-3">{user.name}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${user.isActive ? "text-green-600" : "text-red-600"}`}>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => openModal(user)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit User" : "Create New User"}>
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-ebony-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-ebony-200 bg-white px-3 py-2 text-sm outline-none ring-brand-200 focus:ring-2"
                />
              </div>

              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-ebony-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-ebony-200 bg-white px-3 py-2 text-sm outline-none ring-brand-200 focus:ring-2"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-ebony-700 mb-1">
                  Password {editingId && "(leave blank to keep current)"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg border border-ebony-200 bg-white px-3 py-2 text-sm outline-none ring-brand-200 focus:ring-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ebony-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-lg border border-ebony-200 bg-white px-3 py-2 text-sm outline-none ring-brand-200 focus:ring-2"
                >
                  <option value="user">User</option>
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-ebony-200 bg-white px-4 py-2 text-sm font-medium text-ebony-700 hover:bg-ebony-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      <DeleteConfirmModal
        open={deleteTarget !== null}
        itemLabel={deleteTarget?.email ?? deleteTarget?.name ?? "this user"}
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget.id);
        }}
      />
    </div>
  );
}

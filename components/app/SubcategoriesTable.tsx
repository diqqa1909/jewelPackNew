"use client";

import { useEffect, useMemo, useState } from "react";

type CategoryRow = { code: string; name: string };
type SubcategoryRow = { code: string; name: string; categoryCode: string; imageUrl: string };

export function SubcategoriesTable({
  initial,
  categories
}: {
  initial: SubcategoryRow[];
  categories: CategoryRow[];
}) {
  const [rows, setRows] = useState<SubcategoryRow[]>(initial);
  const [name, setName] = useState("");
  const [categoryCode, setCategoryCode] = useState(categories[0]?.code ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const canSave = useMemo(
    () => name.trim() !== "" && categoryCode.trim() !== "" && file != null && !busy,
    [busy, categoryCode, file, name]
  );

  async function uploadToCloudinary(selected: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", selected);
    formData.append("folder", "jewelpack/subcategories");

    const uploadRes = await fetch("/api/cloudinary/upload", { method: "POST", body: formData });
    const uploadJson = (await uploadRes.json()) as { secure_url?: string; error?: string };
    if (!uploadRes.ok || !uploadJson.secure_url) {
      throw new Error(uploadJson.error ?? "Cloudinary upload failed");
    }
    return uploadJson.secure_url;
  }

  function onPickFile(next: File | null) {
    setFile(next);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(next ? URL.createObjectURL(next) : "");
  }

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setError("");
    try {
      if (!file) throw new Error("Please select an image file.");
      const nextImageUrl = await uploadToCloudinary(file);

      const res = await fetch("/api/subcategories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, categoryCode, imageUrl: nextImageUrl || null })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Save failed");
      }
      const json = (await res.json()) as { subcategory: SubcategoryRow };
      setRows((prev) =>
        [...prev.filter((r) => r.code !== json.subcategory.code), json.subcategory].sort((a, b) =>
          a.categoryCode === b.categoryCode
            ? a.code.localeCompare(b.code)
            : a.categoryCode.localeCompare(b.categoryCode)
        )
      );
      setName("");
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function remove(targetCode: string) {
    const ok = confirm(`Delete subcategory ${targetCode}?`);
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/subcategories?code=${encodeURIComponent(targetCode)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Delete failed");
      setRows((prev) => prev.filter((r) => r.code !== targetCode));
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
          placeholder="Subcategory Name"
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
        />
        <select
          value={categoryCode}
          onChange={(e) => setCategoryCode(e.target.value)}
          className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
        >
          {categories.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-ebony-700">Preview</div>
          <div className="h-12 w-12 overflow-hidden rounded-md ring-1 ring-ebony-200 bg-ebony-50">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canSave}
          className="rounded-lg bg-gold-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-gold-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-ebony-100">
        <table className="w-full text-sm">
          <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
            <tr>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Code</th>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Image</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ebony-100">
            {rows.map((r) => (
              <tr key={r.code} className="bg-white">
                <td className="px-5 py-4 text-ebony-700">{r.categoryCode}</td>
                <td className="px-5 py-4 font-semibold text-ebony-900">{r.code}</td>
                <td className="px-5 py-4 text-ebony-700">{r.name}</td>
                <td className="px-5 py-4">
                  {r.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.imageUrl}
                      alt={r.name}
                      className="h-10 w-10 rounded-md object-cover ring-1 ring-ebony-200"
                    />
                  ) : (
                    <span className="text-xs text-ebony-500">—</span>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setName(r.name);
                      setCategoryCode(r.categoryCode);
                      setFile(null);
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setPreviewUrl("");
                    }}
                    disabled={busy}
                    className="rounded-lg border border-ebony-200 bg-white px-4 py-2 text-xs font-semibold text-ebony-700 hover:bg-ebony-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(r.code)}
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
                <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={5}>
                  No subcategories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

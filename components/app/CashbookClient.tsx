"use client";

import { buttonClassName } from "@/components/ui/Button";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";
import { Plus, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AccountType = "DR" | "CR" | "GL";

type CashbookEntry = {
  id: number;
  date: string;
  accountType: AccountType;
  accountId: number;
  accountNo: string;
  accountName: string;
  memo: string;
  debit: string;
  credit: string;
  createdAt: string;
  updatedAt: string;
};

type DraftRow = {
  key: string;
  id?: number;
  accountType: AccountType;
  accountId: number | null;
  accountNo: string;
  accountName: string;
  memo: string;
  debit: string;
  credit: string;
  dirty: boolean;
  saving: boolean;
};

type Totals = {
  dayDebit: string;
  dayCredit: string;
  opening: string;
  closing: string;
};

type LookupAccount = {
  id: number;
  accountNo: string;
  accountName: string;
  detail: string | null;
  balance: string;
};

const emptyTotals: Totals = { dayDebit: "0.00", dayCredit: "0.00", opening: "0.00", closing: "0.00" };

function rowFromEntry(entry: CashbookEntry): DraftRow {
  return {
    key: `entry-${entry.id}`,
    id: entry.id,
    accountType: entry.accountType,
    accountId: entry.accountId,
    accountNo: entry.accountNo,
    accountName: entry.accountName,
    memo: entry.memo,
    debit: entry.debit,
    credit: entry.credit,
    dirty: false,
    saving: false
  };
}

function blankRow(): DraftRow {
  return {
    key: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    accountType: "DR",
    accountId: null,
    accountNo: "",
    accountName: "",
    memo: "",
    debit: "0.00",
    credit: "0.00",
    dirty: false,
    saving: false
  };
}

function money(value: string | number) {
  const n = Number(value);
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function sanitizeDecimal(raw: string) {
  const s = String(raw ?? "").replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot === -1) return s;
  return s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
}

function isFilled(row: DraftRow) {
  return Boolean(
    row.accountId !== null ||
      row.accountNo ||
      row.accountName ||
      row.memo ||
      Number(row.debit || 0) !== 0 ||
      Number(row.credit || 0) !== 0
  );
}

export function CashbookClient({ initialDate }: { initialDate: string }) {
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [rows, setRows] = useState<DraftRow[]>(() => [blankRow()]);
  const [totals, setTotals] = useState<Totals>(emptyTotals);
  const [loading, setLoading] = useState(true);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupRowKey, setLookupRowKey] = useState<string | null>(null);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupRows, setLookupRows] = useState<LookupAccount[]>([]);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupIndex, setLookupIndex] = useState(0);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [addAccountName, setAddAccountName] = useState("");
  const [addAccountPhone, setAddAccountPhone] = useState("");
  const [addAccountBusy, setAddAccountBusy] = useState(false);
  const [deleteRow, setDeleteRow] = useState<DraftRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const inputRefs = useRef(new Map<string, HTMLInputElement | HTMLSelectElement | null>());
  const pendingBlankFocusRef = useRef(true);

  const savedRows = useMemo(() => rows.filter((row) => row.id), [rows]);

  const setInputRef = (key: string) => (node: HTMLInputElement | HTMLSelectElement | null) => {
    inputRefs.current.set(key, node);
  };

  const focusCell = useCallback((rowKey: string, field: string) => {
    window.setTimeout(() => inputRefs.current.get(`${rowKey}:${field}`)?.focus(), 0);
  }, []);

  const loadDay = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cashbook?date=${encodeURIComponent(selectedDate)}`);
      const json = (await res.json()) as { entries?: CashbookEntry[]; totals?: Totals; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Unable to load cashbook");
      pendingBlankFocusRef.current = true;
      setRows([...(json.entries ?? []).map(rowFromEntry), blankRow()]);
      setTotals(json.totals ?? emptyTotals);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load cashbook";
      toast.error("Cashbook load failed", message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, toast]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  useEffect(() => {
    if (loading || !pendingBlankFocusRef.current) return;
    pendingBlankFocusRef.current = false;
    focusFirstBlank();
  }, [loading, rows]);

  const activeLookupType = useMemo(
    () => rows.find((row) => row.key === lookupRowKey)?.accountType ?? "GL",
    [lookupRowKey, rows]
  );

  const fetchLookup = useCallback(async () => {
    setLookupBusy(true);
    try {
      const params = new URLSearchParams({ mode: "accounts", type: activeLookupType, q: lookupQuery });
      const res = await fetch(`/api/cashbook?${params.toString()}`);
      const json = (await res.json()) as { accounts?: LookupAccount[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Unable to search accounts");
      setLookupRows(json.accounts ?? []);
      setLookupIndex(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to search accounts";
      toast.error("Account search failed", message);
    } finally {
      setLookupBusy(false);
    }
  }, [activeLookupType, lookupQuery, toast]);

  useEffect(() => {
    if (!lookupOpen) return;
    const timer = window.setTimeout(fetchLookup, 150);
    return () => window.clearTimeout(timer);
  }, [fetchLookup, lookupOpen]);

  function updateRow(rowKey: string, patch: Partial<DraftRow>) {
    setRows((prev) =>
      prev.map((row) =>
        row.key === rowKey
          ? {
              ...row,
              ...patch,
              dirty: patch.dirty ?? true
            }
          : row
      )
    );
  }

  function updateType(row: DraftRow, accountType: AccountType) {
    updateRow(row.key, {
      accountType,
      accountId: null,
      accountNo: "",
      accountName: "",
      dirty: row.id ? true : isFilled(row)
    });
    focusCell(row.key, "accountNo");
  }

  function moveType(row: DraftRow, direction: 1 | -1) {
    const types: AccountType[] = ["DR", "CR", "GL"];
    const currentIndex = Math.max(0, types.indexOf(row.accountType));
    const nextIndex = (currentIndex + direction + types.length) % types.length;
    updateType(row, types[nextIndex]);
    focusCell(row.key, "type");
  }

  function openLookup(row: DraftRow, seed = "") {
    setLookupRowKey(row.key);
    setLookupQuery(seed || row.accountNo || row.accountName);
    setLookupOpen(true);
  }

  function chooseAccount(account: LookupAccount) {
    if (!lookupRowKey) return;
    updateRow(lookupRowKey, {
      accountId: account.id,
      accountNo: account.accountNo,
      accountName: account.accountName,
      dirty: true
    });
    setLookupOpen(false);
    focusCell(lookupRowKey, "memo");
  }

  function focusFirstBlank() {
    window.setTimeout(() => {
      const blank = Array.from(inputRefs.current.keys()).find((key) => key.endsWith(":type") && key.includes("new-"));
      if (blank) inputRefs.current.get(blank)?.focus();
    }, 0);
  }

  async function createLookupAccount(e: React.FormEvent) {
    e.preventDefault();
    const name = addAccountName.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    setAddAccountBusy(true);
    try {
      const res = await fetch("/api/cashbook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "account",
          accountType: activeLookupType,
          name,
          phone: addAccountPhone
        })
      });
      const json = (await res.json()) as { account?: LookupAccount; error?: string };
      if (!res.ok || !json.account) throw new Error(json.error ?? "Unable to add account");
      setLookupRows((prev) => [json.account!, ...prev]);
      setAddAccountOpen(false);
      setAddAccountName("");
      setAddAccountPhone("");
      chooseAccount(json.account);
      toast.success("Account added");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to add account";
      toast.error("Add account failed", message);
    } finally {
      setAddAccountBusy(false);
    }
  }

  async function saveRow(row: DraftRow) {
    const debit = Number(row.debit || 0);
    const credit = Number(row.credit || 0);
    if (!row.accountId) {
      toast.error("Select an account", "Press F2 in account fields to search.");
      focusCell(row.key, "accountNo");
      return;
    }
    if ((debit <= 0 && credit <= 0) || (debit > 0 && credit > 0)) {
      toast.error("Enter one amount", "Use either debit or credit for a cashbook row.");
      return;
    }

    setRows((prev) => prev.map((item) => (item.key === row.key ? { ...item, saving: true } : item)));
    try {
      const res = await fetch("/api/cashbook", {
        method: row.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          date: selectedDate,
          accountType: row.accountType,
          accountId: row.accountId,
          memo: row.memo,
          debit: row.debit || "0",
          credit: row.credit || "0"
        })
      });
      const json = (await res.json()) as { entry?: CashbookEntry; error?: string };
      if (!res.ok || !json.entry) throw new Error(json.error ?? "Unable to save row");
      await loadDay();
      toast.success(row.id ? "Cashbook row updated" : "Cashbook row saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save row";
      toast.error("Save failed", message);
      setRows((prev) => prev.map((item) => (item.key === row.key ? { ...item, saving: false } : item)));
    }
  }

  async function confirmDelete() {
    if (!deleteRow?.id) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/cashbook?id=${deleteRow.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Unable to delete row");
      setDeleteRow(null);
      await loadDay();
      toast.success("Cashbook row deleted");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete row";
      toast.error("Delete failed", message);
    } finally {
      setDeleteBusy(false);
    }
  }

  function onAmountChange(row: DraftRow, field: "debit" | "credit", value: string) {
    const clean = sanitizeDecimal(value);
    updateRow(row.key, {
      [field]: clean,
      [field === "debit" ? "credit" : "debit"]: Number(clean || 0) !== 0 ? "0.00" : row[field === "debit" ? "credit" : "debit"]
    } as Partial<DraftRow>);
  }

  function onCellKeyDown(e: React.KeyboardEvent, row: DraftRow, field: string) {
    if (e.key === "F2" && (field === "accountNo" || field === "accountName")) {
      e.preventDefault();
      openLookup(row);
      return;
    }
    if (field === "type" && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      moveType(row, e.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (e.key === "ArrowDown" && (field === "debit" || field === "credit")) {
      e.preventDefault();
      saveRow(row);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const rowIndex = rows.findIndex((item) => item.key === row.key);
      const next = rows[rowIndex + 1] ?? row;
      focusCell(next.key, field);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const rowIndex = rows.findIndex((item) => item.key === row.key);
      const prev = rows[Math.max(0, rowIndex - 1)] ?? row;
      focusCell(prev.key, field);
      return;
    }
    if (e.key === "ArrowRight") {
      const order = ["type", "accountNo", "accountName", "memo", "debit", "credit"];
      const index = order.indexOf(field);
      if (index >= 0 && index < order.length - 1) {
        e.preventDefault();
        focusCell(row.key, order[index + 1]);
      }
      return;
    }
    if (e.key === "ArrowLeft") {
      const order = ["type", "accountNo", "accountName", "memo", "debit", "credit"];
      const index = order.indexOf(field);
      if (index > 0) {
        e.preventDefault();
        focusCell(row.key, order[index - 1]);
      }
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    const order = ["type", "accountNo", "accountName", "memo", "debit", "credit"];
    const index = order.indexOf(field);
    if (field === "debit" || field === "credit") {
      saveRow(row);
      return;
    }
    focusCell(row.key, order[Math.min(index + 1, order.length - 1)]);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-ebony-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-ebony-100 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-ebony-950">Cashbook</h1>
            <p className="mt-1 text-sm font-medium text-ebony-600">
              Daily cash ledger. DR searches customers, CR searches suppliers, GL searches ledger accounts.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-sm">
              <span className="sr-only">Cashbook date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 rounded-lg border border-ebony-200 bg-white px-3 font-semibold text-ebony-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
              />
            </label>
            <button
              type="button"
              onClick={loadDay}
              className={buttonClassName("secondary", "h-10 px-3")}
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading ? "animate-spin" : "")} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex justify-end border-b border-ebony-100 bg-white px-3 py-2">
          <div className="min-w-64 rounded-md border border-ebony-200 bg-ebony-50 px-3 py-2 text-right">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ebony-500">Opening Balance</div>
            <div className="text-base font-extrabold tabular-nums text-ebony-950">{money(totals.opening)}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <thead className="bg-ebony-50 text-left text-[10px] font-bold uppercase tracking-wide text-ebony-600">
              <tr>
                <th className="w-16 border border-ebony-100 px-2 py-1.5">Type</th>
                <th className="w-36 border border-ebony-100 px-2 py-1.5">Acc No</th>
                <th className="w-56 border border-ebony-100 px-2 py-1.5">Account</th>
                <th className="border border-ebony-100 px-2 py-1.5">Memo</th>
                <th className="w-32 border border-ebony-100 px-2 py-1.5 text-right">Debit</th>
                <th className="w-32 border border-ebony-100 px-2 py-1.5 text-right">Credit</th>
                <th className="w-20 border border-ebony-100 px-2 py-1.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={cn(row.id ? "bg-white hover:bg-gold-50/30" : "bg-ebony-50/60")}>
                  <td className="border border-ebony-100 p-0">
                    <select
                      ref={setInputRef(`${row.key}:type`)}
                      value={row.accountType}
                      onChange={(e) => updateType(row, e.target.value as AccountType)}
                      onKeyDown={(e) => onCellKeyDown(e, row, "type")}
                      className="h-8 w-full rounded-none border-0 bg-white px-1.5 text-sm font-bold text-ebony-900 outline-none focus:ring-2 focus:ring-inset focus:ring-gold-400/30"
                    >
                      <option value="DR">DR</option>
                      <option value="GL">GL</option>
                      <option value="CR">CR</option>
                    </select>
                  </td>
                  <td className="border border-ebony-100 p-0">
                    <div className="flex items-center">
                      <input
                        ref={setInputRef(`${row.key}:accountNo`)}
                        value={row.accountNo}
                        onChange={(e) => updateRow(row.key, { accountNo: e.target.value, accountId: null })}
                        onKeyDown={(e) => onCellKeyDown(e, row, "accountNo")}
                        onBlur={() => {
                          if (!row.accountId && row.accountNo.trim()) openLookup(row, row.accountNo);
                        }}
                        className="h-8 min-w-0 flex-1 rounded-none border-0 bg-white px-1.5 font-semibold tabular-nums text-ebony-900 outline-none focus:ring-2 focus:ring-inset focus:ring-gold-400/30"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => openLookup(row)}
                        className="grid h-8 w-8 shrink-0 place-items-center border-l border-ebony-100 bg-white text-ebony-700 hover:bg-ebony-50"
                        title="Search accounts (F2)"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="border border-ebony-100 p-0">
                    <input
                      ref={setInputRef(`${row.key}:accountName`)}
                      value={row.accountName}
                      onChange={(e) => updateRow(row.key, { accountName: e.target.value, accountId: null })}
                      onKeyDown={(e) => onCellKeyDown(e, row, "accountName")}
                      onBlur={() => {
                        if (!row.accountId && row.accountName.trim()) openLookup(row, row.accountName);
                      }}
                      className="h-8 w-full rounded-none border-0 bg-white px-1.5 font-semibold text-ebony-900 outline-none focus:ring-2 focus:ring-inset focus:ring-gold-400/30"
                    />
                  </td>
                  <td className="border border-ebony-100 p-0">
                    <input
                      ref={setInputRef(`${row.key}:memo`)}
                      value={row.memo}
                      onChange={(e) => updateRow(row.key, { memo: e.target.value })}
                      onKeyDown={(e) => onCellKeyDown(e, row, "memo")}
                      className="h-8 w-full rounded-none border-0 bg-white px-1.5 text-ebony-900 outline-none focus:ring-2 focus:ring-inset focus:ring-gold-400/30"
                    />
                  </td>
                  <td className="border border-ebony-100 p-0">
                    <input
                      ref={setInputRef(`${row.key}:debit`)}
                      inputMode="decimal"
                      value={row.debit}
                      onChange={(e) => onAmountChange(row, "debit", e.target.value)}
                      onKeyDown={(e) => onCellKeyDown(e, row, "debit")}
                      className="h-8 w-full rounded-none border-0 bg-white px-1.5 text-right font-bold tabular-nums text-ebony-900 outline-none focus:ring-2 focus:ring-inset focus:ring-gold-400/30"
                    />
                  </td>
                  <td className="border border-ebony-100 p-0">
                    <input
                      ref={setInputRef(`${row.key}:credit`)}
                      inputMode="decimal"
                      value={row.credit}
                      onChange={(e) => onAmountChange(row, "credit", e.target.value)}
                      onKeyDown={(e) => onCellKeyDown(e, row, "credit")}
                      className="h-8 w-full rounded-none border-0 bg-white px-1.5 text-right font-bold tabular-nums text-ebony-900 outline-none focus:ring-2 focus:ring-inset focus:ring-gold-400/30"
                    />
                  </td>
                  <td className="border border-ebony-100 p-0 text-right">
                    <div className="flex h-8 justify-end">
                      <button
                        type="button"
                        onClick={() => saveRow(row)}
                        disabled={row.saving || (!row.id && !isFilled(row))}
                        className="grid h-8 w-8 place-items-center bg-gold-600 text-white shadow-sm hover:bg-gold-700 disabled:cursor-not-allowed disabled:opacity-50"
                        title={row.id ? "Update row" : "Save row"}
                      >
                        {row.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </button>
                      {row.id ? (
                        <button
                          type="button"
                          onClick={() => setDeleteRow(row)}
                          className="grid h-8 w-8 place-items-center border-l border-ebony-100 bg-white text-ebony-700 hover:bg-ebony-50"
                          title="Delete row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && savedRows.length === 0 ? (
                <tr>
                  <td className="border border-ebony-100 px-4 py-8 text-center text-sm font-semibold text-ebony-600" colSpan={7}>
                    No saved cashbook rows for this date. Start in the blank row above.
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot className="bg-ebony-50 text-sm font-extrabold text-ebony-950">
              <tr>
                <td className="border border-ebony-100 px-2 py-2 text-right" colSpan={4}>
                  Day Total
                </td>
                <td className="border border-ebony-100 px-2 py-2 text-right tabular-nums">{money(totals.dayDebit)}</td>
                <td className="border border-ebony-100 px-2 py-2 text-right tabular-nums">{money(totals.dayCredit)}</td>
                <td className="border border-ebony-100 px-2 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end border-t border-ebony-100 bg-white px-3 py-2">
          <div className="min-w-64 rounded-md border border-ebony-200 bg-ebony-50 px-3 py-2 text-right">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ebony-500">Closing Balance</div>
            <div className="text-base font-extrabold tabular-nums text-ebony-950">{money(totals.closing)}</div>
          </div>
        </div>
      </div>

      <Modal
        open={lookupOpen}
        onClose={() => setLookupOpen(false)}
        title={`Search ${activeLookupType === "DR" ? "Debtors" : activeLookupType === "CR" ? "Creditors" : "General Ledger"}`}
        panelClassName="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Search accounts</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ebony-400" />
            <input
              autoFocus
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setLookupIndex((index) => Math.min(lookupRows.length - 1, index + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setLookupIndex((index) => Math.max(0, index - 1));
                } else if (e.key === "Enter" && lookupRows[lookupIndex]) {
                  e.preventDefault();
                  chooseAccount(lookupRows[lookupIndex]);
                }
              }}
              className="h-10 w-full rounded-lg border border-ebony-200 bg-white pl-9 pr-3 text-sm font-medium text-ebony-900 outline-none placeholder:text-ebony-400 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
              placeholder="Search account number or name..."
            />
          </label>
          <button
            type="button"
            onClick={() => setAddAccountOpen(true)}
            className={buttonClassName("primary", "h-10 w-10 px-0")}
            title="Add account"
          >
            <Plus className="h-4 w-4" />
          </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-ebony-100">
            <table className="w-full text-sm">
              <thead className="bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
                <tr>
                  <th className="px-4 py-3">Account No</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {lookupRows.map((account, index) => (
                  <tr
                    key={account.id}
                    onDoubleClick={() => chooseAccount(account)}
                    onClick={() => setLookupIndex(index)}
                    className={cn(
                      "cursor-pointer bg-white hover:bg-gold-50/40",
                      index === lookupIndex ? "bg-gold-50 outline outline-2 -outline-offset-2 outline-gold-500/40" : ""
                    )}
                  >
                    <td className="px-4 py-3 font-bold tabular-nums text-ebony-950">{account.accountNo}</td>
                    <td className="px-4 py-3 font-semibold text-ebony-900">{account.accountName}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-ebony-900">{money(account.balance)}</td>
                  </tr>
                ))}
                {lookupRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm font-semibold text-ebony-600" colSpan={3}>
                      {lookupBusy ? "Searching..." : "No accounts found."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal
        open={addAccountOpen}
        onClose={() => {
          if (!addAccountBusy) setAddAccountOpen(false);
        }}
        title={`Add ${activeLookupType === "DR" ? "Debtor" : activeLookupType === "CR" ? "Creditor" : "GL Account"}`}
        panelClassName="max-w-md"
      >
        <form onSubmit={createLookupAccount} className="space-y-4">
          <label className="space-y-2 text-sm">
            <div className="font-bold text-ebony-800">Name</div>
            <input
              autoFocus
              value={addAccountName}
              onChange={(e) => setAddAccountName(e.target.value)}
              className="h-10 w-full rounded-lg border border-ebony-200 bg-white px-3 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>
          {activeLookupType !== "GL" ? (
            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-800">Phone</div>
              <input
                value={addAccountPhone}
                onChange={(e) => setAddAccountPhone(e.target.value)}
                className="h-10 w-full rounded-lg border border-ebony-200 bg-white px-3 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
              />
            </label>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={addAccountBusy}
              onClick={() => setAddAccountOpen(false)}
              className={buttonClassName("secondary", "h-10 px-4")}
            >
              Cancel
            </button>
            <button type="submit" disabled={addAccountBusy} className={buttonClassName("primary", "h-10 px-4")}>
              {addAccountBusy ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        open={deleteRow !== null}
        itemLabel={deleteRow?.accountName ?? "cashbook row"}
        description="This will remove the cash movement from the selected day."
        busy={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setDeleteRow(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

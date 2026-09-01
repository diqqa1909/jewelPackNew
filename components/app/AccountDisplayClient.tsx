"use client";

import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type AccountKind = "DR" | "CR" | "GL";

export type DisplayAccount = {
  key: string;
  kind: AccountKind;
  accountNumber: string;
  name: string;
  detail: string | null;
  balance: number;
};

export type DisplayTransaction = {
  id: number;
  date: string;
  referenceNumber: string | null;
  memo: string | null;
  source: string | null;
  type: string | null;
  accountNumber: string;
  debit: number;
  credit: number;
};

const tabs: { kind: AccountKind; label: string }[] = [
  { kind: "DR", label: "Debtors" },
  { kind: "CR", label: "Creditors" },
  { kind: "GL", label: "General Ledger" }
];

function money(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dateLabel(value: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : "-";
}

export function AccountDisplayClient({
  accounts,
  transactions
}: {
  accounts: DisplayAccount[];
  transactions: DisplayTransaction[];
}) {
  const [activeKind, setActiveKind] = useState<AccountKind>("DR");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const transactionTableRef = useRef<HTMLDivElement | null>(null);

  const filteredAccounts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return accounts
      .filter((account) => account.kind === activeKind)
      .filter(
        (account) =>
          !term ||
          account.accountNumber.toLowerCase().includes(term) ||
          account.name.toLowerCase().includes(term) ||
          (account.detail ?? "").toLowerCase().includes(term)
      )
      .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber, undefined, { numeric: true }));
  }, [accounts, activeKind, query]);

  const selectedAccount = useMemo(() => {
    const existing = accounts.find((account) => account.key === selectedKey && account.kind === activeKind);
    return existing ?? filteredAccounts[0] ?? null;
  }, [accounts, activeKind, filteredAccounts, selectedKey]);

  const accountTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    return transactions
      .filter((tx) => tx.accountNumber === selectedAccount.accountNumber)
      .sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return dateDiff || a.id - b.id;
      });
  }, [selectedAccount, transactions]);

  const tabTotal = useMemo(
    () =>
      accounts
        .filter((account) => account.kind === activeKind)
        .reduce((total, account) => total + account.balance, 0),
    [accounts, activeKind]
  );

  const transactionTotals = useMemo(
    () =>
      accountTransactions.reduce(
        (total, tx) => {
          total.debit += tx.debit;
          total.credit += tx.credit;
          return total;
        },
        { debit: 0, credit: 0 }
      ),
    [accountTransactions]
  );

  function changeTab(kind: AccountKind) {
    setActiveKind(kind);
    setSelectedKey(null);
    setQuery("");
  }

  useEffect(() => {
    const el = transactionTableRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [selectedAccount?.key, accountTransactions.length]);

  return (
    <div className="flex h-[calc(100vh-5.25rem)] min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-ebony-100 bg-white shadow-sm">
        <div className="flex shrink-0 flex-col gap-2 border-b border-ebony-100 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-ebony-950">Display</h1>
            <p className="mt-0.5 text-xs font-medium text-ebony-600">
              View account balances and drill into account transactions.
            </p>
          </div>
          <label className="relative w-full lg:max-w-sm">
            <span className="sr-only">Search accounts</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ebony-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search account no, name, or detail..."
              className="h-10 w-full rounded-lg border border-ebony-200 bg-white pl-9 pr-3 text-sm font-medium text-ebony-900 outline-none placeholder:text-ebony-400 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-b border-ebony-100 p-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-full rounded-lg border border-ebony-200 bg-ebony-50 p-1 sm:w-auto">
            {tabs.map((tab) => (
              <button
                key={tab.kind}
                type="button"
                onClick={() => changeTab(tab.kind)}
                className={cn(
                  "h-9 flex-1 rounded-md px-4 text-xs font-extrabold transition-colors sm:flex-none",
                  activeKind === tab.kind ? "bg-gold-600 text-white shadow-sm" : "text-ebony-700 hover:bg-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <div className="rounded-md border border-ebony-200 bg-ebony-50 px-3 py-1.5 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wide text-ebony-500">Accounts</div>
              <div className="text-base font-extrabold tabular-nums text-ebony-950">{filteredAccounts.length}</div>
            </div>
            <div className="rounded-md border border-ebony-200 bg-ebony-50 px-3 py-1.5 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wide text-ebony-500">Balance</div>
              <div className="text-base font-extrabold tabular-nums text-ebony-950">{money(tabTotal)}</div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-[780px] w-full text-sm">
            <thead className="sticky top-0 bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
              <tr>
                <th className="px-3 py-2">Account No</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Detail</th>
                <th className="px-3 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {filteredAccounts.map((account) => (
                <tr
                  key={account.key}
                  onClick={() => setSelectedKey(account.key)}
                  className={cn(
                    "cursor-pointer bg-white hover:bg-gold-50/40",
                    selectedAccount?.key === account.key ? "bg-gold-50" : ""
                  )}
                >
                  <td className="px-3 py-2 font-bold tabular-nums text-ebony-950">{account.accountNumber}</td>
                  <td className="px-3 py-2 font-semibold text-ebony-900">{account.name}</td>
                  <td className="px-3 py-2 text-ebony-600">{account.detail || "-"}</td>
                  <td className="px-3 py-2 text-right font-extrabold tabular-nums text-ebony-950">
                    {money(account.balance)}
                  </td>
                </tr>
              ))}
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-semibold text-ebony-600" colSpan={4}>
                    No accounts found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-ebony-100 bg-white shadow-sm">
        <div className="flex shrink-0 flex-col gap-1 border-b border-ebony-100 p-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-ebony-950">
              {selectedAccount ? selectedAccount.name : "Transactions"}
            </h2>
            <p className="mt-1 text-xs font-semibold text-ebony-600">
              {selectedAccount ? selectedAccount.accountNumber : "Select an account above."}
            </p>
          </div>
          <div className="text-right text-xs font-bold text-ebony-700">
            <span className="tabular-nums">Debit {money(transactionTotals.debit)}</span>
            <span className="mx-2 text-ebony-300">|</span>
            <span className="tabular-nums">Credit {money(transactionTotals.credit)}</span>
          </div>
        </div>

        <div ref={transactionTableRef} className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="sticky top-0 bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Reference</th>
                <th className="px-3 py-2">Memo</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Debit</th>
                <th className="px-3 py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {accountTransactions.map((tx) => (
                <tr key={tx.id} className="bg-white hover:bg-ebony-50">
                  <td className="px-3 py-2 tabular-nums text-ebony-700">{dateLabel(tx.date)}</td>
                  <td className="px-3 py-2 text-ebony-700">{tx.referenceNumber || "-"}</td>
                  <td className="px-3 py-2 text-ebony-700">{tx.memo || "-"}</td>
                  <td className="px-3 py-2 text-ebony-700">{tx.source || "-"}</td>
                  <td className="px-3 py-2 text-ebony-700">{tx.type || "-"}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ebony-900">
                    {money(tx.debit)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ebony-900">
                    {money(tx.credit)}
                  </td>
                </tr>
              ))}
              {accountTransactions.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-semibold text-ebony-600" colSpan={7}>
                    No transactions found for the selected account.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

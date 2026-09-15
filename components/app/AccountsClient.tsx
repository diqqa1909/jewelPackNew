"use client";

import { useMemo, useState } from "react";

type DecimalValue = {
  toString(): string;
};

interface Customer {
  id: number;
  accountNumber: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Supplier {
  id: number;
  accountNumber: string | null;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface GeneralLedgerAccount {
  id: number;
  accountNumber: string;
  name: string;
  chartName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Transaction {
  id: number;
  date: Date;
  source: string | null;
  account: string | null;
  memo: string | null;
  debit: DecimalValue;
  credit: DecimalValue;
  accountNumber: string | null;
  type: string | null;
  bankDebit: DecimalValue | null;
  bankCredit: DecimalValue | null;
  realizedDate: Date | null;
  referenceNumber: string | null;
  remarks: string | null;
  bankCode: string | null;
  recon: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AccountRow {
  key: string;
  kind: "DR" | "CR" | "GL";
  accountNumber: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  category: string | null;
}

interface Props {
  customers: Customer[];
  suppliers: Supplier[];
  ledgerAccounts: GeneralLedgerAccount[];
  transactions: Transaction[];
}

function fmtMoney(v: unknown) {
  const n = Number((v as { toString?: () => string } | null)?.toString?.() ?? v ?? 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

export function AccountsClient({ customers, suppliers, ledgerAccounts, transactions }: Props) {
  const accounts = useMemo<AccountRow[]>(
    () => [
      ...customers
        .filter((account) => account.accountNumber)
        .map((account) => ({
          key: `DR-${account.id}`,
          kind: "DR" as const,
          accountNumber: account.accountNumber ?? "",
          name: account.name,
          phone: account.phone,
          email: account.email,
          address: account.address,
          category: null
        })),
      ...suppliers.map((account) => ({
        key: `CR-${account.id}`,
        kind: "CR" as const,
        accountNumber: account.accountNumber ?? `SUP-${String(account.id).padStart(4, "0")}`,
        name: account.name,
        phone: account.phone ?? account.contact,
        email: account.email,
        address: account.address,
        category: null
      })),
      ...ledgerAccounts.map((account) => ({
        key: `GL-${account.id}`,
        kind: "GL" as const,
        accountNumber: account.accountNumber,
        name: account.name,
        phone: null,
        email: null,
        address: null,
        category: account.chartName ?? null
      }))
    ],
    [customers, suppliers, ledgerAccounts]
  );
  const [selectedAccountKey, setSelectedAccountKey] = useState<string | null>(null);

  const selectedAccount = accounts.find((account) => account.key === selectedAccountKey);
  const accountTransactions = useMemo(() => {
    if (!selectedAccount?.accountNumber) return [];
    return transactions
      .filter((transaction) => transaction.accountNumber === selectedAccount.accountNumber)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedAccount, transactions]);

  const sums = useMemo(
    () =>
      accountTransactions.reduce(
        (acc, transaction) => {
          acc.totalDebit += Number(transaction.debit?.toString?.() ?? 0);
          acc.totalCredit += Number(transaction.credit?.toString?.() ?? 0);
          return acc;
        },
        { totalDebit: 0, totalCredit: 0 }
      ),
    [accountTransactions]
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-ebony-700">Accounts</h3>
        <div className="overflow-hidden rounded-lg border border-ebony-100">
          <table className="w-full text-sm">
            <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
              <tr>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Account No</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Phone</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {accounts.map((account) => (
                <tr
                  key={account.key}
                  onClick={() => setSelectedAccountKey(account.key)}
                  className={`cursor-pointer transition-colors ${
                    selectedAccountKey === account.key ? "bg-gold-50" : "bg-white hover:bg-ebony-50"
                  }`}
                >
                  <td className="px-5 py-4 font-bold text-ebony-700">{account.kind}</td>
                  <td className="px-5 py-4 font-semibold text-ebony-900">{account.name}</td>
                  <td className="px-5 py-4 text-ebony-700">{account.accountNumber || "-"}</td>
                  <td className="px-5 py-4 text-ebony-700">{account.category ?? "-"}</td>
                  <td className="px-5 py-4 text-ebony-700">{account.phone ?? "-"}</td>
                  <td className="px-5 py-4 text-ebony-700">{account.email ?? "-"}</td>
                  <td className="px-5 py-4 text-ebony-700">{account.address ?? "-"}</td>
                </tr>
              ))}
              {accounts.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={7}>
                    No accounts found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAccount ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ebony-700">
            Transactions for {selectedAccount.name}
          </h3>
          <div className="overflow-hidden rounded-lg border border-ebony-100">
            <table className="w-full text-sm">
              <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
                <tr>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Reference</th>
                  <th className="px-5 py-4">Memo</th>
                  <th className="px-5 py-4">Source</th>
                  <th className="px-5 py-4 text-right">Debit</th>
                  <th className="px-5 py-4 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {accountTransactions.map((transaction) => (
                  <tr key={transaction.id} className="bg-white transition-colors hover:bg-ebony-50">
                    <td className="px-5 py-4 tabular-nums text-ebony-700">{fmtDate(transaction.date)}</td>
                    <td className="px-5 py-4 text-ebony-700">{transaction.referenceNumber ?? "-"}</td>
                    <td className="px-5 py-4 text-ebony-700">{transaction.memo ?? transaction.remarks ?? "-"}</td>
                    <td className="px-5 py-4 text-ebony-700">{transaction.source ?? "-"}</td>
                    <td className="px-5 py-4 text-right font-medium tabular-nums text-ebony-900">
                      {fmtMoney(transaction.debit)}
                    </td>
                    <td className="px-5 py-4 text-right font-medium tabular-nums text-ebony-900">
                      {fmtMoney(transaction.credit)}
                    </td>
                  </tr>
                ))}
                {accountTransactions.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={6}>
                      No transactions found for this account.
                    </td>
                  </tr>
                ) : null}
              </tbody>
              {accountTransactions.length > 0 ? (
                <tfoot className="bg-ebony-50 font-semibold text-ebony-900">
                  <tr>
                    <td colSpan={4} className="px-5 py-4 text-right">
                      Total
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums">{fmtMoney(sums.totalDebit)}</td>
                    <td className="px-5 py-4 text-right tabular-nums">{fmtMoney(sums.totalCredit)}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>
      ) : null}

      {selectedAccount && accountTransactions.length === 0 ? (
        <div className="rounded-lg border border-ebony-100 bg-ebony-50 p-4 text-center text-sm text-ebony-700">
          No transactions found for {selectedAccount.name}.
        </div>
      ) : null}
    </div>
  );
}

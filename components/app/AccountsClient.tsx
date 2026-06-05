"use client";

import { useState, useMemo } from "react";
import { Decimal } from "@prisma/client/runtime/library";

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

interface Transaction {
  id: number;
  date: Date;
  source: string | null;
  account: string | null;
  memo: string | null;
  debit: Decimal;
  credit: Decimal;
  accountNumber: string | null;
  type: string | null;
  bankDebit: Decimal | null;
  bankCredit: Decimal | null;
  realizedDate: Date | null;
  referenceNumber: string | null;
  remarks: string | null;
  bankCode: string | null;
  recon: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Props {
  customers: Customer[];
  transactions: Transaction[];
}

function fmtMoney(v: any) {
  const n = Number(v?.toString?.() ?? 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

export function AccountsClient({ customers, transactions }: Props) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // Get transactions for selected customer
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const customerTransactions = useMemo(() => {
    if (!selectedCustomer?.accountNumber) return [];
    return transactions.filter((t) => t.accountNumber === selectedCustomer.accountNumber).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCustomer, transactions]);

  // Calculate sums
  const sums = useMemo(() => {
    return customerTransactions.reduce(
      (acc, t) => {
        const debit = Number(t.debit?.toString?.() ?? 0);
        const credit = Number(t.credit?.toString?.() ?? 0);
        return {
          totalDebit: acc.totalDebit + debit,
          totalCredit: acc.totalCredit + credit
        };
      },
      { totalDebit: 0, totalCredit: 0 }
    );
  }, [customerTransactions]);

  return (
    <div className="space-y-6">
      {/* Customers Table */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-ebony-700">Customers</h3>
        <div className="overflow-hidden rounded-lg border border-ebony-100">
          <table className="w-full text-sm">
            <thead className="bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
              <tr>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Account No</th>
                <th className="px-5 py-4">Phone</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={`cursor-pointer transition-colors ${selectedCustomerId === customer.id ? "bg-gold-50" : "bg-white hover:bg-ebony-50"}`}
                >
                  <td className="px-5 py-4 font-semibold text-ebony-900">{customer.name}</td>
                  <td className="px-5 py-4 text-ebony-700">{customer.accountNumber ?? "—"}</td>
                  <td className="px-5 py-4 text-ebony-700">{customer.phone ?? "—"}</td>
                  <td className="px-5 py-4 text-ebony-700">{customer.email ?? "—"}</td>
                  <td className="px-5 py-4 text-ebony-700">{customer.address ?? "—"}</td>
                </tr>
              ))}
              {customers.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={5}>
                    No customers found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Table */}
      {selectedCustomer && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ebony-700">
            Transactions for {selectedCustomer.name}
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
                {customerTransactions.map((t) => (
                  <tr key={t.id} className="bg-white hover:bg-ebony-50 transition-colors">
                    <td className="px-5 py-4 text-ebony-700 tabular-nums">{fmtDate(t.date)}</td>
                    <td className="px-5 py-4 text-ebony-700">{t.referenceNumber ?? "—"}</td>
                    <td className="px-5 py-4 text-ebony-700">{t.memo ?? t.remarks ?? "—"}</td>
                    <td className="px-5 py-4 text-ebony-700">{t.source ?? "—"}</td>
                    <td className="px-5 py-4 text-right font-medium text-ebony-900 tabular-nums">
                      {fmtMoney(t.debit)}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-ebony-900 tabular-nums">
                      {fmtMoney(t.credit)}
                    </td>
                  </tr>
                ))}
                {customerTransactions.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-sm text-ebony-600" colSpan={6}>
                      No transactions found for this customer.
                    </td>
                  </tr>
                ) : null}
              </tbody>
              {customerTransactions.length > 0 && (
                <tfoot className="bg-ebony-50 font-semibold text-ebony-900">
                  <tr>
                    <td colSpan={4} className="px-5 py-4 text-right">
                      Total
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums">{fmtMoney(sums.totalDebit)}</td>
                    <td className="px-5 py-4 text-right tabular-nums">{fmtMoney(sums.totalCredit)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {selectedCustomer && customerTransactions.length === 0 && (
        <div className="rounded-lg border border-ebony-100 bg-ebony-50 p-4 text-center text-sm text-ebony-700">
          No transactions found for {selectedCustomer.name}.
        </div>
      )}
    </div>
  );
}

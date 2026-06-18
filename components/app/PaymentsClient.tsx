"use client";

import { buttonClassName } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";
import { Banknote, CreditCard, ReceiptText, Search } from "lucide-react";
import { useMemo, useState } from "react";

export type PaymentCustomerRow = {
  id: number;
  accountNumber: string;
  name: string;
  phone: string | null;
  totalDebit: number;
  totalCredit: number;
  balanceDue: number;
  lastInvoiceDate: string | null;
  lastPaymentDate: string | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeDecimal(raw: string) {
  const s = String(raw ?? "").replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot === -1) return s;
  return s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
}

function money(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dateLabel(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "-";
}

export function PaymentsClient({ initialRows }: { initialRows: PaymentCustomerRow[] }) {
  const toast = useToast();
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<PaymentCustomerRow | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [paymentType, setPaymentType] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pendingRows = useMemo(() => rows.filter((row) => row.balanceDue > 0), [rows]);
  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return pendingRows;
    return pendingRows.filter(
      (row) =>
        row.name.toLowerCase().includes(term) ||
        row.accountNumber.toLowerCase().includes(term) ||
        (row.phone ?? "").toLowerCase().includes(term)
    );
  }, [pendingRows, query]);

  const totals = useMemo(
    () =>
      pendingRows.reduce(
        (acc, row) => {
          acc.pending += row.balanceDue;
          acc.debit += row.totalDebit;
          acc.credit += row.totalCredit;
          return acc;
        },
        { pending: 0, debit: 0, credit: 0 }
      ),
    [pendingRows]
  );

  function openPayment(row: PaymentCustomerRow) {
    setTarget(row);
    setAmount(row.balanceDue.toFixed(2));
    setPaymentDate(todayISO());
    setPaymentType("Cash");
    setReferenceNumber("");
    setRemarks("");
    setError("");
  }

  function closePayment() {
    if (busy) return;
    setTarget(null);
    setError("");
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }
    if (numericAmount > target.balanceDue) {
      setError("Payment cannot be greater than the pending balance.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerId: target.id,
          amount,
          paymentDate,
          paymentType,
          referenceNumber,
          remarks
        })
      });
      const json = (await res.json().catch(() => null)) as { error?: string; balanceDue?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Payment failed");

      const nextBalance = Number(json?.balanceDue ?? target.balanceDue - numericAmount);
      setRows((prev) =>
        prev.map((row) =>
          row.id === target.id
            ? {
                ...row,
                totalCredit: row.totalCredit + numericAmount,
                balanceDue: Math.max(0, Number.isFinite(nextBalance) ? nextBalance : row.balanceDue - numericAmount),
                lastPaymentDate: paymentDate
              }
            : row
        )
      );
      toast.success("Payment recorded", `${target.name} - LKR ${money(numericAmount)}`);
      closePayment();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      setError(message);
      toast.error("Unable to record payment", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: "Customers Pending", value: pendingRows.length.toLocaleString("en-US"), icon: ReceiptText },
          { label: "Pending Amount", value: `LKR ${money(totals.pending)}`, icon: Banknote },
          { label: "Payments Received", value: `LKR ${money(totals.credit)}`, icon: CreditCard }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-ebony-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-bold uppercase tracking-wide text-ebony-500">{stat.label}</div>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-50 text-gold-700">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3 text-xl font-extrabold tracking-tight text-ebony-950">{stat.value}</div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-ebony-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-ebony-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-ebony-950">Payments</h1>
            <p className="mt-1 text-sm font-medium text-ebony-600">
              Customers with pending account balances.
            </p>
          </div>
          <label className="relative w-full lg:max-w-sm">
            <span className="sr-only">Search payments</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ebony-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer, account, or phone..."
              className="h-10 w-full rounded-lg border border-ebony-200 bg-white pl-9 pr-3 text-sm font-medium text-ebony-900 outline-none placeholder:text-ebony-400 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3">Last Invoice</th>
                <th className="px-4 py-3">Last Payment</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebony-100">
              {filteredRows.map((row) => (
                <tr key={row.id} className="bg-white hover:bg-gold-50/30">
                  <td className="px-4 py-3">
                    <div className="font-bold text-ebony-950">{row.name}</div>
                    <div className="mt-0.5 text-xs font-semibold text-ebony-500">{row.phone || "-"}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-ebony-800">{row.accountNumber}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-ebony-800">{money(row.totalDebit)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">{money(row.totalCredit)}</td>
                  <td className="px-4 py-3 text-right font-extrabold tabular-nums text-red-600">{money(row.balanceDue)}</td>
                  <td className="px-4 py-3 tabular-nums text-ebony-700">{dateLabel(row.lastInvoiceDate)}</td>
                  <td className="px-4 py-3 tabular-nums text-ebony-700">{dateLabel(row.lastPaymentDate)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openPayment(row)}
                      className={buttonClassName("primary", "h-9 px-3 text-xs")}
                    >
                      Record Payment
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-semibold text-ebony-600" colSpan={8}>
                    No customers with pending payments found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={target !== null} onClose={closePayment} title="Record Payment" panelClassName="max-w-xl">
        <form onSubmit={submitPayment} className="space-y-4">
          {target ? (
            <div className="rounded-lg border border-ebony-100 bg-ebony-50 px-4 py-3">
              <div className="text-sm font-extrabold text-ebony-950">{target.name}</div>
              <div className="mt-1 text-xs font-semibold text-ebony-600">
                Account {target.accountNumber} | Pending LKR {money(target.balanceDue)}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-800">Payment Date</div>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-ebony-200 bg-white px-3 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
              />
            </label>
            <label className="space-y-2 text-sm">
              <div className="font-bold text-ebony-800">Payment Type</div>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="h-10 w-full rounded-lg border border-ebony-200 bg-white px-3 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
              >
                <option>Cash</option>
                <option>Bank</option>
                <option>Card</option>
                <option>Cheque</option>
              </select>
            </label>
          </div>

          <label className="space-y-2 text-sm">
            <div className="font-bold text-ebony-800">Amount</div>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(sanitizeDecimal(e.target.value))}
              className="h-11 w-full rounded-lg border border-ebony-200 bg-white px-3 text-right text-base font-extrabold tabular-nums outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-bold text-ebony-800">Reference</div>
            <input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Receipt / bank reference"
              className="h-10 w-full rounded-lg border border-ebony-200 bg-white px-3 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-bold text-ebony-800">Remarks</div>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="min-h-20 w-full resize-y rounded-lg border border-ebony-200 bg-white px-3 py-2 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closePayment}
              disabled={busy}
              className={cn(buttonClassName("secondary", "h-10 px-4"), "justify-center")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={cn(buttonClassName("primary", "h-10 px-4"), "justify-center")}
            >
              {busy ? "Saving..." : "Save Payment"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

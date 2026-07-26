"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";
import { type FocusEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Plus, Search, Save, Send, Trash2 } from "lucide-react";

type CustomerRow = { id: number; name: string; accountNumber?: string | null; phone?: string | null; creditLimit?: string };
type SalesmanRow = { id: number; code: string; name: string };
type SubcategoryRow = { code: string; name: string; categoryCode: string; carat?: string | null };

type AvailabilityRow = {
  subcategoryCode: string;
  carat: string;
  balanceQty: number;
  balanceGoldWeight: string;
  balanceCost: string;
};

type Line = {
  id: string;
  description: string;
  subcategoryCode: string;
  carat: string;
  qty: string;
  goldWeight: string;
  stoneWeight: string;
  sellRatePer8g: string;
};

const RECEIPT_CARATS = ["18", "19", "20", "21", "22", "24"] as const;
type SalesFormMode = "sales" | "customerGoldReceipt";
export type InitialSaleFormData = {
  id: number;
  saleNo: string;
  transactionDate: string;
  salesmanId: number | null;
  customerId: number;
  salesType: "Gold" | "Rate";
  paymentType?: string;
  paidAmount?: string;
  remarks?: string | null;
  lines: Array<{
    description?: string;
    subcategoryCode: string;
    carat: string;
    qty: string;
    goldWeight: string;
    stoneWeight: string;
    sellRatePer8g: string;
  }>;
};

function normalizeCarat(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/K(T)?$/, "");
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sanitizeInt(raw: string) {
  return String(raw ?? "").replace(/[^\d]/g, "");
}

function sanitizeDecimal(raw: string) {
  const s = String(raw ?? "").replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot === -1) return s;
  return s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
}

function selectOnFocus(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.select();
}

function normalizeLineForDirty(line: Omit<Line, "id">) {
  return {
    description: line.description.trim(),
    subcategoryCode: line.subcategoryCode.trim(),
    carat: normalizeCarat(line.carat),
    qty: String(toNumber(line.qty)),
    goldWeight: String(toNumber(line.goldWeight)),
    stoneWeight: String(toNumber(line.stoneWeight)),
    sellRatePer8g: String(toNumber(line.sellRatePer8g))
  };
}

export function SalesForm({ mode = "sales", initialSale }: { mode?: SalesFormMode; initialSale?: InitialSaleFormData }) {
  const isCustomerGoldReceiptMode = mode === "customerGoldReceipt";
  const isEditMode = Boolean(initialSale);
  const router = useRouter();
  const toast = useToast();
  const initialTransactionDateRef = useRef(initialSale?.transactionDate ?? todayISO());
  const allowNavigationRef = useRef(false);
  const historyGuardRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [salesmen, setSalesmen] = useState<SalesmanRow[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);

  const [transactionDate, setTransactionDate] = useState(initialSale?.transactionDate ?? todayISO());
  const [salesmanId, setSalesmanId] = useState<number | "">(initialSale?.salesmanId ?? "");
  const [customerId, setCustomerId] = useState<number | "">(initialSale?.customerId ?? "");
  const [remarks, setRemarks] = useState(initialSale?.remarks ?? "");
  const [salesType, setSalesType] = useState(initialSale?.salesType ?? "Gold");
  const [, setGoldTransactionType] = useState<"RECEIVED" | "ISSUED">(
    isCustomerGoldReceiptMode ? "RECEIVED" : "ISSUED"
  );
  const [paymentType, setPaymentType] = useState(initialSale?.paymentType ?? "Credit");
  const [discount, setDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState(initialSale?.paidAmount ?? "0");
  const [itemSearch, setItemSearch] = useState("");
  const [invoiceNo, setInvoiceNo] = useState(initialSale?.saleNo ?? "");
  const [lines, setLines] = useState<Line[]>(
    initialSale?.lines.length
      ? initialSale.lines.map((line) => ({ id: uid(), ...line, description: line.description ?? "" }))
      : [
          {
            id: uid(),
            description: "",
            subcategoryCode: "",
            carat: "",
            qty: "0",
            goldWeight: "0",
            stoneWeight: "0",
            sellRatePer8g: "0"
          }
        ]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [deleteLineTarget, setDeleteLineTarget] = useState<{ id: string; label: string } | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerCreditLimit, setNewCustomerCreditLimit] = useState("0");
  const [customerBusy, setCustomerBusy] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [customerCredit, setCustomerCredit] = useState<{ balance: number; limit: number; available: number } | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [barcodePickerRowId, setBarcodePickerRowId] = useState<string | null>(null);
  const [pickerIndex, setPickerIndex] = useState(0);
  const [pendingCancelAction, setPendingCancelAction] = useState<"cancel" | "back" | null>(null);
  const barcodeListRef = useRef<HTMLDivElement | null>(null);
  const barcodeRowRefs = useRef<Array<HTMLTableRowElement | null>>([]);
  const [cellRefs] = useState(
    () => new Map<string, HTMLSelectElement | HTMLInputElement | HTMLButtonElement | null>()
  );
  const hasEnteredData = hasEnteredSalesData();

  useEffect(() => {
    if (!initialSale) return;
    setTransactionDate(initialSale.transactionDate);
    setSalesmanId(initialSale.salesmanId ?? "");
    setCustomerId(initialSale.customerId);
    setRemarks(initialSale.remarks ?? "");
    setSalesType(initialSale.salesType);
    setPaymentType(initialSale.paymentType ?? "Credit");
    setPaidAmount(initialSale.paidAmount ?? "0");
    setInvoiceNo(initialSale.saleNo);
    setLines(
      initialSale.lines.length
        ? initialSale.lines.map((line) => ({ id: uid(), ...line, description: line.description ?? "" }))
        : [
            {
              id: uid(),
              description: "",
              subcategoryCode: "",
              carat: "",
              qty: "0",
              goldWeight: "0",
              stoneWeight: "0",
              sellRatePer8g: "0"
            }
          ]
    );
    setError("");
  }, [initialSale]);

  useEffect(() => {
    if (error) toast.error("Invoice notification", error);
  }, [error, toast]);

  useEffect(() => {
    if (!pendingFocusId) return;
    const el = cellRefs.get(`${pendingFocusId}:subcategory`) ?? null;
    if (el && typeof (el as any).focus === "function") {
      (el as any).focus();
      setPendingFocusId(null);
    }
  }, [pendingFocusId, lines.length, cellRefs]);

  useEffect(() => {
    if (typeof customerId !== "number") {
      setCustomerCredit(null);
      return;
    }
    const controller = new AbortController();
    void fetch(`/api/customers/summary?customerId=${customerId}`, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load customer credit");
        return res.json() as Promise<{ summary: { balance: string; creditLimit: string; availableCredit: string } }>;
      })
      .then(({ summary }) => {
        setCustomerCredit({
          balance: Number(summary.balance),
          limit: Number(summary.creditLimit),
          available: Number(summary.availableCredit)
        });
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setCustomerCredit(null);
      });
    return () => controller.abort();
  }, [customerId]);

  useEffect(() => {
    if (!hasEnteredData || loading || allowNavigationRef.current) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasEnteredData, loading]);

  useEffect(() => {
    if (!hasEnteredData || loading || allowNavigationRef.current) return;
    if (!historyGuardRef.current) {
      window.history.pushState({ salesFormGuard: true }, "", window.location.href);
      historyGuardRef.current = true;
    }

    const onPopState = () => {
      if (allowNavigationRef.current) return;
      setPendingCancelAction("back");
      window.history.pushState({ salesFormGuard: true }, "", window.location.href);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [hasEnteredData, loading]);

  const navCols = ["subcategory", "qty", "goldWeight", "stoneWeight", "sellRate"] as const;
  type NavCol = (typeof navCols)[number];

  function setCellRef(rowId: string, col: NavCol, el: any) {
    cellRefs.set(`${rowId}:${col}`, el);
  }

  function focusCell(rowId: string, col: NavCol) {
    const el = cellRefs.get(`${rowId}:${col}`) ?? null;
    if (el && typeof (el as any).focus === "function") (el as any).focus();
  }

  function handleTabNav(e: React.KeyboardEvent, rowId: string, col: NavCol) {
    if (e.key !== "Tab") return;
    e.preventDefault();

    const rowIndex = lines.findIndex((l) => l.id === rowId);
    if (rowIndex < 0) return;

    const visibleNavCols: readonly NavCol[] = isRateSale
      ? navCols
      : navCols.filter((navCol): navCol is NavCol => navCol !== "sellRate");
    const colIndex = visibleNavCols.indexOf(col);
    const dir = e.shiftKey ? -1 : 1;
    let nextRowIndex = rowIndex;
    let nextColIndex = colIndex + dir;

    if (nextColIndex >= visibleNavCols.length) {
      nextRowIndex = rowIndex + 1;
      nextColIndex = 0;
    } else if (nextColIndex < 0) {
      nextRowIndex = rowIndex - 1;
      nextColIndex = visibleNavCols.length - 1;
    }

    if (nextRowIndex >= lines.length) {
      addLine();
      // focus will happen via pendingFocusId, but we want the first cell
      // (subcategory) on the new row.
      return;
    }
    if (nextRowIndex < 0) return;

    focusCell(lines[nextRowIndex].id, visibleNavCols[nextColIndex]);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [c1, c2, c3, c4, inv] = await Promise.all([
          fetch("/api/customers", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/salesmen", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/subcategories", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/stock/availability", { cache: "no-store" }).then((r) => r.json()),
          fetch(
            `${isCustomerGoldReceiptMode ? "/api/gold-receipts" : "/api/sales"}?preview=1&transactionDate=${encodeURIComponent(todayISO())}`,
            {
            cache: "no-store"
            }
          ).then((r) => r.json())
        ]);
        if (!active) return;
        setCustomers(c1.customers ?? []);
        setSalesmen(c2.salesmen ?? []);
        setSubcategories(c3.subcategories ?? []);
        const loadedAvailability = [...(c4.rows ?? [])] as AvailabilityRow[];
        if (initialSale && !isCustomerGoldReceiptMode) {
          for (const line of initialSale.lines) {
            const carat = normalizeCarat(line.carat);
            const existing = loadedAvailability.find(
              (row) => row.subcategoryCode === line.subcategoryCode && normalizeCarat(row.carat) === carat
            );
            if (existing) {
              existing.balanceQty += Math.max(0, Math.floor(toNumber(line.qty)));
              existing.balanceGoldWeight = String(toNumber(existing.balanceGoldWeight) + Math.max(0, toNumber(line.goldWeight)));
            } else {
              loadedAvailability.push({
                subcategoryCode: line.subcategoryCode,
                carat,
                balanceQty: Math.max(0, Math.floor(toNumber(line.qty))),
                balanceGoldWeight: String(Math.max(0, toNumber(line.goldWeight))),
                balanceCost: "0"
              });
            }
          }
        }
        setAvailability(loadedAvailability);
        if (!isEditMode) setInvoiceNo(isCustomerGoldReceiptMode ? inv.grnNo ?? "" : inv.saleNo ?? "");
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [initialSale, isCustomerGoldReceiptMode, isEditMode]);

  useEffect(() => {
    if (isEditMode) return;
    let cancelled = false;
    (async () => {
      try {
        const inv = await fetch(
          `${isCustomerGoldReceiptMode ? "/api/gold-receipts" : "/api/sales"}?preview=1&transactionDate=${encodeURIComponent(transactionDate || todayISO())}`,
          { cache: "no-store" }
        ).then((r) => r.json());
        if (cancelled) return;
        setInvoiceNo(isCustomerGoldReceiptMode ? inv.grnNo ?? "" : inv.saleNo ?? "");
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCustomerGoldReceiptMode, isEditMode, transactionDate]);

  const subcategoriesSorted = useMemo(() => {
    const term = itemSearch.trim().toLowerCase();
    return [...subcategories]
      .filter((s) => {
        if (!term) return true;
        return (
          s.code.toLowerCase().includes(term) ||
          s.name.toLowerCase().includes(term) ||
          s.categoryCode.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [itemSearch, subcategories]);

  const availabilityKeyed = useMemo(() => {
    const map = new Map<string, AvailabilityRow>();
    for (const r of availability) map.set(`${r.subcategoryCode}||${normalizeCarat(r.carat)}`, r);
    return map;
  }, [availability]);

  const availabilityBySubcategory = useMemo(() => {
    const map = new Map<string, { balanceQty: number; balanceGoldWeight: number }>();
    for (const row of availability) {
      const current = map.get(row.subcategoryCode) ?? { balanceQty: 0, balanceGoldWeight: 0 };
      current.balanceQty += Number(row.balanceQty ?? 0);
      current.balanceGoldWeight += Number(row.balanceGoldWeight ?? 0);
      map.set(row.subcategoryCode, current);
    }
    return map;
  }, [availability]);

  const subcategoryByCode = useMemo(() => {
    const map = new Map<string, SubcategoryRow>();
    for (const s of subcategories) map.set(s.code, s);
    return map;
  }, [subcategories]);

  useEffect(() => {
    setPickerIndex(0);
  }, [itemSearch, barcodePickerRowId]);

  useEffect(() => {
    setPickerIndex((prev) => Math.min(prev, Math.max(0, subcategoriesSorted.length - 1)));
  }, [subcategoriesSorted.length]);

  useEffect(() => {
    if (barcodePickerRowId === null) return;
    barcodeRowRefs.current[pickerIndex]?.scrollIntoView({ block: "nearest" });
  }, [barcodePickerRowId, pickerIndex]);

  const totals = useMemo(() => {
    let totalQty = 0;
    let totalGoldWeight = 0;
    let totalStoneWeight = 0;
    let totalNetWeight = 0;
    for (const l of lines) {
      totalQty += Math.max(0, Math.floor(toNumber(l.qty)));
      const goldWeight = Math.max(0, toNumber(l.goldWeight));
      const stoneWeight = Math.max(0, toNumber(l.stoneWeight));
      totalGoldWeight += goldWeight;
      totalStoneWeight += stoneWeight;
      totalNetWeight += goldWeight + stoneWeight;
    }
    return { totalItems: lines.filter((l) => l.subcategoryCode).length, totalQty, totalGoldWeight, totalStoneWeight, totalNetWeight };
  }, [lines]);

  const qtyErrors = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of lines) {
      if (!l.subcategoryCode) continue;
      if (!l.carat) {
        map.set(l.id, "Carat not set for this subcategory");
        continue;
      }
      const avail = availabilityKeyed.get(`${l.subcategoryCode}||${l.carat}`);
      const subAvail = availabilityBySubcategory.get(l.subcategoryCode);
      const qty = Math.floor(toNumber(l.qty));
      const availableQty = avail?.balanceQty ?? subAvail?.balanceQty ?? 0;
      if (qty > availableQty) map.set(l.id, `Quantity exceeded (available ${availableQty})`);
    }
    return map;
  }, [availabilityBySubcategory, availabilityKeyed, lines]);

  const weightErrors = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of lines) {
      if (!l.subcategoryCode) continue;
      if (!l.carat) continue;
      const avail = availabilityKeyed.get(`${l.subcategoryCode}||${l.carat}`);
      const subAvail = availabilityBySubcategory.get(l.subcategoryCode);
      const entered = Math.max(0, toNumber(l.goldWeight));
      const available = Math.max(0, toNumber(avail?.balanceGoldWeight ?? String(subAvail?.balanceGoldWeight ?? 0)));
      if (entered > available) map.set(l.id, `Weight exceeded (available ${available.toFixed(3)}g)`);
    }
    return map;
  }, [availabilityBySubcategory, availabilityKeyed, lines]);

  const sellSubTotal = useMemo(() => {
    let sum = 0;
    for (const l of lines) {
      const rate = Math.max(0, toNumber(l.sellRatePer8g));
      const w = Math.max(0, toNumber(l.goldWeight));
      if (!w || !rate) continue;
      sum += (w / 8) * rate;
    }
    return sum;
  }, [lines]);

  const selectedCustomer = useMemo(() => {
    const id = typeof customerId === "number" ? customerId : Number(customerId);
    return customers.find((c) => c.id === id) ?? null;
  }, [customerId, customers]);

  const totalAmount = sellSubTotal;
  const discountValue = Math.max(0, toNumber(discount));
  const grandTotal = Math.max(0, totalAmount - discountValue);
  const effectiveSalesType = isCustomerGoldReceiptMode ? "Gold" : salesType;
  const isRateSale = !isCustomerGoldReceiptMode && effectiveSalesType.toLowerCase() === "rate";
  const effectiveGoldTransactionType: "RECEIVED" | "ISSUED" = isCustomerGoldReceiptMode ? "RECEIVED" : "ISSUED";
  const isGoldReceipt = !isRateSale && effectiveGoldTransactionType === "RECEIVED";
  const paidValue = isRateSale ? Math.max(0, toNumber(paidAmount)) : 0;
  const balanceDue = Math.max(0, grandTotal - paidValue);
  const remainingAmount = Math.max(0, paidValue - grandTotal);
  function updateLine(id: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        if (patch.subcategoryCode !== undefined) {
          const sub = String(patch.subcategoryCode ?? "").trim();
          const sc = subcategoryByCode.get(sub);
          next.carat = normalizeCarat(sc?.carat);
        }
        return next;
      })
    );
    setError("");
  }

  function openBarcodePicker(rowId: string) {
    setBarcodePickerRowId(rowId);
    setItemSearch("");
    setPickerIndex(0);
  }

  function closeBarcodePicker(focusField?: NavCol) {
    const rowId = barcodePickerRowId;
    setBarcodePickerRowId(null);
    setItemSearch("");
    setPickerIndex(0);
    if (focusField && rowId) {
      window.setTimeout(() => focusCell(rowId, focusField), 0);
    }
  }

  function selectBarcodeItem(code: string) {
    if (!barcodePickerRowId) return;
    updateLine(barcodePickerRowId, { subcategoryCode: code });
    closeBarcodePicker("qty");
  }

  function handlePickerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      barcodeListRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPickerIndex((prev) => Math.min(prev + 1, Math.max(0, subcategoriesSorted.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setPickerIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const selected = subcategoriesSorted[pickerIndex] ?? subcategoriesSorted[0];
      if (selected) selectBarcodeItem(selected.code);
    }
  }

  function addLine() {
    const nextId = uid();
    setLines((prev) => [
      ...prev,
      {
        id: nextId,
        description: "",
        subcategoryCode: "",
        carat: "",
        qty: "0",
        goldWeight: "0",
        stoneWeight: "0",
        sellRatePer8g: "0"
      }
    ]);
    setPendingFocusId(nextId);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.id !== id)));
  }

  function hasEnteredSalesData() {
    const currentLines = lines.map(({ id: _id, ...line }) => normalizeLineForDirty(line));
    const defaultLine = normalizeLineForDirty({
      description: "",
      subcategoryCode: "",
      carat: "",
      qty: "0",
      goldWeight: "0",
      stoneWeight: "0",
      sellRatePer8g: "0"
    });

    if (!initialSale) {
      return (
        transactionDate !== initialTransactionDateRef.current ||
        salesmanId !== "" ||
        customerId !== "" ||
        remarks.trim() !== "" ||
        salesType !== "Gold" ||
        paymentType !== "Credit" ||
        toNumber(discount) > 0 ||
        toNumber(paidAmount) > 0 ||
        currentLines.some((line) => JSON.stringify(line) !== JSON.stringify(defaultLine))
      );
    }

    const initialLines = initialSale.lines.length
      ? initialSale.lines.map((line) =>
          normalizeLineForDirty({
            description: line.description ?? "",
            subcategoryCode: line.subcategoryCode,
            carat: line.carat,
            qty: line.qty,
            goldWeight: line.goldWeight,
            stoneWeight: line.stoneWeight,
            sellRatePer8g: line.sellRatePer8g
          })
        )
      : [defaultLine];

    return (
      transactionDate !== initialSale.transactionDate ||
      (salesmanId === "" ? null : Number(salesmanId)) !== (initialSale.salesmanId ?? null) ||
      (customerId === "" ? null : Number(customerId)) !== Number(initialSale.customerId) ||
      remarks.trim() !== (initialSale.remarks ?? "").trim() ||
      salesType !== initialSale.salesType ||
      paymentType !== (initialSale.paymentType ?? "Credit") ||
      toNumber(discount) !== 0 ||
      toNumber(paidAmount) !== toNumber(initialSale.paidAmount ?? "0") ||
      JSON.stringify(currentLines) !== JSON.stringify(initialLines)
    );
  }

  function salesListPath() {
    return isCustomerGoldReceiptMode ? "/gold?tab=customer" : "/sales";
  }

  function cancelEntry() {
    if (hasEnteredData) {
      setPendingCancelAction("cancel");
      return;
    }
    allowNavigationRef.current = true;
    router.push(salesListPath());
  }

  function closeCancelConfirm() {
    setPendingCancelAction(null);
  }

  function confirmCancelEntry() {
    const action = pendingCancelAction;
    setPendingCancelAction(null);
    allowNavigationRef.current = true;
    if (action === "back") {
      window.history.back();
      return;
    }
    router.push(salesListPath());
  }

  function openCustomerModal() {
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerEmail("");
    setNewCustomerAddress("");
    setNewCustomerCreditLimit("0");
    setCustomerError("");
    setCustomerModalOpen(true);
  }

  async function addCustomer() {
    const name = newCustomerName.trim();
    if (!name || customerBusy) return;
    const limit = Number(newCustomerCreditLimit);
    if (!newCustomerCreditLimit.trim() || !Number.isFinite(limit) || limit < 0) {
      setCustomerError("Enter a valid non-negative credit limit.");
      return;
    }
    setCustomerBusy(true);
    setCustomerError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone: newCustomerPhone, email: newCustomerEmail, address: newCustomerAddress, creditLimit: newCustomerCreditLimit })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to add customer");
      }
      const body = (await res.json()) as { customer: CustomerRow };
      setCustomers((current) => [body.customer, ...current.filter((customer) => customer.id !== body.customer.id)]);
      setCustomerId(body.customer.id);
      setCustomerModalOpen(false);
      toast.success("Customer added", `${body.customer.name} is selected for this invoice.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to add customer";
      setCustomerError(message);
      toast.error("Unable to add customer", message);
    } finally {
      setCustomerBusy(false);
    }
  }

  async function submit(destination: "list" | "invoice" = "list") {
    setError("");
    const sid = typeof salesmanId === "number" ? salesmanId : Number(salesmanId);
    const cid = typeof customerId === "number" ? customerId : Number(customerId);
    if (!transactionDate) return setError("Transaction date is required.");
    if (!Number.isFinite(sid)) return setError("Salesman is required.");
    if (!Number.isFinite(cid)) return setError("Customer is required.");
    if (isRateSale && paymentType === "Cash" && paidValue <= 0) return setError("Paid amount is required for cash sales.");
    if (isRateSale && customerCredit && balanceDue > customerCredit.available) {
      return setError(`Credit limit exceeded. Available credit is ${customerCredit.available.toFixed(2)}.`);
    }

    const selectedLines = isGoldReceipt
      ? lines.filter((l) => l.description.trim() !== "" || toNumber(l.goldWeight) > 0)
      : lines.filter((l) => l.subcategoryCode.trim() !== "");
    const items = selectedLines.map((l) => ({
      description: l.description.trim(),
      subcategoryCode: l.subcategoryCode.trim(),
      qty: Math.floor(toNumber(l.qty)),
      carat: normalizeCarat(l.carat),
      goldWeight: String(l.goldWeight ?? "").trim(),
      stoneWeight: String(l.stoneWeight ?? "").trim(),
      sellRatePer8g: isRateSale ? String(l.sellRatePer8g ?? "").trim() : "0"
    }));

    if (items.length === 0) return setError("Add at least one item.");
    for (const [idx, it] of items.entries()) {
      const line = selectedLines[idx];
      if (isGoldReceipt && !it.description) return setError("Enter description for all received gold rows.");
      if (!line?.carat) return setError("Carat cannot be determined for one or more items.");
      if (!isGoldReceipt && (!Number.isFinite(it.qty) || it.qty <= 0)) return setError("Enter valid qty for all items.");
      if (!it.goldWeight || toNumber(it.goldWeight) <= 0) return setError("Enter valid weight for all items.");
      if (isRateSale && (!it.sellRatePer8g || toNumber(it.sellRatePer8g) <= 0))
        return setError("Enter valid sell rate for all items.");
    }
    if (!isGoldReceipt && qtyErrors.size > 0) return setError("Quantity exceeded. Please reduce qty.");
    if (!isGoldReceipt && weightErrors.size > 0) return setError("Weight exceeded. Please reduce weight.");

    setBusy(true);
    try {
      const res = await fetch(
        isCustomerGoldReceiptMode
          ? "/api/gold-receipts"
          : isEditMode
            ? `/api/sales?id=${initialSale?.id}`
            : "/api/sales",
        {
        method: isEditMode && !isCustomerGoldReceiptMode ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transactionDate,
          salesmanId: sid,
          customerId: cid,
          ...(isCustomerGoldReceiptMode
            ? {}
            : {
                salesType: effectiveSalesType,
                goldTransactionType: isRateSale ? undefined : effectiveGoldTransactionType
              }),
          remarks,
          paymentType: isRateSale ? paymentType : "Credit",
          discount,
          paidAmount: isRateSale ? paidAmount : "0",
          items
        })
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        sale?: { id?: number };
        goldReceipt?: { grnNo?: string };
      } | null;
      if (!res.ok) throw new Error(json?.error ?? "Save failed");
      const savedSaleId = Number(json?.sale?.id);
      const savedGrnNo = json?.goldReceipt?.grnNo ?? invoiceNo;
      toast.success(
        isCustomerGoldReceiptMode ? "Gold receipt saved" : isEditMode ? "Invoice updated" : "Invoice saved",
        savedGrnNo || invoiceNo || undefined
      );
      setLines([
        {
          id: uid(),
          description: "",
          subcategoryCode: "",
          carat: "",
          qty: "0",
          goldWeight: "0",
          stoneWeight: "0",
          sellRatePer8g: "0"
        }
      ]);
      setRemarks("");
      setSalesmanId("");
      setCustomerId("");
      setDiscount("0");
      setPaidAmount("0");
      setGoldTransactionType(isCustomerGoldReceiptMode ? "RECEIVED" : "ISSUED");
      setPaymentType("Credit");
      allowNavigationRef.current = true;
      router.push(
        destination === "invoice" && (Number.isFinite(savedSaleId) || isEditMode)
          ? `/sales/${Number.isFinite(savedSaleId) ? savedSaleId : initialSale?.id}`
          : isCustomerGoldReceiptMode
            ? destination === "invoice" && savedGrnNo
              ? `/gold/receipts/${encodeURIComponent(savedGrnNo)}`
              : "/gold?tab=customer"
            : "/sales"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border border-ebony-100 bg-white p-4 shadow-sm">
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-1.5 text-sm">
            <div className="text-xs font-bold text-ebony-800">{isCustomerGoldReceiptMode ? "GRN No" : "Invoice No"}</div>
            <input
              value={invoiceNo || (isCustomerGoldReceiptMode ? "GRN001" : "INV001")}
              readOnly
              className="h-10 w-full rounded-md border border-ebony-200 bg-ebony-50 px-3 text-sm font-semibold text-ebony-900 outline-none"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <div className="text-xs font-bold text-ebony-800">Date</div>
            <div className="relative">
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 pr-9 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
              />
              <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ebony-400" />
            </div>
          </label>

          <label className="space-y-1.5 text-sm xl:col-span-2">
            <div className="text-xs font-bold text-ebony-800">Customer *</div>
            <div className="flex items-stretch gap-2">
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}
              className="h-10 min-w-0 flex-1 rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.accountNumber ?? `CUST-${String(c.id).padStart(6, "0")}`} · {c.name}
                </option>
              ))}
            </select>
              <button type="button" onClick={openCustomerModal} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gold-500 text-white hover:bg-gold-600" aria-label="Add new customer" title="Add new customer">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {customerCredit && isRateSale ? (
              <div className={`text-[11px] font-semibold ${balanceDue > customerCredit.available ? "text-red-600" : "text-ebony-500"}`}>
                Outstanding: {customerCredit.balance.toFixed(2)} · Limit: {customerCredit.limit.toFixed(2)} · Available: {customerCredit.available.toFixed(2)}
              </div>
            ) : null}
          </label>

          <label className="space-y-1.5 text-sm">
            <div className="text-xs font-bold text-ebony-800">Mobile</div>
            <input
              value={selectedCustomer?.phone ?? ""}
              readOnly
              placeholder="0771234567"
              className="h-10 w-full rounded-md border border-ebony-200 bg-ebony-50 px-3 text-sm font-semibold text-ebony-700 outline-none"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <div className="text-xs font-bold text-ebony-800">Salesman *</div>
            <select
              value={salesmanId}
              onChange={(e) => setSalesmanId(e.target.value ? Number(e.target.value) : "")}
              className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            >
              <option value="">Select...</option>
              {salesmen.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </label>

          {isCustomerGoldReceiptMode ? (
            <>
              <label className="space-y-1.5 text-sm">
                <div className="text-xs font-bold text-ebony-800">Sales Type</div>
                <input
                  value="Gold"
                  readOnly
                  className="h-10 w-full rounded-md border border-ebony-200 bg-ebony-50 px-3 text-sm font-semibold text-ebony-700 outline-none"
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <div className="text-xs font-bold text-ebony-800">Gold Transaction</div>
                <input
                  value="RECEIVED"
                  readOnly
                  className="h-10 w-full rounded-md border border-ebony-200 bg-ebony-50 px-3 text-sm font-semibold text-ebony-700 outline-none"
                />
              </label>
            </>
          ) : (
            <label className="space-y-1.5 text-sm">
              <div className="text-xs font-bold text-ebony-800">Sales Type</div>
              <select
                value={salesType}
                onChange={(e) => {
                  setSalesType(e.target.value === "Rate" ? "Rate" : "Gold");
                  setGoldTransactionType("ISSUED");
                }}
                className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
              >
                <option>Gold</option>
                <option>Rate</option>
              </select>
            </label>
          )}

          {isRateSale ? (
            <label className="space-y-1.5 text-sm">
              <div className="text-xs font-bold text-ebony-800">Payment Type</div>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
              >
                <option>Credit</option>
                <option>Cash</option>
                <option>Bank</option>
              </select>
            </label>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-ebony-100 bg-white shadow-sm">
        {loading ? (
          <div className="px-4 py-6 text-sm font-semibold text-ebony-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            {isGoldReceipt ? (
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
                  <tr>
                    <th className="border border-ebony-100 px-3 py-2 text-center">#</th>
                    <th className="border border-ebony-100 px-3 py-2">Description</th>
                    <th className="border border-ebony-100 px-3 py-2 text-center">Karat</th>
                    <th className="border border-ebony-100 px-3 py-2 text-right">Gold Wt</th>
                    <th className="border border-ebony-100 px-3 py-2 text-right">24KT Wt</th>
                    <th className="border border-ebony-100 px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ebony-100">
                  {lines.map((l, index) => {
                    const goldWeight = Math.max(0, toNumber(l.goldWeight));
                    const carat = Math.max(0, toNumber(normalizeCarat(l.carat)));
                    const pureWeight = (goldWeight * carat) / 24;
                    return (
                      <tr key={l.id} className="bg-white">
                        <td className="border border-ebony-100 px-3 py-2 text-center font-semibold text-ebony-700">
                          {index + 1}
                        </td>
                        <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                          <input
                            value={l.description}
                            onChange={(e) => updateLine(l.id, { description: e.target.value })}
                            className="h-10 w-full border-0 bg-transparent px-2 outline-none focus:bg-gold-50"
                            placeholder="Received gold description"
                          />
                        </td>
                        <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                          <select
                            value={l.carat}
                            onChange={(e) => updateLine(l.id, { carat: e.target.value })}
                            className="h-10 w-full border-0 bg-transparent px-2 text-center outline-none focus:bg-gold-50"
                          >
                            <option value="">Select</option>
                            {RECEIPT_CARATS.map((caratValue) => (
                              <option key={caratValue} value={caratValue}>
                                {caratValue}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                          <input
                            inputMode="decimal"
                            value={l.goldWeight}
                            onFocus={selectOnFocus}
                            onChange={(e) => updateLine(l.id, { goldWeight: sanitizeDecimal(e.target.value) })}
                            className="h-10 w-full border-0 bg-transparent px-2 text-right outline-none focus:bg-gold-50"
                          />
                        </td>
                        <td className="border border-ebony-100 px-3 py-2 text-right font-semibold tabular-nums text-ebony-900">
                          {pureWeight.toFixed(3)}
                        </td>
                        <td className="border border-ebony-100 px-2 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => setDeleteLineTarget({ id: l.id, label: `row ${index + 1}` })}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                            aria-label="Remove row"
                            title="Remove row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
            <table className={`w-full text-sm ${isRateSale ? "min-w-[1000px]" : "min-w-[860px]"}`}>
              <thead className="bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
                <tr>
                  <th className="border border-ebony-100 px-3 py-2 text-center">#</th>
                  <th className="border border-ebony-100 px-3 py-2">Barcode</th>
                  <th className="border border-ebony-100 px-3 py-2">Description</th>
                  <th className="border border-ebony-100 px-3 py-2">Karat</th>
                  <th className="border border-ebony-100 px-3 py-2 text-right">Qty</th>
                  <th className="border border-ebony-100 px-3 py-2 text-right">Gold Wt</th>
                  <th className="border border-ebony-100 px-3 py-2 text-right">Stone Wt</th>
                  {!isRateSale ? (
                    <th className="border border-ebony-100 px-3 py-2 text-right">24KT Wt</th>
                  ) : null}
                  {isRateSale ? (
                    <>
                      <th className="border border-ebony-100 px-3 py-2 text-right">Rate/8g</th>
                      <th className="border border-ebony-100 px-3 py-2 text-right">Amount</th>
                    </>
                  ) : null}
                  <th className="border border-ebony-100 px-3 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {lines.map((l, index) => {
                  const sub = subcategoryByCode.get(l.subcategoryCode);
                  const avail = l.subcategoryCode && l.carat ? availabilityKeyed.get(`${l.subcategoryCode}||${l.carat}`) : undefined;
                  const subAvail = l.subcategoryCode ? availabilityBySubcategory.get(l.subcategoryCode) : undefined;
                  const sellRate = Math.max(0, toNumber(l.sellRatePer8g));
                  const goldWeight = Math.max(0, toNumber(l.goldWeight));
                  const karat = Math.max(0, toNumber(normalizeCarat(l.carat)));
                  const stoneWeight = Math.max(0, toNumber(l.stoneWeight));
                  const pureWeight = (goldWeight / 24) * karat;
                  const amount = (goldWeight / 8) * sellRate;
                  const availableQty = Math.max(0, Number(avail?.balanceQty ?? subAvail?.balanceQty ?? 0));
                  const availableWeight = Math.max(
                    0,
                    toNumber(avail?.balanceGoldWeight ?? String(subAvail?.balanceGoldWeight ?? 0))
                  );
                  return (
                    <tr key={l.id} className="bg-white">
                      <td className="border border-ebony-100 px-3 py-2 text-center font-semibold text-ebony-700">
                        {index + 1}
                      </td>
                      <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                        <button
                          type="button"
                          onClick={() => openBarcodePicker(l.id)}
                          onKeyDown={(e) => handleTabNav(e, l.id, "subcategory")}
                          ref={(el) => setCellRef(l.id, "subcategory", el)}
                          className="h-10 w-full min-w-40 border-0 bg-transparent px-2 text-left text-sm outline-none focus:bg-gold-50"
                        >
                          {l.subcategoryCode || "Select item..."}
                        </button>
                          {qtyErrors.get(l.id) ? (
                            <div className="px-2 pb-1 text-xs font-semibold text-red-600">{qtyErrors.get(l.id)}</div>
                          ) : null}
                          {l.subcategoryCode ? (
                            <div className="px-2 pb-1 text-[11px] font-semibold text-ebony-500">
                              Available: {availableQty} qty, {availableWeight.toFixed(3)} g
                            </div>
                          ) : null}
                        </td>
                      <td className="border border-ebony-100 px-3 py-2 font-medium text-ebony-800">{sub?.name ?? "-"}</td>
                      <td className="border border-ebony-100 px-3 py-2 font-semibold text-ebony-800">{l.carat || "-"}</td>
                      <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                        <input
                          inputMode="numeric"
                          value={l.qty}
                          onFocus={selectOnFocus}
                          onChange={(e) => updateLine(l.id, { qty: sanitizeInt(e.target.value) })}
                          onKeyDown={(e) => handleTabNav(e, l.id, "qty")}
                          ref={(el) => setCellRef(l.id, "qty", el)}
                          className="h-10 w-full border-0 bg-transparent px-2 text-right outline-none focus:bg-gold-50"
                        />
                      </td>
                      <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                        <input
                          inputMode="decimal"
                          value={l.goldWeight}
                          onFocus={selectOnFocus}
                          onChange={(e) => updateLine(l.id, { goldWeight: sanitizeDecimal(e.target.value) })}
                          onKeyDown={(e) => {
                            if (e.key !== "Tab") return;
                            if (weightErrors.get(l.id)) {
                              e.preventDefault();
                              setError(weightErrors.get(l.id) ?? "Weight exceeded");
                              return;
                            }
                            return handleTabNav(e, l.id, "goldWeight");
                          }}
                          ref={(el) => setCellRef(l.id, "goldWeight", el)}
                          className={[
                            "h-10 w-full border-0 bg-transparent px-2 text-right outline-none focus:bg-gold-50",
                            weightErrors.get(l.id) ? "text-red-700" : ""
                          ].join(" ")}
                        />
                        {weightErrors.get(l.id) ? (
                          <div className="px-2 pb-1 text-xs font-semibold text-red-600">{weightErrors.get(l.id)}</div>
                        ) : null}
                      </td>
                      <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                        <input
                          inputMode="decimal"
                          value={l.stoneWeight}
                          onFocus={selectOnFocus}
                          onChange={(e) => updateLine(l.id, { stoneWeight: sanitizeDecimal(e.target.value) })}
                          onKeyDown={(e) => handleTabNav(e, l.id, "stoneWeight")}
                          ref={(el) => setCellRef(l.id, "stoneWeight", el)}
                          className="h-10 w-full border-0 bg-transparent px-2 text-right outline-none focus:bg-gold-50"
                        />
                      </td>
                      {!isRateSale ? (
                        <td className="border border-ebony-100 px-3 py-2 text-right tabular-nums text-ebony-700">
                          {pureWeight.toFixed(3)}
                        </td>
                      ) : null}
                      {isRateSale ? (
                        <>
                          <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                            <input
                              inputMode="decimal"
                              value={l.sellRatePer8g}
                              onFocus={selectOnFocus}
                              onChange={(e) => updateLine(l.id, { sellRatePer8g: sanitizeDecimal(e.target.value) })}
                              onKeyDown={(e) => {
                                if (e.key === "Tab") return handleTabNav(e, l.id, "sellRate");
                                if (e.key !== "Enter") return;
                                e.preventDefault();
                                addLine();
                              }}
                              ref={(el) => setCellRef(l.id, "sellRate", el)}
                              className="h-10 w-full border-0 bg-transparent px-2 text-right outline-none focus:bg-gold-50"
                            />
                          </td>
                          <td className="border border-ebony-100 px-3 py-2 text-right font-bold tabular-nums text-ebony-900">
                            {amount.toFixed(2)}
                          </td>
                        </>
                      ) : null}
                      <td className="border border-ebony-100 px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => setDeleteLineTarget({ id: l.id, label: `row ${index + 1}` })}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                          aria-label="Remove row"
                          title="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={addLine}
          className="inline-flex items-center gap-2 rounded-md border border-ebony-200 bg-white px-3 py-2 text-sm font-bold text-indigo-700 shadow-sm hover:bg-ebony-50"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void submit("invoice")}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
          {busy ? "Saving..." : isCustomerGoldReceiptMode ? "Save GRN" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
          {isCustomerGoldReceiptMode ? "Save & Print GRN" : "Save & Print"}
          </button>
          <button
            type="button"
            onClick={cancelEntry}
            disabled={busy}
            className="rounded-md bg-ebony-100 px-6 py-3 text-sm font-bold text-ebony-800 hover:bg-ebony-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="w-full max-w-[310px] rounded-lg border border-ebony-100 bg-white shadow-sm">
          {[
            ["Total Gold Weight", `${totals.totalGoldWeight.toFixed(3)} g`]
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-b border-ebony-100 px-4 py-3 text-sm">
              <span className="font-semibold text-ebony-700">{label}</span>
              <span className="font-extrabold tabular-nums text-ebony-900">{value}</span>
            </div>
          ))}

          {isRateSale ? (
            <>
              <div className="flex items-center justify-between border-b border-ebony-100 px-4 py-3 text-sm">
                <span className="font-semibold text-ebony-700">Total Amount</span>
                <span className="font-extrabold tabular-nums text-ebony-900">{totalAmount.toFixed(2)}</span>
              </div>
              <label className="flex items-center justify-between border-b border-ebony-100 px-4 py-2 text-sm">
                <span className="font-semibold text-ebony-700">Discount</span>
                <input
                  inputMode="decimal"
                  value={discount}
                  onFocus={selectOnFocus}
                  onChange={(e) => setDiscount(sanitizeDecimal(e.target.value))}
                  placeholder="0.00"
                  className="h-9 w-32 rounded-md border border-ebony-200 px-2 text-right font-bold tabular-nums outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                />
              </label>
              <div className="flex items-center justify-between border-b border-ebony-100 px-4 py-3 text-sm">
                <span className="font-semibold text-ebony-700">Grand Total</span>
                <span className="font-extrabold tabular-nums text-ebony-900">{grandTotal.toFixed(2)}</span>
              </div>
              <label className="flex items-center justify-between border-b border-ebony-100 px-4 py-2 text-sm">
                <span className="font-semibold text-ebony-700">Paid Amount{paymentType === "Cash" ? " *" : ""}</span>
                <input
                  inputMode="decimal"
                  value={paidAmount}
                  onFocus={selectOnFocus}
                  onChange={(e) => setPaidAmount(sanitizeDecimal(e.target.value))}
                  placeholder="0.00"
                  className="h-9 w-32 rounded-md border border-ebony-200 px-2 text-right font-bold tabular-nums outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                />
              </label>
              {remainingAmount > 0 ? (
                <div className="flex items-center justify-between px-4 py-4">
                  <span className="text-base font-extrabold text-emerald-700">Remaining Amount</span>
                  <span className="text-lg font-extrabold tabular-nums text-emerald-700">{remainingAmount.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-4">
                  <span className="text-base font-extrabold text-red-600">Balance Due</span>
                  <span className="text-lg font-extrabold tabular-nums text-red-600">{balanceDue.toFixed(2)}</span>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      <Modal open={customerModalOpen} onClose={() => !customerBusy && setCustomerModalOpen(false)} title="Add Customer">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void addCustomer(); }}>
          <p className="text-sm text-ebony-600">Create a customer and continue this invoice with them selected.</p>
          {customerError ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{customerError}</div> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-ebony-700">Customer Name *</span>
              <input autoFocus required value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} className="w-full rounded-md border border-ebony-200 px-3 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20" />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-ebony-700">Phone</span>
              <input value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} className="w-full rounded-md border border-ebony-200 px-3 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20" />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-ebony-700">Email</span>
              <input type="email" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} className="w-full rounded-md border border-ebony-200 px-3 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20" />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-ebony-700">Address</span>
              <input value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} className="w-full rounded-md border border-ebony-200 px-3 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20" />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-ebony-700">Credit Limit *</span>
              <input type="number" min="0" step="0.01" required value={newCustomerCreditLimit} onChange={(e) => setNewCustomerCreditLimit(e.target.value)} className="w-full rounded-md border border-ebony-200 px-3 py-2.5 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20" />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-ebony-100 pt-4">
            <button type="button" disabled={customerBusy} onClick={() => setCustomerModalOpen(false)} className="rounded-md border border-ebony-200 px-4 py-2.5 text-sm font-semibold text-ebony-700 hover:bg-ebony-50 disabled:opacity-60">Cancel</button>
            <button type="submit" disabled={customerBusy || !newCustomerName.trim() || !newCustomerCreditLimit.trim() || !Number.isFinite(Number(newCustomerCreditLimit)) || Number(newCustomerCreditLimit) < 0} className="rounded-md bg-gold-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-gold-700 disabled:cursor-not-allowed disabled:opacity-60">
              {customerBusy ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={barcodePickerRowId !== null}
        onClose={() => closeBarcodePicker("subcategory")}
        title="Select Barcode"
        panelClassName="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ebony-500" />
            <input
              autoFocus
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              onKeyDown={handlePickerKeyDown}
              placeholder="Search by code, description, or category..."
              className="h-11 w-full rounded-lg border border-ebony-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </div>

          <div
            ref={barcodeListRef}
            tabIndex={0}
            role="listbox"
            aria-label="Barcode items"
            aria-activedescendant={subcategoriesSorted[pickerIndex]?.code ? `barcode-option-${subcategoriesSorted[pickerIndex].code}` : undefined}
            onKeyDown={handlePickerKeyDown}
            className="max-h-[48vh] overflow-auto rounded-lg border border-ebony-100 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
          >
            <table className="w-full min-w-[680px] text-sm">
              <thead className="sticky top-0 bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Karat</th>
                  <th className="px-4 py-3 text-right">Available Qty</th>
                  <th className="px-4 py-3 text-right">Available Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {subcategoriesSorted.map((item, index) => {
                  const available = availabilityBySubcategory.get(item.code);
                  const isActive = index === pickerIndex;
                  return (
                    <tr
                      key={item.code}
                      id={`barcode-option-${item.code}`}
                      ref={(el) => {
                        barcodeRowRefs.current[index] = el;
                      }}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => selectBarcodeItem(item.code)}
                      onMouseEnter={() => setPickerIndex(index)}
                      className={[
                        "cursor-pointer outline-none hover:bg-cream-50",
                        isActive ? "bg-gold-100 text-ebony-950 ring-1 ring-inset ring-gold-400" : "bg-white"
                      ].join(" ")}
                    >
                      <td className="px-4 py-3 font-bold text-ebony-900">{item.code}</td>
                      <td className="px-4 py-3 text-ebony-700">{item.name}</td>
                      <td className="px-4 py-3 font-semibold text-ebony-800">{normalizeCarat(item.carat) || "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-ebony-900">
                        {available?.balanceQty ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-ebony-900">
                        {(available?.balanceGoldWeight ?? 0).toFixed(3)} g
                      </td>
                    </tr>
                  );
                })}
                {subcategoriesSorted.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm font-semibold text-ebony-600" colSpan={5}>
                      No matching items.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-ebony-500">
            <span>{subcategoriesSorted.length} items available</span>
            <span>Use arrow keys and Enter to select</span>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={pendingCancelAction !== null}
        title="Cancel Entry?"
        message={
          isCustomerGoldReceiptMode
            ? "You have entered gold receipt details."
            : "You have entered sales details."
        }
        details="Are you sure you want to leave this form? Unsaved details will be lost."
        confirmLabel="Yes, leave"
        cancelLabel="Keep editing"
        tone="warning"
        onCancel={closeCancelConfirm}
        onConfirm={confirmCancelEntry}
      />

      <DeleteConfirmModal
        open={deleteLineTarget !== null}
        itemLabel={deleteLineTarget?.label ?? "this row"}
        description={
          isCustomerGoldReceiptMode
            ? "This will remove the row from the gold receipt form."
            : "This will remove the row from the invoice form."
        }
        onCancel={() => setDeleteLineTarget(null)}
        onConfirm={() => {
          if (!deleteLineTarget) return;
          removeLine(deleteLineTarget.id);
          setDeleteLineTarget(null);
        }}
      />
    </div>
  );

  return (
    <Card className="max-w-6xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Create Invoice</CardTitle>
            <CardDescription>Create an invoice with multiple items.</CardDescription>
          </div>
          <div className="rounded-lg border border-ebony-200 bg-white px-3 py-2 text-xs font-semibold text-ebony-700">
            Invoice No: {invoiceNo || "—"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Invoice Date</div>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
            />
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Salesman</div>
            <select
              value={salesmanId}
              onChange={(e) => setSalesmanId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
            >
              <option value="">Select salesman...</option>
              {salesmen.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Customer</div>
            <div className="flex items-stretch gap-2">
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}
              className="min-w-0 flex-1 rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.accountNumber ?? `CUST-${String(c.id).padStart(6, "0")}`} · {c.name}
                </option>
              ))}
            </select>
              <button type="button" onClick={openCustomerModal} className="inline-flex w-11 shrink-0 items-center justify-center rounded-lg bg-gold-500 text-white hover:bg-gold-600" aria-label="Add new customer" title="Add new customer">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {customerCredit ? (
              <div className={`text-xs font-semibold ${isRateSale && balanceDue > customerCredit!.available ? "text-red-600" : "text-ebony-500"}`}>
                Outstanding: {customerCredit!.balance.toFixed(2)} · Limit: {customerCredit!.limit.toFixed(2)} · Available: {customerCredit!.available.toFixed(2)}
              </div>
            ) : null}
          </label>
        </div>

        <div className="hidden">
            <div className="text-xs font-semibold uppercase tracking-widest text-ebony-500">Sell Subtotal</div>
            <div className="mt-1 text-2xl font-extrabold text-ebony-900">{sellSubTotal.toFixed(2)}</div>
            <div className="mt-1 text-xs text-ebony-500">Sum of (weight ÷ 8 × sell rate) for all rows.</div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-ebony-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ebony-100 px-4 py-3">
            <div className="text-sm font-semibold text-ebony-900">Items</div>
            <div className="text-xs font-semibold text-ebony-500">Excel-style entry.</div>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-sm font-semibold text-ebony-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead className="sticky top-0 z-10 bg-ebony-50 text-left text-xs font-semibold uppercase tracking-widest text-ebony-700">
                  <tr>
                    <th className="border border-ebony-200 px-3 py-2">Subcategory</th>
                    <th className="border border-ebony-200 px-3 py-2">Carat</th>
                    <th className="border border-ebony-200 px-3 py-2 text-right">Qty</th>
                    <th className="border border-ebony-200 px-3 py-2 text-right">Weight (g)</th>
                    <th className="border border-ebony-200 px-3 py-2 text-right">Sell Rate/8g</th>
                    <th className="border border-ebony-200 px-3 py-2 text-right">Sell Cost</th>
                    <th className="border border-ebony-200 px-3 py-2 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ebony-100">
                  {lines.map((l, index) => {
                    const sellRate = Math.max(0, toNumber(l.sellRatePer8g));
                    const sellCost = (Math.max(0, toNumber(l.goldWeight)) / 8) * sellRate;
                    return (
                      <tr key={l.id} className="bg-white hover:bg-cream-50/40 transition-colors">
                        <td className="border border-ebony-200 p-0">
                          <select
                            value={l.subcategoryCode}
                            onChange={(e) => updateLine(l.id, { subcategoryCode: e.target.value })}
                            onKeyDown={(e) => handleTabNav(e, l.id, "subcategory")}
                            ref={(el) => setCellRef(l.id, "subcategory", el)}
                            className="h-10 w-full rounded-none border-0 bg-white px-2 outline-none focus:bg-cream-50"
                          >
                            <option value="">Select subcategory...</option>
                            {subcategoriesSorted.map((s) => (
                                <option key={s.code} value={s.code}>
                                  {s.code} — {s.name}
                                </option>
                              ))}
                          </select>
                          {qtyErrors.get(l.id) && (
                            <div className="px-2 pb-1 text-xs font-semibold text-red-600">{qtyErrors.get(l.id)}</div>
                          )}
                        </td>
                        <td className="border border-ebony-200 p-0">
                          <div className="h-10 w-full bg-cream-100 px-2 py-2 font-semibold text-ebony-900">
                            {l.carat || "â€”"}
                          </div>
                        </td>
                        <td className="border border-ebony-200 p-0 text-right">
                          <input
                            inputMode="numeric"
                            value={l.qty}
                            onChange={(e) => updateLine(l.id, { qty: sanitizeInt(e.target.value) })}
                            onKeyDown={(e) => handleTabNav(e, l.id, "qty")}
                            ref={(el) => setCellRef(l.id, "qty", el)}
                            className={[
                              "h-10 w-full rounded-none border-0 bg-white px-2 text-right outline-none focus:bg-cream-50",
                              qtyErrors.get(l.id) ? "text-red-700" : ""
                            ].join(" ")}
                          />
                        </td>
                        <td className="border border-ebony-200 p-0 text-right">
                          <input
                            inputMode="decimal"
                            value={l.goldWeight}
                            onChange={(e) => updateLine(l.id, { goldWeight: sanitizeDecimal(e.target.value) })}
                            onKeyDown={(e) => {
                              if (e.key !== "Tab") return;
                              if (weightErrors.get(l.id)) {
                                e.preventDefault();
                                setError(weightErrors.get(l.id) ?? "Weight exceeded");
                                return;
                              }
                              return handleTabNav(e, l.id, "goldWeight");
                            }}
                            ref={(el) => setCellRef(l.id, "goldWeight", el)}
                            className={[
                              "h-10 w-full rounded-none border-0 bg-white px-2 text-right outline-none focus:bg-cream-50",
                              weightErrors.get(l.id) ? "text-red-700" : ""
                            ].join(" ")}
                          />
                          {weightErrors.get(l.id) ? (
                            <div className="px-2 pb-1 text-left text-xs font-semibold text-red-600">{weightErrors.get(l.id)}</div>
                          ) : null}
                        </td>
                        <td className="border border-ebony-200 p-0 text-right">
                          <input
                            inputMode="decimal"
                            value={l.sellRatePer8g}
                            onChange={(e) => updateLine(l.id, { sellRatePer8g: sanitizeDecimal(e.target.value) })}
                            onKeyDown={(e) => {
                              if (e.key === "Tab") return handleTabNav(e, l.id, "sellRate");
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              addLine();
                            }}
                            ref={(el) => setCellRef(l.id, "sellRate", el)}
                            placeholder="0.00"
                            className="h-10 w-full rounded-none border-0 bg-white px-2 text-right outline-none focus:bg-cream-50"
                          />
                        </td>
                        <td className="border border-ebony-200 p-0 text-right">
                          <div className="h-10 w-full bg-cream-100 px-2 py-2 text-right font-bold text-ebony-900">
                            {Number.isFinite(sellCost) ? sellCost.toFixed(2) : "0.00"}
                          </div>
                        </td>
                        <td className="border border-ebony-200 p-0 text-right">
                          <button
                            type="button"
                            onClick={() => setDeleteLineTarget({ id: l.id, label: `row ${index + 1}` })}
                            className="inline-flex h-10 w-10 items-center justify-center bg-white text-red-700 hover:bg-red-50"
                            aria-label="Remove row"
                            title="Remove row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-ebony-50">
                    <td className="border border-ebony-200 px-3 py-2 font-semibold text-ebony-900" colSpan={2}>
                      Overall Total
                    </td>
                    <td className="border border-ebony-200 px-3 py-2 text-right font-bold text-ebony-900">
                      {totals.totalQty}
                    </td>
                    <td className="border border-ebony-200 px-3 py-2 text-right font-bold text-ebony-900">
                      {totals.totalNetWeight.toFixed(3)}
                    </td>
                    <td className="border border-ebony-200 px-3 py-2" />
                    <td className="border border-ebony-200 px-3 py-2 text-right font-bold text-ebony-900">
                      {sellSubTotal.toFixed(2)}
                    </td>
                    <td className="border border-ebony-200 px-3 py-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="space-y-3 border-t border-ebony-100 px-4 py-3">
            <button
              type="button"
              onClick={addLine}
              className="rounded-lg border border-ebony-300 bg-white px-4 py-2 text-sm font-semibold text-ebony-700 hover:bg-ebony-50"
            >
              + Add Row
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={cancelEntry}
                disabled={busy}
                className="rounded-lg border border-ebony-300 bg-white px-5 py-2.5 text-sm font-semibold text-ebony-700 hover:bg-ebony-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy}
                className="rounded-lg bg-gold-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gold-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Saving..." : "Save Invoice"}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
      <ConfirmModal
        open={pendingCancelAction !== null}
        title="Cancel Entry?"
        message={
          isCustomerGoldReceiptMode
            ? "You have entered gold receipt details."
            : "You have entered sales details."
        }
        details="Are you sure you want to leave this form? Unsaved details will be lost."
        confirmLabel="Yes, leave"
        cancelLabel="Keep editing"
        tone="warning"
        onCancel={closeCancelConfirm}
        onConfirm={confirmCancelEntry}
      />
      <DeleteConfirmModal
        open={deleteLineTarget !== null}
        itemLabel={deleteLineTarget?.label ?? "this row"}
        description="This will remove the row from the invoice form."
        onCancel={() => setDeleteLineTarget(null)}
        onConfirm={() => {
          if (!deleteLineTarget) return;
          removeLine(deleteLineTarget.id);
          setDeleteLineTarget(null);
        }}
      />
    </Card>
  );
}

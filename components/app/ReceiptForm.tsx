"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import type { StockMaster } from "@/lib/generated/prisma";
import { Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

type ReceiptFormState = {
  purchaseType: "Gold" | "Rate";
  transactionDate: string;
  location: string;
  gsmCode: string;
  gsmName: string;
  categoryCode: string;
  articleName: string;
  subcategoryCode: string;
  qty: string;
  description: string;
  carat: string;
  wastageYN: "Y" | "N";
  goldWeight: string;
  wastageMg: string;
  labourCharges: string;
  otherCosts: string;
  remarks: string;
};

type ReceiptFormInitialValues = Partial<ReceiptFormState>;
type Errors = Partial<Record<keyof ReceiptFormState, string>> & { form?: string };
type PurchaseLine = Pick<
  ReceiptFormState,
  | "categoryCode"
  | "articleName"
  | "subcategoryCode"
  | "qty"
  | "description"
  | "carat"
  | "wastageYN"
  | "goldWeight"
  | "wastageMg"
  | "labourCharges"
  | "otherCosts"
> & {
  goldCostRatePer8g: string;
  wastageRateMgPer8g: string;
};
const CARAT_VALUES = ["18K", "19K", "20K", "21K", "22K", "24K"];

function normalizeCarat(value: string | null | undefined) {
  const raw = (value ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/K(T)?$/, "");
  return raw ? `${raw}K` : "";
}

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isPositiveNumber(value: string) {
  const n = toNumber(value);
  return n > 0;
}

function isNonNegativeNumber(value: string) {
  const n = toNumber(value);
  return n >= 0;
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

function selectOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.select();
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function emptyLine(): PurchaseLine & { id: string } {
  return {
    id: uid(),
    categoryCode: "",
    articleName: "",
    subcategoryCode: "",
    qty: "0",
    description: "",
    carat: "",
    wastageYN: "N",
    goldWeight: "0",
    wastageMg: "0",
    labourCharges: "0",
    otherCosts: "0",
    goldCostRatePer8g: "0",
    wastageRateMgPer8g: "0"
  };
}

function emptyForm(): ReceiptFormState {
  return {
    purchaseType: "Gold",
    transactionDate: todayISO(),
    location: "",
    gsmCode: "",
    gsmName: "",
    categoryCode: "",
    articleName: "",
    subcategoryCode: "",
    qty: "0",
    description: "",
    carat: "",
    wastageYN: "N",
    goldWeight: "0",
    wastageMg: "0",
    labourCharges: "0",
    otherCosts: "0",
    remarks: ""
  };
}

export function ReceiptForm({
  mode,
  receiptId,
  submitPath = "/api/stock/receipts",
  redirectPath = "/stock",
  title,
  description,
  submitLabel,
  layout = "default",
  formId,
  initialValues
}: {
  mode: "create" | "edit";
  receiptId?: number;
  submitPath?: string;
  redirectPath?: string;
  title?: string;
  description?: string;
  submitLabel?: string;
  layout?: "default" | "table";
  formId?: string;
  initialValues?: ReceiptFormInitialValues;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ReceiptFormState>(emptyForm());
  const [lines, setLines] = useState<Array<PurchaseLine & { id: string }>>([emptyLine()]);
  const [errors, setErrors] = useState<Errors>({});
  const [lineErrors, setLineErrors] = useState<Record<string, Partial<Record<keyof PurchaseLine, string>>>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(mode === "edit");
  const [goldsmiths, setGoldsmiths] = useState<Array<{ code: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ code: string; name: string }>>([]);
  const [subcategories, setSubcategories] = useState<
    Array<{ code: string; name: string; categoryCode: string; carat?: string | null }>
  >([]);
  const [system, setSystem] = useState<{ goldCostRatePer8g: number; wastageRateMgPer8g: number } | null>(
    null
  );
  const [systemModalOpen, setSystemModalOpen] = useState(false);
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false);
  const [systemForm, setSystemForm] = useState({
    vatRate: "",
    nslRate: "",
    goldCostRatePer8g: "",
    wastageRateMgPer8g: ""
  });
  const [savedSystemForm, setSavedSystemForm] = useState(systemForm);
  const [formRates, setFormRates] = useState({ goldCostRatePer8g: 0, wastageRateMgPer8g: 0 });
  const [systemSaveState, setSystemSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [subcatForm, setSubcatForm] = useState({ categoryCode: "", name: "", carat: "" });
  const [subcatSaveState, setSubcatSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [subcatError, setSubcatError] = useState("");
  const [subcatFile, setSubcatFile] = useState<File | null>(null);
  const [subcatPreviewUrl, setSubcatPreviewUrl] = useState<string>("");
  const [subcategoryPickerOpen, setSubcategoryPickerOpen] = useState(false);
  const [subcategoryPickerLineId, setSubcategoryPickerLineId] = useState<string | null>(null);
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [subcategoryPickerIndex, setSubcategoryPickerIndex] = useState(0);

  useEffect(() => {
    return () => {
      if (subcatPreviewUrl) URL.revokeObjectURL(subcatPreviewUrl);
    };
  }, [subcatPreviewUrl]);

  function update<K extends keyof ReceiptFormState>(key: K, value: ReceiptFormState[K]) {
    if (key === "goldWeight" || key === "wastageYN") {
      setFormRates({
        goldCostRatePer8g: system?.goldCostRatePer8g ?? 0,
        wastageRateMgPer8g: system?.wastageRateMgPer8g ?? 0
      });
    }
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  }

  function updateLine<K extends keyof PurchaseLine>(id: string, key: K, value: PurchaseLine[K]) {
    setLines((prev) =>
      prev.map((line) =>
        line.id === id
          ? {
              ...line,
              [key]: value,
              ...(key === "goldWeight" || key === "wastageYN"
                ? {
                    goldCostRatePer8g: String(system?.goldCostRatePer8g ?? 0),
                    wastageRateMgPer8g: String(system?.wastageRateMgPer8g ?? 0)
                  }
                : {})
            }
          : line
      )
    );
    setLineErrors((prev) => ({ ...prev, [id]: { ...prev[id], [key]: undefined } }));
    setErrors((prev) => ({ ...prev, form: undefined }));
  }

  function captureLatestRatesForLine(id: string) {
    setLines((prev) =>
      prev.map((line) =>
        line.id === id
          ? {
              ...line,
              goldCostRatePer8g: String(system?.goldCostRatePer8g ?? 0),
              wastageRateMgPer8g: String(system?.wastageRateMgPer8g ?? 0)
            }
          : line
      )
    );
  }

  function captureLatestRatesForForm() {
    setFormRates({
      goldCostRatePer8g: system?.goldCostRatePer8g ?? 0,
      wastageRateMgPer8g: system?.wastageRateMgPer8g ?? 0
    });
  }

  function isWeightEditKey(key: string) {
    return key.length === 1 || key === "Backspace" || key === "Delete";
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        ...emptyLine(),
        goldCostRatePer8g: String(system?.goldCostRatePer8g ?? 0),
        wastageRateMgPer8g: String(system?.wastageRateMgPer8g ?? 0)
      }
    ]);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((line) => line.id !== id)));
    setLineErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function setGsmCode(nextCode: string) {
    const code = nextCode.trim();
    const match = goldsmiths.find((g) => g.code === code);
    setForm((prev) => ({
      ...prev,
      gsmCode: code,
      gsmName: match?.name ?? ""
    }));
    setErrors((prev) => ({ ...prev, gsmCode: undefined, gsmName: undefined, form: undefined }));
  }

  function setCategoryCode(nextCode: string) {
    const code = nextCode.trim();
    const match = categories.find((c) => c.code === code);
    setForm((prev) => ({
      ...prev,
      categoryCode: code,
      articleName: match?.name ?? "",
      subcategoryCode: "",
      carat: ""
    }));
    setErrors((prev) => ({ ...prev, categoryCode: undefined, articleName: undefined, form: undefined }));
  }

  function setSubcategoryCode(nextCode: string) {
    const code = nextCode.trim();
    const match = subcategories.find((s) => s.code === code);
    const category = categories.find((c) => c.code === match?.categoryCode);
    setForm((prev) => ({
      ...prev,
      subcategoryCode: code,
      categoryCode: match?.categoryCode ?? prev.categoryCode,
      articleName: category?.name ?? prev.articleName,
      description: match?.name ?? prev.description,
      carat: normalizeCarat(match?.carat)
    }));
    setErrors((prev) => ({
      ...prev,
      subcategoryCode: undefined,
      categoryCode: undefined,
      carat: undefined,
      form: undefined
    }));
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [gs, cs, subs, sys] = await Promise.all([
          fetch("/api/goldsmiths", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/categories", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/subcategories", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/system", { cache: "no-store" }).then((r) => r.json())
        ]);
        if (!active) return;
        setGoldsmiths(gs.goldsmiths ?? []);
        setCategories(cs.categories ?? []);
        setSubcategories(subs.subcategories ?? []);
        const data = sys.data ?? null;
        setSystem({
          goldCostRatePer8g: Number(data?.goldCostRatePer8g ?? 0) || 0,
          wastageRateMgPer8g: Number(data?.wastageRateMgPer8g ?? 0) || 0
        });
        setFormRates({
          goldCostRatePer8g: Number(data?.goldCostRatePer8g ?? 0) || 0,
          wastageRateMgPer8g: Number(data?.wastageRateMgPer8g ?? 0) || 0
        });
        if (data) {
          const nextSystemForm = {
            vatRate: String(data.vatRate ?? ""),
            nslRate: String(data.nslRate ?? ""),
            goldCostRatePer8g: String(data.goldCostRatePer8g ?? ""),
            wastageRateMgPer8g: String(data.wastageRateMgPer8g ?? "")
          };
          setSystemForm(nextSystemForm);
          setSavedSystemForm(nextSystemForm);
        }
      } catch {
        // ignore
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const filteredSubcategories = useMemo(() => {
    if (!form.categoryCode) return [];
    return subcategories.filter((s) => s.categoryCode === form.categoryCode);
  }, [form.categoryCode, subcategories]);

  const subcategoriesSorted = useMemo(() => {
    const term = subcategorySearch.trim().toLowerCase();
    return [...subcategories]
      .filter((s) => {
        if (!term) return true;
        return (
          s.code.toLowerCase().includes(term) ||
          s.name.toLowerCase().includes(term) ||
          s.categoryCode.toLowerCase().includes(term) ||
          normalizeCarat(s.carat).toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subcategorySearch, subcategories]);

  function openSubcategoryPicker(lineId?: string) {
    setSubcategoryPickerLineId(lineId ?? null);
    setSubcategorySearch("");
    setSubcategoryPickerIndex(0);
    setSubcategoryPickerOpen(true);
  }

  function closeSubcategoryPicker() {
    setSubcategoryPickerOpen(false);
    setSubcategoryPickerLineId(null);
    setSubcategorySearch("");
    setSubcategoryPickerIndex(0);
  }

  function selectSubcategory(code: string) {
    if (subcategoryPickerLineId) {
      const match = subcategories.find((s) => s.code === code);
      const category = categories.find((c) => c.code === match?.categoryCode);
      setLines((prev) =>
        prev.map((line) =>
          line.id === subcategoryPickerLineId
            ? {
                ...line,
                subcategoryCode: code,
                categoryCode: match?.categoryCode ?? line.categoryCode,
                articleName: category?.name ?? line.articleName,
                description: match?.name ?? line.description,
                carat: normalizeCarat(match?.carat)
              }
            : line
        )
      );
      setLineErrors((prev) => ({
        ...prev,
        [subcategoryPickerLineId]: {
          ...prev[subcategoryPickerLineId],
          subcategoryCode: undefined,
          categoryCode: undefined,
          carat: undefined
        }
      }));
      closeSubcategoryPicker();
      return;
    }
    setSubcategoryCode(code);
    closeSubcategoryPicker();
  }

  function handleSubcategoryPickerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSubcategoryPickerIndex((prev) => Math.min(prev + 1, Math.max(0, subcategoriesSorted.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSubcategoryPickerIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const selected = subcategoriesSorted[subcategoryPickerIndex] ?? subcategoriesSorted[0];
      if (selected) selectSubcategory(selected.code);
    }
  }

  useEffect(() => {
    if (form.wastageYN !== "Y" && form.wastageMg !== "") update("wastageMg", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.wastageYN]);

  useEffect(() => {
    if (form.purchaseType !== "Gold" || form.wastageYN !== "Y") return;
    const rate = formRates.wastageRateMgPer8g;
    const generated = (toNumber(form.goldWeight) / 8) * rate;
    const next = generated > 0 ? generated.toFixed(3) : "";
    if (form.wastageMg !== next) update("wastageMg", next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.goldWeight, form.purchaseType, form.wastageYN, formRates.wastageRateMgPer8g]);

  useEffect(() => {
    if (mode === "edit" && initialValues) {
      setForm({ ...emptyForm(), ...initialValues });
      setLoading(false);
      return;
    }
    if (mode !== "edit" || !receiptId) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stock/receipts?id=${receiptId}`, { cache: "no-store" });
        const json = (await res.json()) as { row?: StockMaster | null };
        const row = json.row ?? null;
        if (!active || !row) return;
        setForm({
          purchaseType: "Gold",
          transactionDate: new Date(row.transactionDate).toISOString().slice(0, 10),
          location: row.location ?? "",
          gsmCode: row.gsmCode,
          gsmName: row.gsmName,
          categoryCode: row.categoryCode,
          articleName: row.articleName,
          subcategoryCode: row.subcategoryCode,
          qty: String(row.qty),
          description: row.description ?? "",
          carat: normalizeCarat(row.carat),
          wastageYN: row.wastageYN ? "Y" : "N",
          goldWeight: row.goldWeight.toString(),
          wastageMg: row.wastageMg.toString(),
          labourCharges: row.labourCharges.toString(),
          otherCosts: row.otherCosts.toString(),
          remarks: row.remarks ?? ""
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [initialValues, mode, receiptId]);

  const goldCostCalculated = useMemo(() => {
    const weight = toNumber(form.goldWeight);
    const rate = formRates.goldCostRatePer8g;
    return (weight / 8) * rate;
  }, [form.goldWeight, formRates.goldCostRatePer8g]);

  const wastageCostCalculated = useMemo(() => {
    if (form.wastageYN !== "Y") return 0;
    const weight = toNumber(form.goldWeight);
    const goldRate = formRates.goldCostRatePer8g;
    return (weight / 8) * goldRate;
  }, [form.goldWeight, form.wastageYN, formRates.goldCostRatePer8g]);

  const totalCost = useMemo(() => {
    return (
      goldCostCalculated +
      wastageCostCalculated +
      toNumber(form.labourCharges) +
      toNumber(form.otherCosts)
    );
  }, [form.labourCharges, form.otherCosts, goldCostCalculated, wastageCostCalculated]);

  function lineGeneratedWastage(line: PurchaseLine) {
    if (form.purchaseType !== "Gold" || line.wastageYN !== "Y") return line.wastageMg;
    const rate = toNumber(line.wastageRateMgPer8g);
    const generated = (toNumber(line.goldWeight) / 8) * rate;
    return generated > 0 ? generated.toFixed(3) : "";
  }

  function lineGoldCost(line: PurchaseLine) {
    return (toNumber(line.goldWeight) / 8) * toNumber(line.goldCostRatePer8g);
  }

  function lineWastageCost(line: PurchaseLine) {
    if (line.wastageYN !== "Y") return 0;
    return (toNumber(line.goldWeight) / 8) * toNumber(line.goldCostRatePer8g);
  }

  function lineTotalCost(line: PurchaseLine) {
    return lineGoldCost(line) + lineWastageCost(line) + toNumber(line.labourCharges) + toNumber(line.otherCosts);
  }

  const tableTotals = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        acc.goldCost += lineGoldCost(line);
        acc.wastageCost += lineWastageCost(line);
        acc.labour += toNumber(line.labourCharges);
        acc.total += lineTotalCost(line);
        return acc;
      },
      { goldCost: 0, wastageCost: 0, labour: 0, total: 0 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, form.purchaseType]);

  function validate(): boolean {
    const next: Errors = {};
    const nextLineErrors: Record<string, Partial<Record<keyof PurchaseLine, string>>> = {};
    if (!form.transactionDate) next.transactionDate = "Required";
    if (!form.gsmCode.trim()) next.gsmCode = "Required";

    if (useTableLayout) {
      for (const line of lines) {
        const rowErrors: Partial<Record<keyof PurchaseLine, string>> = {};
        if (!line.categoryCode.trim()) rowErrors.categoryCode = "Required";
        if (!line.subcategoryCode.trim()) rowErrors.subcategoryCode = "Required";
        if (!line.carat) rowErrors.subcategoryCode = "Set carat";
        if (!isPositiveNumber(line.qty)) rowErrors.qty = "Valid qty";
        if (!isPositiveNumber(line.goldWeight)) rowErrors.goldWeight = "Valid weight";
        if (line.labourCharges.trim() !== "" && !isNonNegativeNumber(line.labourCharges)) {
          rowErrors.labourCharges = "Valid labour";
        }
        if (line.wastageYN === "Y") {
          const wastage = lineGeneratedWastage(line);
          if (!isNonNegativeNumber(wastage) || wastage.trim() === "") rowErrors.wastageMg = "Required";
        }
        if (Object.keys(rowErrors).length > 0) nextLineErrors[line.id] = rowErrors;
      }
    } else {
      if (!form.categoryCode.trim()) next.categoryCode = "Required";
      if (!form.subcategoryCode.trim()) next.subcategoryCode = "Required";
      if (!form.carat) next.subcategoryCode = "Set carat in this subcategory before saving";
      if (!isPositiveNumber(form.qty)) next.qty = "Enter a valid qty";
      if (!isPositiveNumber(form.goldWeight)) next.goldWeight = "Enter a valid gold weight";
      if (form.labourCharges.trim() !== "" && !isNonNegativeNumber(form.labourCharges))
        next.labourCharges = "Enter a valid labour charge";
      if (form.wastageYN === "Y") {
        if (!isNonNegativeNumber(form.wastageMg) || form.wastageMg.trim() === "")
          next.wastageMg = "Enter wastage (mg)";
      }
    }
    setErrors(next);
    setLineErrors(nextLineErrors);
    return Object.keys(next).length === 0 && Object.keys(nextLineErrors).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaveState("saving");
    try {
      if (useTableLayout && mode === "create") {
        for (const line of lines) {
          const payload = {
            ...form,
            ...line,
            wastageMg: lineGeneratedWastage(line),
            remarks: form.remarks,
            goldCost: lineGoldCost(line).toFixed(2),
            wastage: lineWastageCost(line).toFixed(2)
          };
          const res = await fetch(submitPath, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const json = (await res.json().catch(() => null)) as { error?: string } | null;
            throw new Error(json?.error ?? "Save failed");
          }
        }
        setSaveState("saved");
        setForm(emptyForm());
        setLines([emptyLine()]);
        router.push(redirectPath);
        return;
      }

      const payload = {
        ...form,
        goldCost: goldCostCalculated.toFixed(2),
        wastage: wastageCostCalculated.toFixed(2)
      };
      const res = await fetch(submitPath, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          mode === "edit" && receiptId
            ? { id: receiptId, ...payload, wastageYN: form.wastageYN === "Y" }
            : payload
        )
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "Save failed");
      }
      setSaveState("saved");
      setForm(emptyForm());
      router.push(redirectPath);
    } catch (e) {
      setSaveState("error");
      const message = e instanceof Error ? e.message : "Save failed. Please try again.";
      setErrors((prev) => ({ ...prev, form: message }));
    }
  }

  async function refreshSubcategories() {
    const subs = await fetch("/api/subcategories", { cache: "no-store" }).then((r) => r.json());
    setSubcategories(subs.subcategories ?? []);
  }

  async function refreshSystem() {
    const sys = await fetch("/api/system", { cache: "no-store" }).then((r) => r.json());
    const data = sys.data ?? null;
    setSystem({
      goldCostRatePer8g: Number(data?.goldCostRatePer8g ?? 0) || 0,
      wastageRateMgPer8g: Number(data?.wastageRateMgPer8g ?? 0) || 0
    });
    const nextSystemForm = {
      vatRate: String(data?.vatRate ?? ""),
      nslRate: String(data?.nslRate ?? ""),
      goldCostRatePer8g: String(data?.goldCostRatePer8g ?? ""),
      wastageRateMgPer8g: String(data?.wastageRateMgPer8g ?? "")
    };
    setSystemForm(nextSystemForm);
    setSavedSystemForm(nextSystemForm);
  }

  async function saveSystemData(e: React.FormEvent) {
    e.preventDefault();
    if (JSON.stringify(systemForm) === JSON.stringify(savedSystemForm)) {
      setSystemModalOpen(false);
      return;
    }
    setSystemSaveState("saving");
    try {
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(systemForm)
      });
      if (!res.ok) throw new Error("Save failed");
      setSystem({
        goldCostRatePer8g: Number(systemForm.goldCostRatePer8g ?? 0) || 0,
        wastageRateMgPer8g: Number(systemForm.wastageRateMgPer8g ?? 0) || 0
      });
      setSavedSystemForm(systemForm);
      setSystemSaveState("saved");
      setTimeout(() => setSystemSaveState("idle"), 1500);
      setSystemModalOpen(false);
    } catch {
      setSystemSaveState("error");
    }
  }

  async function addSubcategory(e: React.FormEvent) {
    e.preventDefault();
    setSubcatError("");
    const categoryCode = (subcatForm.categoryCode ?? "").trim();
    const name = (subcatForm.name ?? "").trim();
    const carat = normalizeCarat(subcatForm.carat);
    if (!categoryCode || !name || !carat) {
      setSubcatError("Category, subcategory name, and carat are required.");
      return;
    }
    setSubcatSaveState("saving");
    try {
      let imageUrl: string | null = null;
      if (subcatFile) {
        const formData = new FormData();
        formData.append("file", subcatFile);
        formData.append("folder", "jewelpack/subcategories");
        const uploadRes = await fetch("/api/cloudinary/upload", { method: "POST", body: formData });
        const uploadJson = (await uploadRes.json()) as { secure_url?: string; error?: string };
        if (!uploadRes.ok || !uploadJson.secure_url) {
          throw new Error(uploadJson.error ?? "Image upload failed");
        }
        imageUrl = uploadJson.secure_url;
      }

      const res = await fetch("/api/subcategories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryCode, name, carat, imageUrl })
      });
      const json = (await res.json()) as { subcategory?: { code: string } };
      if (!res.ok || !json?.subcategory?.code) throw new Error("Create failed");
      await refreshSubcategories();
      setForm((prev) => ({ ...prev, subcategoryCode: json.subcategory!.code, carat }));
      setSubcatSaveState("saved");
      setTimeout(() => setSubcatSaveState("idle"), 1500);
      setSubcategoryModalOpen(false);
    } catch {
      setSubcatSaveState("error");
      setSubcatError("Unable to add subcategory.");
    }
  }

  const pageTitle = title ?? (mode === "edit" ? "Edit Receipt" : "Add New Receipt");
  const pageDescription = description ?? "Capture inbound stock receipt details.";
  const saveButtonText = submitLabel ?? (mode === "edit" ? "Save Receipt" : "Save Receipt");
  const useTableLayout = layout === "table";

  return (
    <Card className={useTableLayout ? "min-w-0 overflow-hidden" : "max-w-5xl"}>
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{pageTitle}</CardTitle>
            <CardDescription>{pageDescription}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await refreshSystem();
                setSystemSaveState("idle");
                setSystemModalOpen(true);
              }}
              className="rounded-lg border border-ebony-300 bg-white px-3 py-2 text-xs font-semibold text-ebony-700 hover:bg-ebony-50 transition-all"
            >
              Edit System Data
            </button>
            <button
              type="button"
              onClick={() => {
                setSubcatError("");
                setSubcatSaveState("idle");
                setSubcatForm({ categoryCode: form.categoryCode || "", name: "", carat: "" });
                setSubcatFile(null);
                if (subcatPreviewUrl) URL.revokeObjectURL(subcatPreviewUrl);
                setSubcatPreviewUrl("");
                setSubcategoryModalOpen(true);
              }}
              className="rounded-lg bg-gold-600 px-3 py-2 text-xs font-semibold text-white hover:bg-gold-700 transition-all"
            >
              Add Subcategory
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={useTableLayout ? "min-w-0 overflow-hidden px-4 py-4" : undefined}>
        {loading ? (
          <div className="text-sm font-semibold text-slate-500">Loading...</div>
        ) : (
          <form
            id={formId}
            onSubmit={onSubmit}
            className={useTableLayout ? "space-y-6" : "grid gap-6 md:grid-cols-2"}
          >
            {errors.form && (
              <div className={useTableLayout ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" : "md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"}>
                {errors.form}
              </div>
            )}

            {useTableLayout ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-ebony-100 bg-white p-4 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                    <label className="space-y-1.5 text-sm">
                      <div className="text-xs font-bold text-ebony-800">Purchase Date *</div>
                      <input
                        type="date"
                        value={form.transactionDate}
                        onChange={(e) => update("transactionDate", e.target.value)}
                        className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                      />
                      {errors.transactionDate && <FieldError>{errors.transactionDate}</FieldError>}
                    </label>

                    <label className="space-y-1.5 text-sm">
                      <div className="text-xs font-bold text-ebony-800">Location</div>
                      <input
                        value={form.location}
                        onChange={(e) => update("location", e.target.value)}
                        placeholder="Main Branch"
                        className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                      />
                    </label>

                    <label className="space-y-1.5 text-sm">
                      <div className="text-xs font-bold text-ebony-800">GSM Code *</div>
                      <select
                        value={form.gsmCode}
                        onChange={(e) => setGsmCode(e.target.value)}
                        className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                      >
                        <option value="">Select...</option>
                        {goldsmiths.map((g) => (
                          <option key={g.code} value={g.code}>
                            {g.code}
                          </option>
                        ))}
                      </select>
                      {errors.gsmCode && <FieldError>{errors.gsmCode}</FieldError>}
                    </label>

                    <label className="space-y-1.5 text-sm">
                      <div className="text-xs font-bold text-ebony-800">GSM Name</div>
                      <input
                        readOnly
                        value={form.gsmName}
                        className="h-10 w-full rounded-md border border-ebony-200 bg-ebony-50 px-3 text-sm font-semibold text-ebony-700 outline-none"
                      />
                    </label>

                    <label className="space-y-1.5 text-sm">
                      <div className="text-xs font-bold text-ebony-800">Purchase Type</div>
                      <select
                        value={form.purchaseType}
                        onChange={(e) => update("purchaseType", e.target.value as "Gold" | "Rate")}
                        className="h-10 w-full rounded-md border border-ebony-200 bg-white px-3 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                      >
                        <option value="Gold">Gold</option>
                        <option value="Rate">Rate</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-ebony-100 bg-white shadow-sm">
                  <div className="max-w-full overflow-hidden">
                    <table className="w-full table-fixed text-[11px]">
                      <thead className="bg-ebony-50 text-left text-[10px] font-bold uppercase tracking-wide text-ebony-600">
                        <tr>
                          <th className="w-[3%] border border-ebony-100 px-1 py-1.5 text-center">#</th>
                          <th className="w-[11%] border border-ebony-100 px-1 py-1.5">Subcat *</th>
                          <th className="w-[15%] border border-ebony-100 px-1 py-1.5">Desc</th>
                          <th className="w-[5%] border border-ebony-100 px-1 py-1.5">K</th>
                          <th className="w-[5%] border border-ebony-100 px-1 py-1.5 text-right">Qty *</th>
                          <th className="w-[6%] border border-ebony-100 px-1 py-1.5">Wtg</th>
                          <th className="w-[7%] border border-ebony-100 px-1 py-1.5 text-right">Gold Wt *</th>
                          <th className="w-[7%] border border-ebony-100 px-1 py-1.5 text-right">Wtg Wt</th>
                          <th className="w-[7%] border border-ebony-100 px-1 py-1.5 text-right">Labour</th>
                          <th className="w-[8%] border border-ebony-100 px-1 py-1.5 text-right">Gold Cost</th>
                          <th className="w-[9%] border border-ebony-100 px-1 py-1.5 text-right">Wtg Cost</th>
                          <th className="w-[8%] border border-ebony-100 px-1 py-1.5 text-right">Total</th>
                          <th className="w-[4%] border border-ebony-100 px-1 py-1.5 text-center"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line, index) => {
                          const rowErrors = lineErrors[line.id] ?? {};
                          const generatedWastage = lineGeneratedWastage(line);
                          return (
                            <tr key={line.id} className="bg-white">
                              <td className="border border-ebony-100 px-1 py-1 text-center font-semibold text-ebony-700">
                                {index + 1}
                              </td>
                              <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                                <button
                                  type="button"
                                  onClick={() => openSubcategoryPicker(line.id)}
                                  className="h-8 w-full truncate border-0 bg-transparent px-1 text-left text-[11px] outline-none focus:bg-gold-50"
                                >
                                  {line.subcategoryCode || "Select item..."}
                                </button>
                                {rowErrors.subcategoryCode && <FieldError>{rowErrors.subcategoryCode}</FieldError>}
                              </td>
                              <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                                <input
                                  value={line.description}
                                  readOnly
                                  disabled
                                  placeholder="Item details"
                                  className="h-8 w-full cursor-not-allowed border-0 bg-ebony-50 px-1 text-[11px] font-semibold text-ebony-700 outline-none"
                                />
                              </td>
                              <td className="border border-ebony-100 bg-ebony-50 px-1 py-1 font-semibold text-ebony-800">
                                {line.carat || "-"}
                              </td>
                              <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                                <input
                                  inputMode="numeric"
                                  value={line.qty}
                                  onFocus={selectOnFocus}
                                  onChange={(e) => updateLine(line.id, "qty", sanitizeInt(e.target.value))}
                                  className="h-8 w-full border-0 bg-transparent px-1 text-right text-[11px] outline-none focus:bg-gold-50"
                                />
                                {rowErrors.qty && <FieldError>{rowErrors.qty}</FieldError>}
                              </td>
                              <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                                <select
                                  value={line.wastageYN}
                                  onChange={(e) => updateLine(line.id, "wastageYN", e.target.value as "Y" | "N")}
                                  className="h-8 w-full border-0 bg-transparent px-1 text-[11px] outline-none focus:bg-gold-50"
                                >
                                  <option value="N">N</option>
                                  <option value="Y">Y</option>
                                </select>
                              </td>
                              <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                                <input
                                  inputMode="decimal"
                                  value={line.goldWeight}
                                  onFocus={selectOnFocus}
                                  onKeyDown={(e) => {
                                    if (isWeightEditKey(e.key)) captureLatestRatesForLine(line.id);
                                  }}
                                  onPaste={() => captureLatestRatesForLine(line.id)}
                                  onChange={(e) => updateLine(line.id, "goldWeight", sanitizeDecimal(e.target.value))}
                                  className="h-8 w-full border-0 bg-transparent px-1 text-right text-[11px] outline-none focus:bg-gold-50"
                                />
                                {rowErrors.goldWeight && <FieldError>{rowErrors.goldWeight}</FieldError>}
                              </td>
                              <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                                <input
                                  inputMode="decimal"
                                  readOnly={form.purchaseType === "Gold"}
                                  disabled={line.wastageYN !== "Y"}
                                  value={generatedWastage}
                                  onFocus={selectOnFocus}
                                  onChange={(e) => updateLine(line.id, "wastageMg", sanitizeDecimal(e.target.value))}
                                  className="h-8 w-full border-0 bg-transparent px-1 text-right text-[11px] outline-none focus:bg-gold-50 disabled:bg-ebony-50 read-only:bg-ebony-50"
                                />
                                {rowErrors.wastageMg && <FieldError>{rowErrors.wastageMg}</FieldError>}
                              </td>
                              <td className="border border-ebony-100 p-0 focus-within:bg-gold-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gold-500">
                                <input
                                  inputMode="decimal"
                                  value={line.labourCharges}
                                  onFocus={selectOnFocus}
                                  onChange={(e) => updateLine(line.id, "labourCharges", sanitizeDecimal(e.target.value))}
                                  className="h-8 w-full border-0 bg-transparent px-1 text-right text-[11px] outline-none focus:bg-gold-50"
                                />
                                {rowErrors.labourCharges && <FieldError>{rowErrors.labourCharges}</FieldError>}
                              </td>
                              <td className="border border-ebony-100 px-1 py-1 text-right font-semibold tabular-nums text-ebony-800">
                                {lineGoldCost(line).toFixed(2)}
                              </td>
                              <td className="border border-ebony-100 px-1 py-1 text-right font-semibold tabular-nums text-ebony-800">
                                {lineWastageCost(line).toFixed(2)}
                              </td>
                              <td className="border border-ebony-100 px-1 py-1 text-right font-extrabold tabular-nums text-ebony-900">
                                {lineTotalCost(line).toFixed(2)}
                              </td>
                              <td className="border border-ebony-100 px-1 py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeLine(line.id)}
                                  disabled={lines.length === 1}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label="Remove row"
                                  title="Remove row"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex items-center gap-2 rounded-md border border-ebony-200 bg-white px-3 py-2 text-sm font-bold text-indigo-700 shadow-sm hover:bg-ebony-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
                  <label className="space-y-2 text-sm lg:self-end">
                    <div className="font-bold text-ebony-800">Notes</div>
                    <textarea
                      value={form.remarks}
                      onChange={(e) => update("remarks", e.target.value)}
                      placeholder="Any special remarks..."
                      className="min-h-24 w-full resize-y rounded-md border border-ebony-200 bg-white px-4 py-3 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
                    />
                  </label>

                  <div className="rounded-lg border border-ebony-100 bg-white shadow-sm">
                    {[
                      ["Gold Cost", tableTotals.goldCost.toFixed(2)],
                      ["Wastage Cost", tableTotals.wastageCost.toFixed(2)],
                      ["Labour Charges", tableTotals.labour.toFixed(2)]
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between border-b border-ebony-100 px-4 py-3 text-sm">
                        <span className="font-semibold text-ebony-700">{label}</span>
                        <span className="font-extrabold tabular-nums text-ebony-900">{value}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-4 py-4">
                      <span className="text-base font-extrabold text-red-600">Total Cost</span>
                      <span className="text-lg font-extrabold tabular-nums text-red-600">{tableTotals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={saveState === "saving"}
                    className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saveState === "saving" ? "Saving..." : saveButtonText}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(redirectPath)}
                    disabled={saveState === "saving"}
                    className="rounded-md bg-ebony-100 px-6 py-3 text-sm font-bold text-ebony-800 hover:bg-ebony-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  {saveState === "saved" && <span className="text-sm font-bold text-jewel-700">Saved</span>}
                  {saveState === "error" && <span className="text-sm font-bold text-red-600">Save failed</span>}
                </div>
              </div>
            ) : (
              <>
                <label className="space-y-2 text-sm">
                  <div className="font-bold text-ebony-700">Transaction Date</div>
                  <input
                    type="date"
                    value={form.transactionDate}
                    onChange={(e) => update("transactionDate", e.target.value)}
                    className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
                  />
                  {errors.transactionDate && <div className="text-xs text-red-600">{errors.transactionDate}</div>}
                </label>

                <label className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-ebony-700">Location</div>
                    <div className="text-xs font-semibold text-ebony-400">Optional</div>
                  </div>
                  <input
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    placeholder="Main Branch / Vault / Counter 1"
                    className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
                  />
                  {errors.location && <div className="text-xs text-red-600">{errors.location}</div>}
                </label>

                <label className="space-y-2 text-sm">
                  <div className="font-bold text-ebony-700">GSM Code</div>
                  <select
                    value={form.gsmCode}
                    onChange={(e) => setGsmCode(e.target.value)}
                    className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
                  >
                    <option value="">Select goldsmith...</option>
                    {goldsmiths.map((g) => (
                      <option key={g.code} value={g.code}>
                        {g.code}
                      </option>
                    ))}
                  </select>
                  {errors.gsmCode && <div className="text-xs text-red-600">{errors.gsmCode}</div>}
                </label>

                <label className="space-y-2 text-sm">
                  <div className="font-bold text-ebony-700">GSM Name</div>
                  <input
                    readOnly
                    value={form.gsmName}
                    className="w-full cursor-not-allowed rounded-lg border-2 border-gold-300 bg-cream-50 px-4 py-2.5 text-ebony-800 outline-none"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <div className="font-bold text-ebony-700">Category Code</div>
                  <select
                    value={form.categoryCode}
                    onChange={(e) => setCategoryCode(e.target.value)}
                    className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
                  >
                    <option value="">Select category...</option>
                    {categories.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  {errors.categoryCode && <div className="text-xs text-red-600">{errors.categoryCode}</div>}
                </label>

                <label className="space-y-2 text-sm">
                  <div className="font-bold text-ebony-700">Article Name</div>
                  <input
                    readOnly
                    value={form.articleName}
                    className="w-full cursor-not-allowed rounded-lg border-2 border-gold-300 bg-cream-50 px-4 py-2.5 text-ebony-800 outline-none"
                  />
                </label>

                <label className="space-y-2 text-sm md:col-span-2">
                  <div className="font-bold text-ebony-700">Subcategory</div>
                  <select
                    value={form.subcategoryCode}
                    onChange={(e) => setSubcategoryCode(e.target.value)}
                    disabled={!form.categoryCode}
                    className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30 disabled:opacity-60"
                  >
                    <option value="">
                      {form.categoryCode ? "Select subcategory..." : "Select category first"}
                    </option>
                    {filteredSubcategories.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code}
                      </option>
                    ))}
                  </select>
                  {errors.subcategoryCode && (
                    <div className="text-xs text-red-600">{errors.subcategoryCode}</div>
                  )}
                </label>

                <label className="space-y-2 text-sm">
                  <div className="font-bold text-ebony-700">Qty</div>
                  <input
                    inputMode="numeric"
                    value={form.qty}
                    onFocus={selectOnFocus}
                    onChange={(e) => update("qty", sanitizeInt(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
                  />
                  {errors.qty && <div className="text-xs text-red-600">{errors.qty}</div>}
                </label>

                <label className="space-y-2 text-sm">
                  <div className="font-bold text-ebony-700">Wastage (Y/N)</div>
                  <select
                    value={form.wastageYN}
                    onChange={(e) => update("wastageYN", e.target.value as "Y" | "N")}
                    className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
                  >
                    <option value="N">N</option>
                    <option value="Y">Y</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm">
                  <div className="font-bold text-ebony-700">Gold Weight</div>
                  <input
                    inputMode="decimal"
                    value={form.goldWeight}
                    onFocus={selectOnFocus}
                    onKeyDown={(e) => {
                      if (isWeightEditKey(e.key)) captureLatestRatesForForm();
                    }}
                    onPaste={captureLatestRatesForForm}
                    onChange={(e) => update("goldWeight", sanitizeDecimal(e.target.value))}
                    placeholder="grams"
                    className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
                  />
                  {errors.goldWeight && <div className="text-xs text-red-600">{errors.goldWeight}</div>}
                </label>

                <label className="space-y-2 text-sm">
                  <div className="font-bold text-ebony-700">Gold Cost</div>
                  <input
                    readOnly
                    value={goldCostCalculated.toFixed(2)}
                    className="w-full cursor-not-allowed rounded-lg border-2 border-gold-300 bg-cream-50 px-4 py-2.5 text-ebony-800 outline-none"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <div className="font-bold text-ebony-700">Wastage (mg)</div>
                  <input
                    inputMode="decimal"
                    disabled={form.wastageYN !== "Y"}
                    value={form.wastageMg}
                    onFocus={selectOnFocus}
                    onChange={(e) => update("wastageMg", sanitizeDecimal(e.target.value))}
                    placeholder={form.wastageYN === "Y" ? "0" : "Enable wastage to enter"}
                    className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30 disabled:opacity-60"
                  />
                  {errors.wastageMg && <div className="text-xs text-red-600">{errors.wastageMg}</div>}
                </label>

                <label className="space-y-2 text-sm">
                  <div className="font-bold text-ebony-700">Wastage Cost</div>
                  <input
                    readOnly
                    value={wastageCostCalculated.toFixed(2)}
                    className="w-full cursor-not-allowed rounded-lg border-2 border-gold-300 bg-cream-50 px-4 py-2.5 text-ebony-800 outline-none"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <div className="font-bold text-ebony-700">Labour Charges</div>
                  <input
                    inputMode="decimal"
                    value={form.labourCharges}
                    onFocus={selectOnFocus}
                    onChange={(e) => update("labourCharges", sanitizeDecimal(e.target.value))}
                    placeholder="0.00"
                    className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
                  />
                  {errors.labourCharges && <div className="text-xs text-red-600">{errors.labourCharges}</div>}
                </label>

                <label className="space-y-2 text-sm">
                  <div className="font-bold text-ebony-700">Other Costs</div>
                  <input
                    inputMode="decimal"
                    value={form.otherCosts}
                    onFocus={selectOnFocus}
                    onChange={(e) => update("otherCosts", sanitizeDecimal(e.target.value))}
                    placeholder="0.00"
                    className="w-full rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <div className="font-bold text-ebony-700">Total Cost</div>
                  <input
                    readOnly
                    value={totalCost.toFixed(2)}
                    className="w-full cursor-not-allowed rounded-lg border-2 border-gold-400 bg-gradient-gold px-4 py-2.5 font-bold text-gold-700 outline-none"
                  />
                </label>

                <label className="space-y-2 text-sm md:col-span-2">
                  <div className="font-bold text-ebony-700">Remarks</div>
                  <textarea
                    value={form.remarks}
                    onChange={(e) => update("remarks", e.target.value)}
                    placeholder="Any special remarks..."
                    className="min-h-28 w-full resize-y rounded-lg border-2 border-gold-300 bg-white px-4 py-2.5 outline-none transition-all focus:bg-cream-50 focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30"
                  />
                </label>

                <div className="md:col-span-2 flex items-center justify-end gap-3 pt-4">
                  {saveState === "saved" && <span className="text-sm font-bold text-jewel-700">Saved</span>}
                  {saveState === "error" && <span className="text-sm font-bold text-red-600">Save failed</span>}
                  <button
                    type="submit"
                    disabled={saveState === "saving"}
                    className="rounded-lg bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-2.5 text-sm font-bold text-ebony-900 shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saveState === "saving" ? "Saving..." : saveButtonText}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </CardContent>

      <Modal
        open={subcategoryPickerOpen}
        onClose={closeSubcategoryPicker}
        title="Select Subcategory"
        panelClassName="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ebony-500" />
            <input
              autoFocus
              value={subcategorySearch}
              onChange={(e) => setSubcategorySearch(e.target.value)}
              onKeyDown={handleSubcategoryPickerKeyDown}
              placeholder="Search by code, description, category, or karat..."
              className="h-11 w-full rounded-lg border border-ebony-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </div>

          <div className="max-h-[48vh] overflow-auto rounded-lg border border-ebony-100">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="sticky top-0 bg-ebony-50 text-left text-[11px] font-bold uppercase tracking-wide text-ebony-600">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Karat</th>
                  <th className="px-4 py-3">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-100">
                {subcategoriesSorted.map((item, index) => {
                  const isActive = index === subcategoryPickerIndex;
                  return (
                    <tr
                      key={item.code}
                      tabIndex={0}
                      onClick={() => selectSubcategory(item.code)}
                      onMouseEnter={() => setSubcategoryPickerIndex(index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          selectSubcategory(item.code);
                        }
                      }}
                      className={[
                        "cursor-pointer bg-white outline-none hover:bg-cream-50",
                        isActive ? "bg-gold-100/60" : ""
                      ].join(" ")}
                    >
                      <td className="px-4 py-3 font-bold text-ebony-900">{item.code}</td>
                      <td className="px-4 py-3 text-ebony-700">{item.name}</td>
                      <td className="px-4 py-3 font-semibold text-ebony-800">{normalizeCarat(item.carat) || "-"}</td>
                      <td className="px-4 py-3 text-ebony-700">{item.categoryCode}</td>
                    </tr>
                  );
                })}
                {subcategoriesSorted.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm font-semibold text-ebony-600" colSpan={4}>
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

      <Modal open={systemModalOpen} onClose={() => setSystemModalOpen(false)} title="System Data">
        <form onSubmit={saveSystemData} className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">VAT Rate</div>
            <input
              inputMode="decimal"
              value={systemForm.vatRate}
              onChange={(e) => setSystemForm((p) => ({ ...p, vatRate: e.target.value }))}
              placeholder="e.g. 18"
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">NSL Rate</div>
            <input
              inputMode="decimal"
              value={systemForm.nslRate}
              onChange={(e) => setSystemForm((p) => ({ ...p, nslRate: sanitizeDecimal(e.target.value) }))}
              placeholder="e.g. 2.5"
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Gold Cost Rate (per 8 grams)</div>
            <input
              inputMode="decimal"
              value={systemForm.goldCostRatePer8g}
              onChange={(e) => setSystemForm((p) => ({ ...p, goldCostRatePer8g: sanitizeDecimal(e.target.value) }))}
              placeholder="e.g. 0.00"
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Wastage Rate (mg per 8 grams)</div>
            <input
              inputMode="decimal"
              value={systemForm.wastageRateMgPer8g}
              onChange={(e) => setSystemForm((p) => ({ ...p, wastageRateMgPer8g: sanitizeDecimal(e.target.value) }))}
              placeholder="e.g. 0"
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
            {systemSaveState === "error" && (
              <span className="text-sm font-semibold text-red-600">Save failed</span>
            )}
            <button
              type="button"
              onClick={() => setSystemModalOpen(false)}
              className="rounded-lg border border-ebony-300 bg-white px-5 py-2.5 text-sm font-semibold text-ebony-700 hover:bg-ebony-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={systemSaveState === "saving"}
              className="rounded-lg bg-gold-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gold-700 transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {systemSaveState === "saving" ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={subcategoryModalOpen} onClose={() => setSubcategoryModalOpen(false)} title="Add Subcategory">
        <form onSubmit={addSubcategory} className="grid gap-5">
          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Category</div>
            <select
              value={subcatForm.categoryCode}
              onChange={(e) => setSubcatForm((p) => ({ ...p, categoryCode: e.target.value }))}
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Subcategory Name</div>
            <input
              value={subcatForm.name}
              onChange={(e) => setSubcatForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Bangles, Rings, Chains"
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <div className="font-semibold text-ebony-700">Carat</div>
            <select
              value={subcatForm.carat}
              onChange={(e) => setSubcatForm((p) => ({ ...p, carat: e.target.value }))}
              className="w-full rounded-lg border border-ebony-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-gold-500 focus:ring-2 focus:ring-gold-400/20"
            >
              <option value="">Select carat...</option>
              {CARAT_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-ebony-700">Image</div>
                <div className="text-xs font-semibold text-ebony-400">Optional</div>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const next = e.target.files?.[0] ?? null;
                  setSubcatFile(next);
                  if (subcatPreviewUrl) URL.revokeObjectURL(subcatPreviewUrl);
                  setSubcatPreviewUrl(next ? URL.createObjectURL(next) : "");
                }}
                className="w-full text-sm"
              />
            </label>
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold text-ebony-700">Preview</div>
              <div className="h-14 w-14 overflow-hidden rounded-xl bg-ebony-50 ring-1 ring-ebony-200">
                {subcatPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={subcatPreviewUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : null}
              </div>
            </div>
          </div>

          {subcatError && <div className="text-sm font-semibold text-red-600">{subcatError}</div>}
          {subcatSaveState === "error" && (
            <div className="text-sm font-semibold text-red-600">Save failed</div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setSubcategoryModalOpen(false)}
              className="rounded-lg border border-ebony-300 bg-white px-5 py-2.5 text-sm font-semibold text-ebony-700 hover:bg-ebony-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={subcatSaveState === "saving"}
              className="rounded-lg bg-gold-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gold-700 transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {subcatSaveState === "saving" ? "Saving..." : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 truncate text-[10px] font-semibold text-red-600">{children}</div>;
}

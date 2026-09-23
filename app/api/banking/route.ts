import { Prisma } from "@/lib/generated/prisma";
import { POSTING_SOURCE, deleteDoubleEntryPosting, postBankingDoubleEntry } from "@/lib/double-entry";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AccountType = "DR" | "CR" | "GL";

function cleanDate(value: string | null | undefined) {
  const date = (value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
  return date;
}

function dateFromISO(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function decimal(value: unknown) {
  const amount = new Prisma.Decimal(String(value ?? "").trim() || "0");
  if (amount.isNegative()) throw new Error("Amounts cannot be negative");
  return amount;
}

function accountType(value: unknown): AccountType {
  const type = String(value ?? "").trim().toUpperCase();
  if (type !== "DR" && type !== "CR" && type !== "GL") throw new Error("Type must be DR, CR, or GL");
  return type;
}

function isBankAccountNumber(accountNumber: string) {
  const n = Number(accountNumber);
  return Number.isInteger(n) && n >= 6006 && n <= 6025;
}

function entryJson(entry: {
  id: number;
  date: Date;
  bankAccountId: number;
  bankAccountNo: string;
  bankAccountName: string;
  accountType: string;
  accountId: number;
  accountNo: string;
  accountName: string;
  memo: string | null;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: entry.id,
    date: entry.date.toISOString().slice(0, 10),
    bankAccountId: entry.bankAccountId,
    bankAccountNo: entry.bankAccountNo,
    bankAccountName: entry.bankAccountName,
    accountType: entry.accountType,
    accountId: entry.accountId,
    accountNo: entry.accountNo,
    accountName: entry.accountName,
    memo: entry.memo ?? "",
    debit: entry.debit.toFixed(2),
    credit: entry.credit.toFixed(2),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString()
  };
}

async function balanceMap(accountNumbers: string[]) {
  const clean = accountNumbers.filter(Boolean);
  if (clean.length === 0) return new Map<string, Prisma.Decimal>();
  const grouped = await prisma.transaction.groupBy({
    by: ["accountNumber"],
    where: { accountNumber: { in: clean } },
    _sum: { debit: true, credit: true }
  });
  return grouped.reduce((map, row) => {
    if (!row.accountNumber) return map;
    const debit = row._sum.debit ?? new Prisma.Decimal(0);
    const credit = row._sum.credit ?? new Prisma.Decimal(0);
    map.set(row.accountNumber, debit.minus(credit));
    return map;
  }, new Map<string, Prisma.Decimal>());
}

async function bankAccounts() {
  const accounts = await prisma.generalLedgerAccount.findMany({
    orderBy: [{ accountNumber: "asc" }, { name: "asc" }],
    select: { id: true, accountNumber: true, name: true }
  });
  const banks = accounts.filter((account) => isBankAccountNumber(account.accountNumber));
  const balances = await balanceMap(banks.map((account) => account.accountNumber));
  return banks.map((account) => ({
    id: account.id,
    accountNo: account.accountNumber,
    accountName: account.name,
    balance: balances.get(account.accountNumber)?.toFixed(2) ?? "0.00"
  }));
}

async function resolveBankAccount(bankAccountId: number) {
  if (!Number.isFinite(bankAccountId)) throw new Error("Select a bank");
  const bank = await prisma.generalLedgerAccount.findUnique({
    where: { id: bankAccountId },
    select: { id: true, accountNumber: true, name: true }
  });
  if (!bank || !isBankAccountNumber(bank.accountNumber)) {
    throw new Error("Selected account is not a bank account in range 6006-6025");
  }
  return { bankAccountId: bank.id, bankAccountNo: bank.accountNumber, bankAccountName: bank.name };
}

async function resolveAccount(type: AccountType, accountId: number) {
  if (!Number.isFinite(accountId)) throw new Error("Select an account");

  if (type === "DR") {
    const customer = await prisma.customer.findUnique({
      where: { id: accountId },
      select: { id: true, accountNumber: true, name: true }
    });
    if (!customer?.accountNumber) throw new Error("Customer account not found");
    return { accountId: customer.id, accountNo: customer.accountNumber, accountName: customer.name };
  }

  if (type === "CR") {
    const supplier = await prisma.supplier.findUnique({
      where: { id: accountId },
      select: { id: true, accountNumber: true, name: true }
    });
    if (!supplier) throw new Error("Supplier account not found");
    const accountNo = supplier.accountNumber ?? `SUP-${String(supplier.id).padStart(4, "0")}`;
    if (!supplier.accountNumber) {
      await prisma.supplier.update({ where: { id: supplier.id }, data: { accountNumber: accountNo } });
    }
    return { accountId: supplier.id, accountNo, accountName: supplier.name };
  }

  const gl = await prisma.generalLedgerAccount.findUnique({
    where: { id: accountId },
    select: { id: true, accountNumber: true, name: true }
  });
  if (!gl) throw new Error("General ledger account not found");
  return { accountId: gl.id, accountNo: gl.accountNumber, accountName: gl.name };
}

function bankTransactionPayload(data: {
  id?: number;
  date: Date;
  bankAccountNo: string;
  bankAccountName: string;
  memo: string | null;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
}) {
  return {
    date: data.date,
    source: POSTING_SOURCE.BANKING,
    account: data.bankAccountName,
    memo: data.memo || "Banking",
    debit: data.debit,
    credit: data.credit,
    accountNumber: data.bankAccountNo,
    type: "BANKING_BANK",
    referenceNumber: data.id ? `BN-${data.id}` : undefined,
    remarks: data.memo
  };
}

function accountTransactionPayload(data: {
  id?: number;
  date: Date;
  accountNo: string;
  accountName: string;
  memo: string | null;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
}) {
  return {
    date: data.date,
    source: POSTING_SOURCE.BANKING,
    account: data.accountName,
    memo: data.memo || "Banking",
    debit: data.credit,
    credit: data.debit,
    accountNumber: data.accountNo,
    type: "BANKING_ACCOUNT",
    referenceNumber: data.id ? `BN-${data.id}` : undefined,
    remarks: data.memo
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const selectedDate = cleanDate(url.searchParams.get("date"));
    const selected = dateFromISO(selectedDate);
    const banks = await bankAccounts();
    const bankAccountIdRaw = Number(url.searchParams.get("bankAccountId"));
    const selectedBank =
      banks.find((bank) => bank.id === bankAccountIdRaw) ??
      banks[0] ??
      null;

    if (!selectedBank) {
      return NextResponse.json({
        banks,
        selectedBank: null,
        entries: [],
        totals: { dayDebit: "0.00", dayCredit: "0.00", opening: "0.00", closing: "0.00" }
      });
    }

    const [entries, dayTotals, openingTotals] = await Promise.all([
      prisma.bankingEntry.findMany({
        where: { date: selected, bankAccountId: selectedBank.id },
        orderBy: { id: "asc" }
      }),
      prisma.bankingEntry.aggregate({
        where: { date: selected, bankAccountId: selectedBank.id },
        _sum: { debit: true, credit: true }
      }),
      prisma.transaction.aggregate({
        where: { date: { lt: selected }, accountNumber: selectedBank.accountNo },
        _sum: { debit: true, credit: true }
      })
    ]);

    const dayDebit = dayTotals._sum.debit ?? new Prisma.Decimal(0);
    const dayCredit = dayTotals._sum.credit ?? new Prisma.Decimal(0);
    const opening = (openingTotals._sum.debit ?? new Prisma.Decimal(0)).minus(
      openingTotals._sum.credit ?? new Prisma.Decimal(0)
    );
    const closing = opening.plus(dayDebit).minus(dayCredit);

    return NextResponse.json({
      banks,
      selectedBank,
      entries: entries.map(entryJson),
      totals: {
        dayDebit: dayDebit.toFixed(2),
        dayCredit: dayCredit.toFixed(2),
        opening: opening.toFixed(2),
        closing: closing.toFixed(2)
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load banking";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      date: string;
      bankAccountId: number;
      accountType: string;
      accountId: number;
      memo: string;
      debit: string;
      credit: string;
    }>;
    const date = dateFromISO(cleanDate(body.date));
    const bank = await resolveBankAccount(Number(body.bankAccountId));
    const type = accountType(body.accountType);
    const account = await resolveAccount(type, Number(body.accountId));
    const debit = decimal(body.debit);
    const credit = decimal(body.credit);
    if (debit.equals(0) && credit.equals(0)) throw new Error("Enter bank debit or bank credit");
    if (debit.greaterThan(0) && credit.greaterThan(0)) throw new Error("Use either debit or credit, not both");
    if (type === "GL" && account.accountNo === bank.bankAccountNo) throw new Error("Choose a different account");
    const memo = (body.memo ?? "").trim() || null;

    const entry = await prisma.$transaction(async (tx) => {
      const bankTx = await tx.transaction.create({
        data: bankTransactionPayload({ date, ...bank, memo, debit, credit })
      });
      const accountTx = await tx.transaction.create({
        data: accountTransactionPayload({ date, ...account, memo, debit, credit })
      });
      const created = await tx.bankingEntry.create({
        data: {
          date,
          ...bank,
          accountType: type,
          ...account,
          memo,
          debit,
          credit,
          bankTransactionId: bankTx.id,
          accountTransactionId: accountTx.id
        }
      });
      await tx.transaction.updateMany({
        where: { id: { in: [bankTx.id, accountTx.id] } },
        data: { referenceNumber: `BN-${created.id}` }
      });
      await postBankingDoubleEntry(tx, {
        bankingEntryId: created.id,
        bankTransactionId: bankTx.id,
        accountTransactionId: accountTx.id,
        date,
        bankAccountNo: bank.bankAccountNo,
        bankAccountName: bank.bankAccountName,
        accountNo: account.accountNo,
        accountName: account.accountName,
        bankDebit: debit,
        bankCredit: credit,
        memo,
        remarks: memo
      });
      return created;
    });

    return NextResponse.json({ entry: entryJson(entry) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to save banking entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      id: number;
      date: string;
      bankAccountId: number;
      accountType: string;
      accountId: number;
      memo: string;
      debit: string;
      credit: string;
    }>;
    const id = Number(body.id);
    if (!Number.isFinite(id)) throw new Error("Invalid banking entry");
    const date = dateFromISO(cleanDate(body.date));
    const bank = await resolveBankAccount(Number(body.bankAccountId));
    const type = accountType(body.accountType);
    const account = await resolveAccount(type, Number(body.accountId));
    const debit = decimal(body.debit);
    const credit = decimal(body.credit);
    if (debit.equals(0) && credit.equals(0)) throw new Error("Enter bank debit or bank credit");
    if (debit.greaterThan(0) && credit.greaterThan(0)) throw new Error("Use either debit or credit, not both");
    if (type === "GL" && account.accountNo === bank.bankAccountNo) throw new Error("Choose a different account");
    const memo = (body.memo ?? "").trim() || null;

    const entry = await prisma.$transaction(async (tx) => {
      const existing = await tx.bankingEntry.findUnique({ where: { id } });
      if (!existing) throw new Error("Banking entry not found");
      let bankTransactionId = existing.bankTransactionId;
      let accountTransactionId = existing.accountTransactionId;

      if (bankTransactionId) {
        await tx.transaction.update({
          where: { id: bankTransactionId },
          data: bankTransactionPayload({ id, date, ...bank, memo, debit, credit })
        });
      } else {
        const bankTx = await tx.transaction.create({
          data: bankTransactionPayload({ id, date, ...bank, memo, debit, credit })
        });
        bankTransactionId = bankTx.id;
      }

      if (accountTransactionId) {
        await tx.transaction.update({
          where: { id: accountTransactionId },
          data: accountTransactionPayload({ id, date, ...account, memo, debit, credit })
        });
      } else {
        const accountTx = await tx.transaction.create({
          data: accountTransactionPayload({ id, date, ...account, memo, debit, credit })
        });
        accountTransactionId = accountTx.id;
      }

      const updated = await tx.bankingEntry.update({
        where: { id },
        data: {
          date,
          ...bank,
          accountType: type,
          ...account,
          memo,
          debit,
          credit,
          bankTransactionId,
          accountTransactionId
        }
      });
      await postBankingDoubleEntry(tx, {
        bankingEntryId: id,
        bankTransactionId,
        accountTransactionId,
        date,
        bankAccountNo: bank.bankAccountNo,
        bankAccountName: bank.bankAccountName,
        accountNo: account.accountNo,
        accountName: account.accountName,
        bankDebit: debit,
        bankCredit: credit,
        memo,
        remarks: memo
      });
      return updated;
    });

    return NextResponse.json({ entry: entryJson(entry) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update banking entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!Number.isFinite(id)) throw new Error("Invalid banking entry");
    const existing = await prisma.bankingEntry.findUnique({
      where: { id },
      select: { bankTransactionId: true, accountTransactionId: true }
    });
    await prisma.$transaction(async (tx) => {
      await tx.bankingEntry.delete({ where: { id } });
      await deleteDoubleEntryPosting(tx, `B:BN-${id}`);
      const ids = [existing?.bankTransactionId, existing?.accountTransactionId].filter(
        (value): value is number => Number.isFinite(value)
      );
      if (ids.length) await tx.transaction.deleteMany({ where: { id: { in: ids } } });
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to delete banking entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

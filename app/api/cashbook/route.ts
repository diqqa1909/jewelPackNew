import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AccountType = "DR" | "CR" | "GL";

function cleanDate(value: string | null | undefined) {
  const date = (value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
  return date;
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

function dateFromISO(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function entryJson(entry: {
  id: number;
  date: Date;
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

async function postTransaction(data: {
  id?: number | null;
  date: Date;
  type: AccountType;
  accountNo: string;
  accountName: string;
  memo: string | null;
  cashDebit: Prisma.Decimal;
  cashCredit: Prisma.Decimal;
}) {
  const amountDebit = data.cashCredit;
  const amountCredit = data.cashDebit;
  const payload = {
    date: data.date,
    source: "CASHBOOK",
    account: data.accountName,
    memo: data.memo || `Cashbook ${data.type}`,
    debit: amountDebit,
    credit: amountCredit,
    accountNumber: data.accountNo,
    type: `CASHBOOK_${data.type}`,
    referenceNumber: data.id ? `CB-${data.id}` : undefined,
    remarks: data.memo
  };

  if (data.id) {
    return prisma.transaction.update({ where: { id: data.id }, data: payload });
  }
  return prisma.transaction.create({ data: payload });
}

async function deletePostedTransaction(transactionId: number | null) {
  if (!transactionId) return;
  await prisma.transaction.delete({ where: { id: transactionId } }).catch(() => null);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");

    if (mode === "accounts") {
      const type = accountType(url.searchParams.get("type"));
      const q = (url.searchParams.get("q") ?? "").trim();
      const where = q
        ? {
            OR: [
              { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { accountNumber: { contains: q, mode: Prisma.QueryMode.insensitive } }
            ]
          }
        : {};

      if (type === "DR") {
        const customers = await prisma.customer.findMany({
          where: { ...where, accountNumber: { not: null } },
          orderBy: { name: "asc" },
          take: 50,
          select: { id: true, accountNumber: true, name: true, phone: true }
        });
        const balances = await balanceMap(customers.map((account) => account.accountNumber ?? ""));
        return NextResponse.json({
          accounts: customers.map((account) => ({
            id: account.id,
            accountNo: account.accountNumber,
            accountName: account.name,
            detail: account.phone,
            balance: balances.get(account.accountNumber ?? "")?.toFixed(2) ?? "0.00"
          }))
        });
      }

      if (type === "GL") {
        const accounts = await prisma.generalLedgerAccount.findMany({
          where,
          orderBy: { name: "asc" },
          take: 50,
          select: { id: true, accountNumber: true, name: true }
        });
        const balances = await balanceMap(accounts.map((account) => account.accountNumber));
        return NextResponse.json({
          accounts: accounts.map((account) => ({
            id: account.id,
            accountNo: account.accountNumber,
            accountName: account.name,
            detail: "General ledger",
            balance: balances.get(account.accountNumber)?.toFixed(2) ?? "0.00"
          }))
        });
      }

      const suppliers = await prisma.supplier.findMany({
        where,
        orderBy: { name: "asc" },
        take: 50,
        select: { id: true, accountNumber: true, name: true, phone: true, contact: true }
      });
      const supplierRows = suppliers.map((account) => ({
        ...account,
        accountNo: account.accountNumber ?? `SUP-${String(account.id).padStart(4, "0")}`
      }));
      const balances = await balanceMap(supplierRows.map((account) => account.accountNo));
      return NextResponse.json({
        accounts: supplierRows.map((account) => ({
          id: account.id,
          accountNo: account.accountNo,
          accountName: account.name,
          detail: account.phone ?? account.contact,
          balance: balances.get(account.accountNo)?.toFixed(2) ?? "0.00"
        }))
      });
    }

    const selectedDate = cleanDate(url.searchParams.get("date"));
    const selected = dateFromISO(selectedDate);

    const [entries, dayTotals, openingTotals] = await Promise.all([
      prisma.cashBookEntry.findMany({
        where: { date: selected },
        orderBy: { id: "asc" }
      }),
      prisma.cashBookEntry.aggregate({
        where: { date: selected },
        _sum: { debit: true, credit: true }
      }),
      prisma.cashBookEntry.aggregate({
        where: { date: { lt: selected } },
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
      entries: entries.map(entryJson),
      totals: {
        dayDebit: dayDebit.toFixed(2),
        dayCredit: dayCredit.toFixed(2),
        opening: opening.toFixed(2),
        closing: closing.toFixed(2)
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load cashbook";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      mode: string;
      date: string;
      accountType: string;
      accountId: number;
      name: string;
      phone: string;
      contact: string;
      memo: string;
      debit: string;
      credit: string;
    }>;

    if (body.mode === "account") {
      const type = accountType(body.accountType);
      const name = (body.name ?? "").trim();
      if (!name) throw new Error("Name is required");

      if (type === "DR") {
        const account = await prisma.$transaction(async (tx) => {
          const created = await tx.customer.create({
            data: { name, phone: (body.phone ?? "").trim() || null }
          });
          const accountNumber = `CUST-${String(created.id).padStart(4, "0")}`;
          return tx.customer.update({ where: { id: created.id }, data: { accountNumber } });
        });
        return NextResponse.json({
          account: {
            id: account.id,
            accountNo: account.accountNumber,
            accountName: account.name,
            detail: account.phone,
            balance: "0.00"
          }
        });
      }

      if (type === "CR") {
        const account = await prisma.$transaction(async (tx) => {
          const created = await tx.supplier.create({
            data: {
              name,
              contact: (body.contact ?? "").trim() || null,
              phone: (body.phone ?? "").trim() || null
            }
          });
          const accountNumber = `SUP-${String(created.id).padStart(4, "0")}`;
          return tx.supplier.update({ where: { id: created.id }, data: { accountNumber } });
        });
        return NextResponse.json({
          account: {
            id: account.id,
            accountNo: account.accountNumber,
            accountName: account.name,
            detail: account.phone ?? account.contact,
            balance: "0.00"
          }
        });
      }

      const created = await prisma.generalLedgerAccount.create({
        data: {
          accountNumber: `GL-${Date.now()}`,
          name
        }
      });
      return NextResponse.json({
        account: {
          id: created.id,
          accountNo: created.accountNumber,
          accountName: created.name,
          detail: "General ledger",
          balance: "0.00"
        }
      });
    }

    const type = accountType(body.accountType);
    const date = dateFromISO(cleanDate(body.date));
    const account = await resolveAccount(type, Number(body.accountId));
    const debit = decimal(body.debit);
    const credit = decimal(body.credit);
    if (debit.equals(0) && credit.equals(0)) throw new Error("Enter debit or credit");
    if (debit.greaterThan(0) && credit.greaterThan(0)) throw new Error("Use either debit or credit, not both");

    const memo = (body.memo ?? "").trim() || null;
    const entry = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          date,
          source: "CASHBOOK",
          account: account.accountName,
          memo: memo || `Cashbook ${type}`,
          debit: credit,
          credit: debit,
          accountNumber: account.accountNo,
          type: `CASHBOOK_${type}`,
          remarks: memo
        }
      });
      const created = await tx.cashBookEntry.create({
        data: {
          date,
          accountType: type,
          accountId: account.accountId,
          accountNo: account.accountNo,
          accountName: account.accountName,
          memo,
          debit,
          credit,
          transactionId: transaction.id
        }
      });
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { referenceNumber: `CB-${created.id}` }
      });
      return created;
    });

    return NextResponse.json({ entry: entryJson(entry) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to save cashbook entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      id: number;
      date: string;
      accountType: string;
      accountId: number;
      memo: string;
      debit: string;
      credit: string;
    }>;
    const id = Number(body.id);
    if (!Number.isFinite(id)) throw new Error("Invalid entry");

    const type = accountType(body.accountType);
    const date = dateFromISO(cleanDate(body.date));
    const account = await resolveAccount(type, Number(body.accountId));
    const debit = decimal(body.debit);
    const credit = decimal(body.credit);
    if (debit.equals(0) && credit.equals(0)) throw new Error("Enter debit or credit");
    if (debit.greaterThan(0) && credit.greaterThan(0)) throw new Error("Use either debit or credit, not both");

    const memo = (body.memo ?? "").trim() || null;
    const entry = await prisma.$transaction(async (tx) => {
      const existing = await tx.cashBookEntry.findUnique({ where: { id } });
      if (!existing) throw new Error("Cashbook entry not found");
      let transactionId = existing.transactionId;
      if (transactionId) {
        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            date,
            source: "CASHBOOK",
            account: account.accountName,
            memo: memo || `Cashbook ${type}`,
            debit: credit,
            credit: debit,
            accountNumber: account.accountNo,
            type: `CASHBOOK_${type}`,
            referenceNumber: `CB-${id}`,
            remarks: memo
          }
        });
      } else {
        const transaction = await tx.transaction.create({
          data: {
            date,
            source: "CASHBOOK",
            account: account.accountName,
            memo: memo || `Cashbook ${type}`,
            debit: credit,
            credit: debit,
            accountNumber: account.accountNo,
            type: `CASHBOOK_${type}`,
            referenceNumber: `CB-${id}`,
            remarks: memo
          }
        });
        transactionId = transaction.id;
      }
      return tx.cashBookEntry.update({
        where: { id },
        data: {
          date,
          accountType: type,
          accountId: account.accountId,
          accountNo: account.accountNo,
          accountName: account.accountName,
          memo,
          debit,
          credit,
          transactionId
        }
      });
    });

    return NextResponse.json({ entry: entryJson(entry) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update cashbook entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!Number.isFinite(id)) throw new Error("Invalid entry");
    const existing = await prisma.cashBookEntry.findUnique({
      where: { id },
      select: { transactionId: true }
    });
    await prisma.$transaction(async (tx) => {
      await tx.cashBookEntry.delete({ where: { id } });
      if (existing?.transactionId) {
        await tx.transaction.delete({ where: { id: existing.transactionId } }).catch(() => null);
      }
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to delete cashbook entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

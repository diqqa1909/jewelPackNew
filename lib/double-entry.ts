import { Prisma } from "@/lib/generated/prisma";

export const POSTING_SOURCE = {
  CASHBOOK: "C",
  PURCHASES: "P",
  BANKING: "B",
  SALES: "S",
  GOLD: "G"
} as const;

export type PostingSource = (typeof POSTING_SOURCE)[keyof typeof POSTING_SOURCE];

type TxClient = Prisma.TransactionClient;

type SystemAccountKey =
  | "SALES_ACCOUNT"
  | "PURCHASES_ACCOUNT"
  | "DEBTORS_CONTROL_ACCOUNT"
  | "CREDITORS_CONTROL_ACCOUNT"
  | "CASHBOOK_ACCOUNT";

type AccountRef = {
  accountNumber: string;
  accountName: string;
};

type PostingLine = AccountRef & {
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  memo?: string | null;
  type?: string | null;
  sourceTransactionId?: number | null;
  remarks?: string | null;
};

function zero() {
  return new Prisma.Decimal("0");
}

function decimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value);
}

function assertOneSided(line: PostingLine) {
  if (line.debit.isNegative() || line.credit.isNegative()) {
    throw new Error("Double-entry postings cannot contain negative amounts");
  }
  const hasDebit = line.debit.greaterThan(zero());
  const hasCredit = line.credit.greaterThan(zero());
  if (hasDebit === hasCredit) {
    throw new Error("Each double-entry posting row must contain either debit or credit");
  }
}

function assertBalanced(lines: PostingLine[]) {
  if (lines.length < 2) throw new Error("A double-entry posting requires at least two rows");
  const totals = lines.reduce(
    (sum, line) => {
      assertOneSided(line);
      return {
        debit: sum.debit.plus(line.debit),
        credit: sum.credit.plus(line.credit)
      };
    },
    { debit: zero(), credit: zero() }
  );
  if (!totals.debit.equals(totals.credit)) {
    throw new Error(`Unbalanced double-entry posting: debit ${totals.debit.toFixed(2)} credit ${totals.credit.toFixed(2)}`);
  }
}

export async function deleteDoubleEntryPosting(tx: TxClient, postingKey: string) {
  await tx.doubleTransaction.deleteMany({ where: { postingKey } });
}

export async function replaceDoubleEntryPosting(
  tx: TxClient,
  data: {
    postingKey: string;
    date: Date;
    source: PostingSource;
    referenceNumber: string;
    documentType: string;
    documentId: string;
    lines: PostingLine[];
  }
) {
  assertBalanced(data.lines);
  await deleteDoubleEntryPosting(tx, data.postingKey);
  await tx.doubleTransaction.createMany({
    data: data.lines.map((line, index) => ({
      postingKey: data.postingKey,
      lineNo: index + 1,
      date: data.date,
      source: data.source,
      account: line.accountName,
      accountNumber: line.accountNumber,
      memo: line.memo ?? null,
      debit: line.debit,
      credit: line.credit,
      type: line.type ?? null,
      referenceNumber: data.referenceNumber,
      documentType: data.documentType,
      documentId: data.documentId,
      sourceTransactionId: line.sourceTransactionId ?? null,
      remarks: line.remarks ?? null
    }))
  });
}

export async function systemAccount(tx: TxClient, key: SystemAccountKey): Promise<AccountRef> {
  const mapping = await tx.systemAccountMapping.findUnique({
    where: { key },
    include: { account: true }
  });
  if (!mapping?.account) {
    throw new Error(`Missing system account mapping for ${key}`);
  }
  return {
    accountNumber: mapping.account.accountNumber,
    accountName: mapping.account.name
  };
}

export async function postCashbookDoubleEntry(
  tx: TxClient,
  data: {
    cashBookEntryId: number;
    transactionId: number;
    date: Date;
    accountNo: string;
    accountName: string;
    transactionDebit: Prisma.Decimal;
    transactionCredit: Prisma.Decimal;
    memo: string | null;
    remarks?: string | null;
  }
) {
  const cash = await systemAccount(tx, "CASHBOOK_ACCOUNT");
  await replaceDoubleEntryPosting(tx, {
    postingKey: `C:CB-${data.cashBookEntryId}`,
    date: data.date,
    source: POSTING_SOURCE.CASHBOOK,
    referenceNumber: `CB-${data.cashBookEntryId}`,
    documentType: "CASHBOOK",
    documentId: String(data.cashBookEntryId),
    lines: [
      {
        ...cash,
        debit: data.transactionCredit,
        credit: data.transactionDebit,
        memo: data.memo,
        type: "CASHBOOK_CONTROL",
        remarks: data.remarks
      },
      {
        accountNumber: data.accountNo,
        accountName: data.accountName,
        debit: data.transactionDebit,
        credit: data.transactionCredit,
        memo: data.memo,
        type: "CASHBOOK_ACCOUNT",
        sourceTransactionId: data.transactionId,
        remarks: data.remarks
      }
    ]
  });
}

export async function postBankingDoubleEntry(
  tx: TxClient,
  data: {
    bankingEntryId: number;
    bankTransactionId: number;
    accountTransactionId: number;
    date: Date;
    bankAccountNo: string;
    bankAccountName: string;
    accountNo: string;
    accountName: string;
    bankDebit: Prisma.Decimal;
    bankCredit: Prisma.Decimal;
    memo: string | null;
    remarks?: string | null;
  }
) {
  await replaceDoubleEntryPosting(tx, {
    postingKey: `B:BN-${data.bankingEntryId}`,
    date: data.date,
    source: POSTING_SOURCE.BANKING,
    referenceNumber: `BN-${data.bankingEntryId}`,
    documentType: "BANKING",
    documentId: String(data.bankingEntryId),
    lines: [
      {
        accountNumber: data.bankAccountNo,
        accountName: data.bankAccountName,
        debit: data.bankDebit,
        credit: data.bankCredit,
        memo: data.memo,
        type: "BANKING_BANK",
        sourceTransactionId: data.bankTransactionId,
        remarks: data.remarks
      },
      {
        accountNumber: data.accountNo,
        accountName: data.accountName,
        debit: data.bankCredit,
        credit: data.bankDebit,
        memo: data.memo,
        type: "BANKING_ACCOUNT",
        sourceTransactionId: data.accountTransactionId,
        remarks: data.remarks
      }
    ]
  });
}

export async function postSaleDoubleEntry(
  tx: TxClient,
  data: {
    saleNo: string;
    invoiceTransactionId: number;
    salesTransactionId: number;
    date: Date;
    amount: Prisma.Decimal;
    memo: string | null;
    remarks?: string | null;
  }
) {
  const debtors = await systemAccount(tx, "DEBTORS_CONTROL_ACCOUNT");
  const sales = await systemAccount(tx, "SALES_ACCOUNT");
  await replaceDoubleEntryPosting(tx, {
    postingKey: `S:${data.saleNo}:INVOICE`,
    date: data.date,
    source: POSTING_SOURCE.SALES,
    referenceNumber: data.saleNo,
    documentType: "SALES",
    documentId: data.saleNo,
    lines: [
      {
        ...debtors,
        debit: data.amount,
        credit: zero(),
        memo: data.memo,
        type: "INVOICE",
        sourceTransactionId: data.invoiceTransactionId,
        remarks: data.remarks
      },
      {
        ...sales,
        debit: zero(),
        credit: data.amount,
        memo: data.memo,
        type: "SALE_REVENUE",
        sourceTransactionId: data.salesTransactionId,
        remarks: data.remarks
      }
    ]
  });
}

export async function postPurchaseDoubleEntry(
  tx: TxClient,
  data: {
    purchaseGroupNo: string;
    purchaseTransactionId: number;
    date: Date;
    amount: Prisma.Decimal;
    memo: string | null;
    remarks?: string | null;
  }
) {
  const purchases = await systemAccount(tx, "PURCHASES_ACCOUNT");
  const creditors = await systemAccount(tx, "CREDITORS_CONTROL_ACCOUNT");
  await replaceDoubleEntryPosting(tx, {
    postingKey: `P:${data.purchaseGroupNo}:PURCHASE`,
    date: data.date,
    source: POSTING_SOURCE.PURCHASES,
    referenceNumber: data.purchaseGroupNo,
    documentType: "PURCHASES",
    documentId: data.purchaseGroupNo,
    lines: [
      {
        ...purchases,
        debit: data.amount,
        credit: zero(),
        memo: data.memo,
        type: "PURCHASE",
        remarks: data.remarks
      },
      {
        ...creditors,
        debit: zero(),
        credit: data.amount,
        memo: data.memo,
        type: "PURCHASE",
        sourceTransactionId: data.purchaseTransactionId,
        remarks: data.remarks
      }
    ]
  });
}

export async function postCustomerPaymentDoubleEntry(
  tx: TxClient,
  data: {
    referenceNumber: string;
    paymentTransactionId: number;
    date: Date;
    amount: Prisma.Decimal;
    memo: string | null;
    remarks?: string | null;
  }
) {
  const cash = await systemAccount(tx, "CASHBOOK_ACCOUNT");
  const debtors = await systemAccount(tx, "DEBTORS_CONTROL_ACCOUNT");
  await replaceDoubleEntryPosting(tx, {
    postingKey: `C:${data.referenceNumber}:PAYMENT`,
    date: data.date,
    source: POSTING_SOURCE.CASHBOOK,
    referenceNumber: data.referenceNumber,
    documentType: "PAYMENT",
    documentId: data.referenceNumber,
    lines: [
      {
        ...cash,
        debit: data.amount,
        credit: zero(),
        memo: data.memo,
        type: "PAYMENT",
        remarks: data.remarks
      },
      {
        ...debtors,
        debit: zero(),
        credit: data.amount,
        memo: data.memo,
        type: "PAYMENT",
        sourceTransactionId: data.paymentTransactionId,
        remarks: data.remarks
      }
    ]
  });
}

export function amount(value: Prisma.Decimal.Value) {
  return decimal(value);
}

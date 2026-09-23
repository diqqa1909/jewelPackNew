const assert = require("node:assert/strict");

function line(account, debit, credit, source) {
  return { account, debit, credit, source };
}

function assertPosting(name, rows, expectedSource) {
  assert.equal(rows.length, 2, `${name} should produce two rows`);
  const debit = rows.reduce((sum, row) => sum + row.debit, 0);
  const credit = rows.reduce((sum, row) => sum + row.credit, 0);
  assert.equal(debit, credit, `${name} must balance`);
  for (const row of rows) {
    assert.equal(row.source, expectedSource, `${name} source`);
    assert.notEqual(row.debit > 0, row.credit > 0, `${name} row must be one-sided`);
  }
}

assertPosting(
  "cashbook credit",
  [line("Cash", 10000, 0, "C"), line("HNB", 0, 10000, "C")],
  "C"
);

assertPosting(
  "cashbook debit",
  [line("HNB", 10000, 0, "C"), line("Cash", 0, 10000, "C")],
  "C"
);

assertPosting(
  "bank debit",
  [line("Bank", 15000, 0, "B"), line("Contra", 0, 15000, "B")],
  "B"
);

assertPosting(
  "bank credit",
  [line("Contra", 15000, 0, "B"), line("Bank", 0, 15000, "B")],
  "B"
);

assertPosting(
  "credit sale",
  [line("Debtors Control", 50000, 0, "S"), line("Sales", 0, 50000, "S")],
  "S"
);

assertPosting(
  "credit purchase",
  [line("Purchases", 30000, 0, "P"), line("Creditors Control", 0, 30000, "P")],
  "P"
);

assertPosting(
  "customer payment",
  [line("Cash", 12000, 0, "C"), line("Debtors Control", 0, 12000, "C")],
  "C"
);

console.log("Double-entry rule examples passed");

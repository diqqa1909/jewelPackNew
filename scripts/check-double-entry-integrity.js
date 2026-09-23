const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient, Prisma } = require("../lib/generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

for (const file of [".env.local", ".env"]) {
  const envPath = path.join(process.cwd(), file);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool), log: ["error"] });

function dec(value) {
  return new Prisma.Decimal(value ?? 0);
}

async function main() {
  const rows = await prisma.doubleTransaction.findMany({
    orderBy: [{ postingKey: "asc" }, { lineNo: "asc" }]
  });

  const invalidRows = rows.filter((row) => {
    const debit = dec(row.debit);
    const credit = dec(row.credit);
    return debit.isNegative() || credit.isNegative() || debit.greaterThan(0) === credit.greaterThan(0);
  });

  const groups = new Map();
  for (const row of rows) {
    const group = groups.get(row.postingKey) ?? {
      debit: dec(0),
      credit: dec(0),
      lines: 0,
      keys: new Set()
    };
    group.debit = group.debit.plus(row.debit);
    group.credit = group.credit.plus(row.credit);
    group.lines += 1;
    group.keys.add(row.lineNo);
    groups.set(row.postingKey, group);
  }

  const unbalanced = [];
  const duplicateLines = [];
  for (const [postingKey, group] of groups.entries()) {
    if (!group.debit.equals(group.credit) || group.lines < 2) {
      unbalanced.push({ postingKey, debit: group.debit.toFixed(2), credit: group.credit.toFixed(2), lines: group.lines });
    }
    if (group.keys.size !== group.lines) {
      duplicateLines.push(postingKey);
    }
  }

  const badSources = rows.filter((row) => !["C", "P", "B", "S", "G"].includes(row.source));

  if (invalidRows.length || unbalanced.length || duplicateLines.length || badSources.length) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          invalidRowCount: invalidRows.length,
          unbalanced,
          duplicateLines,
          badSourceCount: badSources.length
        },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        postingGroups: groups.size,
        rows: rows.length
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

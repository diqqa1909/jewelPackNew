const bcrypt = require("bcryptjs");
const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("../lib/generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

loadEnvConfig(process.cwd());

const email = "admin@jewelpack.com";
const password = "admin123";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Admin",
      password: hashedPassword,
      role: "admin",
      isActive: true
    },
    create: {
      email,
      name: "Admin",
      password: hashedPassword,
      role: "admin",
      isActive: true
    },
    select: {
      email: true,
      name: true,
      role: true,
      isActive: true
    }
  });

  console.log("Demo admin ready:");
  console.table([user]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

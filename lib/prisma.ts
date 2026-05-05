import { PrismaClient } from "@/lib/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __prismaPool: Pool | undefined;
}

function createClient() {
  const pool =
    globalThis.__prismaPool ??
    new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 300_000
    });

  const adapter = new PrismaPg(pool);

  if (process.env.NODE_ENV !== "production") globalThis.__prismaPool = pool;

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}

export const prisma = globalThis.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;

export async function prismaWithRetry<T>(
  fn: (client: PrismaClient) => Promise<T>,
  opts: { retries?: number } = {}
): Promise<T> {
  const retries = opts.retries ?? 1;
  try {
    return await fn(prisma);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retryable =
      message.includes("Server has closed the connection") ||
      message.includes("ECONNRESET") ||
      message.includes("Connection terminated unexpectedly");
    if (!retryable || retries <= 0) throw err;
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
    return fn(prisma);
  }
}

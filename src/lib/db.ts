import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { db: PrismaClient };

function createDb() {
  const adapter = new PrismaBetterSqlite3({ url: "file:dev.db" });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.db || createDb();

if (process.env.NODE_ENV !== "production") globalForPrisma.db = db;

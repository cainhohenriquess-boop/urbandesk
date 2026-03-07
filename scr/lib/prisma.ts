import { PrismaClient } from "@prisma/client";

// ─────────────────────────────────────────────
// Instância global do Prisma Client
// Evita múltiplas conexões em desenvolvimento (HMR)
// ─────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

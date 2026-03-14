import { PrismaClient } from "@prisma/client";

function getRuntimeDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (!rawUrl) {
    return undefined;
  }

  try {
    const url = new URL(rawUrl);
    const isSupabasePooler = url.hostname.includes("pooler.supabase.com");
    const usesPgBouncer = url.searchParams.get("pgbouncer") === "true";

    if (isSupabasePooler || usesPgBouncer) {
      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set("connection_limit", "1");
      }
      if (!url.searchParams.has("pool_timeout")) {
        url.searchParams.set("pool_timeout", "20");
      }
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

const runtimeDatabaseUrl = getRuntimeDatabaseUrl();

if (runtimeDatabaseUrl) {
  process.env.DATABASE_URL = runtimeDatabaseUrl;
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    datasources: runtimeDatabaseUrl
      ? {
          db: {
            url: runtimeDatabaseUrl,
          },
        }
      : undefined,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

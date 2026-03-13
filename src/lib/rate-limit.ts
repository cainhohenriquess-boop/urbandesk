import { NextResponse } from "next/server";

type HeaderRecord = Record<string, string | string[] | undefined>;
type HeaderLike = Headers | { get(name: string): string | null | undefined } | HeaderRecord;

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RequestRateLimitOptions = {
  namespace: string;
  limit: number;
  windowMs: number;
  extraKey?: string;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __urbandeskRateLimitStore: Map<string, Bucket> | undefined;
}

const RATE_LIMIT_STORE = globalThis.__urbandeskRateLimitStore ?? new Map<string, Bucket>();
globalThis.__urbandeskRateLimitStore = RATE_LIMIT_STORE;

function nowMs(): number {
  return Date.now();
}

function cleanupExpired(now: number): void {
  if (RATE_LIMIT_STORE.size < 5_000) return;
  for (const [key, bucket] of RATE_LIMIT_STORE.entries()) {
    if (bucket.resetAt <= now) RATE_LIMIT_STORE.delete(key);
  }
}

function readHeader(headers: HeaderLike, name: string): string | null {
  if ("get" in headers && typeof headers.get === "function") {
    return headers.get(name) ?? null;
  }

  const record = headers as HeaderRecord;
  const exact = record[name];
  const lower = record[name.toLowerCase()];
  const raw = exact ?? lower;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return typeof raw === "string" ? raw : null;
}

export function extractClientIpFromHeaders(headers: HeaderLike): string {
  const xForwardedFor = readHeader(headers, "x-forwarded-for");
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }

  const xRealIp = readHeader(headers, "x-real-ip");
  if (xRealIp?.trim()) return xRealIp.trim().slice(0, 128);

  const cfConnectingIp = readHeader(headers, "cf-connecting-ip");
  if (cfConnectingIp?.trim()) return cfConnectingIp.trim().slice(0, 128);

  return "unknown";
}

export function consumeRateLimit(options: RateLimitOptions): RateLimitResult {
  const { key, limit, windowMs } = options;
  const now = nowMs();
  cleanupExpired(now);

  const current = RATE_LIMIT_STORE.get(key);
  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    RATE_LIMIT_STORE.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (current.count >= limit) {
    const retryAfterMs = Math.max(0, current.resetAt - now);
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  current.count += 1;
  RATE_LIMIT_STORE.set(key, current);
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
    retryAfterSeconds: 0,
  };
}

export function enforceRequestRateLimit(
  request: Request,
  options: RequestRateLimitOptions
): NextResponse | null {
  const url = new URL(request.url);
  const clientIp = extractClientIpFromHeaders(request.headers);
  const key = `${options.namespace}:${clientIp}:${options.extraKey ?? url.pathname}`;
  const result = consumeRateLimit({
    key,
    limit: options.limit,
    windowMs: options.windowMs,
  });

  if (result.allowed) return null;

  const response = NextResponse.json(
    { error: "Muitas requisições. Tente novamente em instantes." },
    { status: 429 }
  );
  response.headers.set("Retry-After", String(result.retryAfterSeconds));
  response.headers.set("X-RateLimit-Limit", String(options.limit));
  response.headers.set("X-RateLimit-Remaining", "0");
  response.headers.set("X-RateLimit-Reset", new Date(result.resetAt).toISOString());
  return response;
}

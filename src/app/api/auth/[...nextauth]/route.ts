// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

const handler = NextAuth(authOptions);

type RouteContext = { params: Promise<{ nextauth: string[] }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const params = await context.params;
  return handler(req, { params });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRequestRateLimit(req, {
    namespace: "api:auth:nextauth:post",
    limit: 40,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const params = await context.params;
  return handler(req, { params });
}

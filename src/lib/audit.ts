import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const AUDIT_ACTIONS = {
  AUTH_LOGIN: "AUTH_LOGIN",
  AUTH_LOGOUT: "AUTH_LOGOUT",
  PROJECT_CREATE: "PROJECT_CREATE",
  PROJECT_UPDATE: "PROJECT_UPDATE",
  PROJECT_DELETE_SOFT: "PROJECT_DELETE_SOFT",
  PROJECT_DELETE_HARD: "PROJECT_DELETE_HARD",
  GIS_ASSET_CREATE: "GIS_ASSET_CREATE",
  GIS_ASSET_UPDATE: "GIS_ASSET_UPDATE",
  GIS_ASSET_COMMENT: "GIS_ASSET_COMMENT",
  UPLOAD_SUCCESS: "UPLOAD_SUCCESS",
  TENANT_STATUS_CHANGE: "TENANT_STATUS_CHANGE",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditActor {
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  tenantId?: string | null;
}

interface AuditRequestContext {
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditLogInput {
  action: AuditAction | string;
  entityType?: string | null;
  entityId?: string | null;
  actor?: AuditActor | null;
  metadata?: Record<string, unknown> | null;
  requestContext?: AuditRequestContext | null;
}

function sanitizeIp(value: string | null | undefined): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  if (!first) return null;

  const ipv4Match = first.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    return `${ipv4Match[1]}.${ipv4Match[2]}.${ipv4Match[3]}.0`;
  }

  if (first.includes(":")) {
    const parts = first.split(":").filter((part) => part.length > 0);
    const masked = parts.slice(0, 4).join(":");
    return `${masked}::`;
  }

  return first.slice(0, 128);
}

function sanitizeUserAgent(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 512);
}

export function extractRequestContext(req: Pick<NextRequest, "headers">): AuditRequestContext {
  return extractRequestContextFromHeaders(req.headers);
}

export function extractRequestContextFromHeaders(
  headers: Headers
): AuditRequestContext {
  const forwarded = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");

  return {
    ip: sanitizeIp(forwarded ?? realIp),
    userAgent: sanitizeUserAgent(headers.get("user-agent")),
  };
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        userId: input.actor?.userId ?? null,
        userName: input.actor?.userName ?? null,
        userEmail: input.actor?.userEmail ?? null,
        userRole: input.actor?.userRole ?? null,
        tenantId: input.actor?.tenantId ?? null,
        ip: input.requestContext?.ip ?? null,
        userAgent: input.requestContext?.userAgent ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("[AUDIT_WRITE_ERROR]", error);
  }
}

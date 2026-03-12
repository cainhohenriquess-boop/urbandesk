import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import {
  getAccessBlockMessage,
  getAccessBlockReason,
  getRoleHome,
  type AppRole,
} from "@/lib/auth-shared";

// ─────────────────────────────────────────────
// Roles disponíveis no sistema
// ─────────────────────────────────────────────
type Role = AppRole;

// ─────────────────────────────────────────────
// Mapa de acesso: rota prefixo → roles permitidos
// ─────────────────────────────────────────────
const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  "/superadmin": ["SUPERADMIN"],
  "/app/secretaria": ["SUPERADMIN", "SECRETARIO"],
  "/app/projetos": ["SUPERADMIN", "SECRETARIO", "ENGENHEIRO"],
  "/app/campo": ["SUPERADMIN", "SECRETARIO", "ENGENHEIRO", "CAMPO"],
  "/api/projects": ["SUPERADMIN", "SECRETARIO", "ENGENHEIRO"],
  "/api/users": ["SUPERADMIN", "SECRETARIO"],
  "/api/tenant": ["SUPERADMIN"],
  "/api/auth/impersonate": ["SUPERADMIN"],
};

// ─────────────────────────────────────────────
// Rotas completamente públicas (sem autenticação)
// ─────────────────────────────────────────────
const PUBLIC_PAGE_ROUTES = [
  "/",
  "/login",
];

const NEXTAUTH_PUBLIC_API_PREFIXES = [
  "/api/auth/signin",
  "/api/auth/signout",
  "/api/auth/callback",
  "/api/auth/session",
  "/api/auth/csrf",
  "/api/auth/providers",
  "/api/auth/error",
  "/api/auth/verify-request",
];

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function isBillingRoute(pathname: string): boolean {
  return pathname === "/app/billing" || pathname.startsWith("/app/billing/");
}

function isBillingRedirectReason(reason: string): boolean {
  return reason === "tenant_inactive" || reason === "trial_expired";
}

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PAGE_ROUTES.includes(pathname)) return true;
  return NEXTAUTH_PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function getRequiredRoles(pathname: string): Role[] | null {
  const orderedRoutes = Object.entries(ROUTE_PERMISSIONS).sort(
    ([a], [b]) => b.length - a.length
  );
  for (const [prefix, roles] of orderedRoutes) {
    if (pathname.startsWith(prefix)) return roles;
  }
  return null; // sem restrição de role (mas ainda requer autenticação)
}

function redirectToLogin(req: NextRequest): NextResponse {
  const loginUrl = new URL("/login", req.url);
  const callbackUrl = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  loginUrl.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(loginUrl);
}

function redirectToBlockedLogin(req: NextRequest, reason: string): NextResponse {
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("error", reason);
  return NextResponse.redirect(loginUrl);
}

function redirectToBilling(req: NextRequest, reason: string): NextResponse {
  const billingUrl = new URL("/app/billing", req.url);
  billingUrl.searchParams.set("reason", reason);
  return NextResponse.redirect(billingUrl);
}

function redirectToRoleHome(req: NextRequest, role?: string | null): NextResponse {
  const home = getRoleHome(role);
  if (req.nextUrl.pathname === home) return NextResponse.next();
  return NextResponse.redirect(new URL(home, req.url));
}

function jsonUnauthorized(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// ─────────────────────────────────────────────
// GATEKEEPER PRINCIPAL
// Wrap com withAuth para integração com NextAuth
// ─────────────────────────────────────────────
export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token as (JWT & {
      role?: Role;
      isActive?: boolean;
      tenantId?: string;
      tenantStatus?: string;
      trialEndsAt?: string;
    }) | null;

    // 1. Rotas públicas: passe livre
    if (isPublicRoute(pathname)) {
      // Usuário autenticado e válido não precisa permanecer na tela de login
      if (pathname === "/login" && token) {
        const reason = getAccessBlockReason(token);
        if (reason && isBillingRedirectReason(reason)) {
          return redirectToBilling(req, reason);
        }
        if (!reason) return redirectToRoleHome(req, token.role);
      }
      return NextResponse.next();
    }

    // 2. Usuário não autenticado: redireciona para login
    if (!token) {
      if (isApiRoute(pathname)) {
        return jsonUnauthorized("Não autenticado.", 401);
      }
      return redirectToLogin(req);
    }

    // 3. Bloqueios de acesso por status do usuário/tenant
    const blockReason = getAccessBlockReason(token);
    if (blockReason) {
      if (isApiRoute(pathname)) {
        return jsonUnauthorized(getAccessBlockMessage(blockReason), 403);
      }
      if (isBillingRedirectReason(blockReason)) {
        if (isBillingRoute(pathname)) {
          return NextResponse.next();
        }
        return redirectToBilling(req, blockReason);
      }
      return redirectToBlockedLogin(req, blockReason);
    }

    // 4. Verifica permissão de Role
    const requiredRoles = getRequiredRoles(pathname);
    if (requiredRoles) {
      if (!token.role) {
        if (isApiRoute(pathname)) {
          return jsonUnauthorized("Sem permissão para este recurso.", 403);
        }
        return redirectToBlockedLogin(req, "unauthorized");
      }

      if (!requiredRoles.includes(token.role as Role)) {
        if (isApiRoute(pathname)) {
          return jsonUnauthorized("Sem permissão para este recurso.", 403);
        }
        return redirectToRoleHome(req, token.role);
      }
    }

    // 5. Injeta headers de tenant para uso nos Server Components
    const response = NextResponse.next();
    if (token.tenantId) {
      response.headers.set("x-tenant-id", token.tenantId);
    }
    if (token.role) {
      response.headers.set("x-user-role", token.role);
    }
    if (token.tenantStatus) {
      response.headers.set("x-tenant-status", token.tenantStatus);
    }

    return response;
  },
  {
    // withAuth só executa o callback acima quando há token válido
    // Para rotas públicas, o guard acima já retorna antes
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Libera rotas públicas sem checar token
        if (isPublicRoute(pathname)) return true;
        // Demais rotas exigem token
        return !!token;
      },
    },
  }
);

// ─────────────────────────────────────────────
// Matcher: intercepta TUDO exceto assets estáticos
// ─────────────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Intercepta todas as rotas EXCETO:
     * - _next/static  (arquivos estáticos do Next.js)
     * - _next/image   (otimização de imagens)
     * - favicon.ico
     * - public/       (assets públicos: logo, manifest, etc.)
     * - arquivos com extensão (js, css, png, svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};

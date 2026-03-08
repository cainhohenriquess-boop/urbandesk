import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

// ─────────────────────────────────────────────
// Roles disponíveis no sistema
// ─────────────────────────────────────────────
type Role = "SUPERADMIN" | "SECRETARIO" | "ENGENHEIRO" | "CAMPO";

// ─────────────────────────────────────────────
// Mapa de acesso: rota prefixo → roles permitidos
// ─────────────────────────────────────────────
const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  "/superadmin":          ["SUPERADMIN"],
  "/app/secretaria":      ["SUPERADMIN", "SECRETARIO"],
  "/app/projetos":        ["SUPERADMIN", "SECRETARIO", "ENGENHEIRO"],
  "/app/campo":           ["SUPERADMIN", "SECRETARIO", "ENGENHEIRO", "CAMPO"],
};

// ─────────────────────────────────────────────
// Rotas completamente públicas (sem autenticação)
// ─────────────────────────────────────────────
const PUBLIC_ROUTES = [
  "/",          // Landing page B2G
  "/login",
  "/api/auth",  // NextAuth callbacks
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function getRequiredRoles(pathname: string): Role[] | null {
  for (const [prefix, roles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(prefix)) return roles;
  }
  return null; // sem restrição de role (mas ainda requer autenticação)
}

function redirectToLogin(req: NextRequest): NextResponse {
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function redirectToUnauthorized(req: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/login?error=unauthorized", req.url));
}

// ─────────────────────────────────────────────
// GATEKEEPER PRINCIPAL
// Wrap com withAuth para integração com NextAuth
// ─────────────────────────────────────────────
export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token as (JWT & { role?: Role; tenantId?: string; trialEndsAt?: string }) | null;

    // 1. Rotas públicas: passe livre
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    // 2. Usuário não autenticado: redireciona para login
    if (!token) {
      return redirectToLogin(req);
    }

    // 3. Verifica expiração do Trial (somente para rotas /app/*)
    // Refatorado: Redireciona para /app/billing em vez de /login, evitando loop infinito de UX.
    if (pathname.startsWith("/app") && !pathname.startsWith("/app/billing") && token.trialEndsAt) {
      const trialEnd = new Date(token.trialEndsAt);
      if (trialEnd < new Date()) {
        // Trial expirado: redireciona para página de pagamento/aviso
        return NextResponse.redirect(new URL("/app/billing?reason=trial_expired", req.url));
      }
    }

    // 4. Verifica permissão de Role
    const requiredRoles = getRequiredRoles(pathname);
    if (requiredRoles && token.role && !requiredRoles.includes(token.role as Role)) {
      return redirectToUnauthorized(req);
    }

    // 5. Injeta headers de tenant para uso nos Server Components
    const response = NextResponse.next();
    if (token.tenantId) {
      response.headers.set("x-tenant-id", token.tenantId);
    }
    if (token.role) {
      response.headers.set("x-user-role", token.role);
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
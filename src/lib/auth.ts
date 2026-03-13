import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { AppRole, TenantLifecycleStatus } from "@/lib/auth-shared";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit";
import { consumeRateLimit, extractClientIpFromHeaders } from "@/lib/rate-limit";

const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim() ?? "";
const nextAuthUrl =
  process.env.NEXTAUTH_URL?.trim() ||
  process.env.AUTH_URL?.trim() ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : "");

if (process.env.NODE_ENV === "production") {
  if (!nextAuthSecret || nextAuthSecret.length < 32) {
    throw new Error("NEXTAUTH_SECRET inválido para produção. Use um segredo forte com no mínimo 32 caracteres.");
  }

  // Evita quebrar o build em Vercel quando NEXTAUTH_URL não foi definido
  // explicitamente, mas a plataforma já expõe a URL de deploy.
  if (!process.env.NEXTAUTH_URL && nextAuthUrl) {
    process.env.NEXTAUTH_URL = nextAuthUrl;
  }

  if (!process.env.NEXTAUTH_URL && !process.env.VERCEL_URL && !process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    console.warn(
      "[auth] NEXTAUTH_URL não foi definido em produção. Defina a variável para evitar problemas em callbacks e links absolutos."
    );
  }
}

// ─────────────────────────────────────────────
// Tipos estendidos
// ─────────────────────────────────────────────
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: AppRole;
      isActive: boolean;
      tenantId?: string;
      tenantName?: string;
      tenantStatus?: TenantLifecycleStatus;
      trialEndsAt?: string;
    };
  }
  interface User {
    role: AppRole;
    isActive: boolean;
    tenantId?: string;
    tenantName?: string;
    tenantStatus?: TenantLifecycleStatus;
    trialEndsAt?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
    isActive?: boolean;
    tenantId?: string;
    tenantName?: string;
    tenantStatus?: TenantLifecycleStatus;
    trialEndsAt?: string;
  }
}

// ─────────────────────────────────────────────
// Configuração NextAuth
// ─────────────────────────────────────────────
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge:   8 * 60 * 60, // 8 horas (jornada de trabalho)
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  providers: [
    CredentialsProvider({
      name: "Credenciais Institucionais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },

      async authorize(credentials, req): Promise<User | null> {
        if (!credentials?.email || !credentials.password) return null;
        const normalizedEmail = credentials.email.trim().toLowerCase();
        const clientIp = extractClientIpFromHeaders(req?.headers ?? {});
        const loginRate = consumeRateLimit({
          key: `auth:credentials:${clientIp}:${normalizedEmail}`,
          limit: 20,
          windowMs: 10 * 60 * 1000,
        });
        if (!loginRate.allowed) return null;

        // Busca usuário com tenant
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                status: true,
                trialEndsAt: true,
              },
            },
          },
        });

        if (!user || !user.passwordHash) return null;

        // Valida senha
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as AppRole,
          isActive: user.isActive,
          tenantId: user.tenantId ?? undefined,
          tenantName: user.tenant?.name ?? undefined,
          tenantStatus: (user.tenant?.status as TenantLifecycleStatus | undefined) ?? undefined,
          trialEndsAt: user.tenant?.trialEndsAt?.toISOString() ?? undefined,
        };
      },
    }),
  ],

  callbacks: {
    // Persiste campos customizados no JWT
    async jwt({ token, user }): Promise<JWT> {
      if (user) {
        token.role = user.role;
        token.isActive = user.isActive;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        token.tenantStatus = user.tenantStatus;
        token.trialEndsAt = user.trialEndsAt;
      }
      return token;
    },

    // Expõe campos customizados na Session
    async session({ session, token }): Promise<Session> {
      session.user.id = token.sub ?? "";
      session.user.role = token.role ?? "CAMPO";
      session.user.isActive = token.isActive ?? true;
      session.user.tenantId = token.tenantId;
      session.user.tenantName = token.tenantName;
      session.user.tenantStatus = token.tenantStatus;
      session.user.trialEndsAt = token.trialEndsAt;
      return session;
    },

    // Evita open redirect fora do domínio da aplicação
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        if (target.origin === baseUrl) return url;
      } catch {
        // URL inválida: segue para fallback seguro
      }
      return `${baseUrl}/app`;
    },
  },

  events: {
    async signIn({ user }) {
      await writeAuditLog({
        action: AUDIT_ACTIONS.AUTH_LOGIN,
        entityType: "auth",
        entityId: user.id,
        actor: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          tenantId: user.tenantId,
        },
        metadata: {
          provider: "credentials",
        },
      });
    },

    async signOut({ token }) {
      const userId = typeof token?.sub === "string" ? token.sub : null;
      const userRole = typeof token?.role === "string" ? token.role : null;
      const tenantId =
        typeof token?.tenantId === "string" ? token.tenantId : null;
      const userEmail =
        typeof token?.email === "string" ? token.email : null;

      await writeAuditLog({
        action: AUDIT_ACTIONS.AUTH_LOGOUT,
        entityType: "auth",
        entityId: userId,
        actor: {
          userId,
          userEmail,
          userRole,
          tenantId,
        },
      });
    },
  },

  // Loga erros em desenvolvimento
  debug: process.env.NODE_ENV === "development",

  secret: nextAuthSecret || undefined,
};

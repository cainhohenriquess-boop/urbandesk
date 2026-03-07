import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// ─────────────────────────────────────────────
// Tipos estendidos
// ─────────────────────────────────────────────
declare module "next-auth" {
  interface Session {
    user: {
      id:          string;
      name?:       string | null;
      email?:      string | null;
      image?:      string | null;
      role:        string;
      tenantId?:   string;
      tenantName?: string;
      trialEndsAt?: string;
    };
  }
  interface User {
    role:        string;
    tenantId?:   string;
    tenantName?: string;
    trialEndsAt?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?:        string;
    tenantId?:    string;
    tenantName?:  string;
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
        email:    { label: "E-mail", type: "email" },
        password: { label: "Senha",  type: "password" },
      },

      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials.password) return null;

        // Busca usuário com tenant
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            tenant: {
              select: {
                id:          true,
                name:        true,
                trialEndsAt: true,
                status:      true,
              },
            },
          },
        });

        if (!user || !user.passwordHash) return null;

        // Tenant desativado
        if (user.tenant && user.tenant.status === "CANCELADO") return null;

        // Valida senha
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id:          user.id,
          name:        user.name,
          email:       user.email,
          role:        user.role,
          tenantId:    user.tenantId ?? undefined,
          tenantName:  user.tenant?.name ?? undefined,
          trialEndsAt: user.tenant?.trialEndsAt?.toISOString() ?? undefined,
        };
      },
    }),
  ],

  callbacks: {
    // Persiste campos customizados no JWT
    async jwt({ token, user }): Promise<JWT> {
      if (user) {
        token.role        = user.role;
        token.tenantId    = user.tenantId;
        token.tenantName  = user.tenantName;
        token.trialEndsAt = user.trialEndsAt;
      }
      return token;
    },

    // Expõe campos customizados na Session
    async session({ session, token }): Promise<Session> {
      session.user.role        = token.role        ?? "CAMPO";
      session.user.tenantId    = token.tenantId;
      session.user.tenantName  = token.tenantName;
      session.user.trialEndsAt = token.trialEndsAt;
      return session;
    },
  },

  // Loga erros em desenvolvimento
  debug: process.env.NODE_ENV === "development",

  secret: process.env.NEXTAUTH_SECRET,
};

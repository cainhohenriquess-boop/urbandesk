"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Ícones inline
// ─────────────────────────────────────────────
function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconLoader({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Erros do NextAuth
// ─────────────────────────────────────────────
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "E-mail ou senha inválidos.",
  unauthorized:      "Você não tem permissão para acessar esta área.",
  trial_expired:     "Seu período de teste expirou. Entre em contato com o suporte.",
  default:           "Ocorreu um erro ao entrar. Tente novamente.",
};

// ─────────────────────────────────────────────
// Conteúdo Principal
// ─────────────────────────────────────────────
function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/app/secretaria";
  const errorParam   = searchParams.get("error");

  // Estados de Login
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(
    errorParam ? (ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.default) : null
  );

  // Estados de "Esqueci a Senha"
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail,  setForgotEmail]  = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle" | "loading" | "success">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.default);
      return;
    }

    // Traffic Controller: delega o roteamento para o servidor (/app)
    const destination = callbackUrl === "/app/secretaria" ? "/app" : callbackUrl;
    window.location.assign(destination);
  }

  function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail) return;
    
    setForgotStatus("loading");
    
    // Simula chamada à API de recuperação
    setTimeout(() => {
      setForgotStatus("success");
    }, 1500);
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#0d1529]">

      {/* ── Painel esquerdo — Identidade Visual ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden">
        {/* SVG Background Map */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3468f6" strokeWidth="0.5" />
              </pattern>
              <radialGradient id="glow" cx="50%" cy="50%" r="60%">
                <stop offset="0%"   stopColor="#3468f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0d1529" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <rect width="100%" height="100%" fill="url(#glow)" />
          </svg>
        </div>

        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {[280, 220, 160, 100].map((size, i) => (
            <div
              key={size}
              className="absolute rounded-full border border-brand-700/30"
              style={{
                width: size, height: size, top: -size / 2, left: -size / 2,
                animation: `map-ping ${3 + i * 0.8}s ease-out infinite`,
                animationDelay: `${i * 0.6}s`,
              }}
            />
          ))}
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 shadow-[0_0_40px_rgba(52,104,246,0.6)]">
            <IconMapPin className="h-6 w-6 text-white" />
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
              <IconMapPin className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white tracking-tight">
              Urban<span className="text-brand-400">Desk</span>
            </span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-widest text-brand-400">Plataforma B2G</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-white">
              Gestão de infraestrutura urbana com inteligência geoespacial
            </h1>
            <p className="text-base text-slate-400 leading-relaxed max-w-md">
              Do projeto ao campo. Engenheiros, secretários e equipes de campo conectados em tempo real, com dados GIS precisos e auditáveis.
            </p>
          </div>
        </div>
      </div>

      {/* ── Painel direito — Formulário ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16 relative">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-8">
              <h2 className="font-display text-2xl font-bold text-white">Acessar plataforma</h2>
              <p className="mt-1.5 text-sm text-slate-400">Entre com suas credenciais institucionais</p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-danger-800/50 bg-danger-900/30 p-3.5 text-sm text-danger-300 animate-fade-in">
                <svg className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">E-mail institucional</label>
                <div className="relative">
                  <IconMail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@prefeitura.gov.br"
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.05] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-brand-500/60 focus:bg-white/[0.07] focus:ring-1 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Senha</label>
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(true)}
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    Esqueci a senha
                  </button>
                </div>
                <div className="relative">
                  <IconLock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.05] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-brand-500/60 focus:bg-white/[0.07] focus:ring-1 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-500 transition-all active:scale-[0.98] disabled:opacity-60 flex justify-center items-center shadow-[0_2px_12px_rgba(52,104,246,0.4)]"
              >
                {loading ? <span className="flex items-center gap-2"><IconLoader className="h-4 w-4" /> Entrando…</span> : "Entrar na plataforma"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-xs text-slate-600">Acesso restrito</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            <p className="text-center text-xs text-slate-600 leading-relaxed">
              Plataforma de uso exclusivo para gestores e colaboradores municipais.<br />
              Acesso monitorado e sujeito às sanções da Lei nº 12.737/2012.
            </p>
          </div>
        </div>
      </div>

      {/* ── MODAL: ESQUECI A SENHA ── */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1e]/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1529] p-6 shadow-2xl relative overflow-hidden">
            
            {/* Linha decorativa no topo */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-600 to-brand-400" />

            <h3 className="font-display text-xl font-bold text-white mb-2 mt-2">Recuperar acesso</h3>
            
            {forgotStatus === "success" ? (
              <div className="space-y-5 animate-fade-in">
                <div className="rounded-xl border border-accent-500/20 bg-accent-500/10 p-4 text-sm text-accent-100 leading-relaxed">
                  Se o e-mail <strong>{forgotEmail}</strong> estiver registado, receberá um link seguro para redefinir a sua senha em instantes.
                </div>
                <button 
                  onClick={() => { setIsForgotOpen(false); setForgotStatus("idle"); setForgotEmail(""); }}
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-5 animate-fade-in">
                <p className="text-sm text-slate-400 leading-relaxed">
                  Insira o seu e-mail institucional. Enviaremos as instruções para a recuperação da sua conta.
                </p>
                
                <div className="relative">
                  <IconMail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="voce@prefeitura.gov.br"
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" onClick={() => setIsForgotOpen(false)} 
                    className="flex-1 rounded-lg py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" disabled={!forgotEmail || forgotStatus === "loading"} 
                    className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-500 transition-colors disabled:opacity-50 flex justify-center items-center shadow-md"
                  >
                    {forgotStatus === "loading" ? <IconLoader className="h-4 w-4" /> : "Enviar link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0d1529]">
        <span className="text-white text-sm">Carregando...</span>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
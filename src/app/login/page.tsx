"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Usuário ou senha inválidos.",
  unauthorized: "Você não tem permissão para acessar esta área.",
  trial_expired: "Período de teste expirado.",
  default: "Ocorreu um erro. Tente novamente.",
};

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/app/secretaria";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState(""); // Usaremos o campo email para receber o username gerado
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(errorParam ? (ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.default) : null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);

    // O "email" aqui na verdade é o usuário (ex: engenheiro@cidade) que geramos no banco
    const result = await signIn("credentials", { email, password, redirect: false });
    
    if (result?.error) {
      setLoading(false);
      setError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.default);
      return;
    }
    window.location.assign(callbackUrl === "/app/secretaria" ? "/app" : callbackUrl);
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#0d1529]">
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3468f6" strokeWidth="0.5" /></pattern><radialGradient id="glow" cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor="#3468f6" stopOpacity="0.3" /><stop offset="100%" stopColor="#0d1529" stopOpacity="0" /></radialGradient></defs>
            <rect width="100%" height="100%" fill="url(#grid)" /><rect width="100%" height="100%" fill="url(#glow)" />
          </svg>
        </div>
        <div className="relative z-10"><h1 className="font-display text-4xl font-bold text-white">UrbanDesk B2G</h1><p className="text-slate-400 mt-2">Acesso restrito para Gestão Governamental</p></div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 relative">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="font-display text-2xl font-bold text-white mb-6">Acessar plataforma</h2>
          {error && <div className="mb-6 rounded-lg border border-danger-800/50 bg-danger-900/30 p-3 text-sm text-danger-300">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase text-slate-400">Usuário do Sistema</label>
              {/* Note que o input não tem mais type="email" para não forçar ".com", pois o user gerado é 'secretario@slug' */}
              <input type="text" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ex: engenheiro@natal" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.05] py-2.5 px-4 text-sm text-white outline-none focus:border-brand-500/60" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase text-slate-400">Senha de Acesso</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.05] py-2.5 px-4 text-sm text-white outline-none focus:border-brand-500/60" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-500 transition-all">{loading ? "Entrando..." : "Acessar Plataforma"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() { return <Suspense fallback={<div className="min-h-screen bg-[#0d1529]" />}><LoginContent /></Suspense>; }
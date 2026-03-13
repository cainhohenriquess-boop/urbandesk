"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Message {
  id:   string;
  from: "user" | "support";
  text: string;
  time: Date;
}

const INITIAL_MSG: Message = {
  id:   "init",
  from: "support",
  text: "Olá! 👋 Sou o suporte do UrbanDesk. Como posso ajudar hoje?",
  time: new Date(),
};

// Respostas automáticas simples
const AUTO_REPLIES: [RegExp, string][] = [
  [/mapa|gis|mapbox/i,       "Para dúvidas sobre o mapa GIS, consulte nossa documentação em docs.urbandesk.com.br/gis ou entre em contato com suporte técnico."],
  [/obra|projeto/i,          "Projetos e obras ficam na Carteira de Projetos. A partir dela você acessa carteira, mapa e execução de campo."],
  [/campo|gps|foto/i,        "O App de Campo funciona offline! Basta acessar /app/campo pelo navegador e adicionar ao Home Screen."],
  [/pagamento|plano|fatura/i,"Para questões financeiras, entre em contato com vendas@urbandesk.com.br ou acesse o painel de faturas."],
  [/senha|acesso|login/i,    "Para redefinir senha, contate o administrador do sistema ou envie email para suporte@urbandesk.com.br."],
];

function getAutoReply(text: string): string {
  for (const [pattern, reply] of AUTO_REPLIES) {
    if (pattern.test(text)) return reply;
  }
  return "Entendido! Vou registrar sua mensagem e um especialista entrará em contato em breve. Horário de atendimento: Seg–Sex, 8h–18h.";
}

export function SupportChat() {
  const [open,    setOpen]    = useState(false);
  const [input,   setInput]   = useState("");
  const [messages,setMessages]= useState<Message[]>([INITIAL_MSG]);
  const [typing,  setTyping]  = useState(false);
  const [unread,  setUnread]  = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = {
      id:   `u-${Date.now()}`,
      from: "user",
      text,
      time: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const reply: Message = {
        id:   `s-${Date.now()}`,
        from: "support",
        text: getAutoReply(text),
        time: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
      setTyping(false);
      if (!open) setUnread((n) => n + 1);
    }, 1200);
  }

  return (
    <>
      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-20 right-5 z-support w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-map transition-all duration-300",
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 bg-brand-700 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Suporte UrbanDesk</p>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400 animate-pulse-dot" />
              <span className="text-[10px] text-brand-200">Online agora</span>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-brand-200 hover:text-white transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Mensagens */}
        <div className="flex flex-col gap-3 overflow-y-auto p-4 h-64">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex", msg.from === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                  msg.from === "user"
                    ? "rounded-br-sm bg-brand-600 text-white"
                    : "rounded-bl-sm bg-muted text-foreground"
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-2.5">
                {[0,1,2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse-dot"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Digite sua mensagem…"
            className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-support flex h-12 w-12 items-center justify-center rounded-full shadow-map transition-all duration-300",
          open ? "bg-muted text-foreground" : "bg-brand-600 text-white hover:bg-brand-500",
          "hover:scale-105 active:scale-95"
        )}
        aria-label="Abrir suporte"
      >
        {open ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-[9px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}

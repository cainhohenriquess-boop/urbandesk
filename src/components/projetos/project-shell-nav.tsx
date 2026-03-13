"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type ProjectShellNavProps = {
  projectId: string;
};

const getProjectTabs = (projectId: string) => [
  { href: `/app/projetos/${projectId}`, label: "Resumo" },
  { href: `/app/projetos/${projectId}/planejamento`, label: "Planejamento" },
  { href: `/app/projetos/${projectId}/financeiro`, label: "Financeiro" },
  { href: `/app/projetos/${projectId}/mapa`, label: "Mapa/GIS" },
  { href: `/app/projetos/${projectId}/fiscalizacao`, label: "Fiscalização" },
  { href: `/app/projetos/${projectId}/documentos`, label: "Documentos" },
  { href: `/app/projetos/${projectId}/medicoes`, label: "Medições" },
  {
    href: `/app/projetos/${projectId}/pendencias-riscos`,
    label: "Pendências/Riscos",
  },
  { href: `/app/projetos/${projectId}/historico`, label: "Histórico" },
];

export function ProjectShellNav({ projectId }: ProjectShellNavProps) {
  const pathname = usePathname();

  return (
    <nav className="overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-card">
      <div className="flex min-w-max gap-2">
        {getProjectTabs(projectId).map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-brand-600 text-white"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

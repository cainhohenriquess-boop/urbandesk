"use client";

import { ProjectBadge } from "@/components/projetos/project-detail-components";
import type {
  LightingAutoContext,
  LightingReference,
  LightingTechnicalObjectTypeId,
} from "@/lib/lighting-discipline";
import { getTechnicalObjectLabel } from "@/lib/project-disciplines";
import { formatDistance } from "@/lib/utils";

function ReferenceCard({
  title,
  description,
  reference,
}: {
  title: string;
  description: string;
  reference: LightingReference | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <ProjectBadge
          label={reference ? "Vinculado" : "Não encontrado"}
          tone={reference ? "success" : "warning"}
        />
      </div>

      {reference ? (
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Identificação</dt>
            <dd className="text-right font-medium text-foreground">
              {reference.identifier || reference.label}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Rótulo importado</dt>
            <dd className="text-right font-medium text-foreground">{reference.label}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Distância</dt>
            <dd className="text-right font-medium text-foreground">
              {formatDistance(reference.distanceMeters)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Circuito</dt>
            <dd className="text-right font-medium text-foreground">
              {reference.circuit || "Não informado"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Logradouro</dt>
            <dd className="text-right font-medium text-foreground">
              {reference.streetName || "Não informado"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhuma referência importada próxima foi encontrada para este item.
        </p>
      )}
    </div>
  );
}

export function ProjectLightingReferencePanel({
  autoContext,
  technicalObjectType,
}: {
  autoContext: LightingAutoContext | null;
  technicalObjectType: LightingTechnicalObjectTypeId;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Contexto assistido
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ProjectBadge label="Disciplina · Iluminação pública" tone="brand" />
          <ProjectBadge
            label={`Tipo · ${getTechnicalObjectLabel(technicalObjectType)}`}
            tone="neutral"
          />
          <ProjectBadge
            label={
              autoContext?.nearestPole || autoContext?.nearestLightingPoint
                ? "Base elétrica encontrada"
                : "Sem referência importada próxima"
            }
            tone={
              autoContext?.nearestPole || autoContext?.nearestLightingPoint
                ? "success"
                : "warning"
            }
          />
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Projeto</dt>
            <dd className="text-right font-medium text-foreground">
              {autoContext?.projectLabel || "Projeto atual"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Rua</dt>
            <dd className="text-right font-medium text-foreground">
              {autoContext?.streetName || "Não identificada"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Bairro / região</dt>
            <dd className="text-right font-medium text-foreground">
              {[autoContext?.neighborhood, autoContext?.region].filter(Boolean).join(" · ") ||
                "Não informado"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Circuito sugerido</dt>
            <dd className="text-right font-medium text-foreground">
              {autoContext?.suggestedCircuit || "Não disponível"}
            </dd>
          </div>
        </dl>
      </div>

      <ReferenceCard
        title="Base PONNOT"
        description="Poste ou ponto de referência elétrico mais próximo."
        reference={autoContext?.nearestPole ?? null}
      />

      <ReferenceCard
        title="Base PONT_ILUM"
        description="Ponto importado de iluminação pública mais próximo."
        reference={autoContext?.nearestLightingPoint ?? null}
      />
    </div>
  );
}

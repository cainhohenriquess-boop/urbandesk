"use client";

import { ProjectBadge } from "@/components/projetos/project-detail-components";
import { ProjectMapTechnicalForm } from "@/components/projetos/project-map-technical-form";
import type {
  LightingAutoContext,
  LightingPointAssessment,
  LightingTechnicalObjectTypeId,
} from "@/lib/lighting-discipline";
import { getTechnicalObjectLabel, type TechnicalFieldDefinition } from "@/lib/project-disciplines";

type ProjectLightingPointFormProps = {
  autoContext: LightingAutoContext | null;
  technicalObjectType: LightingTechnicalObjectTypeId;
  assessment: LightingPointAssessment | null;
  fields: TechnicalFieldDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
};

export function ProjectLightingPointForm({
  autoContext,
  technicalObjectType,
  assessment,
  fields,
  values,
  onChange,
}: ProjectLightingPointFormProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Contexto operacional
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ProjectBadge label={`Tipo · ${getTechnicalObjectLabel(technicalObjectType)}`} tone="brand" />
          <ProjectBadge
            label={autoContext?.municipalityName || "Município não identificado"}
            tone="neutral"
          />
          <ProjectBadge label={autoContext?.projectLabel || "Projeto atual"} tone="success" />
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Projeto</dt>
            <dd className="text-right font-medium text-foreground">
              {autoContext?.projectLabel || "Projeto atual"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Município</dt>
            <dd className="text-right font-medium text-foreground">
              {[autoContext?.municipalityName, autoContext?.municipalityState]
                .filter(Boolean)
                .join(" · ") || "Não informado"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Logradouro</dt>
            <dd className="text-right font-medium text-foreground">
              {autoContext?.streetName || "Não identificado"}
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
              {autoContext?.suggestedCircuit || values.powerCircuit || "Não disponível"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-border bg-background px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Referências importadas
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
            <p className="text-xs font-semibold text-foreground">Base PONNOT</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {autoContext?.nearestPole?.identifier || autoContext?.nearestPole?.label || "Não encontrada"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {autoContext?.nearestPole?.supportType || "Sem material importado"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
            <p className="text-xs font-semibold text-foreground">Base PONT_ILUM</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {autoContext?.nearestLightingPoint?.label || "Não encontrada"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {autoContext?.nearestLightingPoint?.lampType || "Sem tipo de luminária importado"}
            </p>
          </div>
        </div>
      </div>

      {assessment?.warnings.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <p className="font-semibold">Atenção operacional</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {assessment.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          O formulário foi contextualizado com o projeto atual e com as referências importadas
          encontradas nas proximidades.
        </div>
      )}

      <ProjectMapTechnicalForm fields={fields} values={values} onChange={onChange} />
    </div>
  );
}

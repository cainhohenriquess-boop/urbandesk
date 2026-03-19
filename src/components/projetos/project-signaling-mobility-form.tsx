"use client";

import { ProjectBadge } from "@/components/projetos/project-detail-components";
import { ProjectMapTechnicalForm } from "@/components/projetos/project-map-technical-form";
import type {
  SignalingMobilityAssessment,
  SignalingMobilityAutoContext,
  SignalingMobilityTechnicalObjectTypeId,
} from "@/lib/signaling-mobility";
import {
  getProjectDisciplineLabel,
  getTechnicalObjectLabel,
  type ProjectDisciplineId,
  type TechnicalFieldDefinition,
} from "@/lib/project-disciplines";
import { formatCoords, formatDateTime } from "@/lib/utils";

type ProjectSignalingMobilityFormProps = {
  autoContext: SignalingMobilityAutoContext | null;
  technicalArea: ProjectDisciplineId;
  technicalObjectType: SignalingMobilityTechnicalObjectTypeId;
  assessment: SignalingMobilityAssessment | null;
  fields: TechnicalFieldDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
};

export function ProjectSignalingMobilityForm({
  autoContext,
  technicalArea,
  technicalObjectType,
  assessment,
  fields,
  values,
  onChange,
}: ProjectSignalingMobilityFormProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Contexto técnico
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ProjectBadge label={getProjectDisciplineLabel(technicalArea)} tone="brand" />
          <ProjectBadge label={getTechnicalObjectLabel(technicalObjectType)} tone="neutral" />
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
            <dt className="text-muted-foreground">Via</dt>
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
            <dt className="text-muted-foreground">Distrito</dt>
            <dd className="text-right font-medium text-foreground">
              {autoContext?.district || "Não informado"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Sentido da via</dt>
            <dd className="text-right font-medium text-foreground">
              {autoContext?.suggestedRoadDirectionLabel || "Não inferido"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Georreferenciamento</dt>
            <dd className="text-right font-medium text-foreground">
              {autoContext?.latitude != null && autoContext?.longitude != null
                ? formatCoords(autoContext.latitude, autoContext.longitude)
                : "Geometria sem âncora calculada"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Usuário responsável</dt>
            <dd className="text-right font-medium text-foreground">
              {autoContext?.creatorName || autoContext?.creatorEmail || "Não informado"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Data do registro</dt>
            <dd className="text-right font-medium text-foreground">
              {autoContext?.createdAtIso ? formatDateTime(autoContext.createdAtIso) : "Agora"}
            </dd>
          </div>
        </dl>
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
          O formulário foi contextualizado com o projeto atual, a geometria lançada no mapa e o
          recorte territorial disponível.
        </div>
      )}

      <ProjectMapTechnicalForm
        title="Formulário técnico de sinalização / mobilidade"
        fields={fields}
        values={values}
        onChange={onChange}
      />
    </div>
  );
}

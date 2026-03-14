"use client";

import { formatBRL, formatDateTime, formatDistance, formatNumber } from "@/lib/utils";
import type { TechnicalFieldDefinition } from "@/lib/project-disciplines";
import type { PavementRoadSegmentAssessment } from "@/lib/pavement-technical";
import type { PavementRoadSegmentAutoContext } from "@/lib/pavement-segment";
import { buildPavementRoadSegmentSuggestedName } from "@/lib/pavement-segment";

const MAIN_KEYS = [
  "roadHierarchy",
  "interventionType",
  "pavementType",
  "laneCount",
  "operationalStatus",
  "criticality",
] as const;

const GUIDED_KEYS = ["surfaceCondition", "interventionPriority"] as const;

type ProjectPavementRoadFormProps = {
  autoContext: PavementRoadSegmentAutoContext | null;
  assessment: PavementRoadSegmentAssessment | null;
  fields: TechnicalFieldDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
};

function findField(fields: TechnicalFieldDefinition[], key: string) {
  return fields.find((field) => field.key === key) ?? null;
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: TechnicalFieldDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  const className =
    "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500";

  if (field.kind === "select") {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} className={className}>
        <option value="">Selecione...</option>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      min={field.kind === "number" ? field.min : undefined}
      max={field.kind === "number" ? field.max : undefined}
      step={field.kind === "number" ? "any" : undefined}
      className={className}
    />
  );
}

function ReadonlyInfo({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-xl border border-border bg-amber-50/70 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

export function ProjectPavementRoadForm({
  autoContext,
  assessment,
  fields,
  values,
  onChange,
}: ProjectPavementRoadFormProps) {
  const mainFields = MAIN_KEYS.map((key) => findField(fields, key)).filter(
    (field): field is TechnicalFieldDefinition => field !== null
  );
  const guidedFields = GUIDED_KEYS.map((key) => findField(fields, key)).filter(
    (field): field is TechnicalFieldDefinition => field !== null
  );
  const widthSourceField = findField(fields, "widthSource");
  const widthField = findField(fields, "widthMeters");
  const costField = findField(fields, "estimatedUnitCostSqm");

  return (
    <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
          Cadastro assistido de pavimentação
        </p>
        <h4 className="mt-1 text-sm font-semibold text-foreground">Ficha técnica do trecho viário</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          O sistema calcula comprimento, sugere largura, área, condição, prioridade e custo
          estimado para agilizar o lançamento técnico no mapa.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ReadonlyInfo
          label="Comprimento"
          value={autoContext ? formatDistance(autoContext.lengthMeters) : "Calculando..."}
        />
        <ReadonlyInfo
          label="Rua"
          value={autoContext?.streetName ?? "Não identificada automaticamente"}
        />
        <ReadonlyInfo label="Projeto" value={autoContext?.projectLabel ?? "Projeto atual"} />
        <ReadonlyInfo
          label="Bairro / região"
          value={
            [autoContext?.neighborhood, autoContext?.district, autoContext?.region]
              .filter(Boolean)
              .join(" · ") || "Não informado"
          }
        />
        <ReadonlyInfo
          label="Largura efetiva"
          value={
            assessment?.effectiveWidthMeters
              ? `${formatNumber(assessment.effectiveWidthMeters)} m`
              : "Aguardando parâmetros"
          }
          helper={assessment?.widthWasEstimated ? "Valor estimado automaticamente." : "Valor informado manualmente."}
        />
        <ReadonlyInfo
          label="Área estimada"
          value={assessment?.areaSqm ? `${formatNumber(assessment.areaSqm)} m²` : "Não calculada"}
        />
        <ReadonlyInfo
          label="Custo estimado"
          value={assessment?.estimatedTotalCost ? formatBRL(assessment.estimatedTotalCost) : "Não aplicável"}
          helper={
            assessment?.estimatedUnitCostSqm
              ? `${formatBRL(assessment.estimatedUnitCostSqm)}/m²`
              : "Sem referência de custo para o contexto atual."
          }
        />
        <ReadonlyInfo
          label="Condição sugerida"
          value={assessment?.suggestedSurfaceCondition ?? "Aguardando análise"}
        />
        <ReadonlyInfo
          label="Prioridade sugerida"
          value={assessment?.suggestedPriority ?? "Aguardando análise"}
        />
        <ReadonlyInfo
          label="Criado por"
          value={autoContext?.creatorName ?? autoContext?.creatorEmail ?? "Usuário autenticado"}
        />
        <ReadonlyInfo
          label="Data"
          value={autoContext ? formatDateTime(autoContext.createdAtIso) : "Agora"}
        />
        <ReadonlyInfo
          label="Nome sugerido"
          value={
            autoContext
              ? buildPavementRoadSegmentSuggestedName(autoContext, values)
              : "Aguardando geometria"
          }
        />
      </div>

      {autoContext?.geometryValidation.errors?.length ? (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-danger-700">
            Validação geométrica
          </p>
          <ul className="mt-2 space-y-1 text-sm text-danger-900">
            {autoContext.geometryValidation.errors.map((error) => (
              <li key={error}>• {error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {(autoContext?.geometryValidation.warnings?.length || assessment?.warnings.length) ? (
        <div className="rounded-xl border border-amber-200 bg-white/80 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
            Observações automáticas
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {autoContext?.geometryValidation.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
            {assessment?.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {assessment?.errors.length ? (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-danger-700">
            Ajustes necessários
          </p>
          <ul className="mt-2 space-y-1 text-sm text-danger-900">
            {assessment.errors.map((error) => (
              <li key={error}>• {error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        {widthSourceField ? (
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-foreground">{widthSourceField.label}</span>
            <FieldControl
              field={widthSourceField}
              value={values.widthSource ?? "ESTIMADA"}
              onChange={(value) => onChange("widthSource", value)}
            />
          </label>
        ) : null}

        {widthField ? (
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-foreground">{widthField.label}</span>
            <FieldControl
              field={widthField}
              value={values.widthMeters ?? ""}
              onChange={(value) => {
                if ((values.widthSource ?? "ESTIMADA") !== "INFORMADA") {
                  onChange("widthSource", "INFORMADA");
                }
                onChange("widthMeters", value);
              }}
            />
            <span className="text-xs text-muted-foreground">
              {values.widthSource === "INFORMADA"
                ? "A largura manual prevalece sobre a estimativa automática."
                : widthField.helper ?? "A largura será estimada automaticamente."}
            </span>
          </label>
        ) : null}

        {costField ? (
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-foreground">{costField.label}</span>
            <FieldControl
              field={costField}
              value={values.estimatedUnitCostSqm ?? ""}
              onChange={(value) => onChange("estimatedUnitCostSqm", value)}
            />
            <span className="text-xs text-muted-foreground">
              {costField.helper}
            </span>
          </label>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {mainFields.map((field) => (
          <label key={field.key} className="grid gap-1.5">
            <span className="text-xs font-semibold text-foreground">
              {field.label}
              {field.required ? " *" : ""}
            </span>
            <FieldControl
              field={field}
              value={values[field.key] ?? ""}
              onChange={(value) => onChange(field.key, value)}
            />
            {field.helper ? <span className="text-xs text-muted-foreground">{field.helper}</span> : null}
          </label>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-white/80 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Classificação assistida
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {guidedFields.map((field) => (
            <label key={field.key} className="grid gap-1.5">
              <span className="text-xs font-semibold text-foreground">
                {field.label}
                {field.required ? " *" : ""}
              </span>
              <FieldControl
                field={field}
                value={values[field.key] ?? ""}
                onChange={(value) => onChange(field.key, value)}
              />
              <span className="text-xs text-muted-foreground">
                {field.key === "surfaceCondition"
                  ? "A sugestão considera status operacional e tipo de intervenção."
                  : "A prioridade sugerida combina condição, hierarquia viária e impacto operacional."}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

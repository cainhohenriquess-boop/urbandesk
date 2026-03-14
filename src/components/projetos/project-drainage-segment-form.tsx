"use client";

import { formatDateTime, formatDistance } from "@/lib/utils";
import type { TechnicalFieldDefinition } from "@/lib/project-disciplines";
import type {
  DrainageSegmentAssessment,
  DrainageSegmentAutoContext,
} from "@/lib/drainage-segment";
import { buildDrainageSegmentSuggestedName } from "@/lib/drainage-segment";

const PRIMARY_KEYS = [
  "networkMaterial",
  "diameterMm",
  "sectionType",
  "depthClass",
  "assetCondition",
  "operationalStatus",
  "priority",
  "criticality",
] as const;

const SECONDARY_KEYS = [
  "drainageSegmentType",
  "flowDirection",
  "hydraulicCondition",
] as const;

type ProjectDrainageSegmentFormProps = {
  autoContext: DrainageSegmentAutoContext | null;
  assessment: DrainageSegmentAssessment | null;
  fields: TechnicalFieldDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
};

function findField(fields: TechnicalFieldDefinition[], key: string) {
  return fields.find((field) => field.key === key) ?? null;
}

function SelectField({
  field,
  value,
  onChange,
}: {
  field: TechnicalFieldDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-foreground">
        {field.label}
        {field.required ? " *" : ""}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500"
      >
        <option value="">Selecione...</option>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {field.helper ? (
        <span className="text-xs text-muted-foreground">{field.helper}</span>
      ) : null}
    </label>
  );
}

function ReadonlyInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function ProjectDrainageSegmentForm({
  autoContext,
  assessment,
  fields,
  values,
  onChange,
}: ProjectDrainageSegmentFormProps) {
  const primaryFields = PRIMARY_KEYS.map((key) => findField(fields, key)).filter(
    (field): field is TechnicalFieldDefinition => field !== null
  );
  const secondaryFields = SECONDARY_KEYS.map((key) => findField(fields, key)).filter(
    (field): field is TechnicalFieldDefinition => field !== null
  );

  return (
    <div className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
          Cadastro assistido de drenagem
        </p>
        <h4 className="mt-1 text-sm font-semibold text-foreground">
          Ficha técnica do trecho de drenagem
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          O sistema calcula o comprimento e reaproveita o contexto espacial do projeto
          para agilizar o cadastro técnico.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ReadonlyInfo
          label="Comprimento"
          value={autoContext ? formatDistance(autoContext.lengthMeters) : "Calculando..."}
        />
        <ReadonlyInfo
          label="Rua"
          value={autoContext?.streetName ?? "Não identificada automaticamente"}
        />
        <ReadonlyInfo
          label="Bairro"
          value={autoContext?.neighborhood ?? "Não informado"}
        />
        <ReadonlyInfo
          label="Distrito / região"
          value={[autoContext?.district, autoContext?.region].filter(Boolean).join(" · ") || "Não informado"}
        />
        <ReadonlyInfo
          label="Projeto"
          value={autoContext?.projectLabel ?? "Projeto atual"}
        />
        <ReadonlyInfo
          label="Criado por"
          value={autoContext?.creatorName ?? "Usuário autenticado"}
        />
        <ReadonlyInfo
          label="Data"
          value={autoContext ? formatDateTime(autoContext.createdAtIso) : "Agora"}
        />
        <ReadonlyInfo
          label="Nome sugerido"
          value={autoContext ? buildDrainageSegmentSuggestedName(autoContext) : "Aguardando geometria"}
        />
        <ReadonlyInfo
          label="Conexões"
          value={
            autoContext?.startConnection || autoContext?.endConnection
              ? [
                  autoContext?.startConnection ? `Início: ${autoContext.startConnection.label}` : null,
                  autoContext?.endConnection ? `Fim: ${autoContext.endConnection.label}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Nenhuma estrutura próxima encontrada"
          }
        />
        <ReadonlyInfo
          label="Criticidade sugerida"
          value={assessment?.suggestedCriticality ?? "Calculando"}
        />
        <ReadonlyInfo
          label="Risco operacional"
          value={assessment?.riskLevel ?? "Calculando"}
        />
      </div>

      {assessment?.reason ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
            Critério da classificação
          </p>
          <p className="mt-1 text-sm text-amber-900">{assessment.reason}</p>
        </div>
      ) : null}

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

      {autoContext?.geometryValidation.warnings?.length ? (
        <div className="rounded-xl border border-sky-200 bg-white/80 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
            Observações automáticas
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {autoContext.geometryValidation.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {primaryFields.map((field) => (
          <SelectField
            key={field.key}
            field={field}
            value={values[field.key] ?? ""}
            onChange={(value) => onChange(field.key, value)}
          />
        ))}
      </div>

      {secondaryFields.length > 0 ? (
        <div className="rounded-xl border border-border bg-white/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Complementos técnicos
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {secondaryFields.map((field) => (
              <SelectField
                key={field.key}
                field={field}
                value={values[field.key] ?? ""}
                onChange={(value) => onChange(field.key, value)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

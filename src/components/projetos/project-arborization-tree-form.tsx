"use client";

import { formatDateTime, formatCoords, formatDistance } from "@/lib/utils";
import { ProjectMapTechnicalForm } from "@/components/projetos/project-map-technical-form";
import type { TechnicalFieldDefinition } from "@/lib/project-disciplines";
import type {
  ArborizationTreeAssessment,
  ArborizationTreeAutoContext,
} from "@/lib/arborization-tree";
import { buildArborizationTreeSuggestedName } from "@/lib/arborization-tree";

type ProjectArborizationTreeFormProps = {
  autoContext: ArborizationTreeAutoContext | null;
  assessment: ArborizationTreeAssessment | null;
  fields: TechnicalFieldDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
};

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

export function ProjectArborizationTreeForm({
  autoContext,
  assessment,
  fields,
  values,
  onChange,
}: ProjectArborizationTreeFormProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Cadastro assistido de arborização
        </p>
        <h4 className="mt-1 text-sm font-semibold text-foreground">
          Ficha técnica da árvore
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          O sistema reaproveita o contexto espacial do projeto e tenta identificar
          rua, território e proximidade com rede ou equipamentos urbanos.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ReadonlyInfo
          label="Geolocalização"
          value={
            autoContext?.latitude != null && autoContext.longitude != null
              ? formatCoords(autoContext.latitude, autoContext.longitude)
              : "Aguardando ponto válido"
          }
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
          value={
            [autoContext?.district, autoContext?.region].filter(Boolean).join(" · ") ||
            "Não informado"
          }
        />
        <ReadonlyInfo
          label="Município / projeto"
          value={
            [autoContext?.municipalityName, autoContext?.projectLabel]
              .filter(Boolean)
              .join(" · ") || "Projeto atual"
          }
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
          value={
            autoContext
              ? buildArborizationTreeSuggestedName(autoContext, values)
              : "Aguardando contexto espacial"
          }
        />
        <ReadonlyInfo
          label="Rede mais próxima"
          value={
            autoContext?.nearestNetworkReference
              ? `${autoContext.nearestNetworkReference.label} · ${formatDistance(
                  autoContext.nearestNetworkReference.distanceMeters
                )}`
              : "Nenhuma referência próxima encontrada"
          }
        />
        <ReadonlyInfo
          label="Equipamento mais próximo"
          value={
            autoContext?.nearestEquipmentReference
              ? `${autoContext.nearestEquipmentReference.label} · ${formatDistance(
                  autoContext.nearestEquipmentReference.distanceMeters
                )}`
              : "Nenhum equipamento próximo encontrado"
          }
        />
        <ReadonlyInfo
          label="Risco sugerido"
          value={assessment?.suggestedRiskLevel ?? "Aguardando avaliação"}
        />
        <ReadonlyInfo
          label="Critério da avaliação"
          value={assessment?.reason ?? "Sem avaliação automática ainda"}
        />
      </div>

      {autoContext?.geometryValidation.errors.length ? (
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

      {autoContext?.warnings.length || assessment?.warnings.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
            Observações automáticas
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {[...(autoContext?.warnings ?? []), ...(assessment?.warnings ?? [])].map(
              (warning) => (
                <li key={warning}>• {warning}</li>
              )
            )}
          </ul>
        </div>
      ) : null}

      <ProjectMapTechnicalForm
        fields={fields}
        values={values}
        onChange={onChange}
        title="Formulário técnico da árvore"
      />
    </div>
  );
}

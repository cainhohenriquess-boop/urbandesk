"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ProjectTechnicalArea } from "@prisma/client";
import {
  ProjectBadge,
  ProjectEmptyBlock,
  ProjectMetricCard,
  ProjectProgressCard,
  ProjectSectionCard,
} from "@/components/projetos/project-detail-components";
import {
  getGovernanceTone,
  getProjectMeasurementStatusLabel,
  getProjectTechnicalAreaLabel,
} from "@/lib/project-labels";
import type {
  ProjectMeasurementIndicators,
  SerializedProjectMeasurement,
} from "@/lib/project-measurements";
import { cn, formatBRL, formatDate, formatNumber } from "@/lib/utils";

type MeasurementPhaseOption = {
  id: string;
  name: string;
  sequence: number;
  technicalArea: ProjectTechnicalArea | null;
  status: string;
};

type MeasurementContractOption = {
  id: string;
  title: string;
  contractNumber: string | null;
  status: string;
  contractedAmount: number | null;
};

type MeasurementOptions = {
  technicalAreas: ProjectTechnicalArea[];
  phases: MeasurementPhaseOption[];
  contracts: MeasurementContractOption[];
};

type ProjectMeasurementsClientProps = {
  projectId: string;
  projectCode: string | null;
  projectName: string;
  initialMeasurements: SerializedProjectMeasurement[];
  initialIndicators: ProjectMeasurementIndicators;
  initialOptions: MeasurementOptions;
};

type MeasurementFormState = {
  referenceMonth: string;
  periodStart: string;
  periodEnd: string;
  phaseId: string;
  contractId: string;
  technicalArea: "" | ProjectTechnicalArea;
  status: SerializedProjectMeasurement["status"];
  physicalProgressPct: string;
  measuredAmount: string;
  approvedAmount: string;
  paidAmount: string;
  notes: string;
};

const EMPTY_FORM: MeasurementFormState = {
  referenceMonth: "",
  periodStart: "",
  periodEnd: "",
  phaseId: "",
  contractId: "",
  technicalArea: "",
  status: "RASCUNHO",
  physicalProgressPct: "0",
  measuredAmount: "",
  approvedAmount: "",
  paidAmount: "",
  notes: "",
};

function toMonthInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toCurrencyInput(value: number | null) {
  return value === null ? "" : String(value);
}

function toFormState(measurement: SerializedProjectMeasurement): MeasurementFormState {
  return {
    referenceMonth: toMonthInput(measurement.referenceMonth),
    periodStart: toDateInput(measurement.periodStart),
    periodEnd: toDateInput(measurement.periodEnd),
    phaseId: measurement.phase?.id ?? "",
    contractId: measurement.contract?.id ?? "",
    technicalArea: measurement.technicalArea ?? "",
    status: measurement.status,
    physicalProgressPct: String(measurement.physicalProgressPct),
    measuredAmount: toCurrencyInput(measurement.measuredAmount),
    approvedAmount: toCurrencyInput(measurement.approvedAmount),
    paidAmount: toCurrencyInput(measurement.paidAmount),
    notes: measurement.notes ?? "",
  };
}

function formatMoney(value: number | null | undefined) {
  return value === null || value === undefined ? "Não informado" : formatBRL(value);
}

function formatCompactMonth(value: string | null) {
  if (!value) return "Sem competência";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem competência";
  return new Intl.DateTimeFormat("pt-BR", {
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatFileSize(value: number | null | undefined) {
  if (!value || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectMeasurementsClient({
  projectId,
  projectCode,
  projectName,
  initialMeasurements,
  initialIndicators,
  initialOptions,
}: ProjectMeasurementsClientProps) {
  const router = useRouter();
  const [measurements, setMeasurements] = useState(initialMeasurements);
  const [indicators, setIndicators] = useState(initialIndicators);
  const [options, setOptions] = useState(initialOptions);
  const [form, setForm] = useState<MeasurementFormState>(EMPTY_FORM);
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const phaseMap = useMemo(
    () => new Map(options.phases.map((phase) => [phase.id, phase])),
    [options.phases]
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingMeasurementId(null);
    setPendingFiles([]);
  };

  const syncResponseState = (payload: {
    data?: SerializedProjectMeasurement[];
    indicators?: ProjectMeasurementIndicators;
    options?: MeasurementOptions;
  }) => {
    if (payload.data) setMeasurements(payload.data);
    if (payload.indicators) setIndicators(payload.indicators);
    if (payload.options) setOptions(payload.options);
  };

  const refreshMeasurements = async () => {
    setRefreshing(true);
    setSubmitError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/measurements`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao recarregar medições.");
      }

      syncResponseState(payload as {
        data?: SerializedProjectMeasurement[];
        indicators?: ProjectMeasurementIndicators;
        options?: MeasurementOptions;
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Falha ao recarregar medições."
      );
    } finally {
      setRefreshing(false);
    }
  };

  const uploadAttachments = async (measurementId: string) => {
    if (pendingFiles.length === 0) return;

    const formData = new FormData();
    for (const file of pendingFiles) {
      formData.append("files", file);
    }

    const response = await fetch(
      `/api/projects/${projectId}/measurements/${measurementId}/attachments`,
      {
        method: "POST",
        body: formData,
      }
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Falha ao enviar anexos da medição.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSubmitError(null);
    setFeedback(null);

    try {
      if (!form.referenceMonth) {
        throw new Error("Informe a competência da medição.");
      }

      const body = {
        referenceMonth: `${form.referenceMonth}-01`,
        periodStart: form.periodStart || null,
        periodEnd: form.periodEnd || null,
        phaseId: form.phaseId || null,
        contractId: form.contractId || null,
        technicalArea: form.technicalArea || null,
        status: form.status,
        physicalProgressPct: Number(form.physicalProgressPct || "0"),
        measuredAmount: Number(form.measuredAmount || "0"),
        approvedAmount: form.approvedAmount.trim() ? Number(form.approvedAmount) : null,
        paidAmount: form.paidAmount.trim() ? Number(form.paidAmount) : null,
        notes: form.notes.trim() || null,
      };

      if (!Number.isFinite(body.measuredAmount) || body.measuredAmount < 0) {
        throw new Error("Informe um valor medido válido.");
      }

      const endpoint = editingMeasurementId
        ? `/api/projects/${projectId}/measurements/${editingMeasurementId}`
        : `/api/projects/${projectId}/measurements`;
      const method = editingMeasurementId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Falha ao salvar medição.");
      }

      syncResponseState(payload as {
        data?: SerializedProjectMeasurement[];
        indicators?: ProjectMeasurementIndicators;
        options?: MeasurementOptions;
        measurement?: SerializedProjectMeasurement | null;
      });

      const measurementId =
        payload && typeof payload === "object" && "measurement" in payload
          ? (payload.measurement as SerializedProjectMeasurement | null)?.id ?? null
          : null;

      if (measurementId && pendingFiles.length > 0) {
        await uploadAttachments(measurementId);
        await refreshMeasurements();
      }

      resetForm();
      setFeedback(
        editingMeasurementId
          ? "Medição atualizada com sucesso."
          : "Medição registrada com sucesso."
      );
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Falha ao salvar medição.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-4">
        <ProjectMetricCard
          label="Medições"
          value={formatNumber(indicators.totalMeasurements)}
          helper="Competências registradas no projeto."
        />
        <ProjectMetricCard
          label="Medido no período"
          value={formatMoney(indicators.latestMeasuredAmount)}
          helper="Valor da competência mais recente."
        />
        <ProjectMetricCard
          label="Aprovado no período"
          value={formatMoney(indicators.latestApprovedAmount)}
          helper="Valor validado na última medição."
        />
        <ProjectMetricCard
          label="Acumulado aprovado"
          value={formatMoney(indicators.accumulatedApprovedAmount)}
          helper="Consolidado usado para leitura financeira institucional."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ProjectProgressCard
          label="Avanço físico atual"
          value={indicators.latestPhysicalProgressPct}
          helper="Percentual físico reportado na medição mais recente."
          tone="brand"
        />
        <ProjectProgressCard
          label="Avanço financeiro atual"
          value={indicators.latestFinancialProgressPct}
          helper="Percentual financeiro derivado do acumulado em relação ao contrato/projeto."
          tone="success"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ProjectSectionCard
          eyebrow="Medições"
          title={editingMeasurementId ? "Editar medição" : "Nova medição"}
          description={`Registro físico-financeiro por competência para ${projectCode ?? projectName}. O número da medição é gerado automaticamente.`}
          action={
            editingMeasurementId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Cancelar edição
              </button>
            ) : null
          }
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Competência *</span>
                <input
                  type="month"
                  value={form.referenceMonth}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, referenceMonth: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none ring-0 transition focus:border-brand-400"
                  required
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Início do período</span>
                <input
                  type="date"
                  value={form.periodStart}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, periodStart: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Fim do período</span>
                <input
                  type="date"
                  value={form.periodEnd}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, periodEnd: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Área técnica</span>
                <select
                  value={form.technicalArea}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      technicalArea: (event.target.value || "") as "" | ProjectTechnicalArea,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                >
                  <option value="">Sem vínculo por área</option>
                  {options.technicalAreas.map((area) => (
                    <option key={area} value={area}>
                      {getProjectTechnicalAreaLabel(area)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Etapa</span>
                <select
                  value={form.phaseId}
                  onChange={(event) => {
                    const phaseId = event.target.value;
                    const selectedPhase = phaseMap.get(phaseId);
                    setForm((current) => ({
                      ...current,
                      phaseId,
                      technicalArea: selectedPhase?.technicalArea ?? current.technicalArea,
                    }));
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                >
                  <option value="">Projeto geral</option>
                  {options.phases.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {`Fase ${phase.sequence} · ${phase.name}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Contrato</span>
                <select
                  value={form.contractId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, contractId: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                >
                  <option value="">Sem contrato específico</option>
                  {options.contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.contractNumber
                        ? `${contract.contractNumber} · ${contract.title}`
                        : contract.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Status *</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as MeasurementFormState["status"],
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                >
                  {(["RASCUNHO", "SUBMETIDA", "APROVADA", "REJEITADA", "PAGA"] as const).map(
                    (status) => (
                      <option key={status} value={status}>
                        {getProjectMeasurementStatusLabel(status)}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Percentual físico do período *</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.physicalProgressPct}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      physicalProgressPct: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                  required
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Valor medido *</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.measuredAmount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, measuredAmount: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                  required
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Valor aprovado</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.approvedAmount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, approvedAmount: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Valor pago</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.paidAmount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, paidAmount: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Anexos</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv"
                  onChange={(event) => setPendingFiles(Array.from(event.target.files ?? []))}
                  className="w-full rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-medium file:text-brand-700 hover:border-brand-300"
                />
                <p className="text-xs text-muted-foreground">
                  PDF, imagem, planilha ou documento. Os anexos são vinculados à medição após o salvamento.
                </p>
              </label>
            </div>

            {pendingFiles.length > 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Anexos selecionados</p>
                <ul className="mt-2 space-y-1">
                  {pendingFiles.map((file) => (
                    <li key={`${file.name}-${file.size}`}>{file.name}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <label className="block space-y-2 text-sm">
              <span className="font-medium text-foreground">Observações</span>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                rows={4}
                placeholder="Contexto da competência, ressalvas, encaminhamentos e observações institucionais."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-brand-400"
              />
            </label>

            {submitError ? (
              <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                {submitError}
              </div>
            ) : null}

            {feedback ? (
              <div className="rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
                {feedback}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className={cn(
                  "rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500",
                  saving && "cursor-not-allowed opacity-70"
                )}
              >
                {saving
                  ? editingMeasurementId
                    ? "Salvando alterações..."
                    : "Registrando medição..."
                  : editingMeasurementId
                    ? "Salvar alterações"
                    : "Registrar medição"}
              </button>
              <button
                type="button"
                disabled={refreshing}
                onClick={() => void refreshMeasurements()}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                {refreshing ? "Recarregando..." : "Recarregar dados"}
              </button>
            </div>
          </form>
        </ProjectSectionCard>

        <ProjectSectionCard
          eyebrow="Indicadores derivados"
          title="Leitura física e financeira"
          description="Consolidação pronta para dashboards e relatórios institucionais do projeto."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ProjectMetricCard
              label="Acumulado medido"
              value={formatMoney(indicators.accumulatedMeasuredAmount)}
              helper="Soma de todos os valores medidos até a competência mais recente."
            />
            <ProjectMetricCard
              label="Acumulado pago"
              value={formatMoney(indicators.accumulatedPaidAmount)}
              helper="Base para leitura de execução financeira liquidada."
            />
            <ProjectMetricCard
              label="Pendente de aprovação"
              value={formatMoney(indicators.pendingApprovalAmount)}
              helper="Diferença entre o medido e o aprovado."
            />
            <ProjectMetricCard
              label="Pendente de pagamento"
              value={formatMoney(indicators.pendingPaymentAmount)}
              helper="Diferença entre o aprovado e o já pago."
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Por área técnica
              </p>
              <div className="mt-3 space-y-3">
                {indicators.byTechnicalArea.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    As medições ainda não foram vinculadas a uma área técnica.
                  </p>
                ) : (
                  indicators.byTechnicalArea.map((item) => (
                    <div key={item.technicalArea} className="rounded-lg border border-border px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">
                          {getProjectTechnicalAreaLabel(item.technicalArea)}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatNumber(item.count)} medição(ões)
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Medido {formatMoney(item.measuredAmount)} · Aprovado {formatMoney(item.approvedAmount)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Série por competência
              </p>
              <div className="mt-3 space-y-3">
                {indicators.byReferenceMonth.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Cadastre medições para montar a série de competências do projeto.
                  </p>
                ) : (
                  indicators.byReferenceMonth.map((item) => (
                    <div key={`series-${item.measurementNumber}`} className="rounded-lg border border-border px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{item.label}</p>
                        <span className="text-xs text-muted-foreground">#{item.measurementNumber}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Medido {formatMoney(item.measuredAmount)} · Acumulado aprovado {formatMoney(item.accumulatedApprovedAmount)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </ProjectSectionCard>
      </div>

      <ProjectSectionCard
        eyebrow="Linha de medições"
        title="Histórico físico-financeiro"
        description="Cada competência registra período, valor do período, acumulado, anexos e vínculo opcional com área técnica."
      >
        {measurements.length === 0 ? (
          <ProjectEmptyBlock
            title="Sem medições registradas"
            description="Cadastre a primeira competência para acompanhar evolução física, financeira e documental do projeto."
          />
        ) : (
          <div className="space-y-4">
            {measurements.map((measurement) => (
              <article
                key={measurement.id}
                className="rounded-xl border border-border bg-background px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-foreground">
                        Medição #{measurement.measurementNumber}
                      </p>
                      {measurement.technicalArea ? (
                        <ProjectBadge
                          label={getProjectTechnicalAreaLabel(measurement.technicalArea)}
                          tone="brand"
                        />
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatCompactMonth(measurement.referenceMonth)}
                      {measurement.periodStart || measurement.periodEnd
                        ? ` · ${measurement.periodStart ? formatDate(measurement.periodStart) : "-"} até ${measurement.periodEnd ? formatDate(measurement.periodEnd) : "-"}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ProjectBadge
                      label={getProjectMeasurementStatusLabel(measurement.status)}
                      tone={getGovernanceTone(measurement.status)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMeasurementId(measurement.id);
                        setForm(toFormState(measurement));
                        setPendingFiles([]);
                        setFeedback(null);
                        setSubmitError(null);
                      }}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                    >
                      Editar
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Valor medido</p>
                    <p className="mt-1 font-medium text-foreground">{formatMoney(measurement.measuredAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Valor aprovado</p>
                    <p className="mt-1 font-medium text-foreground">{formatMoney(measurement.approvedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Acumulado medido</p>
                    <p className="mt-1 font-medium text-foreground">{formatMoney(measurement.accumulatedMeasuredAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Acumulado aprovado</p>
                    <p className="mt-1 font-medium text-foreground">{formatMoney(measurement.accumulatedApprovedAmount)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Avanço físico</p>
                    <p className="mt-1 font-medium text-foreground">{measurement.physicalProgressPct}%</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Avanço financeiro</p>
                    <p className="mt-1 font-medium text-foreground">{measurement.financialProgressPct}%</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Etapa</p>
                    <p className="mt-1 font-medium text-foreground">
                      {measurement.phase
                        ? `Fase ${measurement.phase.sequence} · ${measurement.phase.name}`
                        : "Projeto geral"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Contrato</p>
                    <p className="mt-1 font-medium text-foreground">
                      {measurement.contract?.title ?? "Sem contrato específico"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Responsável pelo registro</p>
                    <p className="mt-1 font-medium text-foreground">
                      {measurement.measuredBy?.name ?? "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Aprovado por</p>
                    <p className="mt-1 font-medium text-foreground">
                      {measurement.approvedBy?.name ?? "Não aprovado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Anexos</p>
                    <p className="mt-1 font-medium text-foreground">
                      {formatNumber(measurement.attachments.length)} arquivo(s)
                    </p>
                  </div>
                </div>

                {measurement.notes ? (
                  <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    {measurement.notes}
                  </div>
                ) : null}

                {measurement.attachments.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-border bg-card px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Anexos</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {measurement.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.fileUrl ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            "rounded-lg border border-border px-3 py-3 transition hover:border-brand-300 hover:bg-muted/40",
                            !attachment.fileUrl && "pointer-events-none opacity-70"
                          )}
                        >
                          <p className="font-medium text-foreground">{attachment.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{attachment.fileName}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {formatFileSize(attachment.fileSize)}
                            {attachment.documentDate ? ` · ${formatDate(attachment.documentDate)}` : ""}
                          </p>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </ProjectSectionCard>
    </div>
  );
}

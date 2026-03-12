import type { TenantLifecycleStatus } from "@/lib/auth-shared";

export type BillingStatus = "ACTIVE" | "TRIAL" | "PAST_DUE" | "SUSPENDED";
export type InvoiceLifecycleStatus = "PENDENTE" | "PAGO" | "VENCIDO" | "CANCELADO";

export const BILLING_STATUS_META: Record<
  BillingStatus,
  { label: string; description: string; className: string }
> = {
  ACTIVE: {
    label: "Active",
    description: "Assinatura em dia e acesso liberado.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  TRIAL: {
    label: "Trial",
    description: "Periodo de avaliacao com recursos liberados.",
    className: "border-brand-200 bg-brand-50 text-brand-700",
  },
  PAST_DUE: {
    label: "Past Due",
    description: "Existe fatura pendente que exige regularizacao.",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  SUSPENDED: {
    label: "Suspended",
    description: "Tenant sem acesso ativo ate regularizacao.",
    className: "border-danger-200 bg-danger-50 text-danger-700",
  },
};

export const INVOICE_STATUS_META: Record<
  InvoiceLifecycleStatus,
  { label: string; className: string }
> = {
  PAGO: {
    label: "Pago",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  PENDENTE: {
    label: "Pendente",
    className: "border-brand-200 bg-brand-50 text-brand-700",
  },
  VENCIDO: {
    label: "Vencido",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  CANCELADO: {
    label: "Cancelado",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
};

export function isExpiredTrial(trialEndsAt?: Date | string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() < Date.now();
}

export function getTrialDaysLeft(trialEndsAt?: Date | string | null): number | null {
  if (!trialEndsAt) return null;
  return Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000);
}

export function toBillingStatus(
  tenantStatus?: TenantLifecycleStatus | null,
  trialEndsAt?: Date | string | null
): BillingStatus {
  if (tenantStatus === "ATIVO") return "ACTIVE";
  if (tenantStatus === "INADIMPLENTE") return "PAST_DUE";
  if (tenantStatus === "CANCELADO") return "SUSPENDED";
  if (tenantStatus === "TRIAL") {
    return isExpiredTrial(trialEndsAt) ? "SUSPENDED" : "TRIAL";
  }

  return "SUSPENDED";
}


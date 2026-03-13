import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn, formatBRL, formatDate } from "@/lib/utils";
import { BILLING_STATUS_META, getTrialDaysLeft, INVOICE_STATUS_META, isExpiredTrial, toBillingStatus } from "@/lib/billing";
import { getBillingGatewayAdapter } from "@/lib/billing-gateway";

type BillingPageProps = {
  searchParams?: Promise<{ reason?: string | string[] }>;
};

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const safeParams = (await searchParams) ?? {};
  const reason = typeof safeParams.reason === "string" ? safeParams.reason : undefined;

  const cookieStore = await cookies();
  const user = session.user;
  const impersonatedTenantId =
    user.role === "SUPERADMIN" ? cookieStore.get("impersonate_tenant")?.value : undefined;
  const tenantId = impersonatedTenantId ?? user.tenantId ?? null;

  if (!tenantId) {
    if (user.role === "SUPERADMIN") {
      return (
        <div className="space-y-4">
          <h1 className="font-display text-2xl font-800 text-foreground">Billing</h1>
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <p className="text-sm text-muted-foreground">
              Nenhum tenant selecionado. Acesse o painel SuperAdmin e use o modo fantasma para abrir o billing de uma prefeitura.
            </p>
            <Link
              href="/superadmin"
              className="mt-4 inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Ir para SuperAdmin
            </Link>
          </div>
        </div>
      );
    }

    redirect("/login?error=tenant_missing");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      plan: true,
      status: true,
      trialEndsAt: true,
      updatedAt: true,
      invoices: {
        select: {
          id: true,
          amount: true,
          status: true,
          dueDate: true,
          paidAt: true,
          createdAt: true,
        },
        orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
        take: 30,
      },
    },
  });

  if (!tenant) {
    redirect("/login?error=tenant_missing");
  }

  const billingStatus = toBillingStatus(tenant.status, tenant.trialEndsAt);
  const billingMeta = BILLING_STATUS_META[billingStatus];
  const trialDaysLeft = getTrialDaysLeft(tenant.trialEndsAt);
  const trialExpired = isExpiredTrial(tenant.trialEndsAt);

  const billingGateway = getBillingGatewayAdapter();
  const portalUrl = await billingGateway.getPortalUrl({
    tenantId: tenant.id,
    returnUrl: "/app/billing",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-800 text-foreground">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assinatura, status operacional e faturas do tenant {tenant.name}.
          </p>
        </div>
        <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", billingMeta.className)}>
          {billingMeta.label}
        </span>
      </div>

      {reason && (
        <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-900">
          Seu acesso foi redirecionado para Billing por motivo de {reason === "trial_expired" ? "trial expirado" : "tenant inativo"}.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plano atual</p>
          <p className="mt-2 font-display text-2xl font-800 text-foreground">
            {PLAN_LABELS[tenant.plan] ?? tenant.plan}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Última atualização em {formatDate(tenant.updatedAt)}.</p>
        </article>

        <article className="rounded-xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status do tenant</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{billingMeta.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{billingMeta.description}</p>
        </article>

        <article className="rounded-xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trial</p>
          {tenant.status === "TRIAL" && trialDaysLeft !== null ? (
            <>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {trialExpired ? "Expirado" : `${trialDaysLeft} dia${trialDaysLeft === 1 ? "" : "s"} restante${trialDaysLeft === 1 ? "" : "s"}`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Data limite: {formatDate(tenant.trialEndsAt ?? tenant.updatedAt)}.</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-lg font-semibold text-foreground">Não aplicável</p>
              <p className="mt-1 text-sm text-muted-foreground">O tenant não está em período de trial.</p>
            </>
          )}
        </article>
      </div>

      <section className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-700 text-foreground">Faturas</h2>
          <p className="text-xs text-muted-foreground">Histórico financeiro e vencimentos.</p>
        </div>
        {tenant.invoices.length === 0 ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">
            Nenhuma fatura cadastrada para este tenant.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Fatura", "Status", "Vencimento", "Pagamento", "Valor"].map((header) => (
                    <th
                      key={header}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenant.invoices.map((invoice) => {
                  const statusMeta = INVOICE_STATUS_META[invoice.status];
                  return (
                    <tr key={invoice.id} className="hover:bg-muted/20">
                      <td className="px-5 py-3.5 font-medium text-foreground">{invoice.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-5 py-3.5">
                        <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold", statusMeta.className)}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{formatDate(invoice.dueDate)}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {invoice.paidAt ? formatDate(invoice.paidAt) : "-"}
                      </td>
                      <td className="px-5 py-3.5 font-medium tabular-num text-foreground">{formatBRL(Number(invoice.amount))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-sm font-700 text-foreground">Gateway de cobrança</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Provider configurado:{" "}
          <span className="font-semibold text-foreground">
            {billingGateway.provider === "none" ? "Não configurado" : billingGateway.provider.toUpperCase()}
          </span>
          .
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {portalUrl ? (
            <a
              href={portalUrl}
              className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              rel="noreferrer"
              target="_blank"
            >
              Abrir portal do gateway
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center rounded-md border border-border px-4 py-2 text-sm font-semibold text-muted-foreground"
            >
              Portal indisponível
            </button>
          )}
          <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
            src/lib/billing-gateway.ts
          </code>
        </div>
      </section>
    </div>
  );
}

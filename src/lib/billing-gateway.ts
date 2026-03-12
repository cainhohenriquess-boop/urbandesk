export type BillingGatewayProvider = "none" | "stripe" | "asaas" | "iugu";

export interface BillingPortalInput {
  tenantId: string;
  returnUrl: string;
}

export interface BillingGatewayAdapter {
  provider: BillingGatewayProvider;
  getPortalUrl(input: BillingPortalInput): Promise<string | null>;
}

const NoopGatewayAdapter: BillingGatewayAdapter = {
  provider: "none",
  async getPortalUrl(_input) {
    return null;
  },
};

function createPlaceholderAdapter(provider: Exclude<BillingGatewayProvider, "none">): BillingGatewayAdapter {
  return {
    provider,
    async getPortalUrl(_input) {
      return null;
    },
  };
}

export function getBillingGatewayAdapter(
  provider = process.env.BILLING_GATEWAY_PROVIDER
): BillingGatewayAdapter {
  const normalized = (provider ?? "").trim().toLowerCase();

  if (normalized === "stripe") return createPlaceholderAdapter("stripe");
  if (normalized === "asaas") return createPlaceholderAdapter("asaas");
  if (normalized === "iugu") return createPlaceholderAdapter("iugu");

  return NoopGatewayAdapter;
}


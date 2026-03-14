import { prisma } from "@/lib/prisma";
import { InfrastructureLayerManager } from "@/components/superadmin/infrastructure-layer-manager";

export const dynamic = "force-dynamic";

export default async function SuperAdminInfrastructureLayersPage({
  searchParams,
}: {
  searchParams?: Promise<{ tenantId?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const preselectedTenantId =
    typeof resolvedSearchParams.tenantId === "string"
      ? resolvedSearchParams.tenantId
      : null;

  const [tenants, layers] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        status: true,
      },
    }),
    prisma.infrastructureLayer.findMany({
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        authorizedTenants: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                state: true,
                status: true,
              },
            },
          },
          orderBy: {
            tenant: {
              name: "asc",
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="max-w-4xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
          Superadmin GIS
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
          Publicação de camadas elétricas
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Faça upload dos shapefiles `PONNOT` e `PONT_ILUM`, valide o pacote,
          vincule as prefeituras autorizadas e disponibilize essas camadas no
          mapa institucional sem misturar com as baselayers próprias de cada
          município.
        </p>
      </div>

      <InfrastructureLayerManager
        tenants={tenants}
        layers={layers.map((layer) => ({
          ...layer,
          createdAt: layer.createdAt.toISOString(),
        }))}
        preselectedTenantId={preselectedTenantId}
      />
    </div>
  );
}

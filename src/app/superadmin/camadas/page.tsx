import { prisma } from "@/lib/prisma";
import { InfrastructureLayerManager } from "@/components/superadmin/infrastructure-layer-manager";
import { ensureInfrastructureLayerSchema } from "@/lib/infrastructure-layer-schema-bootstrap";
import {
  getInfrastructureLayerSchemaCompatibility,
  isInfrastructureLayerSchemaCompatError,
} from "@/lib/infrastructure-layer-schema-compat";

export const dynamic = "force-dynamic";

const tenantSummarySelect = {
  id: true,
  name: true,
  slug: true,
  state: true,
  status: true,
} as const;

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

  let compatibility = await getInfrastructureLayerSchemaCompatibility();

  if (!compatibility.managementReady) {
    try {
      await ensureInfrastructureLayerSchema();
      compatibility = await getInfrastructureLayerSchemaCompatibility();
    } catch (error) {
      console.error("[SUPERADMIN_INFRASTRUCTURE_SCHEMA_ENSURE_ERROR]", error);
    }
  }

  const [tenants, layers, uploads] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: {
        name: "asc",
      },
      select: tenantSummarySelect,
    }),
    compatibility.managementReady
      ? prisma.infrastructureLayer
          .findMany({
            include: {
              ownerTenant: {
                select: tenantSummarySelect,
              },
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
                    select: tenantSummarySelect,
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
          })
          .catch((error) => {
            if (isInfrastructureLayerSchemaCompatError(error)) {
              return [];
            }
            throw error;
          })
      : Promise.resolve([]),
    compatibility.managementReady
      ? prisma.infrastructureLayerUpload
          .findMany({
            include: {
              ownerTenant: {
                select: tenantSummarySelect,
              },
              uploadedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              finalLayer: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  status: true,
                  featureCount: true,
                  createdAt: true,
                },
              },
              authorizedTenants: {
                include: {
                  tenant: {
                    select: tenantSummarySelect,
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
              uploadedAt: "desc",
            },
            take: 50,
          })
          .catch((error) => {
            if (isInfrastructureLayerSchemaCompatError(error)) {
              return [];
            }
            throw error;
          })
      : Promise.resolve([]),
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
          Faça upload dos shapefiles <code>PONNOT</code> e{" "}
          <code>PONT_ILUM</code>, valide o pacote, vincule as prefeituras
          autorizadas e disponibilize essas camadas no mapa institucional sem
          misturar com as baselayers próprias de cada município.
        </p>
      </div>

      <InfrastructureLayerManager
        tenants={tenants}
        layers={layers.map((layer) => ({
          ...layer,
          createdAt: layer.createdAt.toISOString(),
        }))}
        uploads={uploads.map((upload) => ({
          ...upload,
          uploadedAt: upload.uploadedAt.toISOString(),
          processedAt: upload.processedAt?.toISOString() ?? null,
          createdAt: upload.createdAt.toISOString(),
          updatedAt: upload.updatedAt.toISOString(),
          finalLayer: upload.finalLayer
            ? {
                ...upload.finalLayer,
                createdAt: upload.finalLayer.createdAt.toISOString(),
              }
            : null,
        }))}
        preselectedTenantId={preselectedTenantId}
        schemaReady={compatibility.managementReady}
        schemaNotice={compatibility.notice}
      />
    </div>
  );
}


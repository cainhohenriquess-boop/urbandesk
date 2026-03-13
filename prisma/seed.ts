import {
  AssetType,
  Prisma,
  PrismaClient,
  ProjectContractStatus,
  ProjectCriticality,
  ProjectDocumentType,
  ProjectFundingSourceStatus,
  ProjectFundingSourceType,
  ProjectMeasurementStatus,
  ProjectOperationalStatus,
  ProjectPhaseStatus,
  ProjectPriority,
  ProjectStatus,
  ProjectTechnicalArea,
  ProjectType,
  ProjectVisibility,
  TenantPlan,
  TenantStatus,
  UserRole,
} from "@prisma/client";
import { hash as bcryptHash } from "bcryptjs";

const prisma = new PrismaClient();

type SeedUser = { name: string; email: string; role: UserRole; password: string };
type Bundle = {
  project: Prisma.ProjectUncheckedCreateInput;
  funding: Prisma.ProjectFundingSourceUncheckedCreateInput;
  contract: Prisma.ProjectContractUncheckedCreateInput;
  phases: Prisma.ProjectPhaseUncheckedCreateInput[];
  measurement: Prisma.ProjectMeasurementUncheckedCreateInput;
  documents: Prisma.ProjectDocumentUncheckedCreateInput[];
  assets: Prisma.AssetUncheckedCreateInput[];
};

const d = (value: string) => new Date(value);
const point = (lng: number, lat: number) => `POINT(${lng} ${lat})`;
const hash = (value: string) => bcryptHash(value, 10);

async function ensureTenant(data: {
  name: string;
  slug: string;
  cnpj: string;
  state: string;
  plan: TenantPlan;
  status: TenantStatus;
  mrr: number;
  trialEndsAt?: Date;
}) {
  return prisma.tenant.upsert({ where: { slug: data.slug }, update: {}, create: data });
}

async function ensureUsers(users: SeedUser[], tenantId?: string) {
  const created = await Promise.all(
    users.map(async (user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          name: user.name,
          email: user.email,
          passwordHash: await hash(user.password),
          role: user.role,
          tenantId,
        },
      }),
    ),
  );
  return Object.fromEntries(created.map((user) => [user.email, user]));
}

async function reseed(bundles: Bundle[]) {
  const ids = bundles.map((bundle) => bundle.project.id as string);
  await prisma.asset.deleteMany({ where: { projectId: { in: ids } } });
  await prisma.project.deleteMany({ where: { id: { in: ids } } });

  for (const bundle of bundles) {
    await prisma.project.create({ data: bundle.project });
    await prisma.projectFundingSource.create({ data: bundle.funding });
    await prisma.projectContract.create({ data: bundle.contract });
    await prisma.projectPhase.createMany({ data: bundle.phases });
    await prisma.projectMeasurement.create({ data: bundle.measurement });
    await prisma.projectDocument.createMany({ data: bundle.documents });
    await prisma.asset.createMany({ data: bundle.assets });
  }
}

async function main() {
  console.log("Iniciando seed...");

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 10);

  await ensureUsers([
    { name: "Super Admin", email: "admin@urbandesk.com.br", role: UserRole.SUPERADMIN, password: "urbandesk@2025" },
  ]);

  const fortaleza = await ensureTenant({
    name: "Prefeitura de Fortaleza",
    slug: "fortaleza-ce",
    cnpj: "07.954.555/0001-76",
    state: "CE",
    plan: TenantPlan.ENTERPRISE,
    status: TenantStatus.ATIVO,
    mrr: 9600,
  });

  const campinas = await ensureTenant({
    name: "Prefeitura de Campinas",
    slug: "campinas-sp",
    cnpj: "51.885.242/0001-40",
    state: "SP",
    plan: TenantPlan.PRO,
    status: TenantStatus.TRIAL,
    mrr: 0,
    trialEndsAt,
  });

  const fort = await ensureUsers(
    [
      { name: "Ana Secretária", email: "secretaria@fortaleza.ce.gov.br", role: UserRole.SECRETARIO, password: "fortaleza@2025" },
      { name: "Carlos Engenharia", email: "engenharia@fortaleza.ce.gov.br", role: UserRole.ENGENHEIRO, password: "fortaleza@2025" },
      { name: "Pedro Campo", email: "campo@fortaleza.ce.gov.br", role: UserRole.CAMPO, password: "fortaleza@2025" },
    ],
    fortaleza.id,
  );

  const camp = await ensureUsers(
    [
      { name: "João Secretário", email: "secretaria@campinas.sp.gov.br", role: UserRole.SECRETARIO, password: "campinas@2025" },
      { name: "Marina Engenharia", email: "engenharia@campinas.sp.gov.br", role: UserRole.ENGENHEIRO, password: "campinas@2025" },
      { name: "Lucas Campo", email: "campo@campinas.sp.gov.br", role: UserRole.CAMPO, password: "campinas@2025" },
    ],
    campinas.id,
  );

  const bundles: Bundle[] = [
    {
      project: {
        id: "seed-proj-1",
        tenantId: fortaleza.id,
        code: "FOR-2025-001",
        name: "Recapeamento da Av. Bezerra de Menezes",
        description: "Recapeamento e sinalização de corredor arterial.",
        projectType: ProjectType.OBRA,
        responsibleDepartment: "Secretaria Municipal da Infraestrutura",
        responsibleArea: "Pavimentação e Mobilidade",
        technicalAreas: [ProjectTechnicalArea.PAVIMENTACAO, ProjectTechnicalArea.SINALIZACAO],
        neighborhood: "São Gerardo",
        district: "Regional 1",
        region: "Oeste",
        priority: ProjectPriority.ALTA,
        criticality: ProjectCriticality.ALTA,
        status: ProjectStatus.EM_ANDAMENTO,
        operationalStatus: ProjectOperationalStatus.EM_EXECUCAO,
        publicVisibility: ProjectVisibility.PUBLICO_RESUMIDO,
        budget: 4200000,
        estimatedBudget: 4200000,
        contractedBudget: 4050000,
        measuredBudget: 2713500,
        paidBudget: 2145000,
        startDate: d("2025-01-15"),
        endDate: d("2025-09-30"),
        plannedStartDate: d("2025-01-15"),
        plannedEndDate: d("2025-09-30"),
        actualStartDate: d("2025-01-20"),
        completionPct: 67,
        physicalProgressPct: 67,
        financialProgressPct: 53,
        managerId: fort["secretaria@fortaleza.ce.gov.br"].id,
        inspectorId: fort["engenharia@fortaleza.ce.gov.br"].id,
        contractorName: "Via Urbana Engenharia Ltda.",
        address: "Av. Bezerra de Menezes",
        referencePoint: "North Shopping",
        procurementProcess: "CP-012/2024-SINF",
        procurementModality: "Concorrência",
        contractNumber: "CT-014/2025",
        metadata: { eixo: "Mobilidade" },
        geomWkt: "POLYGON((-38.5710 -3.7480,-38.5710 -3.7360,-38.5530 -3.7360,-38.5530 -3.7480,-38.5710 -3.7480))",
      },
      funding: {
        id: "seed-funding-1",
        tenantId: fortaleza.id,
        projectId: "seed-proj-1",
        sourceName: "Tesouro Municipal",
        sourceType: ProjectFundingSourceType.TESOURO,
        status: ProjectFundingSourceStatus.LIBERADA,
        budgetCode: "15.451.0052.1.109",
        plannedAmount: 4200000,
        committedAmount: 4050000,
        releasedAmount: 2500000,
        usedAmount: 2145000,
        isPrimary: true,
      },
      contract: {
        id: "seed-contract-1",
        tenantId: fortaleza.id,
        projectId: "seed-proj-1",
        contractNumber: "CT-014/2025",
        title: "Recapeamento da Av. Bezerra de Menezes",
        contractorName: "Via Urbana Engenharia Ltda.",
        contractorTaxId: "12.345.678/0001-90",
        procurementProcess: "CP-012/2024-SINF",
        procurementModality: "Concorrência",
        signedAt: d("2025-01-10"),
        startDate: d("2025-01-20"),
        endDate: d("2025-10-20"),
        status: ProjectContractStatus.VIGENTE,
        contractedAmount: 4050000,
        measuredAmount: 2713500,
        paidAmount: 2145000,
      },
      phases: [
        { id: "seed-phase-1a", tenantId: fortaleza.id, projectId: "seed-proj-1", code: "PAV-1", name: "Preparação", technicalArea: ProjectTechnicalArea.PAVIMENTACAO, sequence: 1, status: ProjectPhaseStatus.CONCLUIDA, plannedStartDate: d("2025-01-15"), plannedEndDate: d("2025-02-10"), actualStartDate: d("2025-01-20"), actualEndDate: d("2025-02-12"), physicalProgressPct: 100, financialProgressPct: 100, ownerId: fort["engenharia@fortaleza.ce.gov.br"].id },
        { id: "seed-phase-1b", tenantId: fortaleza.id, projectId: "seed-proj-1", code: "PAV-2", name: "Execução asfáltica", technicalArea: ProjectTechnicalArea.PAVIMENTACAO, sequence: 2, status: ProjectPhaseStatus.EM_EXECUCAO, plannedStartDate: d("2025-02-11"), plannedEndDate: d("2025-08-30"), actualStartDate: d("2025-02-15"), physicalProgressPct: 72, financialProgressPct: 64, ownerId: fort["engenharia@fortaleza.ce.gov.br"].id },
      ],
      measurement: {
        id: "seed-measurement-1",
        tenantId: fortaleza.id,
        projectId: "seed-proj-1",
        phaseId: "seed-phase-1b",
        contractId: "seed-contract-1",
        measurementNumber: 1,
        referenceMonth: d("2025-05-01"),
        periodStart: d("2025-04-01"),
        periodEnd: d("2025-05-31"),
        measuredAt: d("2025-06-03"),
        status: ProjectMeasurementStatus.SUBMETIDA,
        physicalProgressPct: 67,
        financialProgressPct: 53,
        measuredAmount: 1530000,
        measuredById: fort["engenharia@fortaleza.ce.gov.br"].id,
        approvedById: fort["secretaria@fortaleza.ce.gov.br"].id,
        notes: "Segunda frente em conferência.",
      },
      documents: [
        { id: "seed-doc-1", tenantId: fortaleza.id, projectId: "seed-proj-1", contractId: "seed-contract-1", title: "Contrato de execução", documentType: ProjectDocumentType.CONTRATO, fileName: "contrato-av-bezerra.pdf", storageKey: "seed/fortaleza/FOR-2025-001/contrato.pdf", mimeType: "application/pdf", fileSize: 842000, documentDate: d("2025-01-10"), isPublic: false, uploadedById: fort["secretaria@fortaleza.ce.gov.br"].id },
        { id: "seed-doc-2", tenantId: fortaleza.id, projectId: "seed-proj-1", measurementId: "seed-measurement-1", title: "Boletim de medição 01", documentType: ProjectDocumentType.MEDICAO, fileName: "medicao-01.pdf", storageKey: "seed/fortaleza/FOR-2025-001/medicao-01.pdf", mimeType: "application/pdf", fileSize: 524000, documentDate: d("2025-06-03"), isPublic: false, uploadedById: fort["engenharia@fortaleza.ce.gov.br"].id },
      ],
      assets: [
        { id: "seed-asset-1", tenantId: fortaleza.id, projectId: "seed-proj-1", name: "Trecho operacional 1", type: AssetType.TRECHO, geomWkt: point(-38.5638, -3.7422), attributes: { status: "em_execucao" }, photos: [] },
        { id: "seed-asset-2", tenantId: fortaleza.id, projectId: "seed-proj-1", name: "Travessia elevada", type: AssetType.PONTO, geomWkt: point(-38.5574, -3.7398), attributes: { fase: "sinalizacao" }, photos: [] },
      ],
    },
    {
      project: {
        id: "seed-proj-2",
        tenantId: fortaleza.id,
        code: "FOR-2025-014",
        name: "Rede de drenagem do Montese",
        description: "Microdrenagem em vias com alagamento recorrente.",
        projectType: ProjectType.OBRA,
        responsibleDepartment: "Secretaria Municipal da Infraestrutura",
        responsibleArea: "Drenagem Urbana",
        technicalAreas: [ProjectTechnicalArea.DRENAGEM, ProjectTechnicalArea.PAVIMENTACAO],
        neighborhood: "Montese",
        district: "Regional 4",
        region: "Leste",
        priority: ProjectPriority.ALTA,
        criticality: ProjectCriticality.CRITICA,
        status: ProjectStatus.PARALISADO,
        operationalStatus: ProjectOperationalStatus.PARALISADO,
        publicVisibility: ProjectVisibility.PUBLICO_RESUMIDO,
        budget: 1800000,
        estimatedBudget: 1800000,
        contractedBudget: 1715000,
        measuredBudget: 620000,
        paidBudget: 540000,
        startDate: d("2025-02-01"),
        endDate: d("2025-08-20"),
        plannedStartDate: d("2025-02-01"),
        plannedEndDate: d("2025-08-20"),
        actualStartDate: d("2025-02-10"),
        completionPct: 34,
        physicalProgressPct: 34,
        financialProgressPct: 31,
        managerId: fort["secretaria@fortaleza.ce.gov.br"].id,
        inspectorId: fort["engenharia@fortaleza.ce.gov.br"].id,
        contractorName: "Hidrovale Construções Ltda.",
        address: "Ruas Alberto Magno e Mirian Rocha",
        referencePoint: "Aeroporto antigo",
        procurementProcess: "CP-021/2024-SINF",
        procurementModality: "Concorrência",
        contractNumber: "CT-031/2025",
        metadata: { eixo: "Resiliência urbana" },
        geomWkt: "POLYGON((-38.5330 -3.7525,-38.5330 -3.7430,-38.5205 -3.7430,-38.5205 -3.7525,-38.5330 -3.7525))",
      },
      funding: {
        id: "seed-funding-2",
        tenantId: fortaleza.id,
        projectId: "seed-proj-2",
        sourceName: "Convênio estadual de drenagem",
        sourceType: ProjectFundingSourceType.CONVENIO,
        status: ProjectFundingSourceStatus.LIBERADA,
        externalReference: "CV-CE-442/2024",
        plannedAmount: 1800000,
        committedAmount: 1715000,
        releasedAmount: 900000,
        usedAmount: 540000,
        isPrimary: true,
      },
      contract: {
        id: "seed-contract-2",
        tenantId: fortaleza.id,
        projectId: "seed-proj-2",
        contractNumber: "CT-031/2025",
        title: "Rede de drenagem do Montese",
        contractorName: "Hidrovale Construções Ltda.",
        contractorTaxId: "08.114.221/0001-07",
        procurementProcess: "CP-021/2024-SINF",
        procurementModality: "Concorrência",
        signedAt: d("2025-01-25"),
        startDate: d("2025-02-10"),
        endDate: d("2025-08-30"),
        status: ProjectContractStatus.SUSPENSO,
        contractedAmount: 1715000,
        measuredAmount: 620000,
        paidAmount: 540000,
        notes: "Paralisação por interferência com utilidades.",
      },
      phases: [
        { id: "seed-phase-2a", tenantId: fortaleza.id, projectId: "seed-proj-2", code: "DRN-1", name: "Levantamento e locação", technicalArea: ProjectTechnicalArea.DRENAGEM, sequence: 1, status: ProjectPhaseStatus.CONCLUIDA, plannedStartDate: d("2025-02-01"), plannedEndDate: d("2025-02-20"), actualStartDate: d("2025-02-10"), actualEndDate: d("2025-02-24"), physicalProgressPct: 100, financialProgressPct: 100, ownerId: fort["engenharia@fortaleza.ce.gov.br"].id },
        { id: "seed-phase-2b", tenantId: fortaleza.id, projectId: "seed-proj-2", code: "DRN-2", name: "Assentamento de galerias", technicalArea: ProjectTechnicalArea.DRENAGEM, sequence: 2, status: ProjectPhaseStatus.BLOQUEADA, plannedStartDate: d("2025-02-21"), plannedEndDate: d("2025-07-30"), actualStartDate: d("2025-02-25"), physicalProgressPct: 34, financialProgressPct: 31, ownerId: fort["engenharia@fortaleza.ce.gov.br"].id, metadata: { bloqueio: "concessionária" } },
      ],
      measurement: {
        id: "seed-measurement-2",
        tenantId: fortaleza.id,
        projectId: "seed-proj-2",
        phaseId: "seed-phase-2b",
        contractId: "seed-contract-2",
        measurementNumber: 1,
        referenceMonth: d("2025-04-01"),
        periodStart: d("2025-03-01"),
        periodEnd: d("2025-04-30"),
        measuredAt: d("2025-05-05"),
        status: ProjectMeasurementStatus.APROVADA,
        physicalProgressPct: 34,
        financialProgressPct: 31,
        measuredAmount: 620000,
        approvedAmount: 620000,
        paidAmount: 540000,
        measuredById: fort["engenharia@fortaleza.ce.gov.br"].id,
        approvedById: fort["secretaria@fortaleza.ce.gov.br"].id,
      },
      documents: [
        { id: "seed-doc-3", tenantId: fortaleza.id, projectId: "seed-proj-2", title: "Projeto executivo", phaseId: "seed-phase-2b", documentType: ProjectDocumentType.PROJETO_EXECUTIVO, fileName: "projeto-drenagem-montese.pdf", storageKey: "seed/fortaleza/FOR-2025-014/projeto.pdf", mimeType: "application/pdf", fileSize: 1168000, documentDate: d("2025-01-18"), isPublic: false, uploadedById: fort["engenharia@fortaleza.ce.gov.br"].id },
        { id: "seed-doc-4", tenantId: fortaleza.id, projectId: "seed-proj-2", title: "Relatório de suspensão", contractId: "seed-contract-2", documentType: ProjectDocumentType.RELATORIO, fileName: "suspensao.pdf", storageKey: "seed/fortaleza/FOR-2025-014/suspensao.pdf", mimeType: "application/pdf", fileSize: 294000, documentDate: d("2025-06-17"), isPublic: false, uploadedById: fort["secretaria@fortaleza.ce.gov.br"].id },
      ],
      assets: [
        { id: "seed-asset-3", tenantId: fortaleza.id, projectId: "seed-proj-2", name: "Caixa de captação", type: AssetType.PONTO, geomWkt: point(-38.5261, -3.7474), attributes: { status: "implantado" }, photos: [] },
        { id: "seed-asset-4", tenantId: fortaleza.id, projectId: "seed-proj-2", name: "Trecho de galeria", type: AssetType.TRECHO, geomWkt: point(-38.5236, -3.7488), attributes: { status: "bloqueado" }, photos: [] },
      ],
    },
    {
      project: {
        id: "seed-proj-3",
        tenantId: campinas.id,
        code: "CAM-2026-003",
        name: "Calçadas e drenagem do Jardim Aurélia",
        description: "Acessibilidade e microdrenagem no entorno escolar.",
        projectType: ProjectType.OBRA,
        responsibleDepartment: "Secretaria Municipal de Infraestrutura",
        responsibleArea: "Obras Viárias",
        technicalAreas: [ProjectTechnicalArea.PAVIMENTACAO, ProjectTechnicalArea.DRENAGEM, ProjectTechnicalArea.SINALIZACAO],
        neighborhood: "Jardim Aurélia",
        district: "Noroeste",
        region: "Campinas Norte",
        priority: ProjectPriority.MEDIA,
        criticality: ProjectCriticality.MEDIA,
        status: ProjectStatus.EM_ANDAMENTO,
        operationalStatus: ProjectOperationalStatus.EM_MEDICAO,
        publicVisibility: ProjectVisibility.PUBLICO_RESUMIDO,
        budget: 1350000,
        estimatedBudget: 1350000,
        contractedBudget: 1280000,
        measuredBudget: 365000,
        paidBudget: 210000,
        startDate: d("2026-01-12"),
        endDate: d("2026-08-30"),
        plannedStartDate: d("2026-01-12"),
        plannedEndDate: d("2026-08-30"),
        actualStartDate: d("2026-01-18"),
        completionPct: 28,
        physicalProgressPct: 28,
        financialProgressPct: 16,
        managerId: camp["secretaria@campinas.sp.gov.br"].id,
        inspectorId: camp["engenharia@campinas.sp.gov.br"].id,
        contractorName: "Campvia Obras Urbanas",
        address: "Ruas Júlio Frank e Papa Pio XII",
        referencePoint: "EMEF Jardim Aurélia",
        procurementProcess: "CP-118/2025-SMI",
        procurementModality: "Concorrência",
        contractNumber: "CT-009/2026",
        metadata: { eixo: "Acessibilidade" },
        geomWkt: "POLYGON((-47.0900 -22.8840,-47.0900 -22.8760,-47.0790 -22.8760,-47.0790 -22.8840,-47.0900 -22.8840))",
      },
      funding: {
        id: "seed-funding-3",
        tenantId: campinas.id,
        projectId: "seed-proj-3",
        sourceName: "Tesouro municipal",
        sourceType: ProjectFundingSourceType.TESOURO,
        status: ProjectFundingSourceStatus.LIBERADA,
        budgetCode: "15.451.1020.2.041",
        plannedAmount: 1350000,
        committedAmount: 1280000,
        releasedAmount: 420000,
        usedAmount: 210000,
        isPrimary: true,
      },
      contract: {
        id: "seed-contract-3",
        tenantId: campinas.id,
        projectId: "seed-proj-3",
        contractNumber: "CT-009/2026",
        title: "Calçadas e drenagem do Jardim Aurélia",
        contractorName: "Campvia Obras Urbanas",
        contractorTaxId: "31.778.210/0001-54",
        procurementProcess: "CP-118/2025-SMI",
        procurementModality: "Concorrência",
        signedAt: d("2026-01-08"),
        startDate: d("2026-01-18"),
        endDate: d("2026-08-30"),
        status: ProjectContractStatus.VIGENTE,
        contractedAmount: 1280000,
        measuredAmount: 365000,
        paidAmount: 210000,
      },
      phases: [
        { id: "seed-phase-3a", tenantId: campinas.id, projectId: "seed-proj-3", code: "AUR-1", name: "Drenagem pontual", technicalArea: ProjectTechnicalArea.DRENAGEM, sequence: 1, status: ProjectPhaseStatus.EM_EXECUCAO, plannedStartDate: d("2026-01-12"), plannedEndDate: d("2026-04-15"), actualStartDate: d("2026-01-18"), physicalProgressPct: 46, financialProgressPct: 28, ownerId: camp["engenharia@campinas.sp.gov.br"].id },
        { id: "seed-phase-3b", tenantId: campinas.id, projectId: "seed-proj-3", code: "AUR-2", name: "Calçadas acessíveis", technicalArea: ProjectTechnicalArea.PAVIMENTACAO, sequence: 2, status: ProjectPhaseStatus.PRONTA, plannedStartDate: d("2026-04-16"), plannedEndDate: d("2026-08-30"), ownerId: camp["engenharia@campinas.sp.gov.br"].id },
      ],
      measurement: {
        id: "seed-measurement-3",
        tenantId: campinas.id,
        projectId: "seed-proj-3",
        phaseId: "seed-phase-3a",
        contractId: "seed-contract-3",
        measurementNumber: 1,
        referenceMonth: d("2026-02-01"),
        periodStart: d("2026-01-18"),
        periodEnd: d("2026-02-28"),
        measuredAt: d("2026-03-03"),
        status: ProjectMeasurementStatus.SUBMETIDA,
        physicalProgressPct: 28,
        financialProgressPct: 16,
        measuredAmount: 365000,
        measuredById: camp["engenharia@campinas.sp.gov.br"].id,
      },
      documents: [
        { id: "seed-doc-5", tenantId: campinas.id, projectId: "seed-proj-3", title: "Termo de referência", documentType: ProjectDocumentType.TERMO_REFERENCIA, fileName: "termo-referencia.pdf", storageKey: "seed/campinas/CAM-2026-003/termo.pdf", mimeType: "application/pdf", fileSize: 338000, documentDate: d("2025-11-22"), isPublic: true, uploadedById: camp["secretaria@campinas.sp.gov.br"].id },
        { id: "seed-doc-6", tenantId: campinas.id, projectId: "seed-proj-3", measurementId: "seed-measurement-3", title: "Boletim de medição 01", documentType: ProjectDocumentType.MEDICAO, fileName: "medicao-01.pdf", storageKey: "seed/campinas/CAM-2026-003/medicao-01.pdf", mimeType: "application/pdf", fileSize: 286000, documentDate: d("2026-03-03"), isPublic: false, uploadedById: camp["engenharia@campinas.sp.gov.br"].id },
      ],
      assets: [
        { id: "seed-asset-5", tenantId: campinas.id, projectId: "seed-proj-3", name: "Travessia acessível", type: AssetType.PONTO, geomWkt: point(-47.0843, -22.8799), attributes: { frente: "acessibilidade" }, photos: [] },
        { id: "seed-asset-6", tenantId: campinas.id, projectId: "seed-proj-3", name: "Trecho de drenagem", type: AssetType.TRECHO, geomWkt: point(-47.0859, -22.8808), attributes: { status: "medido" }, photos: [] },
      ],
    },
  ];

  await reseed(bundles);

  console.log("Seed concluído.");
  console.log("admin@urbandesk.com.br / urbandesk@2025");
  console.log("secretaria@fortaleza.ce.gov.br / fortaleza@2025");
  console.log("engenharia@fortaleza.ce.gov.br / fortaleza@2025");
  console.log("campo@fortaleza.ce.gov.br / fortaleza@2025");
  console.log("secretaria@campinas.sp.gov.br / campinas@2025");
  console.log("engenharia@campinas.sp.gov.br / campinas@2025");
  console.log("campo@campinas.sp.gov.br / campinas@2025");
}

main()
  .catch((error) => {
    console.error("Seed falhou:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


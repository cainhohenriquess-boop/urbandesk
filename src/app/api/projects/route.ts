import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessBlockMessage, getAccessBlockReason } from "@/lib/auth-shared";
import { AUDIT_ACTIONS, extractRequestContext, writeAuditLog } from "@/lib/audit";
import { enforceRequestRateLimit } from "@/lib/rate-limit";
import { requireJsonContentType } from "@/lib/request-guards";
import {
  PROJECT_DEADLINE_FILTER_VALUES,
  PROJECT_PRIORITY_VALUES,
  PROJECT_STATUS_VALUES,
  PROJECT_TYPE_OPTIONS,
  PROJECT_TYPE_VALUES,
} from "@/lib/project-portfolio";
import {
  DEFAULT_PROJECT_PORTFOLIO_URL_STATE,
  PROJECT_SORT_BY_VALUES,
  PROJECT_SORT_ORDER_VALUES,
  type ProjectSortBy,
  type ProjectSortOrder,
} from "@/lib/project-portfolio-query";
import { getProjectSchemaCompatibility } from "@/lib/project-schema-compat";

const tenantIdSchema = z.string().cuid();
const ALLOWED_ROLES = new Set(["SUPERADMIN", "SECRETARIO", "ENGENHEIRO"]);
const DEADLINE_WINDOW_DAYS = 30;

const nullableDateSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.coerce.date().nullable()
);

const nullableNumberSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? null : value),
  z.coerce.number().finite().nonnegative().nullable()
);

const nullableTrimmedString = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return null;
      return typeof value === "string" ? value.trim() : value;
    },
    z.string().max(max).nullable()
  );

const createProjectSchema = z
  .object({
    code: nullableTrimmedString(40).optional(),
    name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(140),
    description: nullableTrimmedString(2000).optional(),
    status: z.enum(PROJECT_STATUS_VALUES).optional().default("PLANEJADO"),
    projectType: z.preprocess(
      (value) => (value === "" || value === undefined || value === null ? null : value),
      z.enum(PROJECT_TYPE_VALUES).nullable()
    ).optional(),
    responsibleDepartment: nullableTrimmedString(120).optional(),
    neighborhood: nullableTrimmedString(120).optional(),
    priority: z.enum(PROJECT_PRIORITY_VALUES).optional().default("MEDIA"),
    estimatedBudget: nullableNumberSchema.optional(),
    plannedStartDate: nullableDateSchema.optional(),
    plannedEndDate: nullableDateSchema.optional(),
    completionPct: z.coerce.number().int().min(0).max(100).optional().default(0),
    geomWkt: z.string().trim().max(120000).nullable().optional(),
  })
  .strict();

function serializeProject(project: {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  status: (typeof PROJECT_STATUS_VALUES)[number];
  projectType: (typeof PROJECT_TYPE_VALUES)[number] | null;
  responsibleDepartment: string | null;
  neighborhood: string | null;
  district: string | null;
  region: string | null;
  priority: (typeof PROJECT_PRIORITY_VALUES)[number];
  budget: Prisma.Decimal | null;
  estimatedBudget: Prisma.Decimal | null;
  startDate: Date | null;
  endDate: Date | null;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  completionPct: number;
  physicalProgressPct: number;
  operationalStatus: string;
  geomWkt: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { assets: number };
}) {
  return {
    ...project,
    budget: project.budget ? Number(project.budget) : null,
    estimatedBudget: project.estimatedBudget ? Number(project.estimatedBudget) : null,
  };
}

function parseBoundedInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseOptionalNonNegativeNumber(raw: string | null): number | null | "invalid" {
  if (raw === null || raw.trim() === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return "invalid";
  return parsed;
}

function buildProjectOrderBy(
  sortBy: ProjectSortBy,
  sortOrder: ProjectSortOrder
): Prisma.ProjectOrderByWithRelationInput[] {
  switch (sortBy) {
    case "DEADLINE":
      return [
        { plannedEndDate: sortOrder },
        { endDate: sortOrder },
        { updatedAt: "desc" },
      ];
    case "BUDGET":
      return [
        { estimatedBudget: sortOrder },
        { budget: sortOrder },
        { updatedAt: "desc" },
      ];
    case "PRIORITY":
      return [{ priority: sortOrder }, { plannedEndDate: "asc" }, { updatedAt: "desc" }];
    case "STATUS":
      return [{ status: sortOrder }, { priority: "desc" }, { updatedAt: "desc" }];
    case "UPDATED_AT":
    default:
      return [{ updatedAt: sortOrder }, { createdAt: "desc" }];
  }
}

function resolveReferenceEndDate(project: {
  plannedEndDate: Date | null;
  endDate: Date | null;
}) {
  return project.plannedEndDate ?? project.endDate;
}

function getDeadlineState(
  project: {
    status: (typeof PROJECT_STATUS_VALUES)[number];
    plannedEndDate: Date | null;
    endDate: Date | null;
  },
  now: Date,
  soon: Date
): (typeof PROJECT_DEADLINE_FILTER_VALUES)[number] {
  const deadline = resolveReferenceEndDate(project);

  if (!deadline) return "NO_DEADLINE";
  if (project.status === "CONCLUIDO" || project.status === "CANCELADO") return "ON_TRACK";
  if (deadline.getTime() < now.getTime()) return "DELAYED";
  if (deadline.getTime() <= soon.getTime()) return "DUE_SOON";
  return "ON_TRACK";
}

function getDeadlineWhere(
  deadline: (typeof PROJECT_DEADLINE_FILTER_VALUES)[number],
  now: Date,
  soon: Date
): Prisma.ProjectWhereInput {
  const activeProjectWhere: Prisma.ProjectWhereInput = {
    status: { notIn: ["CONCLUIDO", "CANCELADO"] },
  };

  if (deadline === "NO_DEADLINE") {
    return { plannedEndDate: null, endDate: null };
  }

  if (deadline === "DELAYED") {
    return {
      AND: [
        activeProjectWhere,
        {
          OR: [
            { plannedEndDate: { lt: now } },
            {
              AND: [{ plannedEndDate: null }, { endDate: { lt: now } }],
            },
          ],
        },
      ],
    };
  }

  if (deadline === "DUE_SOON") {
    return {
      AND: [
        activeProjectWhere,
        {
          OR: [
            { plannedEndDate: { gte: now, lte: soon } },
            {
              AND: [
                { plannedEndDate: null },
                { endDate: { gte: now, lte: soon } },
              ],
            },
          ],
        },
      ],
    };
  }

  return {
    AND: [
      activeProjectWhere,
      {
        OR: [
          { plannedEndDate: { gt: soon } },
          {
            AND: [{ plannedEndDate: null }, { endDate: { gt: soon } }],
          },
        ],
      },
    ],
  };
}

async function resolveTenantContext(req: NextRequest): Promise<
  | {
      tenantId: string;
      role: string;
      userId: string | null;
      userName: string | null;
      userEmail: string | null;
    }
  | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return { response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }

  const reason = getAccessBlockReason(session.user);
  if (reason) {
    return {
      response: NextResponse.json(
        { error: getAccessBlockMessage(reason), code: reason },
        { status: 403 }
      ),
    };
  }

  const role = session.user.role ?? "";
  if (!ALLOWED_ROLES.has(role)) {
    return { response: NextResponse.json({ error: "Não autorizado" }, { status: 403 }) };
  }

  const cookieStore = await cookies();
  const queryTenantIdRaw = req.nextUrl.searchParams.get("tenantId");
  const queryTenantId = queryTenantIdRaw
    ? tenantIdSchema.safeParse(queryTenantIdRaw).data ?? null
    : null;
  if (queryTenantIdRaw && !queryTenantId) {
    return {
      response: NextResponse.json({ error: "Tenant inválido na query." }, { status: 400 }),
    };
  }

  let tenantId = session.user.tenantId ?? null;
  if (role === "SUPERADMIN") {
    const impersonatedRaw = cookieStore.get("impersonate_tenant")?.value ?? null;
    const impersonatedTenantId = impersonatedRaw
      ? tenantIdSchema.safeParse(impersonatedRaw).data ?? null
      : null;
    if (impersonatedRaw && !impersonatedTenantId) {
      return {
        response: NextResponse.json({ error: "Tenant inválido no cookie." }, { status: 400 }),
      };
    }

    tenantId = impersonatedTenantId ?? queryTenantId ?? tenantId;
  }

  if (!tenantId || !tenantIdSchema.safeParse(tenantId).success) {
    return {
      response: NextResponse.json(
        { error: "Tenant não identificado para operação." },
        { status: 400 }
      ),
    };
  }

  return {
    tenantId,
    role,
    userId: session.user.id ?? null,
    userName: session.user.name ?? null,
    userEmail: session.user.email ?? null,
  };
}

function validateProjectDates(
  startDate: Date | null | undefined,
  endDate: Date | null | undefined
): string | null {
  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    return "Data final não pode ser anterior à data inicial.";
  }
  return null;
}

async function validateDuplicateProject(
  tenantId: string,
  payload: { name?: string; code?: string | null },
  excludeId?: string
) {
  if (payload.name !== undefined) {
    const duplicateByName = await prisma.project.findFirst({
      where: {
        tenantId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        name: { equals: payload.name, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (duplicateByName) {
      return "Já existe um projeto com este nome neste tenant.";
    }
  }

  if (payload.code) {
    const duplicateByCode = await prisma.project.findFirst({
      where: {
        tenantId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        code: { equals: payload.code, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (duplicateByCode) {
      return "Já existe um projeto com este código neste tenant.";
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:get",
      limit: 180,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const context = await resolveTenantContext(req);
    if ("response" in context) return context.response;

    const projectSchema = await getProjectSchemaCompatibility();
    if (!projectSchema.executiveSchemaReady) {
      return NextResponse.json(
        {
          error:
            projectSchema.notice ??
            "A base de dados ainda não recebeu a migration estrutural do módulo Projetos.",
          code: "project_schema_legacy",
        },
        { status: 503 }
      );
    }

    const { tenantId } = context;
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() ?? "";
    const status = searchParams.get("status");
    const responsibleDepartment = searchParams.get("department")?.trim() ?? "";
    const projectType = searchParams.get("projectType");
    const neighborhood = searchParams.get("neighborhood")?.trim() ?? "";
    const priority = searchParams.get("priority");
    const deadline = searchParams.get("deadline");
    const includeCancelled = searchParams.get("includeCancelled") === "true";
    const page = parseBoundedInt(searchParams.get("page"), 1, 1, 10_000);
    const limit = parseBoundedInt(searchParams.get("limit"), 18, 1, 100);
    const budgetMin = parseOptionalNonNegativeNumber(searchParams.get("budgetMin"));
    const budgetMax = parseOptionalNonNegativeNumber(searchParams.get("budgetMax"));
    const sortByRaw = searchParams.get("sortBy");
    const sortOrderRaw = searchParams.get("sortOrder");
    const sortBy = PROJECT_SORT_BY_VALUES.includes(sortByRaw as ProjectSortBy)
      ? (sortByRaw as ProjectSortBy)
      : DEFAULT_PROJECT_PORTFOLIO_URL_STATE.sortBy;
    const sortOrder = PROJECT_SORT_ORDER_VALUES.includes(
      sortOrderRaw as ProjectSortOrder
    )
      ? (sortOrderRaw as ProjectSortOrder)
      : DEFAULT_PROJECT_PORTFOLIO_URL_STATE.sortOrder;

    if (status && !PROJECT_STATUS_VALUES.includes(status as (typeof PROJECT_STATUS_VALUES)[number])) {
      return NextResponse.json({ error: "Parâmetro status inválido." }, { status: 400 });
    }

    if (
      projectType &&
      !PROJECT_TYPE_VALUES.includes(projectType as (typeof PROJECT_TYPE_VALUES)[number])
    ) {
      return NextResponse.json({ error: "Parâmetro tipo inválido." }, { status: 400 });
    }

    if (
      priority &&
      !PROJECT_PRIORITY_VALUES.includes(priority as (typeof PROJECT_PRIORITY_VALUES)[number])
    ) {
      return NextResponse.json({ error: "Parâmetro prioridade inválido." }, { status: 400 });
    }

    if (
      deadline &&
      !PROJECT_DEADLINE_FILTER_VALUES.includes(
        deadline as (typeof PROJECT_DEADLINE_FILTER_VALUES)[number]
      )
    ) {
      return NextResponse.json({ error: "Parâmetro de prazo inválido." }, { status: 400 });
    }

    if (budgetMin === "invalid" || budgetMax === "invalid") {
      return NextResponse.json({ error: "Faixa de orçamento inválida." }, { status: 400 });
    }

    if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
      return NextResponse.json(
        { error: "O orçamento mínimo não pode ser maior que o máximo." },
        { status: 400 }
      );
    }

    const now = new Date();
    const soon = new Date(now.getTime() + DEADLINE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const filters: Prisma.ProjectWhereInput[] = [];

    if (status) {
      filters.push({ status: status as (typeof PROJECT_STATUS_VALUES)[number] });
    } else if (!includeCancelled) {
      filters.push({ status: { not: "CANCELADO" } });
    }

    if (responsibleDepartment) {
      filters.push({
        responsibleDepartment: {
          equals: responsibleDepartment,
          mode: "insensitive",
        },
      });
    }

    if (projectType) {
      filters.push({ projectType: projectType as (typeof PROJECT_TYPE_VALUES)[number] });
    }

    if (neighborhood) {
      filters.push({ neighborhood: { equals: neighborhood, mode: "insensitive" } });
    }

    if (priority) {
      filters.push({ priority: priority as (typeof PROJECT_PRIORITY_VALUES)[number] });
    }

    if (deadline) {
      filters.push(
        getDeadlineWhere(deadline as (typeof PROJECT_DEADLINE_FILTER_VALUES)[number], now, soon)
      );
    }

    if (budgetMin !== null) {
      filters.push({
        OR: [
          { estimatedBudget: { gte: new Prisma.Decimal(budgetMin) } },
          {
            AND: [
              { estimatedBudget: null },
              { budget: { gte: new Prisma.Decimal(budgetMin) } },
            ],
          },
        ],
      });
    }

    if (budgetMax !== null) {
      filters.push({
        OR: [
          { estimatedBudget: { lte: new Prisma.Decimal(budgetMax) } },
          {
            AND: [
              { estimatedBudget: null },
              { budget: { lte: new Prisma.Decimal(budgetMax) } },
            ],
          },
        ],
      });
    }

    if (q.length > 0) {
      filters.push({
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { responsibleDepartment: { contains: q, mode: "insensitive" } },
          { neighborhood: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.ProjectWhereInput = {
      tenantId,
      ...(filters.length > 0 ? { AND: filters } : {}),
    };
    const orderBy = buildProjectOrderBy(sortBy, sortOrder);

    const [projects, total, summaryRows, filterRows] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: { _count: { select: { assets: true } } },
      }),
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        select: {
          status: true,
          operationalStatus: true,
          budget: true,
          estimatedBudget: true,
          plannedEndDate: true,
          endDate: true,
        },
      }),
      prisma.project.findMany({
        where: { tenantId },
        select: {
          responsibleDepartment: true,
          neighborhood: true,
          projectType: true,
        },
      }),
    ]);

    const summary = summaryRows.reduce(
      (acc, project) => {
        const deadlineState = getDeadlineState(project, now, soon);
        const budget = Number(project.estimatedBudget ?? project.budget ?? 0);

        acc.totalProjects += 1;
        acc.consolidatedBudget += budget;

        if (deadlineState === "DELAYED") acc.delayedProjects += 1;
        if (
          project.status === "EM_ANDAMENTO" ||
          project.operationalStatus === "EM_EXECUCAO" ||
          project.operationalStatus === "EM_MEDICAO"
        ) {
          acc.inExecutionProjects += 1;
        }
        if (
          project.status === "CONCLUIDO" ||
          project.operationalStatus === "ENCERRADO"
        ) {
          acc.completedProjects += 1;
        }

        return acc;
      },
      {
        totalProjects: 0,
        delayedProjects: 0,
        inExecutionProjects: 0,
        completedProjects: 0,
        consolidatedBudget: 0,
      }
    );

    const departments = Array.from(
      new Set(
        filterRows
          .map((row) => row.responsibleDepartment?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    const neighborhoods = Array.from(
      new Set(
        filterRows
          .map((row) => row.neighborhood?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    const types = Array.from(
      new Set(
        filterRows
          .map((row) => row.projectType)
          .filter(
            (value): value is (typeof PROJECT_TYPE_VALUES)[number] =>
              Boolean(value)
          )
      )
    ).sort((a, b) => {
      const aLabel = PROJECT_TYPE_OPTIONS.find((item) => item.value === a)?.label ?? a;
      const bLabel = PROJECT_TYPE_OPTIONS.find((item) => item.value === b)?.label ?? b;
      return aLabel.localeCompare(bLabel, "pt-BR");
    });

    return NextResponse.json({
      data: projects.map((project) => serializeProject(project)),
      total,
      page,
      perPage: limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      summary,
      sort: {
        sortBy,
        sortOrder,
      },
      filterOptions: {
        departments,
        neighborhoods,
        types,
        priorities: [...PROJECT_PRIORITY_VALUES],
        statuses: [...PROJECT_STATUS_VALUES],
      },
    });
  } catch (error) {
    console.error("[PROJECTS_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = enforceRequestRateLimit(req, {
      namespace: "api:projects:post",
      limit: 60,
      windowMs: 60_000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const contentTypeError = requireJsonContentType(req);
    if (contentTypeError) return contentTypeError;

    const context = await resolveTenantContext(req);
    if ("response" in context) return context.response;

    const projectSchema = await getProjectSchemaCompatibility();
    if (!projectSchema.executiveSchemaReady) {
      return NextResponse.json(
        {
          error:
            projectSchema.notice ??
            "A base de dados ainda não recebeu a migration estrutural do módulo Projetos.",
          code: "project_schema_legacy",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const payload = createProjectSchema.parse(body);

    const dateError = validateProjectDates(
      payload.plannedStartDate,
      payload.plannedEndDate
    );
    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 400 });
    }

    const duplicateMessage = await validateDuplicateProject(context.tenantId, {
      name: payload.name,
      code: payload.code ?? null,
    });
    if (duplicateMessage) {
      return NextResponse.json({ error: duplicateMessage }, { status: 409 });
    }

    const estimatedBudget =
      payload.estimatedBudget === null || payload.estimatedBudget === undefined
        ? null
        : new Prisma.Decimal(payload.estimatedBudget);

    const created = await prisma.project.create({
      data: {
        tenantId: context.tenantId,
        code: payload.code ?? null,
        name: payload.name,
        description: payload.description ?? null,
        status: payload.status,
        projectType: payload.projectType ?? null,
        responsibleDepartment: payload.responsibleDepartment ?? null,
        neighborhood: payload.neighborhood ?? null,
        priority: payload.priority,
        budget: estimatedBudget,
        estimatedBudget,
        startDate: payload.plannedStartDate ?? null,
        endDate: payload.plannedEndDate ?? null,
        plannedStartDate: payload.plannedStartDate ?? null,
        plannedEndDate: payload.plannedEndDate ?? null,
        completionPct: payload.completionPct,
        physicalProgressPct: payload.completionPct,
        geomWkt: payload.geomWkt ?? null,
      },
      include: { _count: { select: { assets: true } } },
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.PROJECT_CREATE,
      entityType: "project",
      entityId: created.id,
      actor: {
        userId: context.userId,
        userName: context.userName,
        userEmail: context.userEmail,
        userRole: context.role,
        tenantId: context.tenantId,
      },
      requestContext: extractRequestContext(req),
      metadata: {
        code: created.code,
        name: created.name,
        status: created.status,
        projectType: created.projectType,
        priority: created.priority,
      },
    });

    return NextResponse.json({ data: serializeProject(created) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Payload inválido", details: error.issues }, { status: 400 });
    }

    console.error("[PROJECTS_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

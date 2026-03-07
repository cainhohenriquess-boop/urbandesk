/**
 * UrbanDesk — Database Seed
 * Execução: npm run db:seed
 *
 * Cria:
 *  - 1 SuperAdmin (dono do SaaS)
 *  - 2 Tenants de exemplo (Fortaleza e Campinas)
 *  - Usuários para cada role em cada tenant
 *  - Projetos e ativos de exemplo
 */

import { PrismaClient, UserRole, TenantPlan, TenantStatus, ProjectStatus, AssetType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("🌱 Iniciando seed do UrbanDesk…\n");

  // ─────────────────────────────────────────────
  // 1. SuperAdmin
  // ─────────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where:  { email: "admin@urbandesk.com.br" },
    update: {},
    create: {
      name:         "Super Admin",
      email:        "admin@urbandesk.com.br",
      passwordHash: await hash("urbandesk@2025"),
      role:         UserRole.SUPERADMIN,
    },
  });
  console.log(`✅ SuperAdmin criado: ${superAdmin.email}`);

  // ─────────────────────────────────────────────
  // 2. Tenant — Prefeitura de Fortaleza
  // ─────────────────────────────────────────────
  const fortaleza = await prisma.tenant.upsert({
    where:  { slug: "fortaleza-ce" },
    update: {},
    create: {
      name:    "Prefeitura de Fortaleza",
      slug:    "fortaleza-ce",
      cnpj:    "07.954.555/0001-76",
      state:   "CE",
      plan:    TenantPlan.ENTERPRISE,
      status:  TenantStatus.ATIVO,
      mrr:     9600,
    },
  });
  console.log(`✅ Tenant criado: ${fortaleza.name}`);

  // Usuários de Fortaleza
  const usersFortaleza = [
    { name:"Ana Secretária", email:"secretaria@fortaleza.ce.gov.br", role: UserRole.SECRETARIO  },
    { name:"Carlos Eng.",    email:"engenharia@fortaleza.ce.gov.br",  role: UserRole.ENGENHEIRO  },
    { name:"Pedro Campo",    email:"campo@fortaleza.ce.gov.br",       role: UserRole.CAMPO       },
  ];

  for (const u of usersFortaleza) {
    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: {
        name:         u.name,
        email:        u.email,
        passwordHash: await hash("fortaleza@2025"),
        role:         u.role,
        tenantId:     fortaleza.id,
      },
    });
    console.log(`   👤 ${u.name} (${u.role})`);
  }

  // Projetos de Fortaleza
  const proj1 = await prisma.project.upsert({
    where:  { id: "seed-proj-1" },
    update: {},
    create: {
      id:            "seed-proj-1",
      name:          "Recapeamento Av. Bezerra de Menezes",
      description:   "Recapeamento asfáltico em 3,2 km da avenida, incluindo sinalização horizontal.",
      status:        ProjectStatus.EM_ANDAMENTO,
      budget:        4_200_000,
      completionPct: 67,
      startDate:     new Date("2025-01-15"),
      endDate:       new Date("2025-09-30"),
      tenantId:      fortaleza.id,
    },
  });

  const proj2 = await prisma.project.upsert({
    where:  { id: "seed-proj-2" },
    update: {},
    create: {
      id:            "seed-proj-2",
      name:          "Rede de Drenagem — Bairro Montese",
      description:   "Implantação de rede de microdrenagem em 8 logradouros.",
      status:        ProjectStatus.PARALISADO,
      budget:        1_800_000,
      completionPct: 34,
      startDate:     new Date("2025-02-01"),
      endDate:       new Date("2025-07-15"),
      tenantId:      fortaleza.id,
    },
  });

  const proj3 = await prisma.project.upsert({
    where:  { id: "seed-proj-3" },
    update: {},
    create: {
      id:            "seed-proj-3",
      name:          "Iluminação LED — Centro Histórico",
      status:        ProjectStatus.CONCLUIDO,
      budget:        980_000,
      completionPct: 100,
      startDate:     new Date("2024-10-01"),
      endDate:       new Date("2025-03-01"),
      tenantId:      fortaleza.id,
    },
  });

  console.log(`   📋 3 projetos criados para Fortaleza`);

  // Ativos GIS de Fortaleza
  const assetsFortaleza = [
    { name:"Bueiro #A12 — Aldeota",      type:AssetType.PONTO,  lat:-3.7319, lng:-38.5267, projectId:proj1.id },
    { name:"Luminária LED #204",         type:AssetType.PONTO,  lat:-3.7280, lng:-38.5100, projectId:proj3.id },
    { name:"Bueiro #B7 — Montese",       type:AssetType.PONTO,  lat:-3.7454, lng:-38.5201, projectId:proj2.id },
    { name:"Trecho Av. Abolição — km 1", type:AssetType.TRECHO, lat:-3.7172, lng:-38.5434, projectId:proj1.id },
    { name:"Praça do Ferreira",          type:AssetType.AREA,   lat:-3.7260, lng:-38.5200, projectId:null     },
  ];

  for (const a of assetsFortaleza) {
    await prisma.asset.create({
      data: {
        name:      a.name,
        type:      a.type,
        lat:       a.lat,
        lng:       a.lng,
        geomWkt:   `POINT(${a.lng} ${a.lat})`,
        attributes:{},
        tenantId:  fortaleza.id,
        projectId: a.projectId,
      },
    });
  }
  console.log(`   📍 ${assetsFortaleza.length} ativos GIS criados para Fortaleza`);

  // ─────────────────────────────────────────────
  // 3. Tenant — Prefeitura de Campinas (Trial)
  // ─────────────────────────────────────────────
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 10);

  const campinas = await prisma.tenant.upsert({
    where:  { slug: "campinas-sp" },
    update: {},
    create: {
      name:        "Prefeitura de Campinas",
      slug:        "campinas-sp",
      cnpj:        "51.885.242/0001-40",
      state:       "SP",
      plan:        TenantPlan.PRO,
      status:      TenantStatus.TRIAL,
      mrr:         0,
      trialEndsAt,
    },
  });
  console.log(`\n✅ Tenant criado: ${campinas.name} (Trial — ${10} dias)`);

  const secretarioCampinas = await prisma.user.upsert({
    where:  { email: "secretaria@campinas.sp.gov.br" },
    update: {},
    create: {
      name:         "João Secretário",
      email:        "secretaria@campinas.sp.gov.br",
      passwordHash: await hash("campinas@2025"),
      role:         UserRole.SECRETARIO,
      tenantId:     campinas.id,
    },
  });
  console.log(`   👤 ${secretarioCampinas.name} (SECRETARIO)`);

  // ─────────────────────────────────────────────
  // Resumo
  // ─────────────────────────────────────────────
  console.log(`
╔═══════════════════════════════════════════╗
║         UrbanDesk — Seed Completo         ║
╠═══════════════════════════════════════════╣
║ SuperAdmin  admin@urbandesk.com.br        ║
║             Senha: urbandesk@2025         ║
╠═══════════════════════════════════════════╣
║ Fortaleza   secretaria@fortaleza.ce.gov.br║
║             engenharia@fortaleza.ce.gov.br║
║             campo@fortaleza.ce.gov.br     ║
║             Senha: fortaleza@2025         ║
╠═══════════════════════════════════════════╣
║ Campinas    secretaria@campinas.sp.gov.br ║
║             Senha: campinas@2025          ║
╚═══════════════════════════════════════════╝
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seed falhou:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProjectGovernanceIndicators,
  buildProjectHistoryIndicators,
  type SerializedProjectIssue,
  type SerializedProjectRisk,
  type SerializedProjectHistoryEvent,
} from "@/lib/project-governance";

test("buildProjectGovernanceIndicators consolidates open issues and active risks", () => {
  const issues: SerializedProjectIssue[] = [
    {
      id: "i1",
      title: "Pendência crítica",
      description: null,
      issueType: "BLOQUEIO",
      status: "ABERTA",
      priority: "ALTA",
      severity: "CRITICA",
      dueDate: new Date("2026-03-01T00:00:00.000Z").toISOString(),
      resolvedAt: null,
      resolutionNotes: null,
      createdAt: new Date("2026-03-01T00:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-03-01T00:00:00.000Z").toISOString(),
      source: "projeto",
      technicalArea: "DRENAGEM",
      technicalObjectType: "GALERIA_PLUVIAL",
      phase: null,
      inspection: null,
      asset: null,
      reportedBy: null,
      assignedTo: null,
    },
  ];

  const risks: SerializedProjectRisk[] = [
    {
      id: "r1",
      title: "Risco operacional",
      description: null,
      category: "OPERACIONAL",
      status: "MONITORANDO",
      probability: "ALTA",
      impact: "CRITICO",
      mitigationPlan: null,
      contingencyPlan: null,
      reviewDate: null,
      createdAt: new Date("2026-03-02T00:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-03-02T00:00:00.000Z").toISOString(),
      technicalArea: "DRENAGEM",
      technicalObjectType: "GALERIA_PLUVIAL",
      phase: null,
      asset: null,
      owner: null,
      score: 12,
    },
  ];

  const indicators = buildProjectGovernanceIndicators({ issues, risks });

  assert.equal(indicators.openIssues, 1);
  assert.equal(indicators.criticalIssues, 1);
  assert.equal(indicators.activeRisks, 1);
  assert.equal(indicators.highExposureRisks, 1);
  assert.equal(indicators.issuesByArea[0]?.technicalArea, "DRENAGEM");
  assert.equal(indicators.risksByArea[0]?.technicalArea, "DRENAGEM");
});

test("buildProjectHistoryIndicators groups events by type and area", () => {
  const events: SerializedProjectHistoryEvent[] = [
    {
      id: "e1",
      kind: "auditoria",
      title: "Projeto atualizado",
      detail: "Sistema · project",
      timestamp: new Date("2026-03-03T00:00:00.000Z").toISOString(),
      actorName: "Sistema",
      area: null,
      tone: "brand",
      badge: "Auditoria",
      entityId: "p1",
      metadata: null,
    },
    {
      id: "e2",
      kind: "pendencia",
      title: "Pendência aberta",
      detail: "Bloqueio · Aberta",
      timestamp: new Date("2026-03-04T00:00:00.000Z").toISOString(),
      actorName: "Equipe",
      area: "PAVIMENTACAO",
      tone: "danger",
      badge: "Pendência",
      entityId: "i1",
      metadata: { source: "campo" },
    },
  ];

  const indicators = buildProjectHistoryIndicators(events);

  assert.equal(indicators.totalEvents, 2);
  assert.equal(indicators.auditEvents, 1);
  assert.equal(indicators.operationalEvents, 1);
  assert.equal(indicators.fieldEvents, 1);
  assert.equal(indicators.byKind.find((item) => item.kind === "pendencia")?.count, 1);
  assert.equal(indicators.byArea.find((item) => item.technicalArea === "PAVIMENTACAO")?.count, 1);
});

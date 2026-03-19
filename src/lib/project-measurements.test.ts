import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProjectMeasurementIndicators,
  projectMeasurementInputSchema,
  resolveMeasurementFinancialProgressPct,
  serializeProjectMeasurements,
} from "@/lib/project-measurements";

test("valida regras básicas da medição", () => {
  const result = projectMeasurementInputSchema.safeParse({
    referenceMonth: "2026-03-01",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    status: "APROVADA",
    physicalProgressPct: 18,
    measuredAmount: 120000,
    approvedAmount: 150000,
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0]?.message ?? "", /maior que o valor medido/i);
  }
});

test("serializa medições com acumulado e consolida indicadores", () => {
  const serialized = serializeProjectMeasurements([
    {
      id: "m1",
      measurementNumber: 1,
      referenceMonth: new Date("2026-01-01T00:00:00.000Z"),
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-01-31T00:00:00.000Z"),
      measuredAt: new Date("2026-02-05T00:00:00.000Z"),
      status: "SUBMETIDA",
      technicalArea: "DRENAGEM",
      physicalProgressPct: 12,
      financialProgressPct: 10,
      measuredAmount: 100000,
      approvedAmount: null,
      paidAmount: null,
      notes: null,
      createdAt: new Date("2026-02-05T00:00:00.000Z"),
      updatedAt: new Date("2026-02-05T00:00:00.000Z"),
      documents: [],
    },
    {
      id: "m2",
      measurementNumber: 2,
      referenceMonth: new Date("2026-02-01T00:00:00.000Z"),
      periodStart: new Date("2026-02-01T00:00:00.000Z"),
      periodEnd: new Date("2026-02-28T00:00:00.000Z"),
      measuredAt: new Date("2026-03-06T00:00:00.000Z"),
      status: "APROVADA",
      technicalArea: "DRENAGEM",
      physicalProgressPct: 19,
      financialProgressPct: 18,
      measuredAmount: 180000,
      approvedAmount: 175000,
      paidAmount: 90000,
      notes: "Competência consolidada.",
      createdAt: new Date("2026-03-06T00:00:00.000Z"),
      updatedAt: new Date("2026-03-06T00:00:00.000Z"),
      documents: [],
    },
  ]);

  assert.equal(serialized[0]?.accumulatedMeasuredAmount, 100000);
  assert.equal(serialized[1]?.accumulatedMeasuredAmount, 280000);
  assert.equal(serialized[1]?.accumulatedApprovedAmount, 175000);

  const indicators = buildProjectMeasurementIndicators([...serialized].reverse());
  assert.equal(indicators.totalMeasurements, 2);
  assert.equal(indicators.submittedMeasurements, 1);
  assert.equal(indicators.approvedMeasurements, 1);
  assert.equal(indicators.accumulatedMeasuredAmount, 280000);
  assert.equal(indicators.pendingApprovalAmount, 105000);
  assert.equal(indicators.byTechnicalArea[0]?.technicalArea, "DRENAGEM");
});

test("deriva o avanço financeiro da medição a partir do acumulado", () => {
  const progress = resolveMeasurementFinancialProgressPct({
    contractedAmount: 500000,
    status: "APROVADA",
    accumulatedMeasuredAmount: 280000,
    accumulatedApprovedAmount: 175000,
    accumulatedPaidAmount: 90000,
  });

  assert.equal(progress, 35);
});

import assert from "node:assert/strict";
import test from "node:test";
import type { BaseLayerData, DrawnFeature } from "@/store/useMapStore";
import {
  buildSignalingMobilityAssistAttributes,
  buildSignalingMobilityAutoContext,
  buildSignalingMobilitySuggestedName,
  buildSignalingMobilityTechnicalDefaults,
  validateSignalingMobilityGeometry,
} from "@/lib/signaling-mobility";
import {
  getSignalingMobilityFilterOptions,
  getSignalingMobilityTechnicalPanelStats,
  readSignalingMobilityFilterValue,
} from "@/lib/signaling-mobility-panel";

const baseLayersData: BaseLayerData[] = [
  {
    id: "street-names",
    name: "Textos de ruas",
    type: "STREET_NAMES",
    sourceKind: "TENANT_BASE",
    geoJsonData: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [-36.0206, -6.2302],
              [-36.0195, -6.2298],
            ],
          },
          properties: {
            name: "Rua Coronel Júlio Pinheiro",
          },
        },
      ],
    },
  },
];

const semaforoFeature: DrawnFeature = {
  id: "signal-1",
  type: "SEMAFORO",
  coords: [{ lng: -36.02008, lat: -6.22996 }],
  synced: false,
  createdAt: Date.now(),
  attributes: {
    technicalArea: "SINALIZACAO",
    technicalObjectType: "SEMAFORO",
    subType: "SEMAFORO",
  },
};

const ciclofaixaFeature: DrawnFeature = {
  id: "cycle-1",
  type: "line",
  coords: [
    { lng: -36.0203, lat: -6.23002 },
    { lng: -36.0198, lat: -6.22988 },
  ],
  synced: true,
  createdAt: Date.now(),
  attributes: {
    technicalArea: "MOBILIDADE",
    technicalObjectType: "CICLOVIA_CICLOFAIXA",
    subType: "CICLOVIA_CICLOFAIXA",
    operationCondition: "REGULAR",
    conformityStatus: "AJUSTE",
  },
};

test("monta contexto assistido de sinalização com rua, projeto e sentido da via", () => {
  const autoContext = buildSignalingMobilityAutoContext({
    feature: semaforoFeature,
    baseLayersData,
    project: {
      id: "project-1",
      name: "Requalificação do centro",
      code: "MOB-2026-001",
      neighborhood: "Centro",
      district: "Sede",
      region: "Urbana",
    },
    currentUser: {
      id: "user-1",
      name: "Engenheira de trânsito",
      email: "transito@santacruz.rn.gov.br",
      role: "ENGENHEIRO",
    },
    technicalArea: "SINALIZACAO",
  });

  assert.equal(autoContext.projectLabel, "MOB-2026-001 · Requalificação do centro");
  assert.equal(autoContext.streetName, "Rua Coronel Júlio Pinheiro");
  assert.equal(autoContext.neighborhood, "Centro");
  assert.equal(autoContext.technicalArea, "SINALIZACAO");
  assert.ok(autoContext.suggestedRoadDirection);
  assert.ok(autoContext.suggestedRoadDirectionLabel);
});

test("sugere defaults, prioridade e atributos assistidos da disciplina", () => {
  const autoContext = buildSignalingMobilityAutoContext({
    feature: semaforoFeature,
    baseLayersData,
    project: {
      id: "project-1",
      name: "Requalificação do centro",
      code: "MOB-2026-001",
      neighborhood: "Centro",
      district: "Sede",
      region: "Urbana",
    },
    currentUser: {
      id: "user-1",
      name: "Engenheira de trânsito",
      email: "transito@santacruz.rn.gov.br",
      role: "ENGENHEIRO",
    },
    technicalArea: "SINALIZACAO",
  });

  const defaults = buildSignalingMobilityTechnicalDefaults({
    autoContext,
    technicalObjectType: "SEMAFORO",
    currentValues: {},
  });
  const suggestedName = buildSignalingMobilitySuggestedName(autoContext, "SEMAFORO", {});
  const assist = buildSignalingMobilityAssistAttributes(autoContext, "SEMAFORO");

  assert.equal(defaults.suggestedValues.signalMode, "VEICULAR");
  assert.equal(defaults.suggestedValues.signalingType, "SEMAFORO");
  assert.equal(defaults.suggestedValues.materialType, "METAL");
  assert.equal(defaults.suggestedValues.conformityStatus, "A_VERIFICAR");
  assert.equal(defaults.suggestedValues.priorityLevel, "BAIXA");
  assert.equal(defaults.suggestedValues.roadDirection, autoContext.suggestedRoadDirection);
  assert.equal(suggestedName, "Semáforo · Rua Coronel Júlio Pinheiro");
  assert.equal(assist.linkedProjectId, "project-1");
  assert.equal(assist.streetName, "Rua Coronel Júlio Pinheiro");
  assert.equal(assist.roadDirection, autoContext.suggestedRoadDirection);
});

test("recalcula prioridade sugerida quando condição e conformidade pioram", () => {
  const autoContext = buildSignalingMobilityAutoContext({
    feature: semaforoFeature,
    baseLayersData,
    project: {
      id: "project-1",
      name: "Requalificação do centro",
      code: "MOB-2026-001",
      neighborhood: "Centro",
      district: "Sede",
      region: "Urbana",
    },
    currentUser: {
      id: "user-1",
      name: "Engenheira de trânsito",
      email: "transito@santacruz.rn.gov.br",
      role: "ENGENHEIRO",
    },
    technicalArea: "SINALIZACAO",
  });

  const defaults = buildSignalingMobilityTechnicalDefaults({
    autoContext,
    technicalObjectType: "PLACA_TRANSITO",
    currentValues: {
      operationCondition: "RUIM",
      conformityStatus: "NAO_CONFORME",
      priorityLevel: "MEDIA",
    },
  });

  assert.equal(defaults.suggestedValues.priorityLevel, "URGENTE");
});

test("valida geometria pontual e linear da disciplina", () => {
  const pointGeometry = validateSignalingMobilityGeometry({
    coords: semaforoFeature.coords,
    technicalObjectType: "SEMAFORO",
  });
  const lineGeometry = validateSignalingMobilityGeometry({
    coords: ciclofaixaFeature.coords,
    technicalObjectType: "CICLOVIA_CICLOFAIXA",
  });

  assert.equal(pointGeometry.errors.length, 0);
  assert.equal(lineGeometry.errors.length, 0);
  assert.ok(lineGeometry.anchor);
});

test("consolida filtros e painel técnico da área", () => {
  const features: DrawnFeature[] = [
    {
      ...semaforoFeature,
      attributes: {
        technicalArea: "SINALIZACAO",
        technicalObjectType: "SEMAFORO",
        operationCondition: "BOA",
        conformityStatus: "CONFORME",
      },
    },
    {
      ...ciclofaixaFeature,
    },
    {
      ...semaforoFeature,
      id: "sign-2",
      type: "PLACA_TRANSITO",
      attributes: {
        technicalArea: "SINALIZACAO",
        technicalObjectType: "PLACA_TRANSITO",
        operationCondition: "RUIM",
        conformityStatus: "NAO_CONFORME",
      },
    },
  ];

  const signalingOptions = getSignalingMobilityFilterOptions(features, "SINALIZACAO");
  const mobilityStats = getSignalingMobilityTechnicalPanelStats(features, "MOBILIDADE");
  const signalingStats = getSignalingMobilityTechnicalPanelStats(features, "SINALIZACAO");

  assert.deepEqual(
    signalingOptions.technicalObjectType.map((item) => item.label),
    ["Placa de trânsito", "Semáforo"]
  );
  assert.equal(readSignalingMobilityFilterValue(features[2], "conformityStatus"), "NAO_CONFORME");
  assert.equal(signalingStats.totalItems, 2);
  assert.equal(signalingStats.nonCompliantItems, 1);
  assert.equal(signalingStats.criticalItems, 1);
  assert.equal(mobilityStats.totalItems, 1);
  assert.equal(mobilityStats.linearItems, 1);
});

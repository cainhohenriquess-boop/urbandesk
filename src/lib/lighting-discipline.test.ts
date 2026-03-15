import assert from "node:assert/strict";
import test from "node:test";
import type { BaseLayerData, DrawnFeature } from "@/store/useMapStore";
import {
  buildLightingAssistAttributes,
  buildLightingAutoContext,
  buildLightingSuggestedName,
  getLightingTechnicalPanelStats,
  mergeLightingDefaultValues,
} from "@/lib/lighting-discipline";

const baseLayersData: BaseLayerData[] = [
  {
    id: "ponnot-base",
    name: "PONNOT Santa Cruz",
    type: "PONNOT",
    sourceKind: "INFRASTRUCTURE",
    geoJsonData: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [-36.02002, -6.22998],
          },
          properties: {
            id: "pon-1",
            COD_ID: "POSTE-001",
            identifier: "POSTE-001",
            labelMultiline: "POSTE-001\nDT 24.6/250\nQTD_UCS: 0",
            streetName: "Rua da Matriz",
            neighborhood: "Centro",
            district: "Sede",
            region: "Urbana",
            municipalityName: "Santa Cruz",
            municipalityState: "RN",
            circuit: "CIR-12",
            operationalStatus: "OPERANTE",
          },
        },
      ],
    },
  },
  {
    id: "pont-ilum-base",
    name: "PONT_ILUM Santa Cruz",
    type: "PONT_ILUM",
    sourceKind: "INFRASTRUCTURE",
    geoJsonData: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [-36.02008, -6.22992],
          },
          properties: {
            id: "lum-1",
            TXT_LUM: "LUM-001",
            label: "LUM-001",
            identifier: "LUM-001",
            streetName: "Rua da Matriz",
            neighborhood: "Centro",
            district: "Sede",
            region: "Urbana",
            municipalityName: "Santa Cruz",
            municipalityState: "RN",
            circuit: "CIR-12",
            operationalStatus: "OPERANTE",
          },
        },
      ],
    },
  },
];

const feature: DrawnFeature = {
  id: "draft-lighting-item",
  type: "PONTO_APAGADO",
  coords: [{ lng: -36.02005, lat: -6.22995 }],
  synced: false,
  createdAt: Date.now(),
  attributes: {
    technicalArea: "ILUMINACAO",
    technicalObjectType: "PONTO_APAGADO",
    subType: "PONTO_APAGADO",
  },
};

test("monta contexto assistido de iluminação usando PONNOT e PONT_ILUM próximos", () => {
  const autoContext = buildLightingAutoContext({
    feature,
    baseLayersData,
    project: {
      id: "project-1",
      name: "Modernização da iluminação central",
      code: "ILU-2026-001",
      neighborhood: "Centro",
      district: "Sede",
      region: "Urbana",
    },
    currentUser: {
      id: "user-1",
      name: "Fiscal da iluminação",
      email: "fiscal@santacruz.rn.gov.br",
      role: "ENGENHEIRO",
    },
  });

  assert.equal(autoContext.nearestPole?.identifier, "POSTE-001");
  assert.equal(autoContext.nearestLightingPoint?.identifier, "LUM-001");
  assert.equal(autoContext.suggestedCircuit, "CIR-12");
  assert.equal(autoContext.streetName, "Rua da Matriz");
  assert.equal(autoContext.neighborhood, "Centro");
});

test("gera nome sugerido e atributos assistidos sem duplicar o dado importado", () => {
  const autoContext = buildLightingAutoContext({
    feature,
    baseLayersData,
    project: {
      id: "project-1",
      name: "Modernização da iluminação central",
      code: "ILU-2026-001",
      neighborhood: "Centro",
      district: "Sede",
      region: "Urbana",
    },
    currentUser: {
      id: "user-1",
      name: "Fiscal da iluminação",
      email: "fiscal@santacruz.rn.gov.br",
      role: "ENGENHEIRO",
    },
  });

  const suggestedName = buildLightingSuggestedName(autoContext, "PONTO_APAGADO", {
    powerCircuit: "",
  });
  const assisted = buildLightingAssistAttributes(autoContext, "PONTO_APAGADO", {
    powerCircuit: "",
  });

  assert.equal(suggestedName, "Ponto apagado · LUM-001");
  assert.equal(assisted.lightingDataSource, "INFRASTRUCTURE_REFERENCE");
  assert.equal(assisted.referencePoleIdentifier, "POSTE-001");
  assert.equal(assisted.referenceLightingPointIdentifier, "LUM-001");
  assert.equal(assisted.linkedProjectId, "project-1");
});

test("aplica valores padrão da disciplina de iluminação", () => {
  const values = mergeLightingDefaultValues({
    maintenancePriority: "ALTA",
  });

  assert.equal(values.operationalStatus, "OPERANTE");
  assert.equal(values.maintenancePriority, "ALTA");
  assert.equal(values.occurrenceStatus, "ABERTA");
});

test("calcula painel técnico da disciplina com base importada e itens operacionais", () => {
  const stats = getLightingTechnicalPanelStats({
    baseLayersData,
    features: [
      feature,
      {
        ...feature,
        id: "lum-oper",
        type: "LUMINARIA",
        attributes: {
          technicalArea: "ILUMINACAO",
          technicalObjectType: "LUMINARIA",
          referenceLightingPointId: "lum-1",
        },
      },
      {
        ...feature,
        id: "vistoria-1",
        type: "ITEM_VISTORIADO_ILUMINACAO",
        attributes: {
          technicalArea: "ILUMINACAO",
          technicalObjectType: "ITEM_VISTORIADO_ILUMINACAO",
        },
      },
    ],
  });

  assert.equal(stats.importedPoles, 1);
  assert.equal(stats.importedLightingPoints, 1);
  assert.equal(stats.operationalOutages, 1);
  assert.equal(stats.operationalLightingPoints, 1);
  assert.equal(stats.operationalInspections, 1);
  assert.equal(stats.linkedOperationalItems, 1);
  assert.deepEqual(stats.circuits, ["CIR-12"]);
});

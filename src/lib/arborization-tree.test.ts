import assert from "node:assert/strict";
import test from "node:test";
import type { BaseLayerData, DrawnFeature } from "@/store/useMapStore";
import {
  assessArborizationTree,
  buildArborizationTreeAssistAttributes,
  buildArborizationTreeAutoContext,
  buildArborizationTreeSuggestedName,
  buildArborizationTreeTechnicalDefaults,
  validateArborizationTreeGeometry,
} from "@/lib/arborization-tree";

const baseLayersData: BaseLayerData[] = [
  {
    id: "street-base",
    name: "Arruamento",
    type: "STREETS",
    sourceKind: "TENANT_BASE",
    geoJsonData: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [-36.0205, -6.2302],
              [-36.0195, -6.2297],
            ],
          },
          properties: {
            name: "Rua da Matriz",
          },
        },
      ],
    },
  },
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
            municipalityName: "Santa Cruz",
            streetName: "Rua da Matriz",
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
            coordinates: [-36.02007, -6.22996],
          },
          properties: {
            id: "lum-1",
            TXT_LUM: "LUM-001",
            municipalityName: "Santa Cruz",
            streetName: "Rua da Matriz",
          },
        },
      ],
    },
  },
];

const availableFeatures: DrawnFeature[] = [
  {
    id: "equip-1",
    type: "POSTE_LUZ",
    coords: [{ lng: -36.02003, lat: -6.22999 }],
    synced: true,
    createdAt: Date.now(),
    label: "Poste operacional 01",
    attributes: {
      technicalArea: "ILUMINACAO",
      technicalObjectType: "POSTE_LUZ",
    },
  },
];

const treeFeature: DrawnFeature = {
  id: "tree-1",
  type: "ARVORE",
  coords: [{ lng: -36.02004, lat: -6.22997 }],
  synced: false,
  createdAt: Date.now(),
  attributes: {
    technicalArea: "ARBORIZACAO",
    technicalObjectType: "ARVORE",
  },
};

test("monta contexto assistido de arborização com rua e referências próximas", () => {
  const autoContext = buildArborizationTreeAutoContext({
    feature: treeFeature,
    baseLayersData,
    project: {
      id: "project-1",
      name: "Parque Linear",
      code: "ARB-2026-001",
      neighborhood: "Centro",
      district: "Sede",
      region: "Urbana",
    },
    currentUser: {
      id: "user-1",
      name: "Fiscal ambiental",
      email: "fiscal@santacruz.rn.gov.br",
      role: "ENGENHEIRO",
    },
    availableFeatures,
  });

  assert.equal(autoContext.streetName, "Rua da Matriz");
  assert.equal(autoContext.neighborhood, "Centro");
  assert.equal(autoContext.nearestNetworkReference?.source, "PONNOT");
  assert.equal(autoContext.nearestEquipmentReference?.featureId, "equip-1");
  assert.equal(autoContext.municipalityName, "Santa Cruz");
});

test("sugere nome e risco da árvore com base na condição e nas proximidades", () => {
  const autoContext = buildArborizationTreeAutoContext({
    feature: treeFeature,
    baseLayersData,
    project: {
      id: "project-1",
      name: "Parque Linear",
      code: "ARB-2026-001",
      neighborhood: "Centro",
      district: "Sede",
      region: "Urbana",
    },
    currentUser: {
      id: "user-1",
      name: "Fiscal ambiental",
      email: "fiscal@santacruz.rn.gov.br",
      role: "ENGENHEIRO",
    },
    availableFeatures,
  });

  const assessment = assessArborizationTree(
    {
      species: "OITI",
      canopySize: "GRANDE",
      treeCondition: "EM_RISCO",
      riskLevel: "",
    },
    autoContext
  );
  const suggestedName = buildArborizationTreeSuggestedName(autoContext, {
    species: "OITI",
    canopySize: "GRANDE",
    treeCondition: "EM_RISCO",
    riskLevel: "",
  });
  const assist = buildArborizationTreeAssistAttributes(autoContext, assessment, {
    species: "OITI",
    canopySize: "GRANDE",
    treeCondition: "EM_RISCO",
    riskLevel: "",
  });

  assert.equal(assessment.suggestedRiskLevel, "CRITICO");
  assert.match(assessment.reason, /condição fitossanitária em risco/i);
  assert.equal(suggestedName, "Oiti · Rua da Matriz");
  assert.equal(assist.nearestNetworkSource, "PONNOT");
  assert.equal(assist.nearestEquipmentReferenceId, "equip-1");
});

test("aplica defaults da árvore e mantém geometria pontual válida", () => {
  const defaults = buildArborizationTreeTechnicalDefaults({
    autoContext: null,
    currentValues: {
      species: "",
      speciesOther: "",
    },
  });
  const geometry = validateArborizationTreeGeometry({
    coords: [{ lng: -36.02004, lat: -6.22997 }],
  });

  assert.equal(defaults.suggestedValues.canopySize, "MEDIO");
  assert.equal(defaults.suggestedValues.treeCondition, "SAUDAVEL");
  assert.equal(defaults.suggestedValues.riskLevel, "BAIXO");
  assert.equal(geometry.errors.length, 0);
  assert.equal(geometry.point?.lat, -6.22997);
});

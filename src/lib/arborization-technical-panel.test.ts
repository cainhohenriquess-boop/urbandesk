import assert from "node:assert/strict";
import test from "node:test";
import {
  getArborizationFilterOptions,
  getArborizationTechnicalPanelStats,
  readArborizationFilterValue,
} from "@/lib/arborization-technical-panel";
import type { DrawnFeature } from "@/store/useMapStore";

const arborizationFeatures: DrawnFeature[] = [
  {
    id: "tree-1",
    type: "ARVORE",
    coords: [{ lng: -35.2, lat: -5.8 }],
    synced: false,
    createdAt: Date.now(),
    attributes: {
      technicalArea: "ARBORIZACAO",
      technicalObjectType: "ARVORE",
      species: "Ipê roxo",
      canopySize: "GRANDE",
      treeCondition: "SAUDAVEL",
      riskLevel: "BAIXO",
    },
  },
  {
    id: "tree-2",
    type: "ARVORE",
    coords: [{ lng: -35.2005, lat: -5.8003 }],
    synced: false,
    createdAt: Date.now(),
    attributes: {
      technicalArea: "ARBORIZACAO",
      technicalObjectType: "ARVORE",
      species: "Oiti",
      canopySize: "MEDIO",
      treeCondition: "PRECISA_PODA",
      riskLevel: "MEDIO",
    },
  },
  {
    id: "group-1",
    type: "polygon",
    coords: [
      { lng: -35.21, lat: -5.81 },
      { lng: -35.209, lat: -5.81 },
      { lng: -35.209, lat: -5.809 },
    ],
    synced: false,
    createdAt: Date.now(),
    attributes: {
      technicalArea: "ARBORIZACAO",
      technicalObjectType: "AGRUPAMENTO_ARBOREO",
      species: "Oitizeiro",
      canopySize: "GRANDE",
      treeCondition: "SAUDAVEL",
      riskLevel: "BAIXO",
    },
  },
  {
    id: "pruning-1",
    type: "OCORRENCIA_PODA",
    coords: [{ lng: -35.201, lat: -5.801 }],
    synced: false,
    createdAt: Date.now(),
    attributes: {
      technicalArea: "ARBORIZACAO",
      technicalObjectType: "OCORRENCIA_PODA",
      species: "Oiti",
      canopySize: "MEDIO",
      treeCondition: "PRECISA_PODA",
      riskLevel: "MEDIO",
      occurrenceStatus: "ABERTA",
    },
  },
  {
    id: "risk-1",
    type: "RISCO_QUEDA_ARBORIZACAO",
    coords: [{ lng: -35.202, lat: -5.802 }],
    synced: false,
    createdAt: Date.now(),
    attributes: {
      technicalArea: "ARBORIZACAO",
      technicalObjectType: "RISCO_QUEDA_ARBORIZACAO",
      species: "Ficus",
      canopySize: "GRANDE",
      treeCondition: "EM_RISCO",
      riskLevel: "CRITICO",
      occurrenceStatus: "EM_TRATAMENTO",
    },
  },
  {
    id: "suppression-1",
    type: "SUPRESSAO_ARBORIZACAO",
    coords: [{ lng: -35.203, lat: -5.803 }],
    synced: false,
    createdAt: Date.now(),
    attributes: {
      technicalArea: "ARBORIZACAO",
      technicalObjectType: "SUPRESSAO_ARBORIZACAO",
      species: "Nim",
      canopySize: "MEDIO",
      treeCondition: "EM_RISCO",
      riskLevel: "ALTO",
      occurrenceStatus: "PROGRAMADA",
    },
  },
];

test("lê os valores usados pelos filtros de arborização", () => {
  assert.equal(readArborizationFilterValue(arborizationFeatures[0], "species"), "Ipê roxo");
  assert.equal(readArborizationFilterValue(arborizationFeatures[1], "canopySize"), "MEDIO");
  assert.equal(readArborizationFilterValue(arborizationFeatures[4], "treeCondition"), "EM_RISCO");
  assert.equal(readArborizationFilterValue(arborizationFeatures[5], "riskLevel"), "ALTO");
});

test("monta as opções dos filtros de arborização", () => {
  const options = getArborizationFilterOptions(arborizationFeatures);

  assert.deepEqual(options.canopySize.map((item) => item.value), ["GRANDE", "MEDIO"]);
  assert.ok(options.species.some((item) => item.value === "Ipê roxo"));
  assert.ok(options.treeCondition.some((item) => item.value === "PRECISA_PODA"));
  assert.ok(options.riskLevel.some((item) => item.value === "CRITICO"));
});

test("consolida o painel técnico de arborização", () => {
  const stats = getArborizationTechnicalPanelStats(arborizationFeatures);

  assert.equal(stats.arborizationItems, 6);
  assert.equal(stats.totalTrees, 2);
  assert.equal(stats.groupedAreas, 1);
  assert.equal(stats.openOccurrences, 3);
  assert.equal(stats.pendingSuppressions, 1);
  assert.equal(stats.criticalItems, 2);
  assert.equal(stats.itemsBySpecies[0]?.count, 2);
  assert.deepEqual(stats.itemsByRisk.map((item) => item.key), ["BAIXO", "MEDIO", "ALTO", "CRITICO"]);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  collectInfrastructureLayerConditionOptions,
  collectInfrastructureMunicipalityOptions,
  collectInfrastructureLayerStatusOptions,
  countInfrastructureLayerFeatures,
  filterInfrastructureLayerCollection,
  listInfrastructureLayerFeatures,
} from "@/lib/infrastructure-layer-map";

const ponnotCollection = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-38.5, -3.7] },
      properties: {
        layerCode: "PONNOT",
        COD_ID: "POSTE-001",
        operationalStatus: "OPERANTE",
        municipalityName: "Fortaleza",
        supportType: "CONCRETO",
        searchText: "POSTE-001 | CENTRO | OPERANTE",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-38.51, -3.71] },
      properties: {
        layerCode: "PONNOT",
        COD_ID: "POSTE-002",
        operationalStatus: "MANUTENCAO",
        municipalityName: "Fortaleza",
        supportType: "METALICO",
        searchText: "POSTE-002 | ALDEOTA | MANUTENCAO",
      },
    },
  ],
};

const pontIlumCollection = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-38.49, -3.72] },
      properties: {
        layerCode: "PONT_ILUM",
        TXT_LUM: "IP-045 - LED 120W",
        operationalStatus: "OPERANTE",
        municipalityName: "Fortaleza",
        searchText: "IP-045 - LED 120W | CENTRO | OPERANTE",
      },
    },
  ],
};

test("filtra feições por busca e status operacional", () => {
  const filtered = filterInfrastructureLayerCollection(ponnotCollection, "PONNOT", {
    code: "ALL",
    search: "POSTE-002",
    operationalStatus: "MANUTENCAO",
    condition: "ALL",
    municipalityName: "ALL",
  });

  assert.equal(filtered.features.length, 1);
  assert.equal(
    (filtered.features[0].properties as Record<string, unknown>).COD_ID,
    "POSTE-002"
  );
});

test("esconde feições quando o filtro estiver em outro tipo de camada", () => {
  const filtered = filterInfrastructureLayerCollection(ponnotCollection, "PONNOT", {
    code: "PONT_ILUM",
    search: "",
    operationalStatus: "ALL",
    condition: "ALL",
    municipalityName: "ALL",
  });

  assert.equal(filtered.features.length, 0);
});

test("coleta status disponíveis nas camadas publicadas", () => {
  const statuses = collectInfrastructureLayerStatusOptions([
    { type: "PONNOT", geoJsonData: ponnotCollection },
    { type: "PONT_ILUM", geoJsonData: pontIlumCollection },
  ]);

  assert.deepEqual(statuses, ["MANUTENCAO", "OPERANTE"]);
});

test("conta feições visíveis após aplicar filtros", () => {
  const count = countInfrastructureLayerFeatures(pontIlumCollection, "PONT_ILUM", {
    code: "ALL",
    search: "LED 120W",
    operationalStatus: "OPERANTE",
    condition: "ALL",
    municipalityName: "ALL",
  });

  assert.equal(count, 1);
});

test("filtra feições por condição e município", () => {
  const filtered = filterInfrastructureLayerCollection(ponnotCollection, "PONNOT", {
    code: "ALL",
    search: "",
    operationalStatus: "ALL",
    condition: "CONCRETO",
    municipalityName: "FORTALEZA",
  });

  assert.equal(filtered.features.length, 1);
  assert.equal(
    (filtered.features[0].properties as Record<string, unknown>).COD_ID,
    "POSTE-001"
  );
});

test("lista feições de infraestrutura com rótulo operacional correto", () => {
  const items = listInfrastructureLayerFeatures([
    { id: "ponnot-layer", name: "PONNOT", type: "PONNOT", geoJsonData: ponnotCollection },
    { id: "pont-layer", name: "PONT_ILUM", type: "PONT_ILUM", geoJsonData: pontIlumCollection },
  ]);

  assert.equal(items.length, 3);
  assert.equal(items[0].selectionKey, "PONNOT:POSTE-001");
  assert.equal(items[0].visibleLabel, "POSTE-001");
  assert.equal(items[2].visibleLabel, "IP-045 - LED 120W");
});

test("coleta opções de condição e município das camadas importadas", () => {
  const conditions = collectInfrastructureLayerConditionOptions([
    { type: "PONNOT", geoJsonData: ponnotCollection },
  ]);
  const municipalities = collectInfrastructureMunicipalityOptions([
    { type: "PONNOT", geoJsonData: ponnotCollection },
    { type: "PONT_ILUM", geoJsonData: pontIlumCollection },
  ]);

  assert.deepEqual(conditions, ["CONCRETO", "METALICO"]);
  assert.deepEqual(municipalities, ["Fortaleza"]);
});

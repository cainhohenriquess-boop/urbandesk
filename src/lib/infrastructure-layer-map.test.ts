import test from "node:test";
import assert from "node:assert/strict";
import {
  collectInfrastructureLayerStatusOptions,
  countInfrastructureLayerFeatures,
  filterInfrastructureLayerCollection,
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
  });

  assert.equal(count, 1);
});

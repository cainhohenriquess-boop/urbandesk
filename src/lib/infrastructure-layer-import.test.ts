import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import {
  InfrastructureLayerImportError,
  inspectInfrastructureLayerArchive,
  normalizePonnotProperties,
  normalizePontIlumProperties,
} from "@/lib/infrastructure-layer-import";

test("rejeita shapefile elétrico incompleto quando faltar arquivo obrigatório", () => {
  const zip = zipSync({
    "PONNOT.shp": strToU8("fake-shp"),
    "PONNOT.shx": strToU8("fake-shx"),
    "PONNOT.dbf": strToU8("fake-dbf"),
  });

  assert.throws(
    () =>
      inspectInfrastructureLayerArchive({
        buffer: Buffer.from(zip),
      }),
    (error: unknown) => {
      assert.ok(error instanceof InfrastructureLayerImportError);
      assert.equal(error.code, "MISSING_REQUIRED_FILES");
      return true;
    }
  );
});

test("normaliza PONNOT com rótulo multilinha e QTD_UCS calculado por vínculo", () => {
  const properties = normalizePonnotProperties({
    properties: {
      COD_ID: "12345",
      ESTR: "DT",
      ALT: "30",
      ESF: "72",
    },
    index: 1,
    ownerTenant: {
      id: "cm123owner",
      name: "Fortaleza",
      state: "CE",
      slug: "fortaleza",
    },
    linkedUcCountsByCodId: new Map([["12345", 7]]),
  });

  assert.equal(properties.COD_ID, "12345");
  assert.equal(properties.ESTR, "DT");
  assert.equal(properties.ALT, "30");
  assert.equal(properties.ESF, "72");
  assert.equal(properties.ALT_DECODIFICADO, "24.6");
  assert.equal(properties.ESF_DECODIFICADO, "250");
  assert.equal(properties.QTD_UCS, 7);
  assert.equal(properties.labelMultiline, "12345\nDT 24.6/250\nQTD_UCS: 7");
  assert.equal(properties.ownerTenantId, "cm123owner");
});

test("cria fallback de QTD_UCS em PONNOT quando não houver base suficiente", () => {
  const properties = normalizePonnotProperties({
    properties: {
      COD_ID: "54321",
      ESTR: "DT",
      ALT: "30",
      ESF: "72",
    },
    index: 2,
    ownerTenant: null,
    linkedUcCountsByCodId: null,
  });

  assert.equal(properties.QTD_UCS, 0);
  assert.equal(properties.labelMultiline, "54321\nDT 24.6/250\nQTD_UCS: 0");
});

test("normaliza PONT_ILUM usando exatamente TXT_LUM como texto visível", () => {
  const properties = normalizePontIlumProperties({
    properties: {
      TXT_LUM: "IP-045 - LED 120W",
      CODIGO: "L-45",
      STATUS: "OPERANTE",
    },
    index: 1,
    ownerTenant: {
      id: "cm123owner",
      name: "Fortaleza",
      state: "CE",
      slug: "fortaleza",
    },
  });

  assert.equal(properties.TXT_LUM, "IP-045 - LED 120W");
  assert.equal(properties.label, "IP-045 - LED 120W");
  assert.equal(properties.labelShort, "IP-045 - LED 120W");
  assert.equal(properties.name, "IP-045 - LED 120W");
  assert.equal(properties.operationalStatus, "OPERANTE");
});

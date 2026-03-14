import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPonnotLabel,
  decodePonnotAlt,
  decodePonnotEsf,
  resolvePonnotQtdUcs,
} from "@/lib/ponnot";

test("decodifica ALT e ESF de PONNOT sem arredondar valores", () => {
  assert.equal(decodePonnotAlt("30"), "24.6");
  assert.equal(decodePonnotAlt(72), "56");
  assert.equal(decodePonnotEsf("72"), "250");
  assert.equal(decodePonnotEsf(36), "2400");
});

test("monta o rótulo multilinha de PONNOT com a regra exata", () => {
  const label = buildPonnotLabel({
    codId: "12345",
    estr: "DT",
    altDecoded: "24.6",
    esfDecoded: "250",
    qtdUcs: 7,
  });

  assert.equal(label, "12345\nDT 24.6/250\nQTD_UCS: 7");
});

test("não adiciona /ESF quando ESF for inválido ou vazio", () => {
  const label = buildPonnotLabel({
    codId: "12345",
    estr: "DT",
    altDecoded: "24.6",
    esfDecoded: null,
    qtdUcs: 0,
  });

  assert.equal(label, "12345\nDT 24.6\nQTD_UCS: 0");
});

test("resolve QTD_UCS direto, por vínculo e por fallback", () => {
  assert.equal(
    resolvePonnotQtdUcs({
      rawQtdUcs: "12",
      codId: "P-1",
      linkedUcCountsByCodId: new Map([["P-1", 9]]),
    }),
    12
  );

  assert.equal(
    resolvePonnotQtdUcs({
      rawQtdUcs: null,
      codId: "P-2",
      linkedUcCountsByCodId: new Map([["P-2", 9]]),
    }),
    9
  );

  assert.equal(
    resolvePonnotQtdUcs({
      rawQtdUcs: undefined,
      codId: "P-3",
      linkedUcCountsByCodId: null,
    }),
    0
  );
});

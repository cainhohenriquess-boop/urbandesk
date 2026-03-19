import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCampoChecklistDefaultIssueTitle,
  buildCampoChecklistIssueDescription,
  deriveCampoChecklistIssuePriority,
  getCampoChecklistDefinition,
  summarizeCampoChecklist,
  validateCampoChecklistEntries,
} from "@/lib/campo-checklists";

test("retorna checklist específico por disciplina", () => {
  const definition = getCampoChecklistDefinition("DRENAGEM");

  assert.ok(definition);
  assert.equal(definition?.items.length, 5);
  assert.equal(definition?.items[0]?.label, "Obstrução");
});

test("valida checklist incompleto para área suportada", () => {
  const result = validateCampoChecklistEntries("ILUMINACAO", [
    { itemId: "ponto-apagado", status: "NAO_CONFORME" },
  ]);

  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /checklist de iluminação pública/i);
});

test("resume não conformidades e gera título padrão de pendência", () => {
  const entries = [
    { itemId: "trinca", status: "NAO_CONFORME" as const },
    { itemId: "buraco", status: "NAO_CONFORME" as const },
    { itemId: "afundamento", status: "CONFORME" as const },
    { itemId: "remendo-ruim", status: "NAO_SE_APLICA" as const },
    { itemId: "drenagem-associada", status: "CONFORME" as const },
  ];

  const summary = summarizeCampoChecklist("PAVIMENTACAO", entries);
  const title = buildCampoChecklistDefaultIssueTitle({
    area: "PAVIMENTACAO",
    checklistEntries: entries,
    fallbackName: "Vistoria de pavimentação",
  });

  assert.equal(summary.nonConformingCount, 2);
  assert.deepEqual(summary.nonConformityLabels, ["Trinca", "Buraco"]);
  assert.equal(title, "Não conformidade de pavimentação: Trinca e mais 1");
});

test("gera descrição de pendência a partir do checklist e da observação", () => {
  const description = buildCampoChecklistIssueDescription({
    area: "ARBORIZACAO",
    checklistEntries: [
      { itemId: "risco-queda", status: "NAO_CONFORME" },
      { itemId: "praga", status: "CONFORME" },
      { itemId: "poda-necessaria", status: "NAO_CONFORME" },
      { itemId: "conflito-rede", status: "NAO_SE_APLICA" },
    ],
    note: "Galhos tocando a fiação secundária.",
  });

  assert.match(description, /Checklist de arborização/i);
  assert.match(description, /Risco de queda, Poda necessária/i);
  assert.match(description, /Galhos tocando a fiação secundária/i);
});

test("deriva prioridade da pendência pelo total de não conformidades", () => {
  assert.equal(
    deriveCampoChecklistIssuePriority([
      { itemId: "obstrucao", status: "NAO_CONFORME" },
    ]),
    "MEDIA"
  );
  assert.equal(
    deriveCampoChecklistIssuePriority([
      { itemId: "obstrucao", status: "NAO_CONFORME" },
      { itemId: "assoreamento", status: "NAO_CONFORME" },
    ]),
    "ALTA"
  );
  assert.equal(
    deriveCampoChecklistIssuePriority([
      { itemId: "obstrucao", status: "NAO_CONFORME" },
      { itemId: "assoreamento", status: "NAO_CONFORME" },
      { itemId: "colapso", status: "NAO_CONFORME" },
    ]),
    "URGENTE"
  );
});

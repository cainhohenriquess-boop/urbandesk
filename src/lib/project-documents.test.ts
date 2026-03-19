import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProjectDocumentIndicators,
  buildProjectDocumentTitle,
} from "@/lib/project-documents";

test("usa o título explícito quando informado", () => {
  assert.equal(buildProjectDocumentTitle("contrato-01.pdf", "Contrato assinado"), "Contrato assinado");
});

test("deriva título a partir do nome do arquivo quando necessário", () => {
  assert.equal(buildProjectDocumentTitle("relatorio-fotografico.pdf", null), "relatorio-fotografico");
});

test("consolida indicadores documentais do projeto", () => {
  const indicators = buildProjectDocumentIndicators([
    {
      id: "doc-1",
      title: "Contrato",
      description: null,
      documentType: "CONTRATO",
      fileName: "contrato.pdf",
      fileUrl: "/uploads/contrato.pdf",
      mimeType: "application/pdf",
      fileSize: 1000,
      documentDate: "2026-03-10T00:00:00.000Z",
      isPublic: false,
      createdAt: "2026-03-10T08:00:00.000Z",
      updatedAt: "2026-03-10T08:00:00.000Z",
      technicalArea: "DRENAGEM",
      phase: null,
      contract: null,
      measurement: null,
      uploadedBy: null,
    },
    {
      id: "doc-2",
      title: "Laudo",
      description: null,
      documentType: "LAUDO",
      fileName: "laudo.pdf",
      fileUrl: "/uploads/laudo.pdf",
      mimeType: "application/pdf",
      fileSize: 1000,
      documentDate: "2026-03-12T00:00:00.000Z",
      isPublic: true,
      createdAt: "2026-03-12T08:00:00.000Z",
      updatedAt: "2026-03-12T08:00:00.000Z",
      technicalArea: null,
      phase: null,
      contract: null,
      measurement: null,
      uploadedBy: null,
    },
  ]);

  assert.equal(indicators.totalDocuments, 2);
  assert.equal(indicators.publicDocuments, 1);
  assert.equal(indicators.categorizedDocuments, 2);
  assert.equal(indicators.areaLinkedDocuments, 1);
  assert.equal(indicators.latestDocumentDate, "2026-03-12T00:00:00.000Z");
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInfrastructureLayerTenantWhere,
  evaluateInfrastructureUploadAccess,
} from "@/lib/infrastructure-layer-access";

test("permite upload para superadmin ativo", () => {
  const result = evaluateInfrastructureUploadAccess({
    user: {
      id: "usr_1",
      role: "SUPERADMIN",
      isActive: true,
    },
  });

  assert.equal(result.allowed, true);
  assert.equal(result.status, 200);
  assert.equal(result.payload, null);
});

test("bloqueia upload para usuário sem permissão", () => {
  const result = evaluateInfrastructureUploadAccess({
    user: {
      id: "usr_2",
      role: "SECRETARIO",
      isActive: true,
      tenantId: "cmtenant123",
      tenantStatus: "ATIVO",
    },
  });

  assert.equal(result.allowed, false);
  assert.equal(result.status, 403);
  assert.deepEqual(result.payload, {
    error: "Somente superadmin pode publicar camadas elétricas.",
  });
});

test("bloqueia usuário inativo antes de avaliar permissão", () => {
  const result = evaluateInfrastructureUploadAccess({
    user: {
      id: "usr_3",
      role: "SUPERADMIN",
      isActive: false,
    },
  });

  assert.equal(result.allowed, false);
  assert.equal(result.status, 403);
  assert.deepEqual(result.payload, {
    error: "Usuário inativo.",
    code: "user_inactive",
  });
});

test("gera o escopo de isolamento por tenant para camadas publicadas", () => {
  assert.deepEqual(buildInfrastructureLayerTenantWhere("cmtenant123"), {
    status: "READY",
    authorizedTenants: {
      some: {
        tenantId: "cmtenant123",
      },
    },
  });
});

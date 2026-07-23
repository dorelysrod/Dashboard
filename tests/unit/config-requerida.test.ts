import { test } from "node:test";
import assert from "node:assert/strict";
import { envsFaltantes, ENVS_REQUERIDAS_PRODUCCION } from "../../lib/config/requerida";

const completas = {
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
};

test("en producción con todo definido no falta nada", () => {
  assert.deepEqual(envsFaltantes(completas, "production"), []);
});

test("en producción una env ausente o vacía se reporta como faltante", () => {
  assert.deepEqual(
    envsFaltantes({ ...completas, SUPABASE_SERVICE_ROLE_KEY: undefined }, "production"),
    ["SUPABASE_SERVICE_ROLE_KEY"],
  );
  // Vacía o solo espacios = faltante: un typo de deploy suele dejar "".
  assert.deepEqual(
    envsFaltantes({ ...completas, NEXT_PUBLIC_SUPABASE_URL: "  " }, "production"),
    ["NEXT_PUBLIC_SUPABASE_URL"],
  );
});

test("fuera de producción no se exige nada (dev pre-setup sigue válido)", () => {
  assert.deepEqual(envsFaltantes({}, "development"), []);
  assert.deepEqual(envsFaltantes({}, "test"), []);
  assert.deepEqual(envsFaltantes({}, undefined), []);
});

test("sin NINGUNA env en producción se reportan todas (fallo ruidoso, no parcial)", () => {
  assert.deepEqual(envsFaltantes({}, "production"), [...ENVS_REQUERIDAS_PRODUCCION]);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { FX, PAQUETE_BASE_MXN, aEur, etiquetaScore } from "../../lib/format";

test("aEur convierte MXN→€ con el tipo de cambio de fallback", () => {
  assert.equal(aEur(PAQUETE_BASE_MXN), Math.round(PAQUETE_BASE_MXN * FX));
  assert.equal(aEur(20000), 1000);
});

test("aEur redondea y trata 0 como 0", () => {
  assert.equal(aEur(0), 0);
  assert.equal(aEur(199), Math.round(199 * FX)); // 9.95 → 10
});

test("etiquetaScore: quick win cuando es barato y rápido", () => {
  assert.deepEqual(etiquetaScore(500, 5), { css: "qw", label: "Quick win" });
});

test("etiquetaScore: proyecto grande domina desde 1200€", () => {
  assert.deepEqual(etiquetaScore(1500, 20), {
    css: "big",
    label: "Proyecto grande",
  });
});

test("etiquetaScore: baja prioridad cuando es poco dinero y muchos días", () => {
  assert.deepEqual(etiquetaScore(600, 15), {
    css: "low",
    label: "Baja prioridad",
  });
});

test("etiquetaScore: buen ratio en el caso intermedio", () => {
  assert.deepEqual(etiquetaScore(800, 10), { css: "qw", label: "Buen ratio" });
});

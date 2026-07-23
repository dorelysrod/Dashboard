import { test } from "node:test";
import assert from "node:assert/strict";
import type { EtapaLead } from "../../lib/types/db";
import {
  compararPorCalificacion,
  esInspeccionadoOPosterior,
  esMejorCalificado,
  ETAPAS_INSPECCIONADAS,
  meritaDistintivoCalificado,
  MIN_RESENAS_DISTINTIVO,
  tieneResenas,
  UMBRAL_RATING_CALIFICADO,
} from "../../lib/data/filtros-leads";

test("umbrales nombrados del spec (4.5 rating, 10 reseñas)", () => {
  assert.equal(UMBRAL_RATING_CALIFICADO, 4.5);
  assert.equal(MIN_RESENAS_DISTINTIVO, 10);
});

test("esMejorCalificado: rating no nulo y ≥ 4.5 (borde exacto incluido)", () => {
  assert.equal(esMejorCalificado({ rating: 5.0, resenas: 3 }), true);
  assert.equal(esMejorCalificado({ rating: 4.5, resenas: 0 }), true); // borde
  assert.equal(esMejorCalificado({ rating: 4.4, resenas: 900 }), false);
  assert.equal(esMejorCalificado({ rating: null, resenas: 50 }), false);
});

test("tieneResenas: resenas > 0; null cuenta como 0", () => {
  assert.equal(tieneResenas({ rating: null, resenas: 1 }), true);
  assert.equal(tieneResenas({ rating: 5.0, resenas: 0 }), false);
  assert.equal(tieneResenas({ rating: 5.0, resenas: null }), false);
});

test("esInspeccionadoOPosterior: inspeccionado..entregado dentro; nuevo y descartado FUERA", () => {
  const dentro: EtapaLead[] = [
    "inspeccionado",
    "cotizado",
    "enviado",
    "abierto",
    "aceptado",
    "en_desarrollo",
    "entregado",
  ];
  for (const e of dentro) assert.equal(esInspeccionadoOPosterior(e), true, e);
  assert.equal(esInspeccionadoOPosterior("nuevo"), false);
  // descartado salió del pipeline: no cuenta aunque haya sido inspeccionado.
  assert.equal(esInspeccionadoOPosterior("descartado"), false);
  assert.deepEqual([...ETAPAS_INSPECCIONADAS].sort(), [...dentro].sort());
});

test("compararPorCalificacion ordena rating desc con desempate resenas desc", () => {
  const leads = [
    { id: "pocas", rating: 5.0, resenas: 8 },
    { id: "sin-rating", rating: null, resenas: 900 },
    { id: "media", rating: 4.6, resenas: 34 },
    { id: "top", rating: 5.0, resenas: 75 },
    { id: "resenas-null", rating: 5.0, resenas: null },
  ];
  const orden = [...leads].sort(compararPorCalificacion).map((l) => l.id);
  // Empate en 5.0 → más reseñas primero; resenas null cuenta como 0;
  // rating null al final aunque tenga muchas reseñas.
  assert.deepEqual(orden, ["top", "pocas", "resenas-null", "media", "sin-rating"]);
});

test("compararPorCalificacion es total: iguales → 0, y antisimétrico", () => {
  const a = { rating: 4.8, resenas: 20 };
  const b = { rating: 4.8, resenas: 5 };
  assert.equal(compararPorCalificacion(a, { ...a }), 0);
  assert.ok(compararPorCalificacion(a, b) < 0);
  assert.ok(compararPorCalificacion(b, a) > 0);
});

test("meritaDistintivoCalificado exige rating ≥ 4.5 Y resenas ≥ 10", () => {
  assert.equal(meritaDistintivoCalificado({ rating: 4.5, resenas: 10 }), true); // borde doble
  assert.equal(meritaDistintivoCalificado({ rating: 5.0, resenas: 9 }), false); // pocas reseñas
  assert.equal(meritaDistintivoCalificado({ rating: 4.4, resenas: 500 }), false); // rating bajo
  assert.equal(meritaDistintivoCalificado({ rating: null, resenas: 100 }), false);
  assert.equal(meritaDistintivoCalificado({ rating: 5.0, resenas: null }), false);
});

// El rating de Google mide satisfacción de clientes; el tier del motor mide
// oportunidad de venta (brecha web, cadena…). Sin excluir Tier C, el filtro
// mostraba clínicas 4.9★ que la inspección descartaba después (web fuerte).
test("esMejorCalificado excluye Tier C (descalificado) aunque el rating sea alto", () => {
  assert.equal(esMejorCalificado({ rating: 4.9, resenas: 200, tier: "C" }), false);
  assert.equal(esMejorCalificado({ rating: 4.9, resenas: 200, tier: "A" }), true);
  assert.equal(esMejorCalificado({ rating: 4.9, resenas: 200, tier: "B" }), true);
});

test("tier null/ausente (sin veredicto aún) NO cuenta como descalificado", () => {
  assert.equal(esMejorCalificado({ rating: 4.7, resenas: 30, tier: null }), true);
  assert.equal(esMejorCalificado({ rating: 4.7, resenas: 30 }), true);
});

test("el distintivo ★ tampoco se muestra para Tier C", () => {
  assert.equal(meritaDistintivoCalificado({ rating: 5.0, resenas: 80, tier: "C" }), false);
  assert.equal(meritaDistintivoCalificado({ rating: 5.0, resenas: 80, tier: "A" }), true);
});

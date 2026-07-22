import { test } from "node:test";
import assert from "node:assert/strict";
import { calificarLead } from "../../lib/data/scoring";

test("lead ideal: sin web + demanda probada + owner + premium → tier A", () => {
  const c = calificarLead({ brechaWeb: "sin_web", rating: 4.9, resenas: 120, ownerOperated: true, premium: true });
  assert.equal(c.tier, "A");
  assert.ok(c.score >= 78, `score ${c.score}`);
  assert.ok(!c.descalificado);
});

test("web fuerte descalifica aunque todo lo demás sea bueno", () => {
  const c = calificarLead({ brechaWeb: "fuerte", rating: 5, resenas: 400, ownerOperated: true, premium: true });
  assert.ok(c.descalificado);
  assert.equal(c.tier, "C");
});

test("cadena grande descalifica (venta lenta)", () => {
  const c = calificarLead({ brechaWeb: "debil", rating: 4.8, resenas: 200, cadena: true });
  assert.ok(c.descalificado);
});

test("reputación baja con volumen descalifica (problema de servicio)", () => {
  const c = calificarLead({ brechaWeb: "sin_web", rating: 3.6, resenas: 80 });
  assert.ok(c.descalificado);
});

test("web débil + demanda media → tier B, no A", () => {
  const c = calificarLead({ brechaWeb: "debil", rating: 4.6, resenas: 25 });
  assert.equal(c.tier, "B");
});

test("señales desconocidas → score neutro, marca para enriquecer", () => {
  const c = calificarLead({ brechaWeb: null, rating: null, resenas: null });
  assert.ok(c.motivos.some((m) => /enriquecer/i.test(m)));
  assert.ok(c.score > 0 && c.score < 78);
});

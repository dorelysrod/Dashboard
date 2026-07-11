import { test } from "node:test";
import assert from "node:assert/strict";
import { filaALead, mapearEtapa, masReciente } from "../../lib/data/mapeo";
import type { LeadConRelaciones } from "../../lib/data/mapeo";

test("mapearEtapa traduce las etapas de BD a estado visual", () => {
  assert.equal(mapearEtapa("enviado").css, "st-env");
  assert.equal(mapearEtapa("en_desarrollo").css, "st-dev");
  assert.equal(mapearEtapa("aceptado").label, "Aceptada");
});

test("masReciente elige el elemento con created_at mayor", () => {
  const filas = [
    { created_at: "2026-01-01T00:00:00Z", v: "vieja" },
    { created_at: "2026-06-01T00:00:00Z", v: "nueva" },
    { created_at: "2026-03-01T00:00:00Z", v: "media" },
  ];
  assert.equal(masReciente(filas)?.v, "nueva");
});

test("masReciente devuelve undefined con lista vacía o nula", () => {
  assert.equal(masReciente([]), undefined);
  assert.equal(masReciente(null), undefined);
  assert.equal(masReciente(undefined), undefined);
});

const baseFila = (over: Partial<LeadConRelaciones> = {}): LeadConRelaciones =>
  ({
    id: "l1",
    negocio: "Clínica Sol",
    ciudad: "Madrid",
    rubro: "Medicina estética",
    etapa: "enviado",
    esfuerzo_dias: 3,
    ...over,
  }) as LeadConRelaciones;

test("filaALead toma la cotización más reciente para el importe (total_mxn)", () => {
  const lead = filaALead(
    baseFila({
      cotizaciones: [
        { total_mxn: 10000, base_mxn: 14900, created_at: "2026-01-01T00:00:00Z" },
        { total_mxn: 22000, base_mxn: 14900, created_at: "2026-05-01T00:00:00Z" },
      ] as LeadConRelaciones["cotizaciones"],
    }),
  );
  assert.equal(lead.mxn, 22000);
  assert.equal(lead.nombre, "Clínica Sol");
  assert.equal(lead.meta, "Madrid · Medicina estética");
});

test("filaALead cae a base_mxn cuando total_mxn es nulo", () => {
  const lead = filaALead(
    baseFila({
      cotizaciones: [
        { total_mxn: null, base_mxn: 14900, created_at: "2026-05-01T00:00:00Z" },
      ] as LeadConRelaciones["cotizaciones"],
    }),
  );
  assert.equal(lead.mxn, 14900);
});

test("filaALead usa valores neutros (0/'') cuando no hay relaciones", () => {
  const lead = filaALead(baseFila());
  assert.equal(lead.mxn, 0);
  assert.equal(lead.aperturas, 0);
  assert.equal(lead.correo, "");
  assert.deepEqual(lead.modulos, []);
});

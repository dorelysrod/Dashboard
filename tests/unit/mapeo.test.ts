import { test } from "node:test";
import assert from "node:assert/strict";
import {
  esNicho,
  filaALead,
  mapearEtapa,
  mapearNicho,
  masReciente,
  NICHOS,
  nichoDesdeRubro,
} from "../../lib/data/mapeo";
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

test("mapearNicho da badge con clase y etiqueta por nicho", () => {
  assert.deepEqual(mapearNicho("estetica"), { css: "ni-est", label: "Medicina estética" });
  assert.equal(mapearNicho("turismo_dental").label, "Turismo dental");
  assert.equal(mapearNicho("bodas_venues").css, "ni-bodas");
  assert.equal(mapearNicho("tour_operadores").css, "ni-tour");
});

test("NICHOS lista los 4 nichos con el base primero (orden de los chips)", () => {
  assert.equal(NICHOS.length, 4);
  assert.equal(NICHOS[0], "estetica");
});

test("esNicho valida searchParams: acepta el catálogo y rechaza basura", () => {
  for (const n of NICHOS) assert.equal(esNicho(n), true);
  assert.equal(esNicho("dentistas"), false);
  assert.equal(esNicho(""), false);
  assert.equal(esNicho(null), false);
  assert.equal(esNicho(undefined), false);
});

test("nichoDesdeRubro infiere el nicho del rubro libre de Buscar", () => {
  assert.equal(nichoDesdeRubro("Clínica dental para extranjeros"), "turismo_dental");
  assert.equal(nichoDesdeRubro("Odontología estética"), "turismo_dental");
  assert.equal(nichoDesdeRubro("Jardín de eventos y bodas"), "bodas_venues");
  assert.equal(nichoDesdeRubro("Venue para bodas"), "bodas_venues");
  assert.equal(nichoDesdeRubro("Tour operador de buceo"), "tour_operadores");
  assert.equal(nichoDesdeRubro("Agencia de viajes"), "tour_operadores");
  assert.equal(nichoDesdeRubro("Medicina estética"), "estetica");
  assert.equal(nichoDesdeRubro(""), "estetica");
  assert.equal(nichoDesdeRubro(undefined), "estetica");
});

test("filaALead propaga rating/resenas/etapaDb (resenas null → 0)", () => {
  const conDatos = filaALead(baseFila({ rating: 4.9, resenas: 85 }));
  assert.equal(conDatos.rating, 4.9);
  assert.equal(conDatos.resenas, 85);
  assert.equal(conDatos.etapaDb, "enviado");
  // Fila sin rating/resenas: rating queda null (sin calificación), resenas 0.
  const sinDatos = filaALead(baseFila({ rating: null, resenas: null }));
  assert.equal(sinDatos.rating, null);
  assert.equal(sinDatos.resenas, 0);
});

test("filaALead conserva el nicho de la fila y cae al base si falta", () => {
  const conNicho = filaALead(baseFila({ nicho: "turismo_dental" }));
  assert.equal(conNicho.nicho, "turismo_dental");
  // Fila anterior a la migración (o valor corrupto) → nicho base.
  const sinNicho = filaALead(baseFila());
  assert.equal(sinNicho.nicho, "estetica");
});

test("filaALead propaga rating/resenas/etapaDb (resenas null → 0)", () => {
  const conDatos = filaALead(baseFila({ rating: 4.9, resenas: 85 }));
  assert.equal(conDatos.rating, 4.9);
  assert.equal(conDatos.resenas, 85);
  assert.equal(conDatos.etapaDb, "enviado");
  // Fila sin rating/resenas: rating queda null (sin calificación), resenas 0.
  const sinDatos = filaALead(baseFila({ rating: null, resenas: null }));
  assert.equal(sinDatos.rating, null);
  assert.equal(sinDatos.resenas, 0);
});

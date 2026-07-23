import { test } from "node:test";
import assert from "node:assert/strict";
import { filtrarYOrdenarLeads } from "../../lib/data/leads-consulta";
import type { EtapaLead } from "../../lib/types/db";
import type { Nicho } from "../../lib/types/dominio";

/**
 * Seed-mode composition of the quality filters (AND semantics + ordering).
 * The individual predicates/comparator are covered in filtros-leads.test.ts;
 * here we verify the composition mirrors the Supabase query semantics.
 */

interface LeadPrueba {
  id: string;
  nicho: Nicho;
  etapaDb: EtapaLead;
  rating: number | null;
  resenas: number;
}

function lead(
  id: string,
  nicho: Nicho,
  etapaDb: EtapaLead,
  rating: number | null,
  resenas: number,
): LeadPrueba {
  return { id, nicho, etapaDb, rating, resenas };
}

// Base order simulates created_at asc (seed order).
const BASE: LeadPrueba[] = [
  lead("a", "turismo_dental", "nuevo", 4.9, 120),
  lead("b", "turismo_dental", "inspeccionado", 4.5, 10),
  lead("c", "bodas_venues", "cotizado", 4.9, 85),
  lead("d", "bodas_venues", "nuevo", null, 0),
  lead("e", "turismo_dental", "descartado", 4.8, 40),
  lead("f", "bodas_venues", "entregado", 3.9, 200),
  lead("g", "turismo_dental", "enviado", 4.5, 10),
];

test("sin filtros devuelve todos en el orden de entrada (regresión cero)", () => {
  const resultado = filtrarYOrdenarLeads(BASE, {});
  assert.deepEqual(resultado.map((l) => l.id), ["a", "b", "c", "d", "e", "f", "g"]);
});

test("calificados: filtra rating ≥ 4.5 y ordena rating desc, resenas desc, empates estables", () => {
  const resultado = filtrarYOrdenarLeads(BASE, { calificados: true });
  // a (4.9, 120) > c (4.9, 85) > e (4.8) > b/g empatados (4.5, 10) en orden base
  assert.deepEqual(resultado.map((l) => l.id), ["a", "c", "e", "b", "g"]);
});

test("conResenas: excluye resenas 0 sin reordenar", () => {
  const resultado = filtrarYOrdenarLeads(BASE, { conResenas: true });
  assert.deepEqual(resultado.map((l) => l.id), ["a", "b", "c", "e", "f", "g"]);
});

test("inspeccionados: etapa inspeccionado o posterior; nuevo y descartado fuera", () => {
  const resultado = filtrarYOrdenarLeads(BASE, { inspeccionados: true });
  assert.deepEqual(resultado.map((l) => l.id), ["b", "c", "f", "g"]);
});

test("semántica AND: los 4 filtros combinados se intersectan", () => {
  const resultado = filtrarYOrdenarLeads(BASE, {
    nicho: "bodas_venues",
    calificados: true,
    conResenas: true,
    inspeccionados: true,
  });
  assert.deepEqual(resultado.map((l) => l.id), ["c"]);
});

test("nicho combinado con calificados conserva el orden por calificación", () => {
  const resultado = filtrarYOrdenarLeads(BASE, { nicho: "turismo_dental", calificados: true });
  assert.deepEqual(resultado.map((l) => l.id), ["a", "e", "b", "g"]);
});

test("combo sin resultados devuelve lista vacía (estado vacío del panel)", () => {
  const resultado = filtrarYOrdenarLeads(BASE, { nicho: "bodas_venues", inspeccionados: true, calificados: true, conResenas: false });
  // c es el único bodas inspeccionado y calificado; forzamos vacío con otro combo:
  const vacio = filtrarYOrdenarLeads(
    BASE.filter((l) => l.id !== "c"),
    { nicho: "bodas_venues", inspeccionados: true, calificados: true },
  );
  assert.deepEqual(resultado.map((l) => l.id), ["c"]);
  assert.deepEqual(vacio, []);
});

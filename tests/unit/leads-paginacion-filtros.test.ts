import { test } from "node:test";
import assert from "node:assert/strict";
import { filtrarYOrdenarLeads } from "../../lib/data/leads-consulta";
import { compararPorCalificacion } from "../../lib/data/filtros-leads";
import { paginar, POR_PAGINA, totalPaginas } from "../../lib/data/paginacion";
import type { EtapaLead } from "../../lib/types/db";
import type { Nicho } from "../../lib/types/dominio";

/**
 * Composition test for the seed-mode path of `obtenerLeadsPagina`:
 * `paginar(filtrarYOrdenarLeads(...))`. The pieces are covered individually
 * (leads-consulta.test.ts, paginacion.test.ts); this verifies the CONTRACT the
 * pagination UI relies on (spec AC 4): the reported `total`/`totalPaginas`
 * reflect the FILTERED set, and the quality ordering spans page boundaries
 * without duplicating or skipping rows. The seed fixture (6 leads) never
 * paginates, so this is the only executable evidence for that path.
 */

interface LeadPrueba {
  id: string;
  nicho: Nicho;
  etapaDb: EtapaLead;
  rating: number | null;
  resenas: number;
}

// 60 deterministic leads in "created_at asc" order: 40 qualified (rating ≥ 4.5)
// with repeated ratings to exercise tie-breaks across the page boundary, plus
// 20 non-qualified (low or null rating) that must not count toward the total.
const TODOS: LeadPrueba[] = [];
for (let i = 0; i < 40; i++) {
  TODOS.push({
    id: `q${i}`,
    nicho: i % 2 === 0 ? "turismo_dental" : "bodas_venues",
    etapaDb: "inspeccionado",
    rating: 4.5 + (i % 5) * 0.1, // 4.5..4.9, repeated → ties
    resenas: 10 + i, // unique tie-break
  });
}
for (let i = 0; i < 20; i++) {
  TODOS.push({
    id: `n${i}`,
    nicho: "turismo_dental",
    etapaDb: "nuevo",
    rating: i % 2 === 0 ? null : 3.0,
    resenas: 500 + i, // many reviews but low/no rating: excluded anyway
  });
}

test("paginado sobre set filtrado: total y totalPaginas reflejan el filtro, no el universo", () => {
  const filtrados = filtrarYOrdenarLeads(TODOS, { calificados: true });
  const p1 = paginar(filtrados, 1);

  assert.equal(filtrados.length, 40);
  assert.equal(p1.total, 40); // count of the FILTERED set (60 would be a bug)
  assert.equal(p1.totalPaginas, totalPaginas(40));
  assert.equal(p1.totalPaginas, 2);
  assert.equal(p1.items.length, POR_PAGINA);
});

test("orden por calificación cruza el corte de página sin duplicar ni saltar filas", () => {
  const filtrados = filtrarYOrdenarLeads(TODOS, { calificados: true });
  const p1 = paginar(filtrados, 1);
  const p2 = paginar(filtrados, 2);

  const reunidos = [...p1.items, ...p2.items];
  assert.equal(reunidos.length, 40);
  assert.equal(new Set(reunidos.map((l) => l.id)).size, 40); // no dups
  assert.deepEqual(reunidos, filtrados); // no skips, same order

  // The boundary respects the comparator: last of page 1 ranks ≥ first of page 2.
  const ultimoP1 = p1.items[p1.items.length - 1];
  const primeroP2 = p2.items[0];
  assert.ok(compararPorCalificacion(ultimoP1, primeroP2) <= 0);
});

test("página 2 del set filtrado entrega el resto exacto (15 de 40)", () => {
  const filtrados = filtrarYOrdenarLeads(TODOS, {
    calificados: true,
    nicho: undefined,
  });
  const p2 = paginar(filtrados, 2);
  assert.equal(p2.items.length, 15);
  assert.equal(p2.pagina, 2);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { aplicarOrdenLeads, type ConsultaOrdenable } from "../../lib/data/leads";

/**
 * Regression: the server-side ORDER BY must mirror `compararPorCalificacion`
 * (seed mode) EXACTLY. postgrest-js emits no NULLS modifier unless `nullsFirst`
 * is given, and PostgreSQL defaults to NULLS FIRST for DESC — while the pure
 * comparator treats null as 0/-1 (nulls last). Without `nullsFirst: false` a
 * lead with rating 4.9 / resenas NULL sorts FIRST in Supabase but LAST in seed
 * mode → mode-parity broken (spec AC 11). We assert on the calls emitted to a
 * fake builder: exact columns, direction and NULLS LAST.
 */

interface LlamadaOrder {
  columna: string;
  opciones: { ascending: boolean; nullsFirst?: boolean };
}

function builderFalso(): ConsultaOrdenable & { llamadas: LlamadaOrder[] } {
  return {
    llamadas: [] as LlamadaOrder[],
    order(columna: string, opciones: { ascending: boolean; nullsFirst?: boolean }) {
      this.llamadas.push({ columna, opciones });
      return this;
    },
  };
}

test("calificados: rating y resenas desc emiten NULLS LAST (paridad con `?? 0` del comparador seed)", () => {
  const consulta = builderFalso();
  aplicarOrdenLeads(consulta, { calificados: true });
  assert.deepEqual(consulta.llamadas, [
    { columna: "rating", opciones: { ascending: false, nullsFirst: false } },
    { columna: "resenas", opciones: { ascending: false, nullsFirst: false } },
    { columna: "created_at", opciones: { ascending: true } },
  ]);
});

test("sin calificados: solo created_at asc (regresión cero sobre el orden actual)", () => {
  const consulta = builderFalso();
  aplicarOrdenLeads(consulta, {});
  assert.deepEqual(consulta.llamadas, [
    { columna: "created_at", opciones: { ascending: true } },
  ]);
});

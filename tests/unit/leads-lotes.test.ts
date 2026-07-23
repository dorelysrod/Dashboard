import { test } from "node:test";
import assert from "node:assert/strict";
import { LOTE_LEADS, obtenerTodasLasFilas } from "../../lib/data/leads";

/**
 * Regression T-007: a rangeless select against PostgREST is SILENTLY capped at
 * `max_rows` (default 1000, not overridden in supabase/config.toml). With
 * >1000 leads the old `obtenerLeads()` lost rows without any error — the
 * Buscar dedupe stopped seeing leads #1001+ and re-suggested prospects already
 * in the pipeline. The fix reads exhaustively in `.range()` batches; these
 * tests reproduce the cap with a fake server that NEVER returns more than
 * `cap` rows per request (and never errors — that is what makes it silent).
 */

interface Fila {
  id: number;
}

function servidorFalso(totalFilas: number, cap = 1000) {
  const llamadas: Array<[number, number]> = [];
  return {
    llamadas,
    pedir(desde: number, hasta: number) {
      llamadas.push([desde, hasta]);
      const pedidas = hasta - desde + 1;
      const fin = Math.min(desde + Math.min(pedidas, cap), totalFilas);
      const data: Fila[] = [];
      for (let i = desde; i < fin; i++) data.push({ id: i });
      return Promise.resolve({ data, error: null });
    },
  };
}

test("con 2500 filas y cap silencioso de 1000, el lector por lotes recupera TODAS (el bug devolvía 1000)", async () => {
  const servidor = servidorFalso(2500);
  const filas = await obtenerTodasLasFilas<Fila>(servidor.pedir);

  assert.equal(filas.length, 2500);
  // Sin duplicados ni saltos: ids exactamente 0..2499 en orden.
  assert.deepEqual(
    filas.map((f) => f.id),
    Array.from({ length: 2500 }, (_, i) => i),
  );
});

test("los lotes pedidos son rangos contiguos de LOTE_LEADS (compatibles con el cap de PostgREST)", async () => {
  const servidor = servidorFalso(2500);
  await obtenerTodasLasFilas<Fila>(servidor.pedir);

  assert.equal(LOTE_LEADS, 1000);
  assert.deepEqual(servidor.llamadas, [
    [0, 999],
    [1000, 1999],
    [2000, 2999],
  ]);
});

test("total múltiplo exacto del lote: termina con un lote vacío, sin loop infinito", async () => {
  const servidor = servidorFalso(2000);
  const filas = await obtenerTodasLasFilas<Fila>(servidor.pedir);
  assert.equal(filas.length, 2000);
  assert.equal(servidor.llamadas.length, 3);
});

test("tabla vacía devuelve [] con un solo request", async () => {
  const servidor = servidorFalso(0);
  const filas = await obtenerTodasLasFilas<Fila>(servidor.pedir);
  assert.deepEqual(filas, []);
  assert.equal(servidor.llamadas.length, 1);
});

test("un error en un lote intermedio se propaga (no se degrada a lista parcial)", async () => {
  const error = { message: "boom" };
  let llamada = 0;
  const pedir = (desde: number, hasta: number) => {
    llamada++;
    if (llamada === 2) return Promise.resolve({ data: null, error });
    const data: Fila[] = [];
    for (let i = desde; i <= hasta; i++) data.push({ id: i });
    return Promise.resolve({ data, error: null });
  };
  await assert.rejects(() => obtenerTodasLasFilas<Fila>(pedir), (e: unknown) => e === error);
});

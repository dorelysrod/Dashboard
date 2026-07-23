/**
 * Lectura exhaustiva por LOTES (T-007/T-008). PostgREST aplica `max_rows`
 * (default 1000, sin override en supabase/config.toml) a todo select sin
 * .range(): con más filas la respuesta se TRUNCA EN SILENCIO — no falla, sale
 * incompleta. Cualquier lectura "completa" (KPIs, agregados, dedupe) debe
 * pedirse en lotes contiguos con orden total estable.
 *
 * Módulo puro e inyectable (testeado en tests/unit/leads-lotes.test.ts vía la
 * re-exportación de leads.ts).
 */

/** Tamaño de lote = `max_rows` por defecto de PostgREST. */
export const LOTE_LEADS = 1000;

/** Resultado mínimo de un lote (subconjunto estructural de la respuesta PostgREST). */
export interface ResultadoLote<T> {
  data: T[] | null;
  error: unknown;
}

/**
 * Lee TODAS las filas de una consulta pidiéndolas en lotes contiguos de
 * `lote` filas. `pedirLote` debe aplicar `.range(desde, hasta)` sobre una
 * consulta con ORDEN TOTAL ESTABLE (sin orden, PostgREST puede repetir o
 * saltar filas entre lotes). Termina cuando un lote llega corto; un error en
 * cualquier lote se propaga (nunca lista parcial silenciosa).
 */
export async function obtenerTodasLasFilas<T>(
  pedirLote: (desde: number, hasta: number) => PromiseLike<ResultadoLote<T>>,
  lote = LOTE_LEADS,
): Promise<T[]> {
  const filas: T[] = [];
  for (;;) {
    const { data, error } = await pedirLote(filas.length, filas.length + lote - 1);
    if (error) throw error;
    const pagina = data ?? [];
    filas.push(...pagina);
    if (pagina.length < lote) return filas;
  }
}

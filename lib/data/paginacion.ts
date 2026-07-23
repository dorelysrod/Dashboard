/**
 * Paginación de listas del panel (pura, testeable). La usan el servicio de
 * leads (fallback de seed en memoria) y el panel de Buscar; el camino Supabase
 * comparte las mismas constantes y helpers para calcular el `.range()`.
 */

export const POR_PAGINA = 25;

export interface Paginado<T> {
  items: T[];
  /** Total de elementos ANTES de paginar (para "Página x de y · N leads"). */
  total: number;
  /** Página efectiva (1-based, ya acotada al rango válido). */
  pagina: number;
  totalPaginas: number;
}

/** Total de páginas: al menos 1 aunque la lista esté vacía (hay "página 1" vacía). */
export function totalPaginas(total: number, porPagina = POR_PAGINA): number {
  return Math.max(1, Math.ceil(total / porPagina));
}

/** Acota una página pedida al rango [1, totalPaginas]. */
export function acotarPagina(pagina: number, total: number, porPagina = POR_PAGINA): number {
  const tope = totalPaginas(total, porPagina);
  return Math.min(Math.max(1, pagina), tope);
}

/**
 * Normaliza el `?pagina=` de la URL (o cualquier entrada libre) a un entero ≥ 1.
 * Basura ("abc", "-3", "1.7", undefined) → 1.
 */
export function normalizarPagina(valor: string | number | null | undefined): number {
  const n = typeof valor === "number" ? valor : Number.parseInt(valor ?? "", 10);
  if (!Number.isInteger(n) || n < 1) return 1;
  return n;
}

/** Corta una lista en memoria a la página pedida (acotándola al rango válido). */
export function paginar<T>(items: T[], pagina: number, porPagina = POR_PAGINA): Paginado<T> {
  const total = items.length;
  const efectiva = acotarPagina(pagina, total, porPagina);
  const desde = (efectiva - 1) * porPagina;
  return {
    items: items.slice(desde, desde + porPagina),
    total,
    pagina: efectiva,
    totalPaginas: totalPaginas(total, porPagina),
  };
}

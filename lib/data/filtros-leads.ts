import type { EtapaLead, TierLead } from "@/lib/types/db";

/**
 * Lógica PURA de los filtros de calidad del pipeline y del distintivo
 * "mejor calificado" (spec 'Filtros de calidad + distintivo'). Sin Supabase ni
 * React: la comparten el camino de BD (query server-side), el fallback de seed
 * (filtrado en memoria) y la UI (LeadRow pinta el distintivo), y así se testea
 * en aislamiento con node:test.
 */

/** Umbral de "rating alto" (Google Maps) para filtro y distintivo. */
export const UMBRAL_RATING_CALIFICADO = 4.5;

/** Mínimo razonable de reseñas para que el distintivo sea creíble. */
export const MIN_RESENAS_DISTINTIVO = 10;

/** Subconjunto calificable de un lead (lo satisfacen `Lead` y `LeadRow`). */
export interface CalificacionLead {
  rating: number | null;
  resenas: number | null;
  /**
   * Tier del motor de calificación (lib/data/scoring.ts). El rating de Google
   * mide SATISFACCIÓN DE CLIENTES; el tier mide OPORTUNIDAD DE VENTA (brecha
   * web, cadena, etc.) — van en direcciones opuestas a menudo: la clínica 4.9★
   * suele tener ya una web fuerte → C/descalificado. Opcional: los seeds y los
   * leads aún sin calificar no lo traen (undefined/null = sin veredicto aún,
   * NO cuenta como descalificado).
   */
  tier?: TierLead | null;
}

/**
 * Etapas que ya pasaron por inspección ('inspeccionado' o posterior en el
 * pipeline). `nuevo` queda antes; `descartado` salió del pipeline (spec #7).
 * Readonly para poder pasarla directa a `.in('etapa', …)` en Supabase.
 */
export const ETAPAS_INSPECCIONADAS: readonly EtapaLead[] = [
  "inspeccionado",
  "cotizado",
  "enviado",
  "abierto",
  "aceptado",
  "en_desarrollo",
  "entregado",
];

/**
 * Filtro 'Mejores calificados': rating no nulo y ≥ 4.5, EXCLUYENDO Tier C
 * (ya descalificado por el motor: web fuerte, cadena, reputación baja). Sin
 * esto el filtro mostraba leads con rating alto que la inspección descartaba
 * después — tiempo perdido de la operadora. Tier null/undefined pasa: aún no
 * hay veredicto.
 */
export function esMejorCalificado(lead: CalificacionLead): boolean {
  return (
    lead.rating != null &&
    lead.rating >= UMBRAL_RATING_CALIFICADO &&
    lead.tier !== "C"
  );
}

/** Filtro 'Con reseñas': resenas > 0 (null cuenta como 0). */
export function tieneResenas(lead: CalificacionLead): boolean {
  return (lead.resenas ?? 0) > 0;
}

/** Filtro 'Inspeccionados': etapa inspeccionado o posterior. */
export function esInspeccionadoOPosterior(etapa: EtapaLead): boolean {
  return ETAPAS_INSPECCIONADAS.includes(etapa);
}

/**
 * Orden del filtro 'Mejores calificados': rating desc, desempate por número de
 * reseñas desc. Rating null ordena al final (el filtro ya lo excluye, pero el
 * comparador es total para poder usarse solo).
 */
export function compararPorCalificacion(
  a: CalificacionLead,
  b: CalificacionLead,
): number {
  return (
    (b.rating ?? -1) - (a.rating ?? -1) ||
    (b.resenas ?? 0) - (a.resenas ?? 0)
  );
}

/**
 * Distintivo visual "mejor calificado" (estrella dorada en LeadRow): rating
 * ≥ 4.5 Y al menos 10 reseñas. Siempre visible, con o sin filtro activo.
 */
export function meritaDistintivoCalificado(lead: CalificacionLead): boolean {
  return esMejorCalificado(lead) && (lead.resenas ?? 0) >= MIN_RESENAS_DISTINTIVO;
}

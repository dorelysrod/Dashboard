import type { EtapaLead } from "@/lib/types/db";
import type { Nicho } from "@/lib/types/dominio";
import {
  compararPorCalificacion,
  esInspeccionadoOPosterior,
  esMejorCalificado,
  tieneResenas,
  type CalificacionLead,
} from "./filtros-leads";

/**
 * Composición PURA de los filtros de calidad del pipeline sobre una lista en
 * memoria (camino seed/demo). Usa los MISMOS predicados y comparador de
 * `filtros-leads` que el camino Supabase traduce a la query, para garantizar
 * paridad de modos (spec AC 11) y poder testear la semántica AND y el orden
 * con node:test sin arrastrar `next/headers`.
 */

/** Flags de los 3 filtros de calidad (semántica AND entre sí y con nicho). */
export interface FiltrosCalidadLeads {
  /** 'Mejores calificados': rating ≥ umbral, orden rating desc / resenas desc. */
  calificados?: boolean;
  /** 'Con reseñas': resenas > 0 (null cuenta como 0). */
  conResenas?: boolean;
  /** 'Inspeccionados': etapa 'inspeccionado' o posterior (descartado fuera). */
  inspeccionados?: boolean;
}

export interface FiltrosListaLeads extends FiltrosCalidadLeads {
  /** Sin nicho → todos. */
  nicho?: Nicho;
}

/** Subconjunto filtrable de un lead (lo satisface `Lead` del dominio). */
interface LeadFiltrable extends CalificacionLead {
  nicho: Nicho;
  etapaDb: EtapaLead;
}

/**
 * Filtra con AND los 4 filtros y, con 'calificados' activo, ordena por rating
 * desc con desempate resenas desc. El sort es estable (ES2019+): los empates
 * conservan el orden base created_at asc, igual que la clave terciaria
 * `created_at` de la query Supabase. Sin 'calificados' NO reordena (regresión
 * cero: se respeta el orden de entrada).
 */
export function filtrarYOrdenarLeads<T extends LeadFiltrable>(
  leads: readonly T[],
  filtro: FiltrosListaLeads = {},
): T[] {
  const filtrados = leads.filter(
    (lead) =>
      (!filtro.nicho || lead.nicho === filtro.nicho) &&
      (!filtro.calificados || esMejorCalificado(lead)) &&
      (!filtro.conResenas || tieneResenas(lead)) &&
      (!filtro.inspeccionados || esInspeccionadoOPosterior(lead.etapaDb)),
  );
  if (filtro.calificados) filtrados.sort(compararPorCalificacion);
  return filtrados;
}

import type { Lead, Nicho } from "@/lib/types/dominio";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import { filaALead, type LeadConRelaciones } from "./mapeo";
import { ETAPAS_INSPECCIONADAS, UMBRAL_RATING_CALIFICADO } from "./filtros-leads";
import { filtrarYOrdenarLeads, type FiltrosCalidadLeads } from "./leads-consulta";
import { acotarPagina, paginar, POR_PAGINA, totalPaginas, type Paginado } from "./paginacion";
import { LEADS } from "./seed";

/**
 * Servicio de dominio de leads (M3). La UI nunca toca Supabase directo
 * (CLAUDE.md §1): pasa por aquí. Lee `leads` + sus relaciones (inspección,
 * cotización, correo) y las agrega a la vista plana `Lead`.
 *
 * Fallback: si Supabase no está configurado (fase 1 sin base cableada) sirve el
 * seed local, para que el panel corra en Vercel de punta a punta.
 */

/** SELECT con joins anidados: una fila por lead con sus hijos en arrays. */
const SELECT_LEAD = `
  *,
  inspecciones ( * ),
  cotizaciones ( * ),
  correos ( * )
`;

export async function obtenerLeads(): Promise<Lead[]> {
  if (!supabaseConfigurado()) return LEADS;

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("leads")
    .select(SELECT_LEAD)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as LeadConRelaciones[]).map(filaALead);
}

export interface FiltroLeads extends FiltrosCalidadLeads {
  /** Página 1-based; fuera de rango se acota (URLs editadas a mano). */
  pagina?: number;
  /** Sin nicho → todos. */
  nicho?: Nicho;
}

/**
 * Subconjunto de la API del query builder de PostgREST que usan los filtros.
 * Permite aplicar los MISMOS filtros a la consulta de conteo (head) y a la de
 * datos sin duplicar la lógica.
 */
interface ConsultaFiltrable {
  eq(columna: string, valor: string): this;
  gte(columna: string, valor: number): this;
  gt(columna: string, valor: number): this;
  in(columna: string, valores: readonly string[]): this;
}

/**
 * Subconjunto ordenable del query builder de PostgREST. Extraído a interfaz
 * estructural para poder testear con un builder falso que el orden emitido
 * (columnas, dirección y NULLS LAST) espeja `compararPorCalificacion`.
 */
export interface ConsultaOrdenable {
  order(
    columna: string,
    opciones: { ascending: boolean; nullsFirst?: boolean },
  ): this;
}

/**
 * Traduce `FiltroLeads` a condiciones de la query (server-side, spec AC 11:
 * nunca filtrar en memoria post-página). Espejo exacto de los predicados puros
 * de `filtros-leads` que usa el fallback de seed:
 * - calificados → rating ≥ umbral; en SQL `NULL >= x` es NULL → falso en
 *   WHERE, así que excluye los rating null igual que `esMejorCalificado`
 * - conResenas  → resenas > 0; en SQL `NULL > 0` es falso, igual que `?? 0`
 * - inspeccionados → etapa ∈ ETAPAS_INSPECCIONADAS
 */
function aplicarFiltrosLeads<Q>(consulta: Q, filtro: FiltroLeads): Q {
  // Type-erasure deliberado: comprobar el PostgrestFilterBuilder real contra
  // la interfaz estructural dispara TS2589 (instanciación de tipos demasiado
  // profunda) por sus tipos condicionales; los métodos usados devuelven `this`,
  // así que el encadenado es seguro y el call-site conserva su tipo exacto.
  let c = consulta as ConsultaFiltrable;
  if (filtro.nicho) c = c.eq("nicho", filtro.nicho);
  if (filtro.calificados) c = c.gte("rating", UMBRAL_RATING_CALIFICADO);
  if (filtro.conResenas) c = c.gt("resenas", 0);
  if (filtro.inspeccionados) c = c.in("etapa", ETAPAS_INSPECCIONADAS);
  return c as Q;
}

/**
 * Orden server-side de la lista. Con 'Mejores calificados': rating desc,
 * desempate resenas desc y created_at asc como clave terciaria estable (sin
 * ella, empates entre páginas podrían duplicar/saltar filas). Sin el filtro se
 * conserva el orden actual created_at asc (regresión cero). Exportada para
 * testear con un builder falso que el orden emitido espeja el comparador puro
 * `compararPorCalificacion` del modo seed (paridad de modos, spec AC 11).
 */
export function aplicarOrdenLeads<Q>(consulta: Q, filtro: FiltroLeads): Q {
  // Mismo type-erasure deliberado que aplicarFiltrosLeads (ver arriba).
  const c = consulta as ConsultaOrdenable;
  const ordenada = filtro.calificados
    ? c
        // NULLS LAST explícito: PostgreSQL usa NULLS FIRST por defecto en
        // DESC, pero el comparador seed trata null como 0/-1 (al final).
        .order("rating", { ascending: false, nullsFirst: false })
        .order("resenas", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: true })
    : c.order("created_at", { ascending: true });
  return ordenada as Q;
}

/**
 * Página de leads para las listas (pipeline). Server-side de verdad: filtra
 * (nicho + calificados/conResenas/inspeccionados, semántica AND) y ordena en
 * la query, y corta con `.range()` en Supabase (25 por página), pidiendo el
 * `count` exacto del conjunto filtrado para pintar los controles. El fallback
 * de seed filtra/ordena en memoria con los mismos predicados puros
 * (`leads-consulta`) y pagina con el mismo helper: paridad de modos.
 */
export async function obtenerLeadsPagina(
  filtro: FiltroLeads = {},
): Promise<Paginado<Lead>> {
  if (!supabaseConfigurado()) {
    return paginar(filtrarYOrdenarLeads(LEADS, filtro), filtro.pagina ?? 1);
  }

  const supabase = await crearClienteServidor();

  // El total se pide aparte (head) para poder ACOTAR la página antes del
  // .range(): un offset más allá del total haría fallar PostgREST (PGRST103).
  // Lleva los MISMOS filtros que la consulta de datos: el count refleja el
  // conjunto filtrado completo y la paginación de 25 opera sobre él.
  const conteo = aplicarFiltrosLeads(
    supabase.from("leads").select("id", { count: "exact", head: true }),
    filtro,
  );
  const { count, error: errorConteo } = await conteo;
  if (errorConteo) throw errorConteo;

  const total = count ?? 0;
  const pagina = acotarPagina(filtro.pagina ?? 1, total);
  const desde = (pagina - 1) * POR_PAGINA;

  const consulta = aplicarFiltrosLeads(
    supabase.from("leads").select(SELECT_LEAD),
    filtro,
  );
  const { data, error } = await aplicarOrdenLeads(consulta, filtro).range(
    desde,
    desde + POR_PAGINA - 1,
  );

  if (error) throw error;
  return {
    items: (data as LeadConRelaciones[]).map(filaALead),
    total,
    pagina,
    totalPaginas: totalPaginas(total),
  };
}

export async function obtenerLead(id: string): Promise<Lead | undefined> {
  if (!supabaseConfigurado()) return LEADS.find((l) => l.id === id);

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("leads")
    .select(SELECT_LEAD)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? filaALead(data as LeadConRelaciones) : undefined;
}

/** Leads calientes ordenados por aperturas y luego por dinero (mockup: #hot). */
export async function obtenerLeadsCalientes(limite = 4): Promise<Lead[]> {
  const leads = await obtenerLeads();
  return [...leads]
    .sort((a, b) => b.aperturas - a.aperturas || b.mxn - a.mxn)
    .slice(0, limite);
}

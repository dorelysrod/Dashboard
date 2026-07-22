import type { Lead, Nicho } from "@/lib/types/dominio";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import { filaALead, type LeadConRelaciones } from "./mapeo";
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

export interface FiltroLeads {
  /** Página 1-based; fuera de rango se acota (URLs editadas a mano). */
  pagina?: number;
  /** Sin nicho → todos. */
  nicho?: Nicho;
}

/**
 * Página de leads para las listas (pipeline). Server-side de verdad: filtra por
 * nicho y corta con `.range()` en Supabase (25 por página), pidiendo el `count`
 * exacto para pintar los controles. El fallback de seed pagina en memoria con
 * el mismo helper puro.
 */
export async function obtenerLeadsPagina(
  filtro: FiltroLeads = {},
): Promise<Paginado<Lead>> {
  const nicho = filtro.nicho;

  if (!supabaseConfigurado()) {
    const filtrados = nicho ? LEADS.filter((l) => l.nicho === nicho) : LEADS;
    return paginar(filtrados, filtro.pagina ?? 1);
  }

  const supabase = await crearClienteServidor();

  // El total se pide aparte (head) para poder ACOTAR la página antes del
  // .range(): un offset más allá del total haría fallar PostgREST (PGRST103).
  let conteo = supabase.from("leads").select("id", { count: "exact", head: true });
  if (nicho) conteo = conteo.eq("nicho", nicho);
  const { count, error: errorConteo } = await conteo;
  if (errorConteo) throw errorConteo;

  const total = count ?? 0;
  const pagina = acotarPagina(filtro.pagina ?? 1, total);
  const desde = (pagina - 1) * POR_PAGINA;

  let consulta = supabase.from("leads").select(SELECT_LEAD);
  if (nicho) consulta = consulta.eq("nicho", nicho);
  const { data, error } = await consulta
    .order("created_at", { ascending: true })
    .range(desde, desde + POR_PAGINA - 1);

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

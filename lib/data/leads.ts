import type { Lead } from "@/lib/types/dominio";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import { filaALead, type LeadConRelaciones } from "./mapeo";
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

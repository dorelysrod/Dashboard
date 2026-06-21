import type { Lead } from "@/lib/types/dominio";
import { LEADS } from "./seed";

/**
 * Servicio de dominio de leads. La UI nunca toca Supabase directo (CLAUDE.md §1):
 * pasa por aquí. Fase 1 sirve el seed (sin red); en M3 estas funciones harán
 * SELECT a Supabase con RLS — la firma async ya deja el seam listo.
 */

export async function obtenerLeads(): Promise<Lead[]> {
  // M3: const supabase = await crearClienteServidor(); return supabase.from("leads")...
  return LEADS;
}

export async function obtenerLead(id: string): Promise<Lead | undefined> {
  return LEADS.find((l) => l.id === id);
}

/** Leads calientes ordenados por aperturas y luego por dinero (mockup: #hot). */
export async function obtenerLeadsCalientes(limite = 4): Promise<Lead[]> {
  return [...LEADS]
    .sort((a, b) => b.aperturas - a.aperturas || b.mxn - a.mxn)
    .slice(0, limite);
}

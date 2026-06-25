"use server";

import { revalidatePath } from "next/cache";
import type { EtapaLead } from "@/lib/types/db";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";

/**
 * Mutaciones de dominio del pipeline (M3). Server Actions: corren solo en el
 * servidor con la sesión del operador (RLS `operador_full`). La UI las invoca;
 * nunca toca Supabase directo (CLAUDE.md §1).
 */

export interface ResultadoAccion {
  ok: boolean;
  error: string | null;
}

const ETAPAS_VALIDAS: ReadonlySet<EtapaLead> = new Set<EtapaLead>([
  "nuevo",
  "inspeccionado",
  "cotizado",
  "enviado",
  "abierto",
  "aceptado",
  "en_desarrollo",
  "entregado",
  "descartado",
]);

/** Avanza la etapa de un lead y refresca las vistas del panel. */
export async function avanzarEtapa(
  leadId: string,
  etapa: EtapaLead,
): Promise<ResultadoAccion> {
  if (!ETAPAS_VALIDAS.has(etapa)) {
    return { ok: false, error: "Etapa no válida." };
  }
  if (!supabaseConfigurado()) {
    return {
      ok: false,
      error: "Supabase no está configurado: la acción no se puede persistir.",
    };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("leads")
    .update({ etapa })
    .eq("id", leadId);

  if (error) return { ok: false, error: "No se pudo actualizar la etapa." };

  // Single-user: refrescamos todas las vistas del panel que listan leads.
  revalidatePath("/", "layout");
  return { ok: true, error: null };
}

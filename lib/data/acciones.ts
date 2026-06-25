"use server";

import { revalidatePath } from "next/cache";
import type { EtapaLead, TierLead } from "@/lib/types/db";
import type { Prospecto } from "@/lib/types/dominio";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import { FX, PAQUETE_BASE_MXN } from "@/lib/format";

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

/** Convierte un textarea (una línea por elemento) en text[] sin vacíos. */
function lineasAArray(texto: string): string[] {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export interface DatosInspeccion {
  tecnologia: string;
  hosting: string;
  mejoras: string[];
  recomendacion: string;
}

/**
 * Upsert de la inspección del lead: actualiza la más reciente o crea una si no
 * existe (varios leads del seed no traen inspección). Edita desde el drawer (M3).
 */
export async function guardarInspeccion(
  leadId: string,
  datos: DatosInspeccion,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    return { ok: false, error: "Supabase no está configurado: la acción no se puede persistir." };
  }

  const supabase = await crearClienteServidor();
  const campos = {
    tecnologia: datos.tecnologia || null,
    hosting: datos.hosting || null,
    mejoras: datos.mejoras,
    recomendacion: datos.recomendacion || null,
  };

  const { data: existente } = await supabase
    .from("inspecciones")
    .select("id")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = existente
    ? await supabase.from("inspecciones").update(campos).eq("id", existente.id)
    : await supabase.from("inspecciones").insert({ lead_id: leadId, ...campos });

  if (error) return { ok: false, error: "No se pudo guardar la inspección." };

  revalidatePath("/", "layout");
  return { ok: true, error: null };
}

export interface DatosCotizacion {
  modulos: string[];
  totalMxn: number;
}

/**
 * Upsert de la cotización del lead: actualiza la más reciente o crea una si no
 * existe. total_eur se deriva del tipo de cambio (FX, §7). Edita desde el drawer.
 */
export async function guardarCotizacion(
  leadId: string,
  datos: DatosCotizacion,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    return { ok: false, error: "Supabase no está configurado: la acción no se puede persistir." };
  }
  if (!Number.isFinite(datos.totalMxn) || datos.totalMxn < 0) {
    return { ok: false, error: "El total en MXN debe ser un número válido." };
  }

  const supabase = await crearClienteServidor();
  const totalEur = Math.round(datos.totalMxn * FX);
  const camposComunes = {
    modulos: datos.modulos,
    total_mxn: datos.totalMxn,
    total_eur: totalEur,
  };

  const { data: existente } = await supabase
    .from("cotizaciones")
    .select("id")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = existente
    ? await supabase.from("cotizaciones").update(camposComunes).eq("id", existente.id)
    : await supabase.from("cotizaciones").insert({
        lead_id: leadId,
        base_mxn: PAQUETE_BASE_MXN,
        estado: "borrador",
        ...camposComunes,
      });

  if (error) return { ok: false, error: "No se pudo guardar la cotización." };

  revalidatePath("/", "layout");
  return { ok: true, error: null };
}

/** Extrae el tier (A/B/C) de la señal del prospecto, p.ej. "Tier B · …". */
function tierDeSenal(senal: string): TierLead | null {
  const m = senal.match(/Tier\s+([ABC])/i);
  return m ? (m[1].toUpperCase() as TierLead) : null;
}

/**
 * Crea un lead en etapa `nuevo` a partir de un prospecto de Buscar (la puerta de
 * entrada del recorrido lead→cliente). Anti-duplicado por nombre de negocio.
 */
export async function crearLeadDesdeProspecto(
  p: Prospecto,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    return { ok: false, error: "Supabase no está configurado: la acción no se puede persistir." };
  }
  if (!p?.nombre?.trim()) {
    return { ok: false, error: "El prospecto no tiene nombre." };
  }

  const supabase = await crearClienteServidor();

  const { data: existe } = await supabase
    .from("leads")
    .select("id")
    .eq("negocio", p.nombre)
    .maybeSingle();
  if (existe) {
    return { ok: false, error: "Ese negocio ya está en tu pipeline." };
  }

  const { error } = await supabase.from("leads").insert({
    negocio: p.nombre,
    ciudad: p.meta || null,
    rubro: "Medicina estética",
    rating: p.rating,
    resenas: p.resenas,
    tier: tierDeSenal(p.senal),
    etapa: "nuevo",
  });
  if (error) return { ok: false, error: "No se pudo crear el lead." };

  revalidatePath("/", "layout");
  return { ok: true, error: null };
}

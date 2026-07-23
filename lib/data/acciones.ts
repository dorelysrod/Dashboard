"use server";

import { revalidatePath } from "next/cache";
import type { EstadoFactura, EtapaLead, TierLead } from "@/lib/types/db";
import type { Prospecto } from "@/lib/types/dominio";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import { esNicho, mapearNicho } from "@/lib/data/mapeo";
import { leerFx, leerPaqueteBaseMxn } from "@/lib/config";

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
 * existe. total_eur se deriva del tipo de cambio editable (config.FX_MXN_EUR,
 * §7). Edita desde el drawer.
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
  // Tipo de cambio y precio base desde la tabla `config` editable (fallback a
  // constante en modo seed) — editar FX_MXN_EUR cambia lo que se persiste.
  const fx = await leerFx();
  const totalEur = Math.round(datos.totalMxn * fx);
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
        base_mxn: await leerPaqueteBaseMxn(),
        estado: "borrador",
        ...camposComunes,
      });

  if (error) return { ok: false, error: "No se pudo guardar la cotización." };

  revalidatePath("/", "layout");
  return { ok: true, error: null };
}

export interface DatosCorreo {
  asunto: string;
  cuerpo: string;
}

/**
 * Upsert del correo del lead: actualiza el más reciente o crea uno. Lo usa el
 * flujo de IA ("Reescribir con Claude") tras pegar y parsear la respuesta.
 */
export async function guardarCorreo(
  leadId: string,
  datos: DatosCorreo,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    return { ok: false, error: "Supabase no está configurado: la acción no se puede persistir." };
  }

  const supabase = await crearClienteServidor();
  const campos = {
    asunto: datos.asunto || null,
    cuerpo: datos.cuerpo || null,
  };

  const { data: existente } = await supabase
    .from("correos")
    .select("id")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = existente
    ? await supabase.from("correos").update(campos).eq("id", existente.id)
    : await supabase.from("correos").insert({ lead_id: leadId, ...campos });

  if (error) return { ok: false, error: "No se pudo guardar el correo." };

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

  // .limit(1) evita el error de maybeSingle() cuando ya hay 2+ duplicados
  // preexistentes (antes se tragaba ese error y creaba OTRO duplicado). El
  // error del select ya no se descarta.
  const { data: existe, error: existeError } = await supabase
    .from("leads")
    .select("id")
    .eq("negocio", p.nombre)
    .limit(1)
    .maybeSingle();
  if (existeError) {
    return { ok: false, error: "No se pudo verificar duplicados." };
  }
  if (existe) {
    return { ok: false, error: "Ese negocio ya está en tu pipeline." };
  }

  // El nicho llega del cliente: se valida contra el catálogo (fallback al base).
  const nicho = esNicho(p.nicho) ? p.nicho : "estetica";
  const { error } = await supabase.from("leads").insert({
    negocio: p.nombre,
    ciudad: p.meta || null,
    rubro: mapearNicho(nicho).label,
    rating: p.rating,
    resenas: p.resenas,
    tier: tierDeSenal(p.senal),
    nicho,
    etapa: "nuevo",
  });
  if (error) {
    // 23505 = unique_violation contra leads_negocio_key: un envío concurrente
    // ganó la carrera (TOCTOU). La garantía real es el índice único; aquí solo
    // traducimos a un mensaje claro en vez de "no se pudo crear".
    if (error.code === "23505") {
      return { ok: false, error: "Ese negocio ya está en tu pipeline." };
    }
    return { ok: false, error: "No se pudo crear el lead." };
  }

  revalidatePath("/", "layout");
  return { ok: true, error: null };
}

/** Cambia el estado de pago de una factura (seguimiento de cobros, vista Facturación). */
export async function cambiarEstadoFactura(
  facturaId: string,
  estado: EstadoFactura,
): Promise<ResultadoAccion> {
  if (estado !== "pagada" && estado !== "pendiente") {
    return { ok: false, error: "Estado de factura no válido." };
  }
  if (!supabaseConfigurado()) {
    return { ok: false, error: "Supabase no está configurado: la acción no se puede persistir." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("facturas")
    .update({ estado })
    .eq("id", facturaId);

  if (error) return { ok: false, error: "No se pudo actualizar la factura." };

  revalidatePath("/", "layout");
  return { ok: true, error: null };
}

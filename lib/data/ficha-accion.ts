"use server";

import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import { modoIAActivo } from "@/lib/ai";

export interface FichaLead {
  dossier: Record<string, unknown> | null;
  guion: Guion | null;
  mensajes: Mensajes | null;
  tier: string | null;
  rating: number | null;
  resenas: number | null;
  telefono: string | null;
}

export interface Guion {
  apertura: string;
  puntosVenta: string[];
  objeciones: { objecion: string; respuesta: string }[];
}
export interface Mensajes {
  whatsapp: string;
  dm: string;
  asunto: string;
  correo: string;
}

/**
 * Ficha de venta del lead — TODO desde NUESTRA base (dossier + guion + mensajes
 * cacheados). No toca la suscripción: es lectura interna. La generación (abajo)
 * solo llama la API si el dato falta o se fuerza refresco.
 */
export async function obtenerFichaLead(leadId: string): Promise<FichaLead | null> {
  if (!supabaseConfigurado()) return null;
  const sb = await crearClienteServidor();
  const { data } = await sb
    .from("leads")
    .select("dossier, guion, mensajes, tier, rating, resenas, telefono")
    .eq("id", leadId)
    .maybeSingle();
  if (!data) return null;
  return {
    dossier: (data.dossier as Record<string, unknown>) ?? null,
    guion: (data.guion as Guion) ?? null,
    mensajes: (data.mensajes as Mensajes) ?? null,
    tier: data.tier ?? null,
    rating: data.rating ?? null,
    resenas: data.resenas ?? null,
    telefono: data.telefono ?? null,
  };
}

async function leadConDossier(leadId: string) {
  const sb = await crearClienteServidor();
  const { data } = await sb.from("leads").select("negocio, ciudad, dossier, guion, mensajes").eq("id", leadId).maybeSingle();
  return { sb, data };
}

/**
 * Guion de venta — CACHE-FIRST: si ya está guardado y no se fuerza, lo devuelve
 * de la base (0 llamadas). Si falta, lo genera con la suscripción y lo PERSISTE.
 */
export async function generarGuionVenta(
  leadId: string,
  forzar = false,
): Promise<{ ok: true; guion: Guion } | { ok: false; error: string }> {
  if (!supabaseConfigurado()) return { ok: false, error: "Supabase no configurado." };
  const { sb, data } = await leadConDossier(leadId);
  if (!data) return { ok: false, error: "Lead no encontrado." };

  if (!forzar && data.guion) return { ok: true, guion: data.guion as Guion };

  if (!data.dossier || !(data.dossier as any).dolor) {
    return { ok: false, error: "Primero califica el lead (⭐) para tener su dossier y dolor." };
  }
  if (modoIAActivo() !== "anthropic") {
    return { ok: false, error: "Activa AI_PROVIDER=anthropic para generar el guion." };
  }

  const { generarGuion } = await import("@/lib/ai/cliente-sdk");
  const d = data.dossier as any;
  const guion = await generarGuion(data.negocio, d);
  if (!guion) return { ok: false, error: "No se pudo generar el guion. Intenta de nuevo." };

  await sb.from("leads").update({ guion }).eq("id", leadId);
  return { ok: true, guion };
}

/**
 * Mensajes por canal — CACHE-FIRST: guardados → de la base; si faltan, se generan
 * con la suscripción y se PERSISTEN. Así se generan UNA vez por lead.
 */
export async function generarMensajesLead(
  leadId: string,
  forzar = false,
): Promise<{ ok: true; mensajes: Mensajes } | { ok: false; error: string }> {
  if (!supabaseConfigurado()) return { ok: false, error: "Supabase no configurado." };
  const { sb, data } = await leadConDossier(leadId);
  if (!data) return { ok: false, error: "Lead no encontrado." };

  if (!forzar && data.mensajes) return { ok: true, mensajes: data.mensajes as Mensajes };

  if (!data.dossier || !(data.dossier as any).dolor) {
    return { ok: false, error: "Primero califica el lead (⭐) para tener su dolor." };
  }
  if (modoIAActivo() !== "anthropic") {
    return { ok: false, error: "Activa AI_PROVIDER=anthropic para generar los mensajes." };
  }

  const { generarMensajes } = await import("@/lib/ai/cliente-sdk");
  const mensajes = await generarMensajes(data.negocio, data.ciudad, data.dossier);
  if (!mensajes) return { ok: false, error: "No se pudieron generar los mensajes. Intenta de nuevo." };

  await sb.from("leads").update({ mensajes }).eq("id", leadId);
  return { ok: true, mensajes };
}

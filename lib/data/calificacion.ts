import "server-only";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import { modoIAActivo } from "@/lib/ai";
import { calificarLead, segmentoDeTier, type Calificacion } from "./scoring";

/**
 * Califica un lead DENTRO de la app, usando la SUSCRIPCIÓN (harness): enriquece
 * sus señales (web/rating/reseñas/tipo) vía WebSearch, las puntúa con el criterio
 * (lib/data/scoring) y persiste tier/segmento/rating/reseñas/sitio en Supabase.
 *
 * Requiere el proveedor automático (AI_PROVIDER=anthropic). En modo manual
 * devuelve un error accionable — no rompe la otra funcionalidad. Con AI_MOCK=1
 * (demo) usa un dossier determinista sin tocar el SDK, como el resto del modo demo.
 */
export type ResultadoCalificacion =
  | { ok: true; cal: Calificacion; sitioUrl: string | null; dossier: Record<string, unknown> }
  | { ok: false; error: string };

/** Dossier determinista del modo demo (AI_MOCK=1): sin SDK, sin gasto. */
function dossierMock(negocio: string) {
  return {
    eslogan: null,
    categoria: "clínica de estética",
    servicios: ["limpieza facial", "botox", "rellenos"],
    instagram: null,
    facebook: null,
    tiktok: null,
    sitioWeb: null,
    seguidoresIg: 1200,
    telefono: null,
    email: null,
    direccion: null,
    rating: 4.6,
    resenas: 87,
    brechaWeb: "debil" as const,
    ownerOperated: true,
    cadena: false,
    premium: false,
    colores: [],
    logoUrl: null,
    dolor: [
      `(mock) ${negocio} no aparece cuando la buscan en Google: el paciente agenda con la competencia.`,
      "(mock) Sin agenda online: pierde las reservas de quien decide a medianoche.",
    ],
    ganchoDolor: "(mock) Cada búsqueda sin web propia es un paciente que agenda con otra clínica.",
    resumen: "(mock) Dossier de demostración — sin llamada al SDK.",
  };
}

/**
 * @param forzar  Si es false (default) y el lead YA tiene dossier, NO llama la
 *   suscripción: re-puntúa desde el dato guardado (ahorro de API). Con true,
 *   refresca el dossier vía WebSearch.
 */
export async function calificarLeadPorId(leadId: string, forzar = false): Promise<ResultadoCalificacion> {
  if (!supabaseConfigurado()) {
    return { ok: false, error: "Supabase no está configurado: no se puede calificar ni persistir." };
  }

  const supabase = await crearClienteServidor();
  const { data: lead, error: errorLead } = await supabase
    .from("leads")
    .select("id, negocio, ciudad, rating, resenas, sitio_web, telefono, dossier")
    .eq("id", leadId)
    .maybeSingle();
  if (errorLead) {
    return { ok: false, error: "Error consultando el lead; intenta de nuevo." };
  }
  if (!lead) return { ok: false, error: "Lead no encontrado." };

  // ── CACHE-FIRST: si ya hay dossier y no se fuerza refresco, re-puntúa desde la
  //    base SIN tocar la suscripción (ahorro de llamadas externas). ──────────
  const guardado = lead.dossier as any;
  if (!forzar && guardado && Array.isArray(guardado.dolor)) {
    const cal = calificarLead({
      brechaWeb: guardado.brechaWeb, rating: guardado.rating ?? lead.rating, resenas: guardado.resenas ?? lead.resenas,
      ownerOperated: guardado.ownerOperated, cadena: guardado.cadena, premium: guardado.premium,
    });
    return { ok: true, cal, sitioUrl: guardado.sitioWeb ?? lead.sitio_web ?? null, dossier: guardado };
  }

  if (modoIAActivo() !== "anthropic") {
    return { ok: false, error: "La calificación usa la suscripción. Activa AI_PROVIDER=anthropic." };
  }

  // Dossier OSINT completo (todo lo público del prospecto) vía WebSearch.
  // Modo demo (AI_MOCK=1): dossier determinista, sin cargar el SDK.
  let d;
  if (process.env.AI_MOCK === "1") {
    d = dossierMock(lead.negocio);
  } else {
    const { dossierProspecto } = await import("@/lib/ai/cliente-sdk");
    d = await dossierProspecto(lead.negocio, lead.ciudad);
    if (d === null) {
      // Falló la llamada (≠ "no se encontró nada"): no persistir un tier basura.
      return { ok: false, error: "No se pudo armar el dossier; vuelve a intentar." };
    }
  }

  const cal = calificarLead({
    brechaWeb: d.brechaWeb,
    rating: d.rating ?? lead.rating,
    resenas: d.resenas ?? lead.resenas,
    ownerOperated: d.ownerOperated,
    cadena: d.cadena,
    premium: d.premium,
  });

  const { error: errorUpdate } = await supabase
    .from("leads")
    .update({
      rating: d.rating ?? lead.rating,
      resenas: d.resenas ?? lead.resenas,
      sitio_web: d.sitioWeb ?? lead.sitio_web,
      telefono: d.telefono ?? lead.telefono,
      tier: cal.tier,
      segmento: segmentoDeTier(cal.tier),
      dossier: d as unknown as Record<string, unknown>,
    })
    .eq("id", leadId);

  if (errorUpdate) {
    return { ok: false, error: "No se pudo guardar la calificación; intenta de nuevo." };
  }

  return { ok: true, cal, sitioUrl: d.sitioWeb ?? lead.sitio_web ?? null, dossier: d as unknown as Record<string, unknown> };
}

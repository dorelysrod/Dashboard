/**
 * CALIFICACIÓN DE NICHO (¿a qué vertical vender webs?) para Ai Landing Pro.
 *
 * Codifica el método del estudio de nichos (jul 2026): un nicho es bueno si el
 * negocio SÍ-O-SÍ necesita web con un mecanismo económico medible (comisiones,
 * conversión de ticket alto), hay brecha real verificada en Maps (muchos sin
 * web propia), pueden pagar sin dolor, el dueño decide solo, y deja mensualidad.
 *
 * Dos piezas puras y testeables:
 *  1. clasificarWebMaps / analizarBrechaNicho — validación EMPÍRICA: dado el
 *     campo `website` de un scrape de Google Maps, mide la brecha real.
 *  2. calificarNicho — el juez: score 0-100 con los mismos ejes ponderados que
 *     el scoring de leads, más descalificadores duros.
 */

import type { BrechaWeb } from "./scoring";

// ── 1. Brecha empírica desde un scrape de Maps ──────────────────────────────

/** Dominios que NO cuentan como web propia (redes, agregadores, link-in-bio). */
const NO_ES_WEB = [
  "facebook.com", "instagram.com", "tiktok.com", "linktr.ee", "wa.me",
  "whatsapp.com", "bit.ly", "booking.com", "airbnb.", "tripadvisor.",
  "doctoralia.", "fresha.com", "agendapro.",
];

/** Constructores de plantilla → web débil (existe pero desperdicia la demanda). */
const WEB_DEBIL = [
  "wixsite.com", "ueniweb.com", "negocio.site", "business.site",
  "wordpress.com", "blogspot.", "weebly.com", "webnode.",
];

/**
 * Clasifica el `website` de una ficha de Maps. Solo con la URL se distingue
 * hasta "decente" (dominio propio); "fuerte" exige inspección humana/IA, por
 * eso aquí nunca se devuelve.
 */
export function clasificarWebMaps(website: string | null | undefined): BrechaWeb {
  const url = (website ?? "").trim().toLowerCase();
  if (!url) return "sin_web";
  if (NO_ES_WEB.some((d) => url.includes(d))) return "sin_web";
  if (WEB_DEBIL.some((d) => url.includes(d))) return "debil";
  return "decente";
}

export interface FilaMaps {
  /** Consulta que originó la fila (p. ej. "veterinaria en Querétaro"). */
  consulta: string;
  website: string | null;
}

export interface BrechaNicho {
  consulta: string;
  total: number;
  sinWeb: number;
  webDebil: number;
  /** % de negocios sin web propia o con web de plantilla (0-100). */
  brechaPct: number;
}

/** Agrega un scrape de Maps en la tabla de brecha por consulta/nicho. */
export function analizarBrechaNicho(filas: FilaMaps[]): BrechaNicho[] {
  const porConsulta = new Map<string, FilaMaps[]>();
  for (const f of filas) {
    const grupo = porConsulta.get(f.consulta) ?? [];
    grupo.push(f);
    porConsulta.set(f.consulta, grupo);
  }
  const resultado: BrechaNicho[] = [];
  for (const [consulta, grupo] of porConsulta) {
    let sinWeb = 0, webDebil = 0;
    for (const f of grupo) {
      const clase = clasificarWebMaps(f.website);
      if (clase === "sin_web") sinWeb++;
      else if (clase === "debil") webDebil++;
    }
    resultado.push({
      consulta,
      total: grupo.length,
      sinWeb,
      webDebil,
      brechaPct: grupo.length ? Math.round(((sinWeb + webDebil) / grupo.length) * 100) : 0,
    });
  }
  return resultado.sort((a, b) => b.brechaPct - a.brechaPct);
}

// ── 2. El juez: score del nicho ─────────────────────────────────────────────

export interface SenalesNicho {
  nombre: string;
  /**
   * ¿La web es sí-o-sí con mecanismo económico medible?
   * "estructural" = sin web pierden dinero cuantificable (comisiones, paciente
   * que decide a distancia). "fuerte" = la web convierte pero hay sustitutos
   * (GBP bien llevado). "debil" = la web es imagen, no ingreso.
   */
  necesidad: "estructural" | "fuerte" | "debil";
  /** Brecha empírica del scraper (0-100). null = sin validar aún. */
  brechaPct: number | null;
  /** ¿Pagan $15-30 mil MXN sin dolor? */
  ticket: "alto" | "medio" | "bajo";
  /** ¿Dueño-decisor único, WhatsApp natural, ciclo corto? */
  cierre: "rapido" | "medio" | "lento";
  /** ¿Se encuentra el universo completo con búsquedas de Maps? */
  prospectableMaps: boolean;
  /** ¿La mensualidad es venta natural (SEO local, reseñas, temporadas)? */
  recurrencia: "natural" | "posible" | "nula";
}

export interface CalificacionNicho {
  score: number; // 0-100
  tier: "A" | "B" | "C";
  descalificado: boolean;
  motivos: string[];
}

// Pesos por eje (suman 100). La necesidad manda: sin mecanismo económico no
// hay pitch; la brecha empírica es la prueba de que queda mercado.
const PESO_NECESIDAD = 30;
const PESO_BRECHA = 25;
const PESO_TICKET = 20;
const PESO_CIERRE = 15;
const PESO_RECURRENCIA = 10;

/** Califica un nicho. Descalificadores duros antes de puntuar. */
export function calificarNicho(s: SenalesNicho): CalificacionNicho {
  // ── Descalificadores duros ────────────────────────────────────────────────
  if (!s.prospectableMaps) {
    return { score: 10, tier: "C", descalificado: true, motivos: ["No prospectable por Maps — no encaja con el sistema de prospección."] };
  }
  if (s.brechaPct != null && s.brechaPct < 10) {
    return { score: 15, tier: "C", descalificado: true, motivos: [`Brecha empírica ${s.brechaPct}% — mercado ya saturado de webs, no hay a quién vender.`] };
  }
  if (s.necesidad === "debil" && s.ticket === "bajo") {
    return { score: 20, tier: "C", descalificado: true, motivos: ["Ni necesitan la web ni pueden pagarla — sin pitch posible."] };
  }

  const necesidad = { estructural: 1.0, fuerte: 0.65, debil: 0.2 }[s.necesidad];
  // Brecha sin validar = neutro-bajo: obliga a correr el scraper antes de decidir.
  const brecha = s.brechaPct == null ? 0.4 : Math.min(1, s.brechaPct / 75);
  const ticket = { alto: 1.0, medio: 0.6, bajo: 0.2 }[s.ticket];
  const cierre = { rapido: 1.0, medio: 0.6, lento: 0.2 }[s.cierre];
  const recurrencia = { natural: 1.0, posible: 0.5, nula: 0 }[s.recurrencia];

  const score = Math.round(
    PESO_NECESIDAD * necesidad +
      PESO_BRECHA * brecha +
      PESO_TICKET * ticket +
      PESO_CIERRE * cierre +
      PESO_RECURRENCIA * recurrencia,
  );

  const motivos: string[] = [];
  if (s.necesidad === "estructural") motivos.push("Necesidad estructural: sin web pierden dinero medible.");
  if (s.necesidad === "debil") motivos.push("La web es imagen, no ingreso — pitch cuesta arriba.");
  if (s.brechaPct == null) motivos.push("Brecha sin validar — correr el scraper antes de comprometerse.");
  else if (s.brechaPct >= 50) motivos.push(`Brecha empírica ${s.brechaPct}% — mercado amplio verificado.`);
  if (s.ticket === "alto") motivos.push("Ticket alto: pagan el paquete sin dolor.");
  if (s.cierre === "rapido") motivos.push("Owner-operated, decisor único → cierre rápido.");
  if (s.recurrencia === "natural") motivos.push("Mensualidad natural (SEO local, reseñas, temporadas).");

  const tier: "A" | "B" | "C" = score >= 75 ? "A" : score >= 55 ? "B" : "C";
  return { score, tier, descalificado: false, motivos };
}

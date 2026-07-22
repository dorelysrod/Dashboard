/**
 * SCORING DE CALIDAD DE LEAD (potencial de cliente) para Ai Landing Pro.
 *
 * Nuestro producto es REHACER webs de clínicas de estética. Por tanto el mejor
 * lead NO es el más grande ni el mejor posicionado: es el que tiene DEMANDA real
 * pero una web que la desperdicia, puede pagar, y se cierra rápido. Somos
 * críticos: una clínica con web moderna y fuerte NO es prospecto (no la necesita).
 *
 * Score 0-100 = suma ponderada de 4 ejes + descalificadores duros.
 */

export type BrechaWeb = "sin_web" | "debil" | "decente" | "fuerte";

export interface SenalesLead {
  /** El eje #1: ¿qué tan mala es su web hoy? (null = desconocido, hay que enriquecer). */
  brechaWeb: BrechaWeb | null;
  rating: number | null;
  resenas: number | null;
  /** Un solo decisor (dueña que opera) → venta rápida. */
  ownerOperated?: boolean | null;
  /** Cadena/franquicia grande con agencia → difícil, descalifica. */
  cadena?: boolean | null;
  /** Señales de ticket alto (servicios premium, ubicación premium). */
  premium?: boolean | null;
}

export interface Calificacion {
  score: number; // 0-100
  tier: "A" | "B" | "C";
  descalificado: boolean;
  motivos: string[];
}

// ── Pesos por eje (suman 100) ────────────────────────────────────────────────
const PESO_BRECHA = 40; // la oportunidad: sin web / web débil = más que ganar
const PESO_DEMANDA = 30; // prueba de que tienen pacientes y reputación
const PESO_PAGO = 15; // capacidad de pagar (ticket alto)
const PESO_CIERRE = 15; // facilidad/velocidad de cierre

/** Brecha web → fracción del peso. Web fuerte = 0 (y descalifica). */
function puntosBrecha(b: BrechaWeb | null): number {
  switch (b) {
    case "sin_web": return PESO_BRECHA * 1.0; // solo redes/Linktree: pitch más fácil
    case "debil": return PESO_BRECHA * 0.8; // Wix/plantilla lenta, no responsive
    case "decente": return PESO_BRECHA * 0.3; // mejorable pero no urgente
    case "fuerte": return 0; // ya tiene buena web → no es prospecto
    default: return PESO_BRECHA * 0.5; // desconocido: neutro, marca para enriquecer
  }
}

/**
 * Demanda: rating × volumen de reseñas (log-escalado). El sweet spot es una
 * clínica ESTABLECIDA (rating alto, reseñas suficientes) — prueba de que hay
 * dinero y reputación que su web mala está desperdiciando.
 */
function puntosDemanda(rating: number | null, resenas: number | null): number {
  if (rating == null && resenas == null) return PESO_DEMANDA * 0.4; // desconocido: neutro-bajo
  const r = rating ?? 4.3;
  const n = resenas ?? 0;
  // Calidad de la reputación (4.3→0, 5.0→1), penaliza rating bajo.
  const calidad = Math.max(0, Math.min(1, (r - 4.3) / 0.7));
  // Volumen: log — 10 reseñas ya cuenta, 300+ satura. <10 = tracción floja.
  const volumen = Math.max(0, Math.min(1, Math.log10(n + 1) / Math.log10(300)));
  return PESO_DEMANDA * (0.55 * calidad + 0.45 * volumen);
}

function puntosPago(premium: boolean | null | undefined): number {
  // Medicina estética ya es ticket alto de base; premium suma.
  return premium ? PESO_PAGO : PESO_PAGO * 0.6;
}

function puntosCierre(owner: boolean | null | undefined, cadena: boolean | null | undefined): number {
  if (cadena) return 0; // muchos gatekeepers
  return owner ? PESO_CIERRE : PESO_CIERRE * 0.6;
}

/** Califica un lead. Aplica descalificadores duros antes de puntuar. */
export function calificarLead(s: SenalesLead): Calificacion {
  const motivos: string[] = [];

  // ── Descalificadores duros ────────────────────────────────────────────────
  if (s.brechaWeb === "fuerte") {
    return { score: 5, tier: "C", descalificado: true, motivos: ["Ya tiene una web moderna y fuerte — no nos necesita."] };
  }
  if (s.cadena) {
    return { score: 15, tier: "C", descalificado: true, motivos: ["Cadena/franquicia grande — venta lenta, probablemente con agencia."] };
  }
  if (s.rating != null && s.rating < 4.0 && (s.resenas ?? 0) > 20) {
    return { score: 20, tier: "C", descalificado: true, motivos: ["Reputación baja con volumen — problema de servicio, no de web."] };
  }

  const score = Math.round(
    puntosBrecha(s.brechaWeb) +
      puntosDemanda(s.rating, s.resenas) +
      puntosPago(s.premium) +
      puntosCierre(s.ownerOperated, s.cadena),
  );

  // Motivos legibles (para el operador).
  if (s.brechaWeb === "sin_web") motivos.push("Sin web propia (solo redes) → máxima oportunidad.");
  else if (s.brechaWeb === "debil") motivos.push("Web débil/anticuada → mucho que mejorar.");
  else if (s.brechaWeb == null) motivos.push("Estado de web desconocido — enriquecer.");
  if ((s.rating ?? 0) >= 4.7 && (s.resenas ?? 0) >= 30) motivos.push("Demanda probada (rating alto + reseñas).");
  if ((s.resenas ?? 0) < 10) motivos.push("Tracción floja (pocas reseñas).");
  if (s.ownerOperated) motivos.push("Owner-operated → un decisor, cierre rápido.");
  if (s.premium) motivos.push("Señales premium → ticket alto.");

  const tier: "A" | "B" | "C" = score >= 78 ? "A" : score >= 55 ? "B" : "C";
  return { score, tier, descalificado: false, motivos };
}

/** Mapa tier → segmento 1-4 del dominio (1 = mejor). */
export function segmentoDeTier(tier: "A" | "B" | "C"): number {
  return tier === "A" ? 1 : tier === "B" ? 2 : 3;
}

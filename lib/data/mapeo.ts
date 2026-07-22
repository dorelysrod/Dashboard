import type {
  CorreoRow,
  CotizacionRow,
  EtapaLead,
  InspeccionRow,
  LeadRow,
} from "@/lib/types/db";
import type { EstadoEtapa, EstadoNicho, Lead, Nicho } from "@/lib/types/dominio";

/**
 * Mapeo modelo normalizado (Supabase) → vista plana `Lead` que pinta la UI.
 * El dato vive en varias tablas (`leads` + `inspecciones` + `cotizaciones` +
 * `correos`); aquí se agrega a la forma única que consumen pipeline y drawer.
 * Funciones puras (sin red) para poder testearlas en aislamiento.
 */

/** Las 9 etapas de BD (etapa_lead) → las 5 clases de estilo del mockup (§visual). */
const ETAPA_A_ESTADO: Record<EtapaLead, EstadoEtapa> = {
  nuevo: { css: "st-new", label: "Nuevo" },
  inspeccionado: { css: "st-new", label: "Inspeccionado" },
  cotizado: { css: "st-new", label: "Cotizado" },
  enviado: { css: "st-env", label: "Cotización enviada" },
  abierto: { css: "st-ab", label: "Abierta" },
  aceptado: { css: "st-ac", label: "Aceptada" },
  en_desarrollo: { css: "st-dev", label: "En desarrollo" },
  entregado: { css: "st-ac", label: "Entregado" },
  descartado: { css: "st-new", label: "Descartado" },
};

export function mapearEtapa(etapa: EtapaLead): EstadoEtapa {
  return ETAPA_A_ESTADO[etapa];
}

/** Nichos comerciales (enum `nicho_lead`) → badge del panel. */
const NICHO_A_ESTADO: Record<Nicho, EstadoNicho> = {
  estetica: { css: "ni-est", label: "Medicina estética" },
  turismo_dental: { css: "ni-dent", label: "Turismo dental" },
  bodas_venues: { css: "ni-bodas", label: "Bodas y venues" },
  tour_operadores: { css: "ni-tour", label: "Tour operadores" },
};

/** Orden de presentación de los chips de filtro (el nicho base primero). */
export const NICHOS: readonly Nicho[] = [
  "estetica",
  "turismo_dental",
  "bodas_venues",
  "tour_operadores",
];

export function mapearNicho(nicho: Nicho): EstadoNicho {
  return NICHO_A_ESTADO[nicho];
}

/** ¿Es un valor de nicho válido? (valida searchParams y datos de BD). */
export function esNicho(valor: string | null | undefined): valor is Nicho {
  return valor != null && valor in NICHO_A_ESTADO;
}

/**
 * Infiere el nicho desde el rubro libre que escribe el operador en Buscar
 * (p. ej. "clínica dental para extranjeros" → turismo_dental). Fallback: el
 * nicho base. Puro, para poder testearlo.
 */
export function nichoDesdeRubro(rubro: string | null | undefined): Nicho {
  const r = (rubro ?? "").toLowerCase();
  if (/dental|dentista|odonto/.test(r)) return "turismo_dental";
  if (/boda|venue|jard[ií]n|banquete|hacienda/.test(r)) return "bodas_venues";
  if (/tour|excursi[oó]n|operador|agencia de viajes/.test(r)) return "tour_operadores";
  return "estetica";
}

/** Devuelve el elemento más reciente por `created_at` (o undefined si vacío). */
export function masReciente<T extends { created_at: string }>(
  filas: T[] | null | undefined,
): T | undefined {
  if (!filas || filas.length === 0) return undefined;
  return [...filas].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

/** Fila `leads` con sus hijos anidados (resultado del SELECT con joins). */
export interface LeadConRelaciones extends LeadRow {
  inspecciones?: InspeccionRow[] | null;
  cotizaciones?: CotizacionRow[] | null;
  correos?: CorreoRow[] | null;
}

/**
 * Agrega una fila `leads` + sus relaciones (la inspección/cotización/correo más
 * recientes) en la vista `Lead`. Campos ausentes → valores neutros del contrato
 * visual (cadena vacía, 0), nunca `null`.
 */
export function filaALead(fila: LeadConRelaciones): Lead {
  const inspeccion = masReciente(fila.inspecciones);
  const cotizacion = masReciente(fila.cotizaciones);
  const correo = masReciente(fila.correos);

  const meta = [fila.ciudad, fila.rubro].filter(Boolean).join(" · ");

  return {
    id: fila.id,
    nombre: fila.negocio,
    meta,
    nicho: esNicho(fila.nicho) ? fila.nicho : "estetica",
    etapa: mapearEtapa(fila.etapa),
    tecnologia: inspeccion?.tecnologia ?? fila.tecnologia ?? "",
    hosting: inspeccion?.hosting ?? "",
    mejoras: inspeccion?.mejoras?.join(" · ") ?? "",
    recomendacion: inspeccion?.recomendacion ?? "",
    mxn: cotizacion?.total_mxn ?? cotizacion?.base_mxn ?? 0,
    modulos: cotizacion?.modulos ?? [],
    esfuerzoDias: fila.esfuerzo_dias ?? 0,
    aperturas: correo?.aperturas ?? 0,
    clics: correo?.clics ?? 0,
    vioCotizacion: correo?.vio_cotizacion ? 1 : 0,
    correo: correo
      ? `Asunto: ${correo.asunto ?? ""}\n\n${correo.cuerpo ?? ""}`
      : "",
    telefono: fila.telefono ?? "",
  };
}

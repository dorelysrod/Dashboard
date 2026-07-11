import type {
  CorreoRow,
  CotizacionRow,
  EtapaLead,
  InspeccionRow,
  LeadRow,
} from "@/lib/types/db";
import type { EstadoEtapa, Lead } from "@/lib/types/dominio";

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
  };
}

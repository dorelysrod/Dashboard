/**
 * Tipos de dominio del panel (identificadores en español, CLAUDE.md §1).
 * Subconjunto que consumen las vistas de M2; el modelo completo (§4 del spec:
 * leads, inspecciones, cotizaciones, correos, clientes, facturas, …) se
 * materializa en las migraciones de M1/Supabase.
 */

import type { EtapaLead } from "./db";

/** Clase de estilo de la etapa (tokens del mockup). */
export type EtapaCss = "st-env" | "st-ab" | "st-ac" | "st-dev" | "st-new";

export interface EstadoEtapa {
  css: EtapaCss;
  label: string;
}

/**
 * Nichos comerciales (estudio de nichos jul 2026): el base (estética) + el
 * ranking A. Mismos valores que el enum `nicho_lead` de BD; el mapeo vive en
 * lib/data/mapeo.ts, como con las etapas.
 */
export type Nicho =
  | "estetica"
  | "turismo_dental"
  | "bodas_venues"
  | "tour_operadores";

/** Clase de estilo del badge de nicho (tokens del mockup). */
export type NichoCss = "ni-est" | "ni-dent" | "ni-bodas" | "ni-tour";

export interface EstadoNicho {
  css: NichoCss;
  label: string;
}

/**
 * Vista de lead que necesita el pipeline + drawer. Agrega datos que en el
 * modelo normalizado viven en `leads` + `inspecciones` + `cotizaciones` +
 * `correos`; en M3 se arman desde esos SELECTs.
 */
export interface Lead {
  id: string;
  nombre: string;
  /** "CDMX · Medicina estética" */
  meta: string;
  nicho: Nicho;
  etapa: EstadoEtapa;
  /**
   * Etapa cruda de BD (enum `etapa_lead`); `etapa` es su presentación visual.
   * Necesaria para filtrar por avance del pipeline en modo seed (paridad con
   * el filtro server-side de Supabase).
   */
  etapaDb: EtapaLead;
  /** Calificación de Google Maps (1.0–5.0, 1 decimal). null = sin calificación. */
  rating: number | null;
  /** Número de reseñas en Google Maps (0 si no se conoce; nunca null). */
  resenas: number;
  tecnologia: string;
  hosting: string;
  /** Qué mejorar (texto plano). */
  mejoras: string;
  /** Recomendación; puede contener <b> del contrato visual. */
  recomendacion: string;
  /** Cotización inicial en MXN. */
  mxn: number;
  /** Módulos de la cotización. */
  modulos: string[];
  /** Esfuerzo / ETA en días. */
  esfuerzoDias: number;
  /** Tracking del correo. */
  aperturas: number;
  clics: number;
  /** ¿Vio la cotización? (0/1) */
  vioCotizacion: number;
  /** Cuerpo del correo (con asunto en la 1ª línea). */
  correo: string;
  /** Teléfono del negocio (seguimiento por WhatsApp). Vacío si no se conoce. */
  telefono?: string;
}

/** Prospecto de la vista Buscar (resultado de Places en fase 2; seed en fase 1). */
export interface Prospecto {
  nombre: string;
  meta: string;
  nicho: Nicho;
  rating: number;
  resenas: number;
  /** Señal de tier / oportunidad. */
  senal: string;
}

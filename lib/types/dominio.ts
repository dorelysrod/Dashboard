/**
 * Tipos de dominio del panel (identificadores en español, CLAUDE.md §1).
 * Subconjunto que consumen las vistas de M2; el modelo completo (§4 del spec:
 * leads, inspecciones, cotizaciones, correos, clientes, facturas, …) se
 * materializa en las migraciones de M1/Supabase.
 */

/** Clase de estilo de la etapa (tokens del mockup). */
export type EtapaCss = "st-env" | "st-ab" | "st-ac" | "st-dev" | "st-new";

export interface EstadoEtapa {
  css: EtapaCss;
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
  etapa: EstadoEtapa;
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
}

/** Prospecto de la vista Buscar (resultado de Places en fase 2; seed en fase 1). */
export interface Prospecto {
  nombre: string;
  meta: string;
  rating: number;
  resenas: number;
  /** Señal de tier / oportunidad. */
  senal: string;
}

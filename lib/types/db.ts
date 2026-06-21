/**
 * Tipos de fila de la base (espejo de supabase/migrations · spec §4).
 * Identificadores en español. Los consume la capa de datos en M3 al cablear
 * Supabase. NO confundir con lib/types/dominio.ts (formas que pinta la UI).
 */

export type EtapaLead =
  | "nuevo"
  | "inspeccionado"
  | "cotizado"
  | "enviado"
  | "abierto"
  | "aceptado"
  | "en_desarrollo"
  | "entregado"
  | "descartado";

export type TierLead = "A" | "B" | "C";
export type EstadoCotizacion = "borrador" | "enviada" | "aceptada" | "rechazada";
export type TipoFactura = "build" | "suscripcion";
export type EstadoFactura = "pendiente" | "pagada";
export type DificultadPaso = "facil" | "media" | "dificil";
export type DiaSemana = "LU" | "MA" | "MI" | "JU" | "VI" | "SA" | "DO";

export interface LeadRow {
  id: string;
  negocio: string;
  ciudad: string | null;
  estado: string | null;
  rubro: string | null;
  rating: number | null;
  resenas: number | null;
  telefono: string | null;
  sitio_web: string | null;
  tecnologia: string | null;
  segmento: number | null;
  tier: TierLead | null;
  etapa: EtapaLead;
  valor_eur: number | null;
  esfuerzo_dias: number | null;
  razon_perdida: string | null;
  /** TU agenda: llamada agendada con el lead (Calendly → fase 2). */
  llamada_at: string | null;
  created_at: string;
}

export interface InspeccionRow {
  id: string;
  lead_id: string;
  tecnologia: string | null;
  hosting: string | null;
  mejoras: string[];
  segmento: number | null;
  recomendacion: string | null;
  raw: string | null;
  created_at: string;
}

export interface CotizacionRow {
  id: string;
  lead_id: string;
  base_mxn: number | null;
  modulos: string[];
  total_mxn: number | null;
  total_eur: number | null;
  fecha_entrega: string | null;
  estado: EstadoCotizacion;
  created_at: string;
}

export interface CorreoRow {
  id: string;
  lead_id: string;
  asunto: string | null;
  cuerpo: string | null;
  enviado_at: string | null;
  aperturas: number;
  clics: number;
  vio_cotizacion: boolean;
  created_at: string;
}

export interface ClienteRow {
  id: string;
  lead_id: string;
  nombre: string | null;
  datos_factura: Record<string, unknown> | null;
  suscripcion_activa: boolean;
  created_at: string;
}

export interface FacturaRow {
  id: string;
  cliente_id: string;
  concepto: string | null;
  mxn: number | null;
  tipo_cambio: number | null;
  eur: number | null;
  tipo: TipoFactura;
  estado: EstadoFactura;
  fecha: string | null;
  created_at: string;
}

export interface HoraRow {
  id: string;
  lead_id: string | null;
  paso: string | null;
  estimado_h: number | null;
  real_h: number | null;
  dificultad: DificultadPaso | null;
  created_at: string;
}

export interface GastoRow {
  id: string;
  concepto: string | null;
  eur: number | null;
  btw_eur: number | null;
  fecha: string | null;
  created_at: string;
}

export interface DisponibilidadRow {
  dia: DiaSemana;
  horas: number;
}

export interface ConfigRow {
  clave: string;
  /** jsonb: escalar (FX_MXN_EUR) u objeto (PRECIOS, FISCAL) — §7. */
  valor: unknown;
  descripcion: string | null;
  actualizado_en: string;
}

export interface ClienteMetricasRow {
  cliente_id: string;
  ga4_property_id: string | null;
  gsc_site_url: string | null;
  gbp_location_id: string | null;
  timezone: string;
}

// ── FASE 3 (tablas listas, sin lógica en fase 1) ────────────────────────────
export interface SeguimientoRow {
  id: string;
  lead_id: string;
  intento: number;
  programado_at: string | null;
  enviado_at: string | null;
  created_at: string;
}

export interface IntakeRow {
  id: string;
  lead_id: string;
  token: string;
  /** Arranca el reloj de Entregas (§11.B). */
  completado_at: string | null;
  datos: Record<string, unknown> | null;
  created_at: string;
}

import type { EtapaLead } from "@/lib/types/db";
import type { Lead } from "@/lib/types/dominio";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import { aEur } from "@/lib/format";
import { LEADS } from "./seed";

/**
 * Servicio de la portada (Resumen). Calcula los KPIs del negocio desde Supabase
 * (con fallback al seed si no hay base cableada). La UI nunca consulta directo
 * (CLAUDE.md §1).
 *
 * Definición de KPIs:
 * - leads: total de leads; subtítulo = altas en los últimos 7 días.
 * - cotizEnviadas: leads que ya recibieron cotización (etapa enviado en adelante).
 * - pctAbiertas: % de correos enviados con al menos una apertura.
 * - aceptadas: leads aceptados/en desarrollo/entregados.
 * - pipelineEur: € de cotizaciones aún en juego (etapas enviado/abierto).
 * - mrrEur: ingreso recurrente de suscripciones de dashboard activas.
 */
export interface ResumenKpis {
  totalLeads: number;
  leadsSemana: number;
  cotizEnviadas: number;
  correosEnviados: number;
  correosAbiertos: number;
  pctAbiertas: number;
  aceptadas: number;
  pipelineEur: number;
  suscripcionesActivas: number;
  mrrEur: number;
}

/** Etapas que implican que ya se envió cotización. */
const ETAPAS_COTIZADAS: EtapaLead[] = [
  "enviado",
  "abierto",
  "aceptado",
  "en_desarrollo",
  "entregado",
];
const ETAPAS_ACEPTADAS: EtapaLead[] = ["aceptado", "en_desarrollo", "entregado"];
const ETAPAS_ABIERTAS: EtapaLead[] = ["enviado", "abierto"];

function resumenDesdeSeed(): ResumenKpis {
  const cotizadas = LEADS.filter((l) => l.mxn > 0);
  const abiertos = LEADS.filter((l) => l.aperturas > 0).length;
  const enviados = LEADS.filter((l) => l.aperturas >= 0).length;
  const aceptadas = LEADS.filter((l) => l.etapa.css === "st-dev" || l.etapa.css === "st-ac").length;
  const pipelineEur = LEADS.filter((l) => l.etapa.css === "st-env" || l.etapa.css === "st-ab")
    .reduce((s, l) => s + aEur(l.mxn), 0);
  return {
    totalLeads: LEADS.length,
    leadsSemana: 0,
    cotizEnviadas: cotizadas.length,
    correosEnviados: enviados,
    correosAbiertos: abiertos,
    pctAbiertas: enviados ? Math.round((abiertos / enviados) * 100) : 0,
    aceptadas,
    pipelineEur,
    suscripcionesActivas: 0,
    mrrEur: 0,
  };
}

export async function obtenerResumen(): Promise<ResumenKpis> {
  if (!supabaseConfigurado()) return resumenDesdeSeed();

  const supabase = await crearClienteServidor();

  const [leadsRes, correosRes, clientesRes, facturasRes] = await Promise.all([
    supabase.from("leads").select("etapa, valor_eur, created_at"),
    supabase.from("correos").select("aperturas, enviado_at"),
    supabase.from("clientes").select("id, suscripcion_activa"),
    supabase.from("facturas").select("eur, tipo"),
  ]);

  // No degradar KPIs a "0" en silencio: si cualquiera de las queries falla
  // (RLS, red, columna), se lanza en vez de reportar % abiertas / MRR = 0.
  if (leadsRes.error) throw leadsRes.error;
  if (correosRes.error) throw correosRes.error;
  if (clientesRes.error) throw clientesRes.error;
  if (facturasRes.error) throw facturasRes.error;

  const leads = leadsRes.data ?? [];
  const correos = correosRes.data ?? [];
  const clientes = clientesRes.data ?? [];
  const facturas = facturasRes.data ?? [];

  const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const enviados = correos.filter((c) => c.enviado_at).length;
  const abiertos = correos.filter((c) => c.enviado_at && c.aperturas > 0).length;
  const suscripcionesActivas = clientes.filter((c) => c.suscripcion_activa).length;
  const mrrEur = facturas
    .filter((f) => f.tipo === "suscripcion")
    .reduce((s, f) => s + (f.eur ?? 0), 0);

  return {
    totalLeads: leads.length,
    leadsSemana: leads.filter((l) => l.created_at >= hace7dias).length,
    cotizEnviadas: leads.filter((l) => ETAPAS_COTIZADAS.includes(l.etapa)).length,
    correosEnviados: enviados,
    correosAbiertos: abiertos,
    pctAbiertas: enviados ? Math.round((abiertos / enviados) * 100) : 0,
    aceptadas: leads.filter((l) => ETAPAS_ACEPTADAS.includes(l.etapa)).length,
    pipelineEur: leads
      .filter((l) => ETAPAS_ABIERTAS.includes(l.etapa))
      .reduce((s, l) => s + (l.valor_eur ?? 0), 0),
    suscripcionesActivas,
    mrrEur,
  };
}

export interface AccionHoy {
  id: string;
  motivo: string;
  sugerencia: string;
  tono: "hot" | "warn" | "go";
}

/**
 * Deriva las "Acciones de hoy" del estado real de los leads (función pura).
 * Prioriza señales calientes (aperturas/clics), luego correos sin abrir y
 * entregas en curso. Devuelve hasta `limite` acciones.
 */
export function accionesDeHoy(leads: Lead[], limite = 4): AccionHoy[] {
  const acciones: AccionHoy[] = [];

  for (const l of leads) {
    if (l.aperturas >= 3) {
      acciones.push({
        id: l.id,
        tono: "hot",
        motivo: `${l.nombre} abrió la cotización ${l.aperturas} veces, sin responder.`,
        sugerencia: "→ Mándale seguimiento.",
      });
    } else if (l.clics > 0) {
      acciones.push({
        id: l.id,
        tono: "hot",
        motivo: `${l.nombre} hizo clic en el link.`,
        sugerencia: "→ Lead caliente, agéndale llamada.",
      });
    } else if (l.aperturas === 0 && (l.etapa.css === "st-env" || l.etapa.css === "st-ab")) {
      acciones.push({
        id: l.id,
        tono: "warn",
        motivo: `${l.nombre} aún no abre el correo.`,
        sugerencia: "→ Reenvía con otro asunto.",
      });
    } else if (l.etapa.css === "st-dev") {
      acciones.push({
        id: l.id,
        tono: "go",
        motivo: `Entrega de ${l.nombre} en desarrollo.`,
        sugerencia: "→ Vigila la fecha de entrega.",
      });
    }
  }

  // Orden por prioridad de tono (hot > warn > go) y recorte.
  const peso = { hot: 0, warn: 1, go: 2 } as const;
  return acciones.sort((a, b) => peso[a.tono] - peso[b.tono]).slice(0, limite);
}

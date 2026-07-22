import type { EstadoFactura } from "@/lib/types/db";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import { leerConfig } from "@/lib/config";
import {
  FISCAL_VE_DEFAULT,
  type MonedaFacturaVe,
  type ParametrosFiscalVe,
} from "@/lib/data/fiscal-ve-calculos";

/**
 * Servicio de Facturación Venezuela (persona natural con RIF). Lee `facturas_ve`
 * y `config.FISCAL_VE`; la UI nunca toca Supabase directo (CLAUDE.md §1).
 * Si la tabla aún no existe (migración 20260720200000 sin aplicar), degrada con
 * `disponible: false` en vez de romper la vista.
 */
export interface FacturaVe {
  id: string;
  numero: number;
  numeroControl: string;
  fecha: string;
  clienteNombre: string;
  clienteRif: string | null;
  clienteDomicilio: string | null;
  concepto: string;
  moneda: MonedaFacturaVe;
  monto: number;
  tasaBcv: number;
  baseBs: number;
  ivaPct: number;
  ivaBs: number;
  igtfPct: number;
  igtfBs: number;
  totalBs: number;
  totalUsd: number;
  estado: EstadoFactura;
}

export interface ResumenFacturasVe {
  disponible: boolean;
  facturas: FacturaVe[];
  totalCobradoBs: number;
  totalPendienteBs: number;
  siguienteNumero: number;
  parametros: ParametrosFiscalVe;
}

interface FilaFacturaVe {
  id: string;
  numero: number;
  numero_control: string;
  fecha: string;
  cliente_nombre: string;
  cliente_rif: string | null;
  cliente_domicilio: string | null;
  concepto: string;
  moneda: MonedaFacturaVe;
  monto: number;
  tasa_bcv: number;
  base_bs: number;
  iva_pct: number;
  iva_bs: number;
  igtf_pct: number;
  igtf_bs: number;
  total_bs: number;
  total_usd: number;
  estado: EstadoFactura;
}

const COLUMNAS =
  "id, numero, numero_control, fecha, cliente_nombre, cliente_rif, cliente_domicilio, concepto, moneda, monto, tasa_bcv, base_bs, iva_pct, iva_bs, igtf_pct, igtf_bs, total_bs, total_usd, estado";

/** La tabla no existe todavía (migración sin aplicar): 42P01 (Postgres) o PGRST205 (PostgREST). */
export function esTablaAusente(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

function mapear(f: FilaFacturaVe): FacturaVe {
  return {
    id: f.id,
    numero: f.numero,
    numeroControl: f.numero_control,
    fecha: f.fecha,
    clienteNombre: f.cliente_nombre,
    clienteRif: f.cliente_rif,
    clienteDomicilio: f.cliente_domicilio,
    concepto: f.concepto,
    moneda: f.moneda,
    monto: f.monto ?? 0,
    tasaBcv: f.tasa_bcv ?? 0,
    baseBs: f.base_bs ?? 0,
    ivaPct: f.iva_pct ?? 0,
    ivaBs: f.iva_bs ?? 0,
    igtfPct: f.igtf_pct ?? 0,
    igtfBs: f.igtf_bs ?? 0,
    totalBs: f.total_bs ?? 0,
    totalUsd: f.total_usd ?? 0,
    estado: f.estado,
  };
}

/** Parámetros del régimen VE desde `config.FISCAL_VE`, con defaults seguros. */
export async function leerFiscalVe(): Promise<ParametrosFiscalVe> {
  const v = await leerConfig<Partial<ParametrosFiscalVe>>("FISCAL_VE");
  return { ...FISCAL_VE_DEFAULT, ...(v ?? {}) };
}

export async function obtenerFacturasVe(): Promise<ResumenFacturasVe> {
  const vacio: ResumenFacturasVe = {
    disponible: false,
    facturas: [],
    totalCobradoBs: 0,
    totalPendienteBs: 0,
    siguienteNumero: 1,
    parametros: FISCAL_VE_DEFAULT,
  };
  if (!supabaseConfigurado()) return vacio;

  const supabase = await crearClienteServidor();
  const [facturasRes, parametros] = await Promise.all([
    supabase
      .from("facturas_ve")
      .select(COLUMNAS)
      .order("numero", { ascending: false }),
    leerFiscalVe(),
  ]);

  if (facturasRes.error) {
    if (esTablaAusente(facturasRes.error)) return { ...vacio, parametros };
    throw facturasRes.error;
  }

  const facturas = ((facturasRes.data ?? []) as FilaFacturaVe[]).map(mapear);
  const totalCobradoBs = facturas
    .filter((f) => f.estado === "pagada")
    .reduce((s, f) => s + f.totalBs, 0);
  const totalPendienteBs = facturas
    .filter((f) => f.estado === "pendiente")
    .reduce((s, f) => s + f.totalBs, 0);
  const siguienteNumero = (facturas[0]?.numero ?? 0) + 1;

  return {
    disponible: true,
    facturas,
    totalCobradoBs,
    totalPendienteBs,
    siguienteNumero,
    parametros,
  };
}

/** Una factura VE + los datos del emisor, para la vista imprimible. */
export async function obtenerFacturaVe(
  id: string,
): Promise<{ factura: FacturaVe; emisor: ParametrosFiscalVe } | null> {
  if (!supabaseConfigurado()) return null;

  const supabase = await crearClienteServidor();
  const [facturaRes, emisor] = await Promise.all([
    supabase.from("facturas_ve").select(COLUMNAS).eq("id", id).maybeSingle(),
    leerFiscalVe(),
  ]);

  if (facturaRes.error) {
    if (esTablaAusente(facturaRes.error)) return null;
    throw facturaRes.error;
  }
  if (!facturaRes.data) return null;

  return { factura: mapear(facturaRes.data as FilaFacturaVe), emisor };
}

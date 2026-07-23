"use server";

import { revalidatePath } from "next/cache";
import type { EstadoFactura } from "@/lib/types/db";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import {
  calcularFacturaVe,
  formatearRif,
  validarRif,
  type MonedaFacturaVe,
  type ParametrosFiscalVe,
} from "@/lib/data/fiscal-ve-calculos";
import { esTablaAusente, leerFiscalVe } from "@/lib/data/facturas-ve";

/**
 * Mutaciones de Facturación Venezuela. Server Actions con la sesión del
 * operador (RLS `operador_full`); la UI nunca toca Supabase directo
 * (CLAUDE.md §1). Los montos se calculan en el servidor con el motor puro
 * (fiscal-ve-calculos) — el cliente solo envía la entrada.
 */

export interface ResultadoAccionVe {
  ok: boolean;
  error: string | null;
  facturaId?: string;
}

export interface EntradaNuevaFacturaVe {
  clienteNombre: string;
  clienteRif: string;
  clienteDomicilio: string;
  concepto: string;
  moneda: MonedaFacturaVe;
  monto: number;
  tasaBcv: number;
  aplicaIgtf: boolean;
  numeroControl: string;
  fecha: string;
}

const SIN_TABLA =
  "Falta aplicar la migración 20260720200000_facturas_ve.sql (supabase db push).";

/** Emite una factura VE: correlativo, N.º de control, IVA discriminado e IGTF. */
export async function crearFacturaVe(
  e: EntradaNuevaFacturaVe,
): Promise<ResultadoAccionVe> {
  if (!supabaseConfigurado()) {
    return { ok: false, error: "Supabase no está configurado." };
  }
  if (!e.clienteNombre.trim()) {
    return { ok: false, error: "Escribe el nombre o razón social del cliente." };
  }
  if (e.clienteRif.trim() && !validarRif(e.clienteRif)) {
    return {
      ok: false,
      error: "RIF del cliente inválido (formato V-12345678-9, J-…, E-…).",
    };
  }
  if (!e.concepto.trim()) {
    return { ok: false, error: "Escribe el concepto del servicio." };
  }
  if (!Number.isFinite(e.monto) || e.monto <= 0) {
    return { ok: false, error: "Ingresa un monto mayor que 0." };
  }
  if (!Number.isFinite(e.tasaBcv) || e.tasaBcv <= 0) {
    return { ok: false, error: "Ingresa la tasa BCV (Bs por USD) del día." };
  }
  if (e.moneda !== "USD" && e.moneda !== "VES") {
    return { ok: false, error: "Moneda no válida." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.fecha)) {
    return { ok: false, error: "Fecha no válida." };
  }

  const parametros = await leerFiscalVe();
  // La factura al cliente lleva TU identificación fiscal (persona natural con
  // RIF): sin emisor configurado el documento saldría inválido ante el SENIAT.
  if (!parametros.nombre.trim() || !validarRif(parametros.rif)) {
    return {
      ok: false,
      error:
        "Configura primero tu nombre y RIF de emisor en «⚙️ Datos del emisor y parámetros».",
    };
  }
  const calculo = calcularFacturaVe({
    monto: e.monto,
    moneda: e.moneda,
    tasaBcv: e.tasaBcv,
    ivaPct: parametros.iva_pct,
    aplicaIgtf: e.aplicaIgtf,
    igtfPct: parametros.igtf_pct,
  });

  const supabase = await crearClienteServidor();
  const { data: ultima, error: errorNumero } = await supabase
    .from("facturas_ve")
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errorNumero) {
    if (esTablaAusente(errorNumero)) return { ok: false, error: SIN_TABLA };
    return { ok: false, error: "No se pudo leer el correlativo de facturas." };
  }

  const numero = (ultima?.numero ?? 0) + 1;
  const numeroControl =
    e.numeroControl.trim() || `00-${String(numero).padStart(6, "0")}`;

  const { data, error } = await supabase
    .from("facturas_ve")
    .insert({
      numero,
      numero_control: numeroControl,
      fecha: e.fecha,
      cliente_nombre: e.clienteNombre.trim(),
      cliente_rif: e.clienteRif.trim() ? formatearRif(e.clienteRif) : null,
      cliente_domicilio: e.clienteDomicilio.trim() || null,
      concepto: e.concepto.trim(),
      moneda: e.moneda,
      monto: e.monto,
      tasa_bcv: e.tasaBcv,
      base_bs: calculo.baseBs,
      iva_pct: parametros.iva_pct,
      iva_bs: calculo.ivaBs,
      igtf_pct: e.aplicaIgtf ? parametros.igtf_pct : 0,
      igtf_bs: calculo.igtfBs,
      total_bs: calculo.totalBs,
      total_usd: calculo.totalUsd,
    })
    .select("id")
    .single();

  if (error) {
    // 23505: otro insert simultáneo tomó el correlativo — reintentar.
    if (error.code === "23505") {
      return { ok: false, error: "Correlativo ocupado; vuelve a intentar." };
    }
    return { ok: false, error: "No se pudo emitir la factura." };
  }

  revalidatePath("/factura");
  revalidatePath("/fiscal");
  return { ok: true, error: null, facturaId: data.id };
}

/** Conmuta pendiente ⇄ pagada en una factura VE. */
export async function cambiarEstadoFacturaVe(
  facturaId: string,
  estado: EstadoFactura,
): Promise<ResultadoAccionVe> {
  if (estado !== "pendiente" && estado !== "pagada") {
    return { ok: false, error: "Estado no válido." };
  }
  if (!supabaseConfigurado()) {
    return { ok: false, error: "Supabase no está configurado." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("facturas_ve")
    .update({ estado })
    .eq("id", facturaId);

  if (error) {
    if (esTablaAusente(error)) return { ok: false, error: SIN_TABLA };
    return { ok: false, error: "No se pudo actualizar la factura." };
  }

  revalidatePath("/factura");
  revalidatePath("/fiscal");
  return { ok: true, error: null };
}

export interface EntradaParametrosVe {
  nombre: string;
  rif: string;
  domicilio: string;
  utBs: number;
  tasaBcv: number;
  cargasFamiliares: number;
}

/** Guarda los datos del emisor y parámetros VE en `config.FISCAL_VE`. */
export async function guardarParametrosFiscalVe(
  e: EntradaParametrosVe,
): Promise<ResultadoAccionVe> {
  if (!supabaseConfigurado()) {
    return { ok: false, error: "Supabase no está configurado." };
  }
  if (e.rif.trim() && !validarRif(e.rif)) {
    return { ok: false, error: "RIF inválido (formato V-12345678-9)." };
  }
  if (!Number.isFinite(e.utBs) || e.utBs <= 0) {
    return { ok: false, error: "El valor de la UT (Bs) debe ser mayor que 0." };
  }
  if (!Number.isFinite(e.tasaBcv) || e.tasaBcv < 0) {
    return { ok: false, error: "La tasa BCV no es válida." };
  }
  if (!Number.isFinite(e.cargasFamiliares) || e.cargasFamiliares < 0) {
    return { ok: false, error: "Cargas familiares no válidas." };
  }

  const previos = await leerFiscalVe();
  const valor: ParametrosFiscalVe = {
    ...previos,
    nombre: e.nombre.trim(),
    rif: e.rif.trim() ? formatearRif(e.rif) : "",
    domicilio: e.domicilio.trim(),
    ut_bs: e.utBs,
    tasa_bcv: e.tasaBcv,
    cargas_familiares: Math.floor(e.cargasFamiliares),
  };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("config").upsert({
    clave: "FISCAL_VE",
    valor,
    descripcion:
      "Régimen fiscal Venezuela (persona natural con RIF): emisor, UT, tasa BCV, alícuotas.",
  });

  if (error) {
    return { ok: false, error: "No se pudo guardar la configuración." };
  }

  revalidatePath("/factura");
  revalidatePath("/fiscal");
  return { ok: true, error: null };
}

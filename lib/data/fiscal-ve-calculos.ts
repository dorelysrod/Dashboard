/**
 * Motor fiscal Venezuela — funciones PURAS (sin Supabase, sin red).
 * Persona natural residente con RIF: cálculo de factura (base en Bs, IVA
 * discriminado, IGTF sobre pagos en divisas, equivalente USD a tasa BCV) y
 * estimación de la declaración definitiva de ISLR (Tarifa N.º 1, en UT).
 * Orientación — no asesoría; el operador confirma con su contador y el SENIAT.
 */

export interface ParametrosFiscalVe {
  nombre: string;
  rif: string;
  domicilio: string;
  /** Valor de la Unidad Tributaria en Bs (ajustable: lo publica el SENIAT). */
  ut_bs: number;
  /** Tasa BCV Bs/USD usada por defecto al emitir (editable por factura). */
  tasa_bcv: number;
  iva_pct: number;
  igtf_pct: number;
  cargas_familiares: number;
}

export const FISCAL_VE_DEFAULT: ParametrosFiscalVe = {
  nombre: "",
  rif: "",
  domicilio: "",
  ut_bs: 9,
  tasa_bcv: 0,
  iva_pct: 0.16,
  igtf_pct: 0.03,
  cargas_familiares: 0,
};

/** Bs con 2 decimales (formato es-VE). */
export const fBs = new Intl.NumberFormat("es-VE", {
  style: "currency",
  currency: "VES",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** USD con 2 decimales, para el contravalor de la factura. */
export const fUsd = new Intl.NumberFormat("es-VE", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const r2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * RIF: letra (V/E persona natural; J/P/G otros) + 8 dígitos + dígito verificador.
 * Se valida el FORMATO (el dígito verificador lo asigna el SENIAT al inscribir;
 * no se recalcula aquí para no rechazar RIF válidos por variantes del algoritmo).
 */
export function validarRif(rif: string): boolean {
  return /^[VEJPG]-?\d{8}-?\d$/i.test(rif.trim());
}

/** Normaliza a la forma canónica `V-12345678-9`. */
export function formatearRif(rif: string): string {
  const limpio = rif.trim().toUpperCase().replace(/-/g, "");
  if (!/^[VEJPG]\d{9}$/.test(limpio)) return rif.trim().toUpperCase();
  return `${limpio[0]}-${limpio.slice(1, 9)}-${limpio[9]}`;
}

export type MonedaFacturaVe = "USD" | "VES";

export interface EntradaFacturaVe {
  monto: number;
  moneda: MonedaFacturaVe;
  tasaBcv: number;
  ivaPct: number;
  /** IGTF 3%: aplica cuando el pago se recibe en divisas. */
  aplicaIgtf: boolean;
  igtfPct: number;
}

export interface CalculoFacturaVe {
  baseBs: number;
  ivaBs: number;
  igtfBs: number;
  totalBs: number;
  totalUsd: number;
}

/** Cálculo de una factura VE: base en Bs, IVA discriminado, IGTF sobre lo pagado en divisas. */
export function calcularFacturaVe(e: EntradaFacturaVe): CalculoFacturaVe {
  const baseBs = r2(e.moneda === "USD" ? e.monto * e.tasaBcv : e.monto);
  const ivaBs = r2(baseBs * e.ivaPct);
  const igtfBs = e.aplicaIgtf ? r2((baseBs + ivaBs) * e.igtfPct) : 0;
  const totalBs = r2(baseBs + ivaBs + igtfBs);
  const totalUsd = e.tasaBcv > 0 ? r2(totalBs / e.tasaBcv) : 0;
  return { baseBs, ivaBs, igtfBs, totalBs, totalUsd };
}

/** Tarifa N.º 1 ISLR (persona natural residente), tramos en UT. */
export const TARIFA_ISLR_UT: ReadonlyArray<{
  hastaUt: number;
  pct: number;
  sustraendoUt: number;
}> = [
  { hastaUt: 1000, pct: 0.06, sustraendoUt: 0 },
  { hastaUt: 1500, pct: 0.09, sustraendoUt: 30 },
  { hastaUt: 2000, pct: 0.12, sustraendoUt: 75 },
  { hastaUt: 2500, pct: 0.16, sustraendoUt: 155 },
  { hastaUt: 3000, pct: 0.2, sustraendoUt: 255 },
  { hastaUt: 4000, pct: 0.24, sustraendoUt: 375 },
  { hastaUt: 6000, pct: 0.29, sustraendoUt: 575 },
  { hastaUt: Infinity, pct: 0.34, sustraendoUt: 875 },
];

/** Desgravamen único (alternativa a los detallados), en UT. */
export const DESGRAVAMEN_UNICO_UT = 774;
/** Rebaja personal + por carga familiar, en UT. */
export const REBAJA_PERSONAL_UT = 10;
export const REBAJA_CARGA_UT = 10;

export interface DeclaracionIslrVe {
  ingresosBs: number;
  ingresosUt: number;
  desgravamenUt: number;
  baseImponibleUt: number;
  tramoPct: number;
  sustraendoUt: number;
  impuestoUt: number;
  rebajasUt: number;
  impuestoNetoUt: number;
  impuestoNetoBs: number;
  /** Obligación de declarar: >1.000 UT netas o >1.500 UT de ingreso bruto. */
  obligadoDeclarar: boolean;
}

/**
 * Declaración definitiva de ISLR estimada (persona natural residente, forma
 * DPN-99025): ingresos anuales en Bs → UT, desgravamen único, Tarifa N.º 1 y
 * rebajas personales. Se presenta antes del 31 de marzo del año siguiente.
 */
export function calcularIslrVe(
  ingresosBs: number,
  utBs: number,
  cargasFamiliares: number,
): DeclaracionIslrVe {
  if (utBs <= 0) {
    return {
      ingresosBs: r2(ingresosBs),
      ingresosUt: 0,
      desgravamenUt: 0,
      baseImponibleUt: 0,
      tramoPct: 0,
      sustraendoUt: 0,
      impuestoUt: 0,
      rebajasUt: 0,
      impuestoNetoUt: 0,
      impuestoNetoBs: 0,
      obligadoDeclarar: false,
    };
  }

  const ingresosUt = ingresosBs / utBs;
  const desgravamenUt = Math.min(DESGRAVAMEN_UNICO_UT, ingresosUt);
  const baseImponibleUt = Math.max(0, ingresosUt - desgravamenUt);

  const tramo =
    TARIFA_ISLR_UT.find((t) => baseImponibleUt <= t.hastaUt) ??
    TARIFA_ISLR_UT[TARIFA_ISLR_UT.length - 1];
  const impuestoUt = Math.max(
    0,
    baseImponibleUt * tramo.pct - tramo.sustraendoUt,
  );

  const cargas = Math.max(0, Math.floor(cargasFamiliares));
  const rebajasUt = REBAJA_PERSONAL_UT + REBAJA_CARGA_UT * cargas;
  const impuestoNetoUt = Math.max(0, impuestoUt - rebajasUt);

  return {
    ingresosBs: r2(ingresosBs),
    ingresosUt: r2(ingresosUt),
    desgravamenUt: r2(desgravamenUt),
    baseImponibleUt: r2(baseImponibleUt),
    tramoPct: tramo.pct,
    sustraendoUt: tramo.sustraendoUt,
    impuestoUt: r2(impuestoUt),
    rebajasUt,
    impuestoNetoUt: r2(impuestoNetoUt),
    impuestoNetoBs: r2(impuestoNetoUt * utBs),
    obligadoDeclarar: baseImponibleUt > 1000 || ingresosUt > 1500,
  };
}

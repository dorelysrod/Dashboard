import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import {
  calcularIslrVe,
  type DeclaracionIslrVe,
  type ParametrosFiscalVe,
  FISCAL_VE_DEFAULT,
} from "@/lib/data/fiscal-ve-calculos";
import { esTablaAusente, leerFiscalVe } from "@/lib/data/facturas-ve";

/**
 * Motor de declaración Venezuela (persona natural con RIF). Calcula desde
 * `facturas_ve` + `config.FISCAL_VE`, SIEMPRE por periodo explícito:
 * - ISLR: declaración definitiva estimada del ejercicio en curso (anual,
 *   forma DPN-99025, se presenta antes del 31 de marzo del año siguiente).
 * - IVA: débito fiscal del mes en curso (declaración mensual, forma 30).
 * - IGTF: percibido en el mes por pagos en divisas.
 * Orientación — no asesoría; el operador confirma con su contador y el SENIAT.
 */
export interface ResumenFiscalVe {
  disponible: boolean;
  parametros: ParametrosFiscalVe;
  ejercicio: number;
  islr: DeclaracionIslrVe;
  ivaMesBs: number;
  igtfMesBs: number;
  ingresosMesBs: number;
  facturasAno: number;
}

interface FilaFiscalVe {
  fecha: string;
  base_bs: number | null;
  iva_bs: number | null;
  igtf_bs: number | null;
}

function vacio(
  parametros: ParametrosFiscalVe,
  ejercicio: number,
): ResumenFiscalVe {
  return {
    disponible: false,
    parametros,
    ejercicio,
    islr: calcularIslrVe(0, parametros.ut_bs, parametros.cargas_familiares),
    ivaMesBs: 0,
    igtfMesBs: 0,
    ingresosMesBs: 0,
    facturasAno: 0,
  };
}

export async function obtenerFiscalVe(): Promise<ResumenFiscalVe> {
  const ahora = new Date();
  const ejercicio = ahora.getFullYear();
  if (!supabaseConfigurado()) return vacio(FISCAL_VE_DEFAULT, ejercicio);

  const supabase = await crearClienteServidor();
  const [facturasRes, parametros] = await Promise.all([
    supabase
      .from("facturas_ve")
      .select("fecha, base_bs, iva_bs, igtf_bs")
      .gte("fecha", `${ejercicio}-01-01`)
      .lte("fecha", `${ejercicio}-12-31`),
    leerFiscalVe(),
  ]);

  if (facturasRes.error) {
    if (esTablaAusente(facturasRes.error)) return vacio(parametros, ejercicio);
    throw facturasRes.error;
  }

  const filas = (facturasRes.data ?? []) as FilaFiscalVe[];
  const mes = ahora.getMonth();
  const delMes = filas.filter(
    (f) => new Date(`${f.fecha}T00:00:00`).getMonth() === mes,
  );

  const ingresosAnoBs = filas.reduce((s, f) => s + (f.base_bs ?? 0), 0);

  return {
    disponible: true,
    parametros,
    ejercicio,
    islr: calcularIslrVe(
      ingresosAnoBs,
      parametros.ut_bs,
      parametros.cargas_familiares,
    ),
    ivaMesBs: delMes.reduce((s, f) => s + (f.iva_bs ?? 0), 0),
    igtfMesBs: delMes.reduce((s, f) => s + (f.igtf_bs ?? 0), 0),
    ingresosMesBs: delMes.reduce((s, f) => s + (f.base_bs ?? 0), 0),
    facturasAno: filas.length,
  };
}

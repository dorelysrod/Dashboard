import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";

/**
 * Motor Fiscal (§M5). Calcula desde Supabase los dos impuestos del régimen NL:
 * BTW (trimestral, se recupera el de gastos porque a México no se cobra) e
 * inkomstenbelasting (anual, sobre la ganancia). Parámetros desde `config.FISCAL`.
 * Orientación — no asesoría; el operador confirma con un boekhouder.
 */
export interface FacturaFiscal {
  id: string;
  etiqueta: string;
  mxn: number;
  tipoCambio: number;
  eur: number;
}

export interface ResumenFiscal {
  ingresosEur: number;
  gastosEur: number;
  gananciaEur: number;
  apartarEur: number;
  // BTW (trimestral)
  btwCobradoEur: number;
  btwRecuperableEur: number;
  btwResultadoEur: number; // >0 a pagar, <0 a recuperar
  // Inkomstenbelasting (anual)
  mkbVrijstellingEur: number;
  baseGravableEur: number;
  ibEur: number;
  zvwEur: number;
  apartarIbEur: number;
  // Urencriterium
  horasRegistradas: number;
  horasObjetivo: number;
  // Conversión por factura
  facturas: FacturaFiscal[];
}

interface ConfigFiscal {
  tipo_marginal: number;
  mkb_vrijstelling: number;
  zvw: number;
  apartar_pct: number;
  kor: boolean;
}

const FISCAL_DEFAULT: ConfigFiscal = {
  tipo_marginal: 0.37,
  mkb_vrijstelling: 0.127,
  zvw: 0.0485,
  apartar_pct: 0.4,
  kor: false,
};

const HORAS_OBJETIVO = 1225;

function vacio(): ResumenFiscal {
  return {
    ingresosEur: 0,
    gastosEur: 0,
    gananciaEur: 0,
    apartarEur: 0,
    btwCobradoEur: 0,
    btwRecuperableEur: 0,
    btwResultadoEur: 0,
    mkbVrijstellingEur: 0,
    baseGravableEur: 0,
    ibEur: 0,
    zvwEur: 0,
    apartarIbEur: 0,
    horasRegistradas: 0,
    horasObjetivo: HORAS_OBJETIVO,
    facturas: [],
  };
}

export async function obtenerFiscal(): Promise<ResumenFiscal> {
  if (!supabaseConfigurado()) return vacio();

  const supabase = await crearClienteServidor();
  const [facturasRes, gastosRes, horasRes, configRes] = await Promise.all([
    supabase.from("facturas").select("id, concepto, mxn, tipo_cambio, eur"),
    supabase.from("gastos").select("eur, btw_eur"),
    supabase.from("horas").select("real_h, estimado_h"),
    supabase.from("config").select("valor").eq("clave", "FISCAL").maybeSingle(),
  ]);

  // Un panel de orientación fiscal no debe degradar a "0" en silencio: si RLS,
  // red o una columna renombrada rompen CUALQUIERA de las queries, se lanza
  // (no solo la primera) para no presentar cifras incorrectas como reales.
  if (facturasRes.error) throw facturasRes.error;
  if (gastosRes.error) throw gastosRes.error;
  if (horasRes.error) throw horasRes.error;
  if (configRes.error) throw configRes.error;

  const cfg: ConfigFiscal = {
    ...FISCAL_DEFAULT,
    ...((configRes.data?.valor as Partial<ConfigFiscal> | null) ?? {}),
  };

  const facturas = facturasRes.data ?? [];
  const gastos = gastosRes.data ?? [];
  const horas = horasRes.data ?? [];

  const ingresosEur = facturas.reduce((s, f) => s + (f.eur ?? 0), 0);
  const gastosEur = gastos.reduce((s, g) => s + (g.eur ?? 0), 0);
  const gananciaEur = ingresosEur - gastosEur;
  const apartarEur = Math.round(gananciaEur * cfg.apartar_pct);

  // BTW: a México no se cobra (0); se recupera el de los gastos.
  const btwCobradoEur = 0;
  const btwRecuperableEur = gastos.reduce((s, g) => s + (g.btw_eur ?? 0), 0);
  const btwResultadoEur = btwCobradoEur - btwRecuperableEur;

  // Inkomstenbelasting sobre la ganancia.
  const mkbVrijstellingEur = Math.round(gananciaEur * cfg.mkb_vrijstelling);
  const baseGravableEur = gananciaEur - mkbVrijstellingEur;
  const ibEur = Math.round(baseGravableEur * cfg.tipo_marginal);
  const zvwEur = Math.round(baseGravableEur * cfg.zvw);
  const apartarIbEur = ibEur + zvwEur;

  const horasRegistradas = horas.reduce(
    (s, h) => s + (h.real_h ?? h.estimado_h ?? 0),
    0,
  );

  const facturasFiscal: FacturaFiscal[] = facturas.map((f) => ({
    id: f.id,
    etiqueta: f.concepto ?? "—",
    mxn: f.mxn ?? 0,
    tipoCambio: f.tipo_cambio ?? 0,
    eur: f.eur ?? 0,
  }));

  return {
    ingresosEur,
    gastosEur,
    gananciaEur,
    apartarEur,
    btwCobradoEur,
    btwRecuperableEur,
    btwResultadoEur,
    mkbVrijstellingEur,
    baseGravableEur,
    ibEur,
    zvwEur,
    apartarIbEur,
    horasRegistradas,
    horasObjetivo: HORAS_OBJETIVO,
    facturas: facturasFiscal,
  };
}

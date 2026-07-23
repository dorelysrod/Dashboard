import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import { obtenerTodasLasFilas, type ResultadoLote } from "./lotes";

interface FilaFacturaFiscal {
  id: string;
  concepto: string | null;
  mxn: number | null;
  tipo_cambio: number | null;
  eur: number | null;
  fecha: string | null;
  created_at: string;
}
interface FilaGasto {
  id: string;
  eur: number | null;
  btw_eur: number | null;
  fecha: string | null;
  created_at: string;
}
interface FilaHora {
  id: string;
  real_h: number | null;
  created_at: string;
}

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
  // Por LOTES con orden estable (T-008): cifras FISCALES sobre un select sin
  // .range() se truncan en silencio al max_rows de PostgREST (1000) — una
  // declaración calculada sobre un subconjunto es peor que un error. Un fallo
  // en cualquier lote se propaga (paridad con el check de configRes abajo).
  const [facturasData, gastosData, horasData, configRes] = await Promise.all([
    obtenerTodasLasFilas<FilaFacturaFiscal>((desde, hasta) =>
      supabase
        .from("facturas")
        .select("id, concepto, mxn, tipo_cambio, eur, fecha, created_at")
        .order("id", { ascending: true })
        .range(desde, hasta) as unknown as PromiseLike<ResultadoLote<FilaFacturaFiscal>>,
    ),
    obtenerTodasLasFilas<FilaGasto>((desde, hasta) =>
      supabase.from("gastos").select("id, eur, btw_eur, fecha, created_at").order("id", { ascending: true }).range(desde, hasta) as unknown as PromiseLike<
        ResultadoLote<FilaGasto>
      >,
    ),
    obtenerTodasLasFilas<FilaHora>((desde, hasta) =>
      supabase.from("horas").select("id, real_h, created_at").order("id", { ascending: true }).range(desde, hasta) as unknown as PromiseLike<
        ResultadoLote<FilaHora>
      >,
    ),
    supabase.from("config").select("valor").eq("clave", "FISCAL").maybeSingle(),
  ]);

  // Un panel de orientación fiscal no debe degradar a "0" en silencio: la
  // config también lanza en error para no presentar cifras incorrectas.
  if (configRes.error) throw configRes.error;

  const cfg: ConfigFiscal = {
    ...FISCAL_DEFAULT,
    ...((configRes.data?.valor as Partial<ConfigFiscal> | null) ?? {}),
  };

  // PERIODOS: el panel presenta cifras "del año" (IB, horas) y "del trimestre"
  // (BTW). Sin filtro, en cuanto los datos abarquen más de un periodo cada
  // declaración mostraría el acumulado histórico como si fuera del periodo.
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const trimestre = Math.floor(ahora.getMonth() / 3);
  const fechaDe = (fecha: string | null, createdAt: string): Date =>
    new Date(fecha ? `${fecha}T00:00:00` : createdAt);
  const delAnio = (d: Date): boolean => d.getFullYear() === anio;
  const delTrimestre = (d: Date): boolean =>
    delAnio(d) && Math.floor(d.getMonth() / 3) === trimestre;

  const facturas = facturasData.filter((f) =>
    delAnio(fechaDe(f.fecha, f.created_at)),
  );
  const gastosAnio = gastosData.filter((g) =>
    delAnio(fechaDe(g.fecha, g.created_at)),
  );
  const gastosTrimestre = gastosAnio.filter((g) =>
    delTrimestre(fechaDe(g.fecha, g.created_at)),
  );
  const horas = horasData.filter((h) => delAnio(new Date(h.created_at)));

  const ingresosEur = facturas.reduce((s, f) => s + (f.eur ?? 0), 0);
  const gastosEur = gastosAnio.reduce((s, g) => s + (g.eur ?? 0), 0);
  const gananciaEur = ingresosEur - gastosEur;
  const apartarEur = Math.round(gananciaEur * cfg.apartar_pct);

  // BTW (trimestral): a México no se cobra (0); se recupera el de los gastos
  // del trimestre en curso.
  const btwCobradoEur = 0;
  const btwRecuperableEur = gastosTrimestre.reduce(
    (s, g) => s + (g.btw_eur ?? 0),
    0,
  );
  const btwResultadoEur = btwCobradoEur - btwRecuperableEur;

  // Inkomstenbelasting sobre la ganancia.
  const mkbVrijstellingEur = Math.round(gananciaEur * cfg.mkb_vrijstelling);
  const baseGravableEur = gananciaEur - mkbVrijstellingEur;
  const ibEur = Math.round(baseGravableEur * cfg.tipo_marginal);
  const zvwEur = Math.round(baseGravableEur * cfg.zvw);
  const apartarIbEur = ibEur + zvwEur;

  // Urencriterium: solo horas REALES trabajadas (documentables ante la
  // Belastingdienst); las estimadas inflarían el contador con horas no hechas.
  const horasRegistradas = horas.reduce((s, h) => s + (h.real_h ?? 0), 0);

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

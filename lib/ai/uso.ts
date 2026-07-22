/**
 * Contabilidad ligera de tokens y COSTO estimado por generación (fase 2).
 * Portado del `stats.ts` del harness pero slim: para un negocio de una persona,
 * saber cuánto cuesta cada correo/cotización importa. Cada llamada se registra
 * etiquetada con su tarea y se emite a los logs del servidor (visibles en Vercel).
 *
 * En serverless el array se reinicia por invocación; sirve como observabilidad,
 * no como store persistente. Si en el futuro se quiere histórico, este es el
 * punto donde escribir a la tabla `config`/una tabla `uso_ia` de Supabase.
 */

// Precios USD por millón de tokens. Ajusta con ANTHROPIC_PRICES="modelo=in:out,...".
// Modelo desconocido → precio del más caro (nunca subestima el costo).
const PRECIOS_DEFAULT: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8": { input: 15, output: 75 },
  "claude-fable-5": { input: 15, output: 75 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};
const FALLBACK = PRECIOS_DEFAULT["claude-opus-4-8"];

function parseOverrides(): Record<string, { input: number; output: number }> {
  const out: Record<string, { input: number; output: number }> = {};
  for (const par of (process.env.ANTHROPIC_PRICES ?? "").split(",")) {
    const m = par.trim().match(/^(.+)=([\d.]+):([\d.]+)$/);
    if (m) out[m[1]] = { input: Number(m[2]), output: Number(m[3]) };
  }
  return out;
}

const PRECIOS = { ...PRECIOS_DEFAULT, ...parseOverrides() };

function precioDe(model: string): { input: number; output: number } {
  if (PRECIOS[model]) return PRECIOS[model];
  const prefijo = Object.keys(PRECIOS).find((k) => model.startsWith(k));
  return prefijo ? PRECIOS[prefijo] : FALLBACK;
}

export interface RegistroUso {
  ts: string;
  model: string;
  label?: string;
  input: number;
  output: number;
  cacheRead: number;
  costoUsd: number;
}

const registros: RegistroUso[] = [];

/** Costo de una llamada: input+output a precio, cache read ~10% del input. */
function costoUsd(
  model: string,
  u: { input: number; output: number; cacheRead: number },
): number {
  const p = precioDe(model);
  return (u.input * p.input + u.output * p.output + u.cacheRead * p.input * 0.1) / 1e6;
}

/** Registra el usage de una llamada al modelo (usage de la API de Anthropic). */
export function registrarUso(model: string, usage: any, label?: string): void {
  const u = {
    input: usage?.input_tokens ?? 0,
    output: usage?.output_tokens ?? 0,
    cacheRead: usage?.cache_read_input_tokens ?? 0,
  };
  const rec: RegistroUso = {
    ts: new Date().toISOString(),
    model,
    label,
    ...u,
    costoUsd: costoUsd(model, u),
  };
  registros.push(rec);
  console.info(
    `[ia:uso] ${label ?? "—"} ${model} in=${rec.input} out=${rec.output} ` +
      `≈ $${rec.costoUsd.toFixed(4)}`,
  );
}

/** Costo acumulado en esta invocación (útil para responder a la UI si se quiere). */
export function usoDeEstaInvocacion(): { costoUsd: number; llamadas: number } {
  return {
    costoUsd: registros.reduce((a, r) => a + r.costoUsd, 0),
    llamadas: registros.length,
  };
}

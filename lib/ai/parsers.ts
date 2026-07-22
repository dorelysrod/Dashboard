/**
 * Parseo de la respuesta cruda al formato etiquetado que piden los prompts
 * (lib/ai/prompts.ts). Dos orígenes, un solo punto de parseo:
 *  - Modo manual: el operador pega TEXTO etiquetado → parseo regex (abajo).
 *  - Modo anthropic (fase 2): el proveedor devuelve JSON de la salida
 *    estructurada → se toma directo (helpers `intentarJson`/`str`/`arr`).
 * Tolerante: si falta un campo, devuelve vacío en vez de fallar; el operador
 * revisa antes de guardar.
 */

/** Intenta leer la respuesta como JSON (salida estructurada). null si no lo es. */
function intentarJson(raw: string): Record<string, any> | null {
  const t = raw.trim();
  if (!t.startsWith("{")) return null;
  try {
    const o = JSON.parse(t);
    return o && typeof o === "object" ? o : null;
  } catch {
    return null;
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : v == null ? "" : String(v));
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

/** Valor en la misma línea: `ETIQUETA: valor`. */
function valorEtiqueta(raw: string, etiqueta: string): string {
  const m = raw.match(new RegExp(`^\\s*${etiqueta}\\s*:\\s*(.*)$`, "mi"));
  return m ? m[1].trim() : "";
}

/** Lista de viñetas bajo `ETIQUETA:` (líneas que empiezan con - * •). */
function listaBajo(raw: string, etiqueta: string): string[] {
  const lineas = raw.split("\n");
  const idx = lineas.findIndex((l) =>
    new RegExp(`^\\s*${etiqueta}\\s*:`, "i").test(l),
  );
  if (idx === -1) return [];
  const out: string[] = [];
  for (let i = idx + 1; i < lineas.length; i++) {
    const t = lineas[i].trim();
    if (/^[-*•]/.test(t)) out.push(t.replace(/^[-*•]\s*/, "").trim());
    else if (/^[A-ZÁÉÍÓÚÑ_]{3,}\s*:/.test(t)) break;
  }
  return out.filter(Boolean);
}

/** Bloque de texto bajo `ETIQUETA:` hasta la siguiente etiqueta en MAYÚSCULAS. */
function bloqueBajo(raw: string, etiqueta: string): string {
  const lineas = raw.split("\n");
  const idx = lineas.findIndex((l) =>
    new RegExp(`^\\s*${etiqueta}\\s*:`, "i").test(l),
  );
  if (idx === -1) return "";
  const primera = lineas[idx]
    .replace(new RegExp(`^\\s*${etiqueta}\\s*:`, "i"), "")
    .trim();
  const resto: string[] = [];
  for (let i = idx + 1; i < lineas.length; i++) {
    if (/^\s*[A-ZÁÉÍÓÚÑ_]{3,}\s*:/.test(lineas[i])) break;
    resto.push(lineas[i]);
  }
  return [primera, ...resto].join("\n").trim();
}

export interface InspeccionParseada {
  tecnologia: string;
  hosting: string;
  mejoras: string[];
  recomendacion: string;
}
export function parseInspeccion(raw: string): InspeccionParseada {
  const j = intentarJson(raw);
  if (j) {
    return {
      tecnologia: str(j.tecnologia),
      hosting: str(j.hosting),
      mejoras: arr(j.mejoras),
      recomendacion: str(j.recomendacion),
    };
  }
  return {
    tecnologia: valorEtiqueta(raw, "TECNOLOGIA"),
    hosting: valorEtiqueta(raw, "HOSTING"),
    mejoras: listaBajo(raw, "MEJORAS"),
    recomendacion: bloqueBajo(raw, "RECOMENDACION"),
  };
}

export interface CorreoParseado {
  asunto: string;
  cuerpo: string;
}
export function parseCorreo(raw: string): CorreoParseado {
  const j = intentarJson(raw);
  if (j) return { asunto: str(j.asunto), cuerpo: str(j.cuerpo) };
  return {
    asunto: valorEtiqueta(raw, "ASUNTO"),
    cuerpo: bloqueBajo(raw, "CUERPO"),
  };
}

export interface CotizacionParseada {
  modulos: string[];
  totalMxn: number | null;
}
export function parseCotizacion(raw: string): CotizacionParseada {
  const j = intentarJson(raw);
  if (j) {
    const t = typeof j.totalMxn === "number" ? j.totalMxn : Number(str(j.totalMxn).replace(/[^\d]/g, ""));
    return { modulos: arr(j.modulos), totalMxn: Number.isFinite(t) && t > 0 ? t : null };
  }
  const total = valorEtiqueta(raw, "TOTAL_MXN").replace(/[^\d]/g, "");
  return {
    modulos: listaBajo(raw, "MODULOS"),
    totalMxn: total ? Number(total) : null,
  };
}

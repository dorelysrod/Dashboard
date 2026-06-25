/**
 * Parseo de la respuesta cruda (pegada en modo manual) al formato etiquetado que
 * piden los prompts (lib/ai/prompts.ts). Tolerante: si falta un campo, devuelve
 * vacío en vez de fallar; el operador revisa antes de guardar.
 */

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
  const total = valorEtiqueta(raw, "TOTAL_MXN").replace(/[^\d]/g, "");
  return {
    modulos: listaBajo(raw, "MODULOS"),
    totalMxn: total ? Number(total) : null,
  };
}

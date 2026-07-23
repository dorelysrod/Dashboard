/**
 * Helpers PUROS de extracción de texto (sin dependencias server-only, para poder
 * testearlos). Los usa fetch-sitio.ts al reducir el HTML del sitio actual.
 */

const MAX_TEXTO = 6000;

/** Normaliza una URL: le antepone https:// si viene sin esquema. null si inválida. */
export function normalizarUrl(u: string): string | null {
  const t = u.trim();
  if (!t) return null;
  const conEsquema = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    return new URL(conEsquema).toString();
  } catch {
    return null;
  }
}

/** Quita scripts/estilos/tags del HTML y colapsa el espacio → texto legible. */
export function htmlATexto(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXTO);
}

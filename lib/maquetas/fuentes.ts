import "server-only";

/**
 * Embebe la fuente REAL de la marca como `@font-face` con el .woff2 en base64
 * (data-URI) → la maqueta usa la tipografía del cliente sin dejar de ser
 * self-contained (no CDN, no @import remoto). Toma el nombre (ej. "Playfair
 * Display") y trae la fuente de Google Fonts. No lanza: null si no se puede.
 */
const UA_MODERNO =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const GENERICAS = /^(system-ui|sans-serif|serif|monospace|inherit|-apple-system|blinkmacsystemfont|ui-sans-serif|ui-serif)$/i;
const MAX_BYTES = 220_000; // cap por si una fuente es enorme

async function fetchTexto(url: string): Promise<string | null> {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { "user-agent": UA_MODERNO } });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

async function fetchBase64(url: string): Promise<string | null> {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { "user-agent": UA_MODERNO } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > MAX_BYTES) return null;
    return buf.toString("base64");
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

export interface FuenteEmbebida {
  familia: string;
  css: string; // uno o varios @font-face con woff2 en base64
}

/** Devuelve el `@font-face` con la fuente embebida, o null si no está en Google Fonts. */
export async function fuenteEmbebida(nombre: string, pesos = [400, 600, 700]): Promise<FuenteEmbebida | null> {
  // Defensivo: descarta un eje de Google Fonts colado en el nombre
  // ("Playfair Display:wght@500;600;700" → "Playfair Display").
  const familia = nombre.split(":")[0].trim();
  if (!familia || GENERICAS.test(familia)) return null;

  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(familia)}:wght@${pesos.join(";")}&display=swap`;
  const css = await fetchTexto(url);
  if (!css || !/@font-face/.test(css)) return null;

  const bloques = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
  // Solo subsets LATINOS (latin + latin-ext) → cubre español (tildes, ñ) sin
  // inflar con cirílico/griego/vietnamita. latin = U+0000-00FF; latin-ext = U+0100…
  const latinos = bloques.filter((b) => /unicode-range:\s*U\+(0000-00FF|0100)/i.test(b));
  const usar = (latinos.length ? latinos : bloques).slice(0, 6);
  const salida: string[] = [];
  for (const b of usar) {
    const u = b.match(/url\((https:[^)]+\.woff2)\)/i);
    if (!u) continue;
    const data = await fetchBase64(u[1]);
    if (!data) continue;
    salida.push(b.replace(/url\(https:[^)]+\.woff2\)/i, `url(data:font/woff2;base64,${data}) format('woff2')`));
  }
  return salida.length ? { familia, css: salida.join("\n") } : null;
}

/** Inyecta el bloque @font-face al inicio del <style> (o del <head>) del HTML. */
export function inyectarFontFace(html: string, css: string | null): string {
  if (!css) return html;
  const style = html.match(/<style[^>]*>/i);
  if (style) return html.replace(style[0], `${style[0]}\n${css}\n`);
  return html.replace(/<\/head>/i, `<style>${css}</style></head>`);
}

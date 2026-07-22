import "server-only";
import { scrapearOg, type MarcaScrapeada } from "./marca";
import { normalizarUrl } from "./texto";

/**
 * SCRAPER de marca: fetchea una URL (web, Instagram, Facebook, Google Business,
 * directorio) con User-Agent de navegador y extrae su marca por Open Graph
 * (logo/foto de perfil, eslogan/bio, título) + colores.
 *
 * Honesto sobre límites: algunas redes (Instagram/Facebook) sirven muro de login
 * o bloquean bots, y entonces NO exponen og:image → devuelve lo que haya y null
 * el resto. No lanza: ante fallo devuelve marca vacía.
 */
const TIMEOUT_MS = 9000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const vacio: MarcaScrapeada = { logoUrl: null, titulo: null, eslogan: null, colores: [] };

export async function scrapearMarca(url: string): Promise<MarcaScrapeada> {
  const normal = normalizarUrl(url);
  if (!normal) return vacio;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(normal, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": UA,
        // Pedir HTML "de compartir" ayuda a que algunos sitios sirvan las OG tags.
        accept: "text/html,application/xhtml+xml",
        "accept-language": "es-MX,es;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) return vacio;
    if (!(res.headers.get("content-type") ?? "").includes("html")) return vacio;
    return scrapearOg(await res.text(), normal);
  } catch {
    return vacio;
  } finally {
    clearTimeout(t);
  }
}

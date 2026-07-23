import "server-only";
import { normalizarUrl, htmlATexto } from "./texto";
import { extraerMarca, type Marca } from "./marca";

/**
 * Descarga el sitio actual del negocio y extrae lo que el rediseño necesita:
 * TEXTO plano + MARCA (colores, tipografía, logo). Si la empresa ya tiene
 * identidad, se rediseña DESDE ella. Server-side (nunca desde el cliente).
 * Tolerante: ante timeout/error/HTML gigante, devuelve null → "sin sitio".
 */

const TIMEOUT_MS = 8000;
const LOGO_MAX_BYTES = 120_000;

export interface SitioFetch {
  url: string;
  texto: string;
  marca: Marca;
  /** Logo real ya incrustable (data-URI), o null si no se pudo traer. */
  logoDataUri: string | null;
}

async function fetchConTimeout(url: string): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; AiLandingPro/1.0; +panel)" },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Trae el logo y lo devuelve como data-URI (o null). Cap de tamaño para no inflar. */
export async function fetchLogoDataUri(url: string): Promise<string | null> {
  const res = await fetchConTimeout(url);
  if (!res || !res.ok) return null;
  const tipo = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!/^image\/(png|jpeg|jpg|svg\+xml|webp|gif)$/.test(tipo)) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0 || buf.length > LOGO_MAX_BYTES) return null;
  return `data:${tipo};base64,${buf.toString("base64")}`;
}

/** Fetchea la URL y devuelve texto + marca (+ logo data-URI), o null si no sirve. */
export async function fetchSitio(url: string): Promise<SitioFetch | null> {
  const normal = normalizarUrl(url);
  if (!normal) return null;

  const res = await fetchConTimeout(normal);
  if (!res || !res.ok) return null;
  if (!(res.headers.get("content-type") ?? "").includes("html")) return null;

  const html = await res.text();
  const texto = htmlATexto(html);
  if (texto.length <= 40) return null;

  const marca = extraerMarca(html, normal);
  const logoDataUri = marca.logoUrl ? await fetchLogoDataUri(marca.logoUrl) : null;
  return { url: normal, texto, marca, logoDataUri };
}

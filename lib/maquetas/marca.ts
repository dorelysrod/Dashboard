/**
 * Extracción de MARCA del sitio existente (puro, testeable): colores, tipografía
 * y URL del logo. Si el negocio YA tiene identidad, el rediseño debe partir de
 * ella (no inventar otra). El logo se incrusta después como data-URI (fetch-sitio)
 * para no romper el self-contained.
 */

export interface Marca {
  colores: string[];
  fuentes: string[];
  logoUrl: string | null;
}

/** ¿El hex es acromático (gris) o un extremo (casi negro/blanco)? → no es color de marca. */
function esNeutro(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 18) return true; // gris
  if (max < 24 || min > 232) return true; // casi negro / casi blanco
  return false;
}

const expandir3 = (h: string) => `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;

/** Colores de marca probables: los hex cromáticos más frecuentes del HTML/CSS. */
export function extraerColores(html: string, max = 4): string[] {
  const crudo = html.match(/#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b/g) ?? [];
  const theme = html.match(/name=["']theme-color["'][^>]*content=["'](#[0-9a-fA-F]{3,6})/i);
  const todos = [...crudo];
  if (theme) todos.unshift(theme[1], theme[1], theme[1]); // pondera el theme-color

  const freq = new Map<string, number>();
  for (let h of todos) {
    h = h.toLowerCase();
    if (h.length === 4) h = expandir3(h);
    if (h.length !== 7 || esNeutro(h)) continue;
    freq.set(h, (freq.get(h) ?? 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map((e) => e[0]);
}

/** Nombres de tipografías declaradas (font-family / Google Fonts). */
export function extraerFuentes(html: string, max = 3): string[] {
  const ff = [...html.matchAll(/font-family:\s*([^;}]+)/gi)].map((m) => m[1]);
  // Google Fonts: `?family=Playfair+Display:wght@500;600;700&family=Montserrat`
  // (css2, un family por `&`) o `?family=Playfair+Display|Montserrat` (v1, `|`).
  // Hay que quitar el eje `:wght@…`/`:ital,wght@…` o el nombre queda inservible
  // para embeber (fuenteEmbebida armaría una URL inválida). Se toma la URL entera
  // primero y luego TODOS sus `family=` (un <link> puede traer varias familias).
  const gfUrls = html.match(/fonts\.googleapis\.com\/css2?\?[^"'\s>]+/gi) ?? [];
  const gf = gfUrls.flatMap((u) =>
    [...u.matchAll(/family=([^&]+)/gi)]
      .flatMap((m) => decodeURIComponent(m[1]).replace(/\+/g, " ").split("|"))
      .map((s) => s.split(":")[0].trim()),
  );
  const genericas = new Set(["inherit", "sans-serif", "serif", "monospace", "system-ui", "-apple-system"]);
  const nombres = [...gf, ...ff]
    .map((s) => s.split(",")[0].replace(/['"]/g, "").split(":")[0].trim())
    .filter((s) => s && !genericas.has(s.toLowerCase()));
  return [...new Set(nombres)].slice(0, max);
}

/** URL del logo probable: <img ~logo>, luego og:image, luego apple-touch-icon/icon. */
export function extraerLogoUrl(html: string, baseUrl: string): string | null {
  const abs = (u: string): string | null => {
    try { return new URL(u, baseUrl).toString(); } catch { return null; }
  };
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (/logo/i.test(tag)) {
      const s = tag.match(/src=["']([^"']+)["']/i);
      if (s) return abs(s[1]);
    }
  }
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (og) return abs(og[1]);
  const icon = html.match(/<link[^>]+rel=["'][^"']*(?:apple-touch-icon|icon)[^"']*["'][^>]*>/i);
  if (icon) {
    const s = icon[0].match(/href=["']([^"']+)["']/i);
    if (s) return abs(s[1]);
  }
  return null;
}

/**
 * Extrae contacto DETERMINISTA del HTML de un sitio: email (mailto: o texto) y
 * teléfono (tel: o patrón MX). No depende del modelo → fiable donde haya web.
 */
export function extraerContacto(html: string): { email: string | null; telefono: string | null } {
  const mailto = html.match(/mailto:([^"'?>\s]+@[^"'?>\s]+)/i);
  const emailTxt = html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  const email = (mailto?.[1] || emailTxt?.[0] || null)?.toLowerCase() ?? null;
  const tel = html.match(/tel:\+?([\d\s().-]{7,})/i);
  const telTxt = html.match(/(?:\+?52[\s-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/);
  const telefono = (tel?.[1] || telTxt?.[0] || null)?.replace(/\s+/g, " ").trim() ?? null;
  return { email, telefono };
}

/** Lee una meta de Open Graph / name (tolerante al orden de los atributos). */
export function metaOg(html: string, prop: string): string | null {
  const p = prop.replace(/[:]/g, "\\:");
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']*)["']`, "i"));
  if (a) return a[1];
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${p}["']`, "i"));
  return b ? b[1] : null;
}

export interface MarcaScrapeada {
  logoUrl: string | null;
  titulo: string | null;
  eslogan: string | null;
  colores: string[];
}

/**
 * Extrae marca de CUALQUIER página (web, Instagram, Facebook, directorio) por
 * Open Graph: og:image = logo/foto de perfil, og:description = bio/eslogan,
 * og:title = nombre. Cae a los heurísticos de logo/colores del HTML si no hay OG.
 */
export function scrapearOg(html: string, baseUrl: string): MarcaScrapeada {
  const abs = (u: string | null): string | null => {
    if (!u) return null;
    try { return new URL(u, baseUrl).toString(); } catch { return null; }
  };
  const ogImage = metaOg(html, "og:image");
  const desc = metaOg(html, "og:description") || metaOg(html, "description");
  return {
    logoUrl: abs(ogImage) ?? extraerLogoUrl(html, baseUrl),
    titulo: metaOg(html, "og:title"),
    eslogan: desc ? desc.trim().slice(0, 200) : null,
    colores: extraerColores(html),
  };
}

export function extraerMarca(html: string, baseUrl: string): Marca {
  return {
    colores: extraerColores(html),
    fuentes: extraerFuentes(html),
    logoUrl: extraerLogoUrl(html, baseUrl),
  };
}

/**
 * Inyecta el logo real (data-URI) en el marcador ⟦LOGO⟧ que dejó el modelo. Sin
 * logo, quita el marcador (queda el wordmark de texto del header). Post-proceso:
 * el data-URI nunca pasa por el modelo (más barato y no se corrompe).
 */
export function inyectarLogo(html: string, logoDataUri: string | null, negocio: string): string {
  const rep = logoDataUri
    ? `<img src="${logoDataUri}" alt="${negocio}" style="max-height:46px;width:auto;display:block"/>`
    : "";
  return html.replace(/⟦LOGO⟧/g, rep);
}

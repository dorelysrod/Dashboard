import "server-only";

/**
 * Fotos royalty-free para la maqueta (SOLO el mock). El modelo deja marcadores
 * ⟦FOTO:slug⟧ dentro de contenedores con un gradiente de respaldo; aquí se buscan
 * fotos libres (Pexels), se embeben como data-URI (la maqueta sigue self-contained
 * y bloqueable a capturas) y se sustituye el marcador por un <img>.
 *
 * Legalidad: Pexels es royalty-free y de uso comercial sin atribución. NO se usa
 * iStock (licenciado/con marca de agua = infracción). Para habilitar iStock/Getty
 * haría falta su API con credenciales y licencia del operador (otro proveedor).
 *
 * Sin PEXELS_API_KEY: se quitan los marcadores y queda el gradiente de respaldo
 * (comportamiento actual), sin romper nada.
 */

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const MAX_BYTES = 360_000; // cap por foto para no inflar la página
const MAX_FOTOS = 4;

const RE_MARCADOR = /⟦FOTO:([^⟧]+)⟧/g;

/**
 * Red de seguridad ÉTICA (independiente del prompt): jamás poner una foto de
 * stock donde se leería como resultado real de un paciente o su testimonio —
 * sería engañoso. El modelo a veces ignora la regla del prompt, así que se filtra
 * aquí también: estos slugs se quitan (queda el gradiente de respaldo).
 */
const SLUG_PROHIBIDO = /(before[\s-]*after|antes[\s-]*despu|testimonial|testimonio|patient|paciente|reseñ|review|resultado)/i;

/** Sesga la búsqueda al rubro para que la foto encaje (estética/clínica). */
const KEYWORD: Record<string, string> = {
  "medicina estética": "aesthetic clinic skincare",
  "estética": "beauty clinic skincare",
  "dermatología": "dermatology skincare clinic",
  "odontología": "dental clinic",
  "dental": "dental clinic",
  "spa": "spa wellness",
  "nutrición": "nutrition healthy",
  "fisioterapia": "physiotherapy clinic",
};

async function buscarPexels(query: string, key: string): Promise<string | null> {
  const u = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(u, { headers: { Authorization: key }, signal: ac.signal });
    if (!r.ok) return null;
    const j: any = await r.json();
    const p = j?.photos?.[0];
    return p?.src?.large ?? p?.src?.medium ?? p?.src?.original ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

async function embeber(url: string): Promise<string | null> {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA }, signal: ac.signal });
    if (!r.ok) return null;
    const tipo = (r.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(tipo)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > MAX_BYTES) return null;
    return `data:${tipo};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

export interface ResultadoFotos {
  html: string;
  encontradas: number;
  embebidas: number;
}

/**
 * Sustituye los marcadores ⟦FOTO:slug⟧ por fotos royalty-free embebidas. Sin key
 * (o si una foto no se puede traer) quita el marcador y deja el gradiente de
 * respaldo. No lanza.
 */
export async function inyectarFotos(html: string, opts: { rubro?: string | null } = {}): Promise<ResultadoFotos> {
  const marcadores = [...html.matchAll(RE_MARCADOR)];
  if (!marcadores.length) return { html, encontradas: 0, embebidas: 0 };

  const key = process.env.PEXELS_API_KEY;
  if (!key) {
    // Sin proveedor: quita marcadores → queda el gradiente de respaldo.
    return { html: html.replace(RE_MARCADOR, ""), encontradas: marcadores.length, embebidas: 0 };
  }

  const suffix = opts.rubro ? KEYWORD[opts.rubro.toLowerCase()] ?? opts.rubro : "";
  const cache = new Map<string, string | null>();
  let out = html;
  let embebidas = 0;
  let usados = 0;

  for (const m of marcadores) {
    const marcador = m[0];
    if (!out.includes(marcador)) continue; // ya sustituido (mismo texto repetido)

    // Guardarraíl ético: nunca una foto de stock como "antes/después" ni testimonio.
    if (SLUG_PROHIBIDO.test(m[1]) || usados >= MAX_FOTOS) {
      out = out.replace(marcador, "");
      continue;
    }

    const slug = m[1].trim().replace(/[-_]+/g, " ");
    const query = `${slug} ${suffix}`.trim();
    let data = cache.get(query);
    if (data === undefined) {
      const imgUrl = await buscarPexels(query, key);
      data = imgUrl ? await embeber(imgUrl) : null;
      cache.set(query, data);
    }

    if (data) {
      const alt = slug.replace(/"/g, "");
      out = out.replace(
        marcador,
        `<img src="${data}" alt="${alt}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block"/>`,
      );
      embebidas++;
      usados++;
    } else {
      out = out.replace(marcador, ""); // deja el gradiente de respaldo
    }
  }

  return { html: out, encontradas: marcadores.length, embebidas };
}

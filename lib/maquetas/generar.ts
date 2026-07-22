import "server-only";
import { generarIA, modoIAActivo } from "@/lib/ai";
import type { CtxMaqueta } from "@/lib/ai/tipos";
import { fetchSitio } from "./fetch-sitio";
import { inyectarLogo } from "./marca";
import { fuenteEmbebida, inyectarFontFace, type FuenteEmbebida } from "./fuentes";
import { guardarMaqueta } from "./store";
import { nuevoToken } from "@/lib/ids";
import { randomBytes } from "node:crypto";
import { obtenerLead } from "@/lib/data/leads";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";

/**
 * Orquesta la generación de una maqueta para un lead, pasando por el HARNESS IA
 * (generarIA → provider → Claude), igual que inspección/correo:
 *   1. descubrir/confirmar el sitio actual (sitio_web, o WebSearch si falta);
 *   2. fetchear+extraer su texto si existe;
 *   3. generar la landing (rediseño si hay sitio, nueva si no);
 *   4. persistir con un token de capacidad + expiración.
 *
 * Es fase 2: requiere el proveedor automático (AI_PROVIDER=anthropic) o AI_MOCK=1.
 * En modo manual devuelve un error accionable en vez de un prompt para pegar
 * (pegar un HTML completo a mano no tiene sentido).
 */

const TTL_DIAS = Number(process.env.MAQUETA_TTL_DIAS ?? 14);
const esMock = () => process.env.AI_MOCK === "1";

export type ResultadoMaqueta =
  | { ok: true; token: string; numero: number | null; codigo: string; ruta: string; origen: "nueva" | "redisenio" }
  | { ok: false; error: string };

/**
 * Override de MARCA del operador (control de diseño): lo que el operador ve
 * (marca detectada) y puede corregir antes de generar. Cada campo pisa lo
 * detectado; lo que venga vacío/undefined mantiene lo automático.
 */
export interface MarcaOverride {
  colores?: string[];
  tipografiaFamilia?: string | null;
  eslogan?: string | null;
}

/** Vista serializable de la marca detectada, para pintarla y editarla en el panel. */
export interface MarcaDetectada {
  colores: string[];
  /** Fuente principal detectada (la que se embebería). Solo webs con fuente detectable. */
  tipografiaFamilia: string | null;
  fuentes: string[];
  eslogan: string | null;
  tieneLogo: boolean;
  /** Data-URI del logo real, para previsualizarlo en el panel. */
  logoDataUri: string | null;
  origen: "nueva" | "redisenio";
  sitioWeb: string | null;
}

export type ResultadoDeteccion =
  | { ok: true; marca: MarcaDetectada }
  | { ok: false; error: string };

/** Código de acceso corto y legible (sin caracteres ambiguos) para el portal. */
function nuevoCodigo(): string {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (const b of randomBytes(6)) s += abc[b % abc.length];
  return s;
}

/** Marca ya cacheada en el dossier (OSINT) — se reutiliza sin llamar a la API. */
interface DossierMarca {
  colores?: string[];
  eslogan?: string | null;
  logoUrl?: string | null;
}

interface Negocio {
  negocio: string;
  ciudad: string | null;
  rubro: string | null;
  sitioWeb: string | null;
  mejoras: string[];
  email: string | null;
  dossier: DossierMarca | null;
}

/** Reúne el contexto de negocio del lead (seed o Supabase). */
async function contextoNegocio(leadId: string): Promise<Negocio | null> {
  const lead = await obtenerLead(leadId);
  if (!lead) return null;

  const partes = lead.meta.split("·").map((s) => s.trim());
  let ciudad: string | null = partes[0] || null;
  let rubro: string | null = partes[1] || null;
  let sitioWeb: string | null = null;
  let email: string | null = null;
  let dossier: DossierMarca | null = null;

  if (supabaseConfigurado()) {
    const supabase = await crearClienteServidor();
    const { data } = await supabase
      .from("leads")
      .select("sitio_web, ciudad, rubro, dossier")
      .eq("id", leadId)
      .maybeSingle();
    if (data) {
      sitioWeb = data.sitio_web ?? null;
      ciudad = data.ciudad ?? ciudad;
      rubro = data.rubro ?? rubro;
      const d = data.dossier as ({ email?: string | null } & DossierMarca) | null;
      email = d?.email ?? null;
      dossier = d
        ? { colores: d.colores ?? [], eslogan: d.eslogan ?? null, logoUrl: d.logoUrl ?? null }
        : null;
    }
  }

  const mejoras = lead.mejoras?.trim() ? [lead.mejoras.trim()] : [];
  return { negocio: lead.nombre, ciudad, rubro, sitioWeb, mejoras, email, dossier };
}

/** Resultado de reunir la marca (sin embeber fuente todavía; eso depende del override). */
interface MarcaReunida {
  url: string | null;
  sitio: Awaited<ReturnType<typeof fetchSitio>>;
  origen: "nueva" | "redisenio";
  marcaCtx: CtxMaqueta["marca"];
  logoDataUri: string | null;
  /** Fuentes detectadas en el sitio (candidatas a embeber). */
  fuentesMarca: string[];
}

/**
 * Reúne la MARCA del lead priorizando lo BARATO y ya guardado:
 *   1. sitio conocido → fetch HTTP (colores/fuentes/logo reales, sin gastar API);
 *   2. si no hay sitio → dossier OSINT en la BD (colores/eslogan/logo cacheados);
 *   3. solo si `permitirDescubrir` y no hay nada → WebSearch (única llamada cara).
 * La detección para el panel llama con `permitirDescubrir=false` → coste CERO.
 */
async function reunirMarca(negocio: Negocio, permitirDescubrir: boolean): Promise<MarcaReunida> {
  const auto = modoIAActivo() === "anthropic" && !esMock();

  // 1) URL del sitio: la conocida, o descubierta por WebSearch (solo si se permite).
  let url = negocio.sitioWeb;
  if (!url && permitirDescubrir && auto) {
    const { descubrirWeb } = await import("@/lib/ai/cliente-sdk");
    url = await descubrirWeb(negocio.negocio, negocio.ciudad);
  }

  const sitio = url && !esMock() ? await fetchSitio(url) : null;
  const origen: "nueva" | "redisenio" = sitio ? "redisenio" : "nueva";

  let marcaCtx: CtxMaqueta["marca"];
  let logoDataUri: string | null = sitio?.logoDataUri ?? null;
  let fuentesMarca: string[] = [];

  if (sitio) {
    marcaCtx = { colores: sitio.marca.colores, fuentes: sitio.marca.fuentes, tieneLogo: Boolean(sitio.logoDataUri) };
    fuentesMarca = sitio.marca.fuentes;
  } else {
    // Sin sitio: la marca del dossier OSINT (ya en BD) — sin llamar a la API.
    let colores = negocio.dossier?.colores ?? [];
    let eslogan = negocio.dossier?.eslogan ?? null;
    let logoUrl = negocio.dossier?.logoUrl ?? null;

    // Solo si el dossier no trae nada Y se permite: descúbrelo por web (llamada cara).
    if (!colores.length && !eslogan && !logoUrl && permitirDescubrir && auto) {
      const { marcaDesdeWeb } = await import("@/lib/ai/cliente-sdk");
      const mw = await marcaDesdeWeb(negocio.negocio, negocio.ciudad);
      colores = mw.colores;
      eslogan = mw.eslogan;
      logoUrl = mw.logoUrl;
    }
    if (logoUrl && !logoDataUri) {
      const { fetchLogoDataUri } = await import("./fetch-sitio");
      logoDataUri = await fetchLogoDataUri(logoUrl);
    }
    if (colores.length || eslogan || logoDataUri) {
      marcaCtx = { colores, eslogan, tieneLogo: Boolean(logoDataUri) };
    }
  }

  return { url, sitio, origen, marcaCtx, logoDataUri, fuentesMarca };
}

/**
 * Detecta la marca del lead SIN gastar API (cache-first) para que el operador la
 * vea y corrija en el panel antes de generar. No dispara WebSearch: si no hay
 * sitio ni dossier, devuelve vacío y el operador la completa a mano.
 */
export async function detectarMarcaParaLead(leadId: string): Promise<ResultadoDeteccion> {
  const negocio = await contextoNegocio(leadId);
  if (!negocio) return { ok: false, error: "No se encontró el lead." };

  const { marcaCtx, fuentesMarca, logoDataUri, url, origen } = await reunirMarca(negocio, false);
  return {
    ok: true,
    marca: {
      colores: marcaCtx?.colores ?? [],
      tipografiaFamilia: fuentesMarca[0] ?? null,
      fuentes: fuentesMarca,
      eslogan: marcaCtx?.eslogan ?? null,
      tieneLogo: Boolean(marcaCtx?.tieneLogo),
      logoDataUri,
      origen,
      sitioWeb: url ?? null,
    },
  };
}

export async function generarMaquetaParaLead(
  leadId: string,
  override?: MarcaOverride,
): Promise<ResultadoMaqueta> {
  if (modoIAActivo() !== "anthropic" && !esMock()) {
    return {
      ok: false,
      error:
        "La generación de maquetas necesita el proveedor automático. Activa AI_PROVIDER=anthropic " +
        "(o AI_MOCK=1 para una demo sin gastar).",
    };
  }

  const negocio = await contextoNegocio(leadId);
  if (!negocio) return { ok: false, error: "No se encontró el lead." };

  // 1-2) Reunir la MARCA (sitio → dossier → WebSearch, en ese orden de coste).
  const { url, sitio, origen, marcaCtx, logoDataUri, fuentesMarca } = await reunirMarca(negocio, true);

  // Aplica el OVERRIDE del operador (control de diseño): cada campo pisa lo
  // detectado; lo vacío mantiene lo automático. Garantiza objeto marca si hubo edición.
  const hayOverride = Boolean(
    override && (override.colores?.length || override.tipografiaFamilia?.trim() || override.eslogan?.trim()),
  );
  let marca: CtxMaqueta["marca"] = marcaCtx;
  if (hayOverride) {
    marca = {
      colores: override!.colores?.length ? override!.colores : marcaCtx?.colores,
      fuentes: marcaCtx?.fuentes,
      tieneLogo: marcaCtx?.tieneLogo,
      eslogan: override!.eslogan?.trim() ? override!.eslogan!.trim() : marcaCtx?.eslogan,
    };
  }

  // Tipografía REAL del cliente: embeber su fuente (@font-face base64) → SU letra,
  // no una aproximación. Fuente = la que fijó el operador, si no la detectada.
  const familiaFuente = override?.tipografiaFamilia?.trim() || fuentesMarca[0] || null;
  let fuente: FuenteEmbebida | null = null;
  if (familiaFuente && !esMock()) {
    fuente = await fuenteEmbebida(familiaFuente);
    if (fuente) marca = { ...(marca ?? {}), tipografiaFamilia: fuente.familia };
  }

  // ¿El proveedor real (suscripción) está activo? Entonces corre el EQUIPO DE
  // DISEÑO (pipeline multi-agente) y permite fotos royalty-free. En mock/manual,
  // un solo tiro por el harness (sin gastar / para pegar a mano).
  const conSuscripcion = modoIAActivo() === "anthropic" && !esMock();

  // 3) Generar la landing. Si hay marca, se construye DESDE ella.
  const contexto: CtxMaqueta = {
    negocio: negocio.negocio,
    ciudad: negocio.ciudad,
    rubro: negocio.rubro,
    sitioWeb: sitio?.url ?? url ?? null,
    sitioTexto: sitio?.texto ?? null,
    mejoras: negocio.mejoras,
    marca,
    permitirFotos: conSuscripcion,
  };

  let titulo = negocio.negocio;
  let html: string;
  try {
    if (conSuscripcion) {
      // Equipo de diseño: ux-dev → frontend-dev → revisor + a11y → refinar.
      const { pipelineMaqueta } = await import("@/lib/ai/pipeline-maqueta");
      const r = await pipelineMaqueta(contexto);
      if (!r.html || !/<html[\s>]/i.test(r.html)) {
        return { ok: false, error: "El equipo de diseño no devolvió un HTML válido." };
      }
      titulo = r.titulo?.trim() || titulo;
      html = r.html;
      console.log(`[maqueta] ${negocio.negocio}: fundamento=${r.fundamento} · hallazgos=${r.hallazgos}`);
    } else {
      const r = await generarIA({ tarea: "maqueta", contexto });
      if (r.manual) {
        return { ok: false, error: "El proveedor está en modo manual; activa AI_PROVIDER=anthropic." };
      }
      const parsed = JSON.parse(r.respuesta.texto) as { titulo?: string; html?: string };
      if (!parsed.html || !/<html[\s>]/i.test(parsed.html)) {
        return { ok: false, error: "El modelo no devolvió un HTML válido." };
      }
      titulo = parsed.titulo?.trim() || titulo;
      html = parsed.html;
    }
  } catch (e: any) {
    return { ok: false, error: `Falló la generación: ${e?.message ?? e}` };
  }

  // Inyecta el logo real de la marca en el marcador ⟦LOGO⟧ (o lo quita si no hay).
  html = inyectarLogo(html, logoDataUri, negocio.negocio);
  // Inyecta la fuente REAL del cliente (@font-face base64) → tipografía fiel.
  html = inyectarFontFace(html, fuente?.css ?? null);
  // Sustituye ⟦FOTO:slug⟧ por fotos royalty-free embebidas (solo con suscripción).
  if (conSuscripcion) {
    const { inyectarFotos } = await import("./fotos");
    const rf = await inyectarFotos(html, { rubro: negocio.rubro });
    html = rf.html;
    if (rf.encontradas) console.log(`[maqueta] fotos: ${rf.embebidas}/${rf.encontradas} embebidas`);
  }

  // 4) Persistir con token + candado del portal (email del prospecto + código).
  const token = nuevoToken();
  const codigo = nuevoCodigo();
  const expiraAt = new Date(Date.now() + TTL_DIAS * 86_400_000).toISOString();
  let numero: number | null = null;
  try {
    const res = await guardarMaqueta({
      token,
      leadId,
      titulo,
      html,
      origen,
      urlFuente: sitio?.url ?? url ?? null,
      expiraAt,
      email: negocio.email,
      codigo,
    });
    numero = res.numero;
  } catch (e: any) {
    return { ok: false, error: `No se pudo guardar la maqueta: ${e?.message ?? e}` };
  }

  // Ruta del portal: /p/[numero] (candado email+código). Si por alguna razón no
  // hay número (fallback), cae al acceso por token.
  const ruta = numero != null ? `/p/${numero}` : `/maqueta/${token}`;
  return { ok: true, token, numero, codigo, ruta, origen };
}

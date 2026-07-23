import "server-only";
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { registrarUso } from "./uso";

/**
 * Conexión real a Claude vía el Agent SDK, backend de SUSCRIPCIÓN (misma auth
 * que Claude Code). Portado del harness `fable` (`structuredCallViaSdk` +
 * política de reintentos de `client.ts`), reducido a lo que necesita el panel:
 * UNA generación estructurada de un solo turno, sin tools de filesystem.
 *
 * Requisitos en ejecución: el runtime de Claude Code presente y una suscripción
 * autenticada en el entorno (local: lo da tu sesión de Claude Code). En Vercel
 * serverless estándar no aplica — ahí se usaría AI_PROVIDER=manual o AI_MOCK=1.
 */

const NS = "landing";
const MODELO_DEFAULT = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

/**
 * Tools built-in de Claude Code a DESACTIVAR: en una generación one-shot no
 * queremos que toque filesystem, web ni shell. Solo se permite nuestra tool.
 */
const BUILTINS_OFF = [
  "Bash", "BashOutput", "KillShell", "Read", "Write", "Edit", "MultiEdit",
  "NotebookEdit", "Glob", "Grep", "LS", "WebFetch", "WebSearch", "TodoWrite",
  "Task", "ExitPlanMode", "ListMcpResources", "ReadMcpResource",
];

// ── Reintentos (portado de client.ts del harness) ───────────────────────────
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504, 529]);
const RETRYABLE_NET = new Set(["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EPIPE", "ENOTFOUND", "EAI_AGAIN"]);
const REINTENTOS = Number(process.env.ANTHROPIC_RETRIES ?? 3);

function esReintentable(e: any): boolean {
  const status: number | undefined = e?.status;
  if (typeof status === "number") return RETRYABLE_STATUS.has(status);
  if (e?.code && RETRYABLE_NET.has(e.code)) return true;
  if (/Connection|Timeout/i.test(String(e?.name ?? ""))) return true;
  return /fetch failed|network|socket hang up|timed? ?out/i.test(String(e?.message ?? ""));
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function conReintentos<T>(fn: () => Promise<T>): Promise<T> {
  let ultimo: unknown;
  for (let intento = 0; intento <= REINTENTOS; intento++) {
    try {
      return await fn();
    } catch (e: any) {
      ultimo = e;
      if (!esReintentable(e) || intento === REINTENTOS) throw e;
      const backoff = Math.min(1000 * 2 ** intento, 30_000) + Math.floor(Math.random() * 500);
      console.warn(`[ia] ${e?.status ?? "conexión"}: reintento ${intento + 1}/${REINTENTOS} en ${Math.round(backoff / 1000)}s`);
      await dormir(backoff);
    }
  }
  throw ultimo;
}

// ── Preflight de auth (fail fast, claro) ─────────────────────────────────────
/**
 * El backend Agent SDK usa la auth AMBIENTE de Claude Code. Un token de
 * SUSCRIPCIÓN suelto (sk-ant-oat…) en el entorno rompería el proceso hijo con
 * 401 (hecho verificado en el harness): lo quitamos — es inservible aquí.
 */
export function prepararEntorno(): void {
  if (process.env.ANTHROPIC_AUTH_TOKEN?.startsWith("sk-ant-oat")) {
    delete process.env.ANTHROPIC_AUTH_TOKEN;
  }
}

export interface OpcionesEstructurada {
  system: string;
  userMessage: string;
  toolName: string;
  toolDescription: string;
  shape: z.ZodRawShape;
  model?: string;
  costLabel?: string;
  /** Permite el built-in WebSearch (para descubrir el sitio del negocio). */
  permitirWebSearch?: boolean;
  /** Turnos máximos antes de forzar la tool. Sube para prompts largos (revisar HTML grande). */
  maxTurns?: number;
}

/**
 * Genera una respuesta ESTRUCTURADA: fuerza al modelo a invocar `toolName` con
 * el `shape` dado y devuelve su input ya validado. Sin parsear texto libre.
 */
export async function generarEstructurado<T = any>(opts: OpcionesEstructurada): Promise<T> {
  prepararEntorno();
  const model = opts.model ?? MODELO_DEFAULT;

  return conReintentos(async () => {
    const ac = new AbortController();
    let capturado: T | null = null;

    const laTool = tool(opts.toolName, opts.toolDescription, opts.shape, async (input: any) => {
      capturado = input as T;
      ac.abort();
      return { content: [{ type: "text" as const, text: "recibido" }] };
    });
    const server = createSdkMcpServer({ name: NS, version: "1.0.0", tools: [laTool] });

    // WebSearch: read-only, sin riesgo de escritura como Bash/Write. Se permite
    // solo cuando el caller lo pide (descubrir el sitio del negocio).
    const allowedTools = [`mcp__${NS}__${opts.toolName}`];
    let disallowedTools = BUILTINS_OFF;
    if (opts.permitirWebSearch) {
      allowedTools.push("WebSearch");
      disallowedTools = BUILTINS_OFF.filter((t) => t !== "WebSearch");
    }

    try {
      const q = query({
        prompt: opts.userMessage,
        options: {
          model,
          // WebSearch consume un turno por búsqueda: dar margen para 2-3 búsquedas
          // + lecturas antes de que el modelo invoque la tool de reporte.
          maxTurns: opts.maxTurns ?? (opts.permitirWebSearch ? 16 : 3),
          permissionMode: "bypassPermissions",
          mcpServers: { [NS]: server },
          allowedTools,
          disallowedTools,
          systemPrompt: opts.system,
          settingSources: [],
          abortController: ac,
        } as any,
      });
      for await (const msg of q as any) {
        if (msg.type === "assistant" && msg.message?.usage) {
          registrarUso(model, msg.message.usage, opts.costLabel);
        }
        if (capturado) break;
      }
    } catch (e: any) {
      if (!capturado && e?.name !== "AbortError") throw e;
    }

    if (!capturado) {
      throw new Error("El modelo no devolvió una respuesta estructurada (no invocó la tool).");
    }
    return capturado;
  });
}

export interface ProspectoWeb {
  nombre: string;
  ciudad: string | null;
  rating: number | null;
  resenas: number | null;
  nota: string;
}

/**
 * Descubre prospectos REALES para la vista Buscar, usando WebSearch: negocios
 * del rubro/ciudad que sean buenos candidatos para rehacer su web (sin sitio o
 * con sitio débil). No lanza: ante cualquier fallo devuelve lista vacía. Honesto:
 * el rating/reseñas es aproximado (lo infiere de los resultados, no es la API de
 * Places), por eso `nota` explica la señal.
 */
export async function buscarProspectosWeb(
  ciudad: string,
  rubro: string,
  limite = 8,
  excluir: string[] = [],
): Promise<ProspectoWeb[]> {
  // Excluir los que YA tenemos: el modelo no los busca ni reporta → no gastamos
  // tokens/tiempo en negocios que ya están en el pipeline. Se cap­ea la lista
  // para no inflar el prompt.
  const yaTengo = excluir.slice(0, 200);
  const bloqueExcluir = yaTengo.length
    ? `\n\nYA TENGO estos negocios (NO los busques, NO los reportes, encuentra OTROS distintos):\n${yaTengo.map((n) => `- ${n}`).join("\n")}`
    : "";
  try {
    const res = await generarEstructurado<{ prospectos: ProspectoWeb[] }>({
      system:
        "Encuentras negocios locales REALES como prospectos comerciales, usando WebSearch. " +
        "Prioriza los que NO tienen web o la tienen débil/anticuada (mejor oportunidad para " +
        "rehacerla). NO inventes: si no encuentras negocios reales, devuelve lista vacía. " +
        "Cada prospecto: nombre real, ciudad, rating y nº de reseñas si los ves (si no, null), " +
        "y una nota corta con la señal de oportunidad. Haz COMO MÁXIMO 3 búsquedas y luego " +
        "invoca la tool con lo que tengas — no sigas buscando indefinidamente.",
      userMessage: `Encuentra hasta ${limite} negocios reales de "${rubro}" en ${ciudad} (México) que sean buenos prospectos para rehacer su web.${bloqueExcluir}`,
      toolName: "reportar_prospectos",
      toolDescription: "Reporta la lista de prospectos reales encontrados.",
      shape: {
        prospectos: z.array(
          z.object({
            nombre: z.string(),
            ciudad: z.string().nullable(),
            rating: z.number().nullable(),
            resenas: z.number().int().nullable(),
            nota: z.string(),
          }),
        ),
      },
      costLabel: "buscar-prospectos",
      permitirWebSearch: true,
    });
    return (res?.prospectos ?? []).slice(0, limite);
  } catch (e: any) {
    // Relanzar: un [] silencioso se pintaría como "no hay prospectos" (falso).
    // El catch de BuscarPanel muestra el error real de búsqueda al operador.
    console.warn(`[ia] buscarProspectosWeb falló: ${e?.message ?? e}`);
    throw new Error("La búsqueda IA falló; inténtalo de nuevo.");
  }
}

export interface MensajesCanal {
  whatsapp: string;
  dm: string;
  asunto: string;
  correo: string;
}

/**
 * Genera los 3 mensajes de outreach por canal (WhatsApp, Instagram DM, correo),
 * atados al DOLOR del dossier (Problema→Agitar→Solución). No lanza.
 */
export async function generarMensajes(negocio: string, ciudad: string | null, dossier: any): Promise<MensajesCanal | null> {
  try {
    return await generarEstructurado<MensajesCanal>({
      system:
        "Escribes outreach de VENTA POR DOLOR (Problema→Agitar→Solución) para una agencia que rehace webs " +
        "de clínicas de estética en México. Español MX, cercano, sin spam ni promesas exageradas. Adapta al " +
        "canal: whatsapp = 2-4 líneas, directo, un dolor + CTA suave (pregunta fácil); dm = como whatsapp pero " +
        "más casual (Instagram); correo = asunto (máx 8 palabras que toque el dolor) + cuerpo ~130 palabras con " +
        "los 4 momentos. Usa el DOLOR provisto. Entrega los 3 mensajes ÚNICAMENTE invocando la tool provista.",
      userMessage:
        `Negocio: ${negocio}${ciudad ? ` (${ciudad})` : ""}. Servicios: ${(dossier?.servicios ?? []).join(", ") || "—"}. ` +
        `DOLOR: ${(dossier?.dolor ?? []).join(" | ") || dossier?.ganchoDolor || "web débil/inexistente"}. ` +
        `Gancho: ${dossier?.ganchoDolor ?? "—"}. Escribe los 3 mensajes.`,
      toolName: "reportar_mensajes",
      toolDescription: "Reporta los 3 mensajes de outreach por canal.",
      shape: { whatsapp: z.string(), dm: z.string(), asunto: z.string(), correo: z.string() },
      costLabel: "mensajes-canal",
    });
  } catch (e: any) {
    console.warn(`[ia] generarMensajes falló: ${e?.message ?? e}`);
    return null;
  }
}

export interface GuionVenta {
  apertura: string;
  puntosVenta: string[];
  objeciones: { objecion: string; respuesta: string }[];
}

/**
 * Genera un GUION de venta para la reunión, atado al DOLOR del dossier: apertura
 * que engancha con su dolor, puntos que cierran (solución = remedio a su dolor),
 * y objeciones probables de una clínica de estética con su respuesta. No lanza.
 */
export async function generarGuion(negocio: string, dossier: any): Promise<GuionVenta | null> {
  try {
    return await generarEstructurado<GuionVenta>({
      system:
        "Eres un cerrador de ventas de una agencia que rehace webs de clínicas de estética en México. " +
        "Prepara al vendedor para la reunión: venta POR DOLOR. La apertura engancha con el dolor real del " +
        "prospecto; los puntosVenta atan nuestra solución (rehacer su web/presencia) a ESE dolor (no features " +
        "genéricas); las objeciones son las reales de una clínica (precio, 'ya tengo Instagram', 'no tengo " +
        "tiempo', 'me lo hace mi sobrino') con una respuesta corta y efectiva. Español MX, concreto, sin " +
        "promesas exageradas. Entrega el guion ÚNICAMENTE invocando la tool provista.",
      userMessage:
        `Prepara el guion de venta para: ${negocio}.\n` +
        `Dolor: ${(dossier?.dolor ?? []).join(" | ") || dossier?.ganchoDolor || "web débil/inexistente"}.\n` +
        `Servicios: ${(dossier?.servicios ?? []).join(", ") || "—"}. Categoría: ${dossier?.categoria ?? "—"}. ` +
        `Rating: ${dossier?.rating ?? "—"} (${dossier?.resenas ?? "—"} reseñas).`,
      toolName: "reportar_guion",
      toolDescription: "Reporta el guion de venta para la reunión.",
      shape: {
        apertura: z.string(),
        puntosVenta: z.array(z.string()),
        objeciones: z.array(z.object({ objecion: z.string(), respuesta: z.string() })),
      },
      costLabel: "guion-venta",
    });
  } catch (e: any) {
    console.warn(`[ia] generarGuion falló: ${e?.message ?? e}`);
    return null;
  }
}

export interface DossierProspecto {
  eslogan: string | null;
  categoria: string | null;
  servicios: string[];
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  sitioWeb: string | null;
  seguidoresIg: number | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  rating: number | null;
  resenas: number | null;
  brechaWeb: "sin_web" | "debil" | "decente" | "fuerte" | null;
  ownerOperated: boolean | null;
  cadena: boolean | null;
  premium: boolean | null;
  colores: string[];
  logoUrl: string | null;
  /** El DOLOR: qué está perdiendo HOY por su web/presencia (venta basada en dolor). */
  dolor: string[];
  /** El gancho más filoso: el dolor #1, en una frase que se sienta. */
  ganchoDolor: string | null;
  resumen: string;
}

/**
 * DOSSIER completo del prospecto (OSINT vía WebSearch): todo lo público —
 * eslogan, seguidores, categoría, servicios, contacto, rating, redes, señales de
 * calificación — Y el DOLOR: qué pierde hoy por su web/presencia, para venderle
 * la solución sobre su dolor. NO inventa: deja null/[] lo no confirmado.
 */
export async function dossierProspecto(negocio: string, ciudad?: string | null): Promise<DossierProspecto | null> {
  const vacio: DossierProspecto = {
    eslogan: null, categoria: null, servicios: [], instagram: null, facebook: null, tiktok: null,
    sitioWeb: null, seguidoresIg: null, telefono: null, email: null, direccion: null,
    rating: null, resenas: null, brechaWeb: null, ownerOperated: null, cadena: null, premium: null,
    colores: [], logoUrl: null, dolor: [], ganchoDolor: null, resumen: "sin datos",
  };
  try {
    const r = await generarEstructurado<DossierProspecto>({
      system:
        "Eres un analista de PROSPECTOS para una agencia que rehace webs de clínicas de estética. Con " +
        "WebSearch, reúne TODO lo público de un negocio local (Instagram, Facebook, TikTok, Google Business, " +
        "directorios): eslogan/bio, categoría, servicios, seguidores de IG, teléfono, email, dirección, rating " +
        "y reseñas de Google, URLs de redes y web, si tiene web propia y su calidad (brechaWeb), si es cadena " +
        "u owner-operated, si es premium, colores/logo si los distingues.\n" +
        "LO MÁS IMPORTANTE — el DOLOR: a partir de lo que encuentres, deduce qué está PERDIENDO HOY por su " +
        "web/presencia digital, en términos CONCRETOS y que se SIENTAN (no genéricos). Ejemplos del tipo de " +
        "dolor: 'sin web propia → cuando la buscan en Google no aparece y el paciente agenda con la " +
        "competencia'; 'sin agenda online → pierde las reservas de quien decide a medianoche'; 'sitio lento " +
        "en móvil → la mayoría se va antes de ver nada'; 'sin antes/después ni testimonios → en estética la " +
        "decisión es por confianza, y sin prueba visual el paciente duda'. `dolor` = 2-4 dolores específicos " +
        "de ESTE negocio; `ganchoDolor` = el dolor #1 en UNA frase que duela. Escribe un `resumen` de 1-2 " +
        "frases. NO inventes datos duros (deja null/[] lo no confirmado), pero SÍ infiere el dolor a partir de " +
        "su situación real. Máx 5 búsquedas y reporta.",
      userMessage: `Arma el dossier completo del prospecto: ${negocio}${ciudad ? ` en ${ciudad}` : ""} (México).`,
      toolName: "reportar_dossier",
      toolDescription: "Reporta el dossier completo del prospecto.",
      shape: {
        eslogan: z.string().nullable(),
        categoria: z.string().nullable(),
        servicios: z.array(z.string()),
        instagram: z.string().nullable(),
        facebook: z.string().nullable(),
        tiktok: z.string().nullable(),
        sitioWeb: z.string().nullable(),
        seguidoresIg: z.number().int().nullable(),
        telefono: z.string().nullable(),
        email: z.string().nullable(),
        direccion: z.string().nullable(),
        rating: z.number().nullable(),
        resenas: z.number().int().nullable(),
        brechaWeb: z.enum(["sin_web", "debil", "decente", "fuerte"]).nullable(),
        ownerOperated: z.boolean().nullable(),
        cadena: z.boolean().nullable(),
        premium: z.boolean().nullable(),
        colores: z.array(z.string()),
        logoUrl: z.string().nullable(),
        dolor: z.array(z.string()),
        ganchoDolor: z.string().nullable(),
        resumen: z.string(),
      },
      costLabel: "dossier-prospecto",
      permitirWebSearch: true,
    });
    return r ?? vacio;
  } catch (e: any) {
    // null = FALLÓ la llamada (≠ vacio, que es "no se encontró nada"): el
    // caller no debe persistir una calificación basada en un fallo.
    console.warn(`[ia] dossierProspecto falló: ${e?.message ?? e}`);
    return null;
  }
}

export interface MarcaWeb {
  /** URL DIRECTA a una imagen del logo (png/jpg/webp/svg), o null. */
  logoUrl: string | null;
  /** Colores de marca identificados (hex), si se ven en su perfil/imágenes. */
  colores: string[];
  /** Eslogan/tagline textual (de su web o bio de redes), o null. */
  eslogan: string | null;
  instagram: string | null;
  facebook: string | null;
}

/**
 * Reúne la MARCA de un negocio SIN web propia, desde toda su presencia (Instagram,
 * Facebook, Google Business, directorios) vía WebSearch. Es el "método" para no
 * perder logo/colores/eslogan cuando no hay sitio que scrapear. No inventa: deja
 * null lo que no confirme. No lanza: ante fallo devuelve marca vacía.
 */
export async function marcaDesdeWeb(negocio: string, ciudad?: string | null): Promise<MarcaWeb> {
  const vacio: MarcaWeb = { logoUrl: null, colores: [], eslogan: null, instagram: null, facebook: null };
  try {
    const r = await generarEstructurado<MarcaWeb>({
      system:
        "Investigas la IDENTIDAD DE MARCA de un negocio local con WebSearch, mirando su Instagram, " +
        "Facebook, Google Business y directorios. Devuelve: logoUrl = URL DIRECTA a una imagen del " +
        "logo o foto de perfil (que termine en .png/.jpg/.jpeg/.webp/.svg; si no la ves clara, null); " +
        "colores = 2-4 hex de su marca si los distingues de su perfil/imágenes; eslogan = su tagline o " +
        "frase de bio, TEXTUAL; instagram/facebook = URLs de perfil. NO inventes URLs, colores ni frases; " +
        "deja null/[] lo que no confirmes. Máximo 3 búsquedas y reporta.",
      userMessage: `Reúne la marca (logo, colores, eslogan, redes) de: ${negocio}${ciudad ? ` en ${ciudad}` : ""} (México).`,
      toolName: "reportar_marca",
      toolDescription: "Reporta la identidad de marca encontrada.",
      shape: {
        logoUrl: z.string().nullable(),
        colores: z.array(z.string()),
        eslogan: z.string().nullable(),
        instagram: z.string().nullable(),
        facebook: z.string().nullable(),
      },
      costLabel: "marca-web",
      permitirWebSearch: true,
    });
    return r ?? vacio;
  } catch (e: any) {
    console.warn(`[ia] marcaDesdeWeb falló: ${e?.message ?? e}`);
    return vacio;
  }
}

export interface SenalesEnriquecidas {
  brechaWeb: "sin_web" | "debil" | "decente" | "fuerte" | null;
  rating: number | null;
  resenas: number | null;
  sitioUrl: string | null;
  ownerOperated: boolean | null;
  cadena: boolean | null;
  premium: boolean | null;
  notas: string;
}

/**
 * ENRIQUECE un lead con las señales que lo CALIFICAN (WebSearch): estado de su
 * web, rating, reseñas, si es cadena/owner-operated y si es premium. Es el paso
 * que convierte un nombre crudo en un lead evaluable por `calificarLead`.
 * No lanza: ante fallo devuelve señales nulas (quedará "desconocido").
 */
export async function enriquecerLead(negocio: string, ciudad?: string | null): Promise<SenalesEnriquecidas> {
  const vacio: SenalesEnriquecidas = {
    brechaWeb: null, rating: null, resenas: null, sitioUrl: null,
    ownerOperated: null, cadena: null, premium: null, notas: "sin datos",
  };
  try {
    const r = await generarEstructurado<SenalesEnriquecidas>({
      system:
        "Evalúas un negocio local como PROSPECTO para rehacerle la web. Usa WebSearch. " +
        "Determina: si tiene web propia y su calidad (sin_web=solo redes/Linktree; debil=Wix/" +
        "plantilla lenta o no responsive; decente=funcional pero mejorable; fuerte=moderna y " +
        "profesional), su rating y nº de reseñas (Google), si es cadena grande o un consultorio " +
        "owner-operated, y si el posicionamiento es premium. NO inventes; deja null lo que no " +
        "confirmes. Máximo 3 búsquedas y reporta.",
      userMessage: `Evalúa como prospecto: ${negocio}${ciudad ? ` en ${ciudad}` : ""} (México).`,
      toolName: "reportar_senales",
      toolDescription: "Reporta las señales de calificación del prospecto.",
      shape: {
        brechaWeb: z.enum(["sin_web", "debil", "decente", "fuerte"]).nullable(),
        rating: z.number().nullable(),
        resenas: z.number().int().nullable(),
        sitioUrl: z.string().nullable(),
        ownerOperated: z.boolean().nullable(),
        cadena: z.boolean().nullable(),
        premium: z.boolean().nullable(),
        notas: z.string(),
      },
      costLabel: "enriquecer-lead",
      permitirWebSearch: true,
    });
    return r ?? vacio;
  } catch (e: any) {
    console.warn(`[ia] enriquecerLead falló: ${e?.message ?? e}`);
    return vacio;
  }
}

/**
 * Descubre si el negocio tiene web y su URL, usando WebSearch. Devuelve la URL
 * oficial más probable o null. No lanza: ante cualquier fallo devuelve null (el
 * caller trata "sin URL" como "crear desde cero").
 */
export async function descubrirWeb(negocio: string, ciudad?: string | null): Promise<string | null> {
  try {
    const res = await generarEstructurado<{ existe: boolean; url: string | null }>({
      system:
        "Buscas la web OFICIAL de un negocio local. Usa WebSearch. Devuelve el dominio propio " +
        "del negocio (no directorios como Facebook, Instagram, Yelp, Google Maps, DoctorAlia). " +
        "Si no hay sitio propio claro, existe=false y url=null. Haz COMO MÁXIMO 2 búsquedas y " +
        "luego invoca la tool con tu conclusión.",
      userMessage: `Busca la web oficial de: ${negocio}${ciudad ? ` en ${ciudad}` : ""}.`,
      toolName: "reportar_web",
      toolDescription: "Reporta si el negocio tiene web oficial y su URL.",
      shape: {
        existe: z.boolean(),
        url: z.string().nullable().describe("URL del sitio oficial, o null"),
      },
      costLabel: "descubrir-web",
      permitirWebSearch: true,
    });
    const url = res?.url?.trim();
    return res?.existe && url ? url : null;
  } catch (e: any) {
    console.warn(`[ia] descubrirWeb falló: ${e?.message ?? e}`);
    return null;
  }
}

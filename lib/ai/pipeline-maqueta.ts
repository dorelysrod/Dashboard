import "server-only";
import { z } from "zod";
import type { CtxMaqueta } from "./tipos";
import { construirPrompt } from "./prompts";
import { esquemaDeTarea } from "./esquemas";
import { generarEstructurado } from "./cliente-sdk";

/**
 * "Equipo de diseño" para la maqueta, sobre la SUSCRIPCIÓN (Agent SDK). Replica
 * los roles del harness de diseño en cadena determinista:
 *   ux-dev (fundamento) → frontend-dev (build) → revisor + a11y (paralelo) → refinar.
 * Cada rol falla con gracia: si el fundamento/revisión/refinado no salen, se
 * conserva el build. El post-proceso (logo, tipografía real, fotos) va aparte,
 * en lib/maquetas/generar.ts, igual que en el flujo de un solo tiro.
 */

// Modelos por rol: diseño exige calidad (Opus); la revisión es más barata (Sonnet).
const M_DISENO = process.env.ANTHROPIC_MODEL_DISENO || "claude-opus-4-8";
const M_REVISOR = process.env.ANTHROPIC_MODEL_REVISOR || "claude-sonnet-5";

const SYS_UXDEV =
  "Eres UX-DEV (diseño de producto) de Ai Landing Pro. Tu salida NO son opiniones " +
  "('bonito/feo' PROHIBIDAS) sino un FUNDAMENTO DE DISEÑO implementable y medible para una " +
  "landing de conversión. Entrega ÚNICAMENTE invocando la tool provista.";

const SYS_FRONTEND =
  "Eres FRONTEND-DEV de Ai Landing Pro. Implementas EXACTAMENTE el fundamento del ux-dev en un " +
  "documento HTML self-contained. Entrega ÚNICAMENTE invocando la tool provista.";

const SYS_REVISOR_DS =
  "Eres el REVISOR de design-system de Ai Landing Pro. Juzgas por reglas MEDIBLES, no por gustos. " +
  "NO expliques ni pienses en voz alta: invoca la tool directamente con los hallazgos.";

const SYS_A11Y =
  "Eres el AUDITOR DE ACCESIBILIDAD de Ai Landing Pro (WCAG 2.2 AA). NO expliques ni pienses en " +
  "voz alta: invoca la tool directamente con los hallazgos.";

export interface Hallazgo {
  severidad: "alta" | "media" | "baja";
  area: string;
  problema: string;
  arreglo: string;
}

const shapeHallazgos = {
  hallazgos: z
    .array(
      z.object({
        severidad: z.enum(["alta", "media", "baja"]),
        area: z.string(),
        problema: z.string(),
        arreglo: z.string(),
      }),
    )
    .describe("Hallazgos concretos y accionables (vacío si no hay)"),
};

/** 1) ux-dev: fundamento de diseño desde la marca/servicios reales. */
async function fundamentoDiseno(ctx: CtxMaqueta): Promise<string | null> {
  const marca = ctx.marca;
  const contexto = [
    `Negocio: ${ctx.negocio} — ${ctx.rubro ?? "—"}, ${ctx.ciudad ?? "—"}.`,
    marca?.colores?.length ? `Paleta REAL de marca (úsala como base, NO inventes): ${marca.colores.join(", ")}.` : "",
    marca?.tipografiaFamilia ? `Tipografía REAL: "${marca.tipografiaFamilia}" (ya se embebe).` : "",
    marca?.eslogan ? `Eslogan real (hero): "${marca.eslogan}".` : "",
    ctx.mejoras?.length ? `Dolores a atacar: ${ctx.mejoras.join(" · ")}.` : "",
    ctx.sitioTexto ? `Texto real de su sitio (tono/servicios):\n"""${ctx.sitioTexto.slice(0, 3000)}"""` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const r = await generarEstructurado<{ fundamento: string }>({
    system: SYS_UXDEV,
    model: M_DISENO,
    maxTurns: 4,
    toolName: "entregar_fundamento",
    toolDescription: "Entrega el fundamento de diseño implementable.",
    shape: { fundamento: z.string().describe("Fundamento de diseño implementable, en texto estructurado") },
    costLabel: "maqueta-fundamento",
    userMessage: `${contexto}

Entrega un FUNDAMENTO con:
1) TOKENS (para :root): color = 4-6 roles derivados de la paleta real con HEX concretos; neutros con leve sesgo al color de marca (no gris puro). Contraste AA: cuerpo ≥4.5:1, grande/UI ≥3:1 — indica pares texto/fondo. Tipografía = escala modular (h1..small en rem) con pesos e interlineado. Espaciado (--space-*), radios (--radius-*), UNA sombra sobria.
2) CONCEPTO DE LAYOUT (2 frases): jerarquía real (NO todo centrado); evita clichés de "IA".
3) MAPA DE SECCIONES (orden, objetivo, contenido concreto con servicios/precios reales, estados foco/hover): hero-tesis (eslogan + CTA), servicios con precio real, prueba social creíble, confianza, contacto con WhatsApp fijo + agenda.
Concreto y medible; se implementa tal cual.`,
  });
  return r?.fundamento?.trim() || null;
}

/** 2) frontend-dev: construye el HTML desde el fundamento (reusa el prompt de producción). */
async function construirHtml(ctx: CtxMaqueta): Promise<{ titulo: string; html: string }> {
  const esq = esquemaDeTarea("maqueta");
  const prompt = construirPrompt({ tarea: "maqueta", contexto: ctx });
  return generarEstructurado<{ titulo: string; html: string }>({
    system: SYS_FRONTEND,
    model: M_DISENO,
    maxTurns: 4,
    toolName: esq.toolName,
    toolDescription: esq.toolDescription,
    shape: esq.shape,
    costLabel: "maqueta-build",
    userMessage: prompt,
  });
}

/** 3) revisor de design-system + auditor a11y en paralelo → hallazgos combinados. */
async function revisar(html: string, marca: CtxMaqueta["marca"]): Promise<Hallazgo[]> {
  const marcaEsperada = marca?.colores?.length ? `Marca real esperada: ${marca.colores.join(", ")}. ` : "";
  const [ds, a11y] = await Promise.allSettled([
    generarEstructurado<{ hallazgos: Hallazgo[] }>({
      system: SYS_REVISOR_DS,
      model: M_REVISOR,
      maxTurns: 6,
      toolName: "entregar_hallazgos",
      toolDescription: "Reporta los hallazgos de design-system.",
      shape: shapeHallazgos,
      costLabel: "maqueta-revisor-ds",
      userMessage: `Revisa este HTML y lista hallazgos si: faltan tokens (magic values), la paleta no deriva de la marca real o parece plantilla por defecto, escala tipográfica inconsistente, componentes no reutilizados, hero/estructura genérica, o señales de "IA". Para cada uno: severidad, área, problema, ARREGLO concreto. ${marcaEsperada}\nHTML:\n"""${html}"""`,
    }),
    generarEstructurado<{ hallazgos: Hallazgo[] }>({
      system: SYS_A11Y,
      model: M_REVISOR,
      maxTurns: 6,
      toolName: "entregar_hallazgos",
      toolDescription: "Reporta las violaciones de accesibilidad.",
      shape: shapeHallazgos,
      costLabel: "maqueta-a11y",
      userMessage: `Audita este HTML y lista violaciones concretas: contraste texto/fondo <4.5:1 (o <3:1 en grande/UI) con los hex implicados, foco no visible, touch targets <44px, jerarquía de encabezados rota, alt/labels ausentes, movimiento sin prefers-reduced-motion. Para cada uno: severidad, área, problema, ARREGLO concreto.\nHTML:\n"""${html}"""`,
    }),
  ]);
  const de = (r: PromiseSettledResult<{ hallazgos: Hallazgo[] }>) =>
    r.status === "fulfilled" ? r.value?.hallazgos ?? [] : [];
  return [...de(ds), ...de(a11y)];
}

/** 4) frontend-dev: aplica los hallazgos → HTML final. */
async function refinar(html: string, hallazgos: Hallazgo[]): Promise<{ titulo: string; html: string } | null> {
  const esq = esquemaDeTarea("maqueta");
  const lista = hallazgos.map((h, i) => `${i + 1}. [${h.severidad}] ${h.area}: ${h.problema} → ${h.arreglo}`).join("\n");
  const r = await generarEstructurado<{ titulo: string; html: string }>({
    system: SYS_FRONTEND,
    model: M_DISENO,
    maxTurns: 6,
    toolName: esq.toolName,
    toolDescription: esq.toolDescription,
    shape: esq.shape,
    costLabel: "maqueta-refinar",
    userMessage: `Aplica TODOS estos hallazgos del revisor y del auditor de accesibilidad al HTML, manteniendo self-contained y las reglas duras (tokens en :root, sin recursos externos salvo los marcadores ⟦LOGO⟧/⟦FOTO⟧).\nHALLAZGOS:\n${lista}\n\nHTML actual:\n"""${html}"""\n\nEntrega { titulo, html } con el HTML corregido COMPLETO.`,
  });
  return r?.html ? r : null;
}

export interface ResultadoPipeline {
  titulo: string;
  html: string;
  fundamento: boolean;
  hallazgos: number;
}

/**
 * Corre el pipeline completo del equipo de diseño y devuelve el HTML final + meta
 * (para logging). El post-proceso de assets lo hace el caller.
 */
export async function pipelineMaqueta(ctx: CtxMaqueta): Promise<ResultadoPipeline> {
  const fundamento = await fundamentoDiseno(ctx).catch((e) => {
    console.warn(`[maqueta] fundamento falló: ${e?.message ?? e}`);
    return null;
  });

  const build = await construirHtml({ ...ctx, fundamento: fundamento ?? undefined });

  const hallazgos = await revisar(build.html, ctx.marca).catch((e) => {
    console.warn(`[maqueta] revisión falló: ${e?.message ?? e}`);
    return [] as Hallazgo[];
  });

  let final = build;
  if (hallazgos.length) {
    const ref = await refinar(build.html, hallazgos).catch((e) => {
      console.warn(`[maqueta] refinado falló: ${e?.message ?? e}`);
      return null;
    });
    if (ref) final = ref;
  }

  return { titulo: final.titulo, html: final.html, fundamento: Boolean(fundamento), hallazgos: hallazgos.length };
}

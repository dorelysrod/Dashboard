/**
 * "Equipo de diseño" para la maqueta de Centro Integral, replicando los roles del
 * fable-harness (ux-dev → frontend-dev → revisor + accessibility-auditor → refinar)
 * sobre la suscripción (Agent SDK), igual que la app. Post-procesa con las MISMAS
 * funciones de producción (fuenteEmbebida + inyectarFontFace + inyectarLogo) para
 * embeber la tipografía REAL (Playfair Display + Montserrat) y el logo. Helper local.
 */
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { esquemaDeTarea } from "./lib/ai/esquemas";
import { inyectarLogo } from "./lib/maquetas/marca";
import { fetchSitio } from "./lib/maquetas/fetch-sitio";
import { fuenteEmbebida, inyectarFontFace } from "./lib/maquetas/fuentes";
if (process.env.ANTHROPIC_AUTH_TOKEN?.startsWith("sk-ant-oat")) delete process.env.ANTHROPIC_AUTH_TOKEN;

const NS = "diseno";
const OPUS = "claude-opus-4-8";
const SONNET = "claude-sonnet-5";
const log = (s: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);

const b = JSON.parse(readFileSync("scratch-centro.json", "utf8"));

/** Un turno forzado a invocar UNA tool → salida estructurada (como el AnthropicProvider). */
async function estr<T = any>(o: {
  model: string; system: string; user: string; toolName: string; shape: z.ZodRawShape; maxTurns?: number;
}): Promise<T | null> {
  const ac = new AbortController();
  let cap: any = null;
  const t = tool(o.toolName, "Entrega el resultado.", o.shape, async (i: any) => {
    cap = i; ac.abort(); return { content: [{ type: "text" as const, text: "ok" }] };
  });
  const server = createSdkMcpServer({ name: NS, version: "1.0.0", tools: [t] });
  try {
    const q = query({ prompt: o.user, options: {
      model: o.model, maxTurns: o.maxTurns ?? 8, permissionMode: "bypassPermissions", mcpServers: { [NS]: server },
      allowedTools: [`mcp__${NS}__${o.toolName}`],
      disallowedTools: ["Bash", "Read", "Write", "Edit", "WebSearch", "WebFetch", "Glob", "Grep", "TodoWrite", "Task"],
      systemPrompt: o.system, settingSources: [], abortController: ac } as any });
    for await (const _ of q as any) { if (cap) break; }
  } catch (err: any) {
    // Robusto: un rol que falle (maxTurns, límite de sesión) no tumba el pipeline.
    if (!cap && err?.name !== "AbortError") { log(`  ⚠ ${o.toolName}: ${err?.message ?? err}`); return null; }
  }
  return cap;
}

/** Post-proceso REAL (idéntico a la app): inyecta logo + tipografía embebida y guarda. */
function finalizar(htmlStr: string, logo: string | null, fontCss: string | null, out: string): number {
  let html = inyectarLogo(htmlStr, logo, b.negocio);
  html = inyectarFontFace(html, fontCss);
  writeFileSync(out, html);
  return html.length;
}

const MARCA = `Negocio: ${b.negocio} — ${b.rubro}, ${b.ciudad}.
Paleta REAL de marca (cian/teal; ÚSALA como base, NO inventes otra): ${b.colores.join(", ")}.
Tipografía REAL: display "Playfair Display" (titulares) + cuerpo "Montserrat". Ya se embeberán vía @font-face; refiérete a ellas por nombre exacto.
Eslogan real (úsalo textual en el hero): "${b.eslogan}".
Logo: existe — coloca el marcador LITERAL ⟦LOGO⟧ en el header (no lo dibujes ni estilices).
Servicios y precios REALES (son su gancho, úsalos): VENUS LEGACY (radiofrecuencia) $6,000→$2,997; Limpieza facial profunda $800→$497; Modelado de glúteos $11,500→$7,497. WhatsApp: 33 3040 0400.
Dolores a atacar: ${b.mejoras.join(" · ")}.
Texto real de su sitio actual (tono/servicios): """${b.sitioTexto}"""`;

// ── 1) UX-DEV: fundamento de diseño (tokens + jerarquía + mapa de secciones) ──
log("ux-dev · fundamento de diseño…");
const fund = await estr<{ fundamento: string }>({
  model: OPUS, toolName: "entregar_fundamento",
  shape: { fundamento: z.string().describe("Fundamento de diseño implementable, en texto estructurado") },
  system:
    "Eres UX-DEV (diseño de producto) de Ai Landing Pro. Tu salida NO son opiniones ('bonito/feo' PROHIBIDAS) " +
    "sino un FUNDAMENTO DE DISEÑO implementable y medible para una landing de conversión de una clínica de " +
    "medicina estética (sector de confianza, ticket alto). Entrega SOLO invocando la tool.",
  user: `${MARCA}

Entrega un fundamento con:
1) TOKENS (para :root): color = 4-6 roles derivados de la paleta real (--brand, --brand-strong, --ink, --bg, --surface, --accent) con HEX concretos; neutros con leve sesgo al cian (no gris puro). Contraste AA: cuerpo ≥4.5:1, grande/UI ≥3:1 — indica pares texto/fondo y ratio aprox. Tipografía = escala modular (h1..small en rem) con Playfair Display (display) + Montserrat (cuerpo), pesos e interlineado. Espaciado (--space-*), radios (--radius-*), UNA sombra sobria.
2) CONCEPTO DE LAYOUT (2 frases): jerarquía real (NO todo centrado); limpieza clínica + lujo accesible; evita clichés de "IA".
3) MAPA DE SECCIONES (orden, objetivo, contenido concreto con servicios/precios reales, estados foco/hover): hero-tesis (eslogan + CTA), servicios con precio real, prueba social creíble, confianza médica (certificaciones), contacto con WhatsApp fijo + agenda.
Concreto y medible; se implementa tal cual.`,
});
if (!fund?.fundamento) { log("✗ ux-dev no entregó fundamento"); process.exit(1); }
log(`  fundamento: ${fund.fundamento.length} chars`);

// Recursos deterministas (logo + tipografía real embebida) — una sola vez, para
// el checkpoint y el final. Prueba el pipeline de fuentes ya corregido.
mkdirSync("salida/mocks", { recursive: true });
const OUT = "salida/mocks/centro-integral-equipo-diseno.html";
const sitio = await fetchSitio(b.sitioWeb);
const logo = sitio?.logoDataUri ?? null;
const playfair = await fuenteEmbebida("Playfair Display", [600, 700]);
const montserrat = await fuenteEmbebida("Montserrat", [400, 600, 700]);
const fontCss = [playfair?.css, montserrat?.css].filter(Boolean).join("\n") || null;
log(`  recursos: logo ${logo ? "OK" : "—"} · fuentes ${[playfair && "Playfair", montserrat && "Montserrat"].filter(Boolean).join("+") || "—"}`);

// ── 2) FRONTEND-DEV: construir el HTML desde el fundamento ────────────────────
const e = esquemaDeTarea("maqueta");
const REGLAS = `REQUISITOS DUROS:
- <!doctype html>…</html>, TODO el CSS inline en <style>. Define tokens en :root (color/space/text/radius/shadow) y ESTILIZA con tokens (nada de magic values sueltos).
- font-family: "Playfair Display" en titulares, "Montserrat" en cuerpo (se embeben por @font-face; solo referéncialas). NADA de Inter/Space Grotesk.
- Mobile-first. Foco VISIBLE (:focus-visible). Touch targets ≥44px. prefers-reduced-motion respetado.
- SIN recursos externos: nada de CDN, <script src>, @import, fuentes remotas ni <img> externo. Imágenes = gradientes/formas CSS o SVG inline elegante. ÚNICA excepción: el marcador ⟦LOGO⟧.
- SEO/growth: <title>, meta description, OG y JSON-LD schema.org (MedicalBusiness/LocalBusiness) con nombre, ciudad, teléfono.
- Conversión: hero-tesis (eslogan + CTA agenda/WhatsApp), servicios con PRECIOS REALES y descuento, prueba social creíble (sin cifras absurdas), confianza médica, CTA final. Botón WhatsApp FIJO. Copy en español de México, específico de ESTE negocio.
PROHIBIDO (señales de "IA"): degradado violeta/azul, todo centrado, border-radius grande en todo, emojis como marcadores de sección, 01/02/03 sin secuencia real, crema+serif+terracota, promesas exageradas, lorem.`;

log("frontend-dev · construyendo HTML…");
const build = await estr<{ titulo: string; html: string }>({
  model: OPUS, toolName: e.toolName, shape: e.shape,
  system: "Eres FRONTEND-DEV de Ai Landing Pro. Implementas EXACTAMENTE el fundamento del ux-dev. Entrega SOLO invocando la tool.",
  user: `${MARCA}\n\nFUNDAMENTO A IMPLEMENTAR:\n${fund.fundamento}\n\n${REGLAS}\n\nEntrega { titulo, html }.`,
});
if (!build?.html) { log("✗ frontend-dev no entregó HTML"); process.exit(1); }
log(`  HTML v1: ${build.html.length} bytes`);
// CHECKPOINT: guarda v1 ya con logo+fuente por si la revisión/refinado fallan.
log(`  checkpoint v1 → ${OUT} (${finalizar(build.html, logo, fontCss, OUT)} bytes)`);

// ── 3) REVISIÓN en paralelo: revisor (design-system) + auditor a11y (WCAG) ────
const shapeHallazgos = {
  hallazgos: z.array(z.object({
    severidad: z.enum(["alta", "media", "baja"]),
    area: z.string(),
    problema: z.string(),
    arreglo: z.string(),
  })).describe("Hallazgos concretos y accionables"),
};
log("revisor-ds + a11y · revisando (paralelo)…");
const [revDS, revA11y] = await Promise.all([
  estr<{ hallazgos: any[] }>({
    model: SONNET, toolName: "entregar_hallazgos", shape: shapeHallazgos, maxTurns: 6,
    system: "Eres el REVISOR de design-system de Ai Landing Pro. Juzgas por reglas MEDIBLES, no por gustos. NO expliques ni pienses en voz alta: invoca la tool directamente con los hallazgos.",
    user: `Revisa este HTML y lista hallazgos si: faltan tokens (magic values), la paleta no deriva de la marca real (cian/teal) o parece plantilla por defecto, escala tipográfica inconsistente, componentes no reutilizados, hero/estructura genérica, o señales de "IA". Para cada uno: severidad, área, problema, ARREGLO concreto.\nMarca real esperada: ${b.colores.join(", ")} · Playfair Display + Montserrat.\nHTML:\n"""${build.html}"""`,
  }),
  estr<{ hallazgos: any[] }>({
    model: SONNET, toolName: "entregar_hallazgos", shape: shapeHallazgos, maxTurns: 6,
    system: "Eres el AUDITOR DE ACCESIBILIDAD de Ai Landing Pro (WCAG 2.2 AA). NO expliques ni pienses en voz alta: invoca la tool directamente con los hallazgos.",
    user: `Audita este HTML y lista violaciones concretas: contraste texto/fondo <4.5:1 (o <3:1 en grande/UI) con los hex implicados, foco no visible, touch targets <44px, jerarquía de encabezados rota, alt/labels ausentes, movimiento sin prefers-reduced-motion, orden de tabulación. Para cada uno: severidad, área, problema, ARREGLO concreto.\nHTML:\n"""${build.html}"""`,
  }),
]);
const hallazgos = [...(revDS?.hallazgos ?? []), ...(revA11y?.hallazgos ?? [])];
log(`  hallazgos: ${hallazgos.length} (ds:${revDS?.hallazgos?.length ?? 0} · a11y:${revA11y?.hallazgos?.length ?? 0})`);
for (const h of hallazgos) log(`    [${h.severidad}] ${h.area}: ${h.problema}`);

// ── 4) FRONTEND-DEV: aplicar hallazgos → HTML final ───────────────────────────
if (hallazgos.length) {
  log("frontend-dev · refinando con los hallazgos…");
  const ref = await estr<{ titulo: string; html: string }>({
    model: OPUS, toolName: e.toolName, shape: e.shape, maxTurns: 6,
    system: "Eres FRONTEND-DEV de Ai Landing Pro. Aplicas los hallazgos sin romper marca ni estructura. Entrega SOLO invocando la tool.",
    user: `Aplica TODOS estos hallazgos del revisor y del auditor de accesibilidad al HTML, manteniendo self-contained y las reglas duras.\nHALLAZGOS:\n${hallazgos.map((h, i) => `${i + 1}. [${h.severidad}] ${h.area}: ${h.problema} → ${h.arreglo}`).join("\n")}\n\nHTML actual:\n"""${build.html}"""\n\nEntrega { titulo, html } con el HTML corregido COMPLETO.`,
  });
  if (ref?.html) {
    // ── 5) Post-proceso REAL (idéntico a la app): logo + fuente embebida ──────
    log(`  HTML final: ${finalizar(ref.html, logo, fontCss, OUT)} bytes → ${OUT} (refinado)`);
  } else {
    log("  refinado falló; se conserva el checkpoint v1.");
  }
} else {
  log("  sin hallazgos; se conserva el checkpoint v1.");
}
log("✓ listo");

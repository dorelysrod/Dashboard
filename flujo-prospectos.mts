/**
 * FLUJO COMPLETO sobre prospectos REALES (via harness Claude + WebSearch):
 *   buscar → descubrir web → fetch/extraer → inspeccionar → maqueta + correo draft.
 * Guarda todo en salida/ (gitignored). NO envía nada — tú revisas y controlas.
 *
 * Config por env: CITY (default Guadalajara), RUBRO (Medicina estética), N (3).
 */
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { mkdirSync, writeFileSync } from "node:fs";
import { construirPrompt } from "./lib/ai/prompts";
import { esquemaDeTarea } from "./lib/ai/esquemas";
import { htmlATexto, normalizarUrl } from "./lib/maquetas/texto";

if (process.env.ANTHROPIC_AUTH_TOKEN?.startsWith("sk-ant-oat")) delete process.env.ANTHROPIC_AUTH_TOKEN;
const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const CITY = process.env.CITY || "Guadalajara";
const RUBRO = process.env.RUBRO || "Medicina estética";
const N = Number(process.env.N || 3);
const NS = "landing";
const SYS = "Eres el asistente de Ai Landing Pro (rehacemos webs para clínicas y profesionales en México). Responde en español. Entrega el resultado ÚNICAMENTE invocando la tool provista.";

const log = (s: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);

async function estructurado<T = any>(o: {
  system: string; user: string; toolName: string; toolDescription: string;
  shape: z.ZodRawShape; web?: boolean;
}): Promise<T | null> {
  const ac = new AbortController();
  let cap: T | null = null;
  const t = tool(o.toolName, o.toolDescription, o.shape, async (i: any) => {
    cap = i as T; ac.abort(); return { content: [{ type: "text" as const, text: "ok" }] };
  });
  const server = createSdkMcpServer({ name: NS, version: "1.0.0", tools: [t] });
  const allowed = [`mcp__${NS}__${o.toolName}`];
  const disallowed = ["Bash", "Read", "Write", "Edit", "WebFetch", "Glob", "Grep", "TodoWrite", "Task"];
  if (o.web) allowed.push("WebSearch"); else disallowed.push("WebSearch");
  try {
    const q = query({ prompt: o.user, options: {
      model, maxTurns: o.web ? 16 : 3, permissionMode: "bypassPermissions",
      mcpServers: { [NS]: server }, allowedTools: allowed, disallowedTools: disallowed,
      systemPrompt: o.system, settingSources: [], abortController: ac } as any });
    for await (const _ of q as any) { if (cap) break; }
  } catch (e: any) { if (!cap && e?.name !== "AbortError") throw e; }
  return cap;
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

async function fetchTexto(url: string): Promise<string | null> {
  const n = normalizarUrl(url); if (!n) return null;
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(n, { signal: ctrl.signal, redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; AiLandingPro/1.0)" } });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null;
    const t = htmlATexto(await r.text()); return t.length > 40 ? t : null;
  } catch { return null; } finally { clearTimeout(to); }
}

const BASE = "salida";
mkdirSync(BASE, { recursive: true });

async function main() {
  log(`Buscando hasta ${N} prospectos de "${RUBRO}" en ${CITY}…`);
  const disc = await estructurado<{ prospectos: any[] }>({
    system: "Encuentras negocios locales REALES con WebSearch. Prioriza los que NO tienen web o la tienen débil. NO inventes; si no hay, lista vacía. Haz COMO MÁXIMO 3 búsquedas y luego invoca la tool.",
    user: `Encuentra hasta ${N} negocios reales de "${RUBRO}" en ${CITY} (México) que sean buenos prospectos para rehacer su web.`,
    toolName: "reportar_prospectos", toolDescription: "Reporta prospectos reales.",
    shape: { prospectos: z.array(z.object({ nombre: z.string(), ciudad: z.string().nullable(),
      rating: z.number().nullable(), resenas: z.number().int().nullable(), nota: z.string() })) },
    web: true,
  });
  const prospectos = (disc?.prospectos ?? []).slice(0, N);
  log(`Encontrados: ${prospectos.map((p) => p.nombre).join(", ") || "(ninguno)"}`);

  const resumen: any[] = [];
  for (const [i, p] of prospectos.entries()) {
    const dir = `${BASE}/${String(i + 1).padStart(2, "0")}-${slug(p.nombre)}`;
    mkdirSync(dir, { recursive: true });
    log(`[${i + 1}/${prospectos.length}] ${p.nombre} — descubriendo web…`);

    const w = await estructurado<{ existe: boolean; url: string | null }>({
      system: "Buscas la web OFICIAL de un negocio local con WebSearch. Ignora directorios (Doctoralia, Facebook, Instagram). Si no hay sitio propio, existe=false. Haz COMO MÁXIMO 2 búsquedas y luego invoca la tool.",
      user: `Busca la web oficial de: ${p.nombre}${p.ciudad ? ` en ${p.ciudad}` : ""}.`,
      toolName: "reportar_web", toolDescription: "Reporta web oficial y URL.",
      shape: { existe: z.boolean(), url: z.string().nullable() }, web: true,
    });
    const url = w?.existe && w.url ? w.url : null;
    const sitioTexto = url ? await fetchTexto(url) : null;
    log(`   web: ${url ?? "sin sitio propio"}${sitioTexto ? " (texto extraído)" : ""}`);

    log(`   inspeccionando…`);
    const iE = esquemaDeTarea("inspeccion");
    const insp = await estructurado<any>({ system: SYS, toolName: iE.toolName, toolDescription: iE.toolDescription, shape: iE.shape,
      user: construirPrompt({ tarea: "inspeccion", contexto: { negocio: p.nombre, ciudad: p.ciudad, rubro: RUBRO, sitioWeb: url } }) });

    log(`   generando maqueta…`);
    const mE = esquemaDeTarea("maqueta");
    const maq = await estructurado<{ titulo: string; html: string }>({ system: SYS, toolName: mE.toolName, toolDescription: mE.toolDescription, shape: mE.shape,
      user: construirPrompt({ tarea: "maqueta", contexto: { negocio: p.nombre, ciudad: p.ciudad, rubro: RUBRO, sitioWeb: url, sitioTexto, mejoras: insp?.mejoras } }) });

    log(`   redactando borrador de correo…`);
    const cE = esquemaDeTarea("correo");
    const cor = await estructurado<{ asunto: string; cuerpo: string }>({ system: SYS, toolName: cE.toolName, toolDescription: cE.toolDescription, shape: cE.shape,
      user: construirPrompt({ tarea: "correo", contexto: { negocio: p.nombre, rubro: RUBRO, mejoras: insp?.mejoras, recomendacion: insp?.recomendacion } }) });

    if (maq?.html) writeFileSync(`${dir}/maqueta.html`, maq.html);
    writeFileSync(`${dir}/correo-BORRADOR.md`,
      `# Borrador de correo — ${p.nombre}\n\n**Asunto:** ${cor?.asunto ?? "(sin asunto)"}\n\n${cor?.cuerpo ?? "(sin cuerpo)"}\n\n---\n_Borrador. Revisa y envía tú (no se envió nada)._\n`);
    writeFileSync(`${dir}/inspeccion.json`, JSON.stringify({ prospecto: p, url, inspeccion: insp }, null, 2));
    resumen.push({ nombre: p.nombre, dir, url, asunto: cor?.asunto, maqueta: Boolean(maq?.html) });
    log(`   ✓ guardado en ${dir}`);
  }

  const filas = resumen.map((r) =>
    `<tr><td>${r.nombre}</td><td>${r.url ?? "—"}</td><td>${r.asunto ?? "—"}</td>` +
    `<td>${r.maqueta ? `<a href="${r.dir.replace(BASE + "/", "")}/maqueta.html">ver maqueta</a>` : "—"}</td>` +
    `<td><a href="${r.dir.replace(BASE + "/", "")}/correo-BORRADOR.md">borrador correo</a></td></tr>`).join("\n");
  writeFileSync(`${BASE}/index.html`,
    `<!doctype html><meta charset="utf-8"><title>Prospectos — ${CITY}</title>` +
    `<style>body{font:15px system-ui;margin:40px;color:#23223A}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#F6F5FB}</style>` +
    `<h1>Prospectos ${RUBRO} — ${CITY}</h1><p>${resumen.length} prospectos. Maquetas + borradores de correo listos para tu revisión. No se envió nada.</p>` +
    `<table><tr><th>Negocio</th><th>Web actual</th><th>Asunto correo</th><th>Maqueta</th><th>Correo</th></tr>${filas}</table>`);
  log(`LISTO. Abre salida/index.html — ${resumen.length} prospectos procesados.`);
}
main().catch((e) => { console.error("FALLÓ:", e?.message ?? e); process.exit(1); });

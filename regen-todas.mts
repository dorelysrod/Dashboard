/**
 * Regenera las maquetas de salida/* con Opus 4.8. Si el negocio tiene web real,
 * EXTRAE su marca (colores, tipografía, logo) y rediseña DESDE ella; si no,
 * inventa con una DIRECCIÓN visual distinta por clínica. Helper local (no app).
 */
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync, writeFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { construirPrompt } from "./lib/ai/prompts";
import { esquemaDeTarea } from "./lib/ai/esquemas";
import { extraerMarca, inyectarLogo } from "./lib/maquetas/marca";
import { htmlATexto, normalizarUrl } from "./lib/maquetas/texto";
if (process.env.ANTHROPIC_AUTH_TOKEN?.startsWith("sk-ant-oat")) delete process.env.ANTHROPIC_AUTH_TOKEN;

const model = "claude-opus-4-8";
const NS = "landing";
const log = (s: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);

const DIRECCIONES = [
  "DIRECCIÓN VISUAL: clínico y luminoso. Fondo casi blanco frío con neutro de leve sesgo azul; UN acento sobrio (teal profundo o azul pizarra). Tipografía humanista sans (sin serif). Mucho aire, precisión médica. NADA de crema+serif.",
  "DIRECCIÓN VISUAL: editorial y sofisticado, fondo OSCURO. Carbón cálido con tipografía marfil; UN acento joya apagado (ámbar profundo o rosa-terroso), nunca verde ácido ni bermellón. Alto contraste elegante, boutique de lujo.",
  "DIRECCIÓN VISUAL: cálido y humano, contemporáneo. Neutro arcilla/arena apagado con acento oliva profundo o cobre desaturado; sans humanista redondeada (NO serif). Cercano y de confianza, sin crema+serif+terracota.",
];

async function fetchTexto(url: string) {
  const n = normalizarUrl(url); if (!n) return null;
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(n, { signal: ac.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; AiLandingPro/1.0)" } });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null;
    const html = await r.text();
    return { html, texto: htmlATexto(html), base: n };
  } catch { return null; } finally { clearTimeout(to); }
}

async function fetchLogo(url: string): Promise<string | null> {
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ac.signal, redirect: "follow" }); clearTimeout(to);
    if (!r.ok) return null;
    const tipo = (r.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!/^image\/(png|jpeg|jpg|svg\+xml|webp|gif)$/.test(tipo)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > 120_000) return null;
    return `data:${tipo};base64,${buf.toString("base64")}`;
  } catch { return null; }
}

async function genMaqueta(userMsg: string): Promise<{ titulo: string; html: string } | null> {
  const e = esquemaDeTarea("maqueta"); const ac = new AbortController(); let cap: any = null;
  const t = tool(e.toolName, e.toolDescription, e.shape, async (i: any) => { cap = i; ac.abort(); return { content: [{ type: "text" as const, text: "ok" }] }; });
  const server = createSdkMcpServer({ name: NS, version: "1.0.0", tools: [t] });
  try {
    const q = query({ prompt: userMsg, options: {
      model, maxTurns: 3, permissionMode: "bypassPermissions", mcpServers: { [NS]: server },
      allowedTools: [`mcp__${NS}__${e.toolName}`],
      disallowedTools: ["Bash", "Read", "Write", "Edit", "WebSearch", "WebFetch", "Glob", "Grep", "TodoWrite", "Task"],
      systemPrompt: "Eres director de arte de Ai Landing Pro. Entrega el resultado SOLO invocando la tool.",
      settingSources: [], abortController: ac } as any });
    for await (const _ of q as any) { if (cap) break; }
  } catch (err: any) { if (!cap && err?.name !== "AbortError") throw err; }
  return cap;
}

async function main() {
  const dirs = readdirSync("salida").filter((d) => /^\d\d-/.test(d)).sort();
  log(`Regenerando ${dirs.length} maquetas con ${model}…`);
  for (const [i, d] of dirs.entries()) {
    const base = `salida/${d}`;
    const j = JSON.parse(readFileSync(`${base}/inspeccion.json`, "utf8"));
    let marca: any = undefined, sitioTexto: string | null = null, logoDataUri: string | null = null, direccion: string | undefined;

    if (j.url) {
      log(`[${i + 1}/${dirs.length}] ${j.prospecto.nombre} — re-fetch de marca en ${j.url}…`);
      const s = await fetchTexto(j.url);
      if (s) {
        const m = extraerMarca(s.html, s.base);
        logoDataUri = m.logoUrl ? await fetchLogo(m.logoUrl) : null;
        marca = { colores: m.colores, fuentes: m.fuentes, tieneLogo: Boolean(logoDataUri) };
        sitioTexto = s.texto;
        log(`   marca: colores=${m.colores.join(",") || "—"} | fuentes=${m.fuentes.join(",") || "—"} | logo=${logoDataUri ? "sí" : "no"}`);
      }
    }
    if (!marca) { direccion = DIRECCIONES[i % DIRECCIONES.length]; log(`[${i + 1}/${dirs.length}] ${j.prospecto.nombre} — sin marca → ${direccion.slice(20, 55)}…`); }

    const user = construirPrompt({ tarea: "maqueta", contexto: {
      negocio: j.prospecto.nombre, ciudad: j.prospecto.ciudad, rubro: "Medicina estética",
      sitioWeb: j.url, sitioTexto, mejoras: j.inspeccion?.mejoras, marca, direccion } });
    const maq = await genMaqueta(user);
    if (maq?.html) {
      const html = inyectarLogo(maq.html, logoDataUri, j.prospecto.nombre);
      writeFileSync(`${base}/maqueta.html`, html);
      if (existsSync(`${base}/maqueta-NUEVA.html`)) rmSync(`${base}/maqueta-NUEVA.html`);
      log(`   ✓ ${html.length} bytes${marca ? " (desde su marca)" : ""} → ${base}/maqueta.html`);
    } else log(`   ⚠ sin resultado`);
  }
  log("LISTO.");
}
main().catch((e) => { console.error("FALLÓ:", e?.message ?? e); process.exit(1); });

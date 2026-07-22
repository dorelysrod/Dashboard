/**
 * PIPELINE DE CALIFICACIÓN: enriquece leads (WebSearch) → los puntúa con el
 * criterio de calidad (lib/data/scoring) → escribe tier/segmento en Supabase →
 * y para los TIER A genera el mock (marca/logo/eslogan) y lo guarda en `maquetas`.
 * Helper local. Config: N (a enriquecer, def 25), MOCKS (tier A a mockear, def 5).
 */
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { calificarLead, segmentoDeTier, type SenalesLead } from "./lib/data/scoring";
import { construirPrompt } from "./lib/ai/prompts";
import { esquemaDeTarea } from "./lib/ai/esquemas";
import { extraerMarca, inyectarLogo } from "./lib/maquetas/marca";
import { htmlATexto, normalizarUrl } from "./lib/maquetas/texto";

for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
if (process.env.ANTHROPIC_AUTH_TOKEN?.startsWith("sk-ant-oat")) delete process.env.ANTHROPIC_AUTH_TOKEN;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const N = Number(process.env.N || 25);
const MOCKS = Number(process.env.MOCKS || 5);
const NS = "landing";
const log = (s: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function estructurado<T = any>(o: { system: string; user: string; toolName: string; toolDescription: string; shape: z.ZodRawShape; web?: boolean; model: string }): Promise<T | null> {
  const ac = new AbortController(); let cap: T | null = null;
  const t = tool(o.toolName, o.toolDescription, o.shape, async (i: any) => { cap = i as T; ac.abort(); return { content: [{ type: "text" as const, text: "ok" }] }; });
  const server = createSdkMcpServer({ name: NS, version: "1.0.0", tools: [t] });
  const allowed = [`mcp__${NS}__${o.toolName}`]; const disallowed = ["Bash", "Read", "Write", "Edit", "WebFetch", "Glob", "Grep", "TodoWrite", "Task"];
  if (o.web) allowed.push("WebSearch"); else disallowed.push("WebSearch");
  const q = query({ prompt: o.user, options: { model: o.model, maxTurns: o.web ? 16 : 3, permissionMode: "bypassPermissions", mcpServers: { [NS]: server }, allowedTools: allowed, disallowedTools: disallowed, systemPrompt: o.system, settingSources: [], abortController: ac } as any });
  for await (const _ of q as any) { if (cap) break; }
  return cap;
}
async function retry<T>(fn: () => Promise<T>, n = 3): Promise<T> {
  let last: any; for (let i = 0; i <= n; i++) { try { return await fn(); } catch (e: any) { last = e; if (i === n) throw e; const s = (/session limit/i.test(e?.message || "") ? 25 : 6) * (i + 1); log(`   ↻ retry ${i + 1} en ${s}s`); await sleep(s * 1000); } } throw last;
}

async function enriquecer(negocio: string, ciudad: string | null, model: string) {
  return retry(() => estructurado<any>({
    model, web: true, toolName: "reportar_senales", toolDescription: "Señales de calificación.",
    system: "Evalúas un negocio como PROSPECTO para rehacerle la web. Usa WebSearch. brechaWeb: sin_web|debil|decente|fuerte. NO inventes; null lo que no confirmes. Máx 3 búsquedas y reporta.",
    user: `Evalúa como prospecto: ${negocio}${ciudad ? ` en ${ciudad}` : ""} (México).`,
    shape: { brechaWeb: z.enum(["sin_web", "debil", "decente", "fuerte"]).nullable(), rating: z.number().nullable(), resenas: z.number().int().nullable(), sitioUrl: z.string().nullable(), ownerOperated: z.boolean().nullable(), cadena: z.boolean().nullable(), premium: z.boolean().nullable(), notas: z.string() },
  }));
}

async function fetchSitio(url: string) {
  const n = normalizarUrl(url); if (!n) return null;
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 8000);
  try { const r = await fetch(n, { signal: ac.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; AiLandingPro/1.0)" } }); if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null; const html = await r.text(); return { html, texto: htmlATexto(html), base: n }; } catch { return null; } finally { clearTimeout(to); }
}
async function fetchLogo(url: string): Promise<string | null> {
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 8000);
  try { const r = await fetch(url, { signal: ac.signal, redirect: "follow" }); clearTimeout(to); if (!r.ok) return null; const tipo = (r.headers.get("content-type") ?? "").split(";")[0].trim(); if (!/^image\/(png|jpeg|jpg|svg\+xml|webp|gif)$/.test(tipo)) return null; const buf = Buffer.from(await r.arrayBuffer()); if (!buf.length || buf.length > 120_000) return null; return `data:${tipo};base64,${buf.toString("base64")}`; } catch { return null; }
}

async function generarMock(lead: any, sitioUrl: string | null) {
  let marca: any, sitioTexto: string | null = null, logo: string | null = null;
  if (sitioUrl) { const s = await fetchSitio(sitioUrl); if (s) { const m = extraerMarca(s.html, s.base); logo = m.logoUrl ? await fetchLogo(m.logoUrl) : null; marca = { colores: m.colores, fuentes: m.fuentes, tieneLogo: Boolean(logo) }; sitioTexto = s.texto; } }
  const user = construirPrompt({ tarea: "maqueta", contexto: { negocio: lead.negocio, ciudad: lead.ciudad, rubro: "Medicina estética", sitioWeb: sitioUrl, sitioTexto, mejoras: [] } });
  const e = esquemaDeTarea("maqueta");
  const maq = await retry(() => estructurado<{ titulo: string; html: string }>({ model: "claude-opus-4-8", toolName: e.toolName, toolDescription: e.toolDescription, shape: e.shape, user, system: "Eres director de arte de Ai Landing Pro. Entrega SOLO invocando la tool." }));
  if (!maq?.html) return null;
  const html = inyectarLogo(maq.html, logo, lead.negocio);
  return { titulo: maq.titulo || lead.negocio, html, origen: sitioTexto ? "redisenio" : "nueva" as const };
}

async function main() {
  mkdirSync("salida/mocks", { recursive: true });
  const { data: leads } = await sb.from("leads").select("id,negocio,ciudad,rating,resenas,sitio_web,tier").is("tier", null).not("negocio", "ilike", "%(test)%").limit(N);
  log(`Calificando ${leads?.length ?? 0} leads (sin tier)…`);
  const calificados: any[] = [];
  for (const [i, lead] of (leads ?? []).entries()) {
    let sen: any;
    try { sen = await enriquecer(lead.negocio, lead.ciudad, "claude-sonnet-5"); }
    catch (e: any) { log(`[${i + 1}] ${lead.negocio}: enrich falló (${e?.message?.slice(0, 40)}) — salto`); continue; }
    const s: SenalesLead = { brechaWeb: sen?.brechaWeb ?? null, rating: sen?.rating ?? lead.rating ?? null, resenas: sen?.resenas ?? lead.resenas ?? null, ownerOperated: sen?.ownerOperated, cadena: sen?.cadena, premium: sen?.premium };
    const cal = calificarLead(s);
    await sb.from("leads").update({ rating: s.rating, resenas: s.resenas, sitio_web: sen?.sitioUrl ?? lead.sitio_web ?? null, tier: cal.tier, segmento: segmentoDeTier(cal.tier) }).eq("id", lead.id);
    calificados.push({ ...lead, sitioUrl: sen?.sitioUrl ?? null, ...cal });
    log(`[${i + 1}] ${lead.negocio} → ${cal.tier} (${cal.score})${cal.descalificado ? " ✗desc" : ""} | ${cal.motivos[0] ?? ""}`);
    writeFileSync("salida/calificacion.json", JSON.stringify(calificados, null, 2));
  }

  const topA = calificados.filter((c) => c.tier === "A" && !c.descalificado).sort((a, b) => b.score - a.score).slice(0, MOCKS);
  log(`\nTIER A: ${topA.length}. Generando mocks para los mejores ${topA.length}…`);
  for (const [i, lead] of topA.entries()) {
    log(`  mock [${i + 1}/${topA.length}] ${lead.negocio} (score ${lead.score})…`);
    let mock; try { mock = await generarMock(lead, lead.sitioUrl); } catch (e: any) { log(`    ⚠ falló: ${e?.message?.slice(0, 40)}`); continue; }
    if (!mock) { log("    ⚠ sin html"); continue; }
    const slug = lead.negocio.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    writeFileSync(`salida/mocks/${slug}.html`, mock.html);
    const token = randomBytes(32).toString("base64url");
    const { error } = await sb.from("maquetas").insert({ lead_id: lead.id, token, titulo: mock.titulo, html: mock.html, origen: mock.origen, url_fuente: lead.sitioUrl, expira_at: new Date(Date.now() + 14 * 86400e3).toISOString() });
    log(error ? `    ⚠ Supabase: ${error.message}` : `    ✓ mock guardado + persistido (/maqueta/${token.slice(0, 10)}…)`);
  }
  log("LISTO.");
}
main().catch((e) => { console.error("FALLÓ:", e?.message ?? e); process.exit(1); });

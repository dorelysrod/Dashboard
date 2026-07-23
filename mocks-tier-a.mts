/**
 * MOCKS INCREMENTALES: genera la maqueta para leads Tier A reales que aún NO
 * tienen ninguna en `maquetas` (a diferencia de calificar-leads.mts, que solo
 * mockea a los recién calificados de esa corrida). Pensado para el flujo
 * diario: cada día mockea los mejores MOCKS (def 3) pendientes, ordenados por
 * rating/reseñas. Reusa el mismo patrón de generación (marca del sitio real si
 * existe, dirección nueva si no). Helper local (no app).
 *
 * Uso: node --import tsx mocks-tier-a.mts        (MOCKS=3 por defecto)
 */
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { construirPrompt } from "./lib/ai/prompts";
import { esquemaDeTarea } from "./lib/ai/esquemas";
import { extraerMarca, inyectarLogo } from "./lib/maquetas/marca";
import { htmlATexto, normalizarUrl } from "./lib/maquetas/texto";

for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
if (process.env.ANTHROPIC_AUTH_TOKEN?.startsWith("sk-ant-oat")) delete process.env.ANTHROPIC_AUTH_TOKEN;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const MOCKS = Number(process.env.MOCKS || 3);
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
  let sitioTexto: string | null = null, logo: string | null = null;
  if (sitioUrl) { const s = await fetchSitio(sitioUrl); if (s) { const m = extraerMarca(s.html, s.base); logo = m.logoUrl ? await fetchLogo(m.logoUrl) : null; sitioTexto = s.texto; } }
  const user = construirPrompt({ tarea: "maqueta", contexto: { negocio: lead.negocio, ciudad: lead.ciudad, rubro: lead.rubro || "Negocio local", sitioWeb: sitioUrl, sitioTexto, mejoras: [] } });
  const e = esquemaDeTarea("maqueta");
  const maq = await retry(() => estructurado<{ titulo: string; html: string }>({ model: "claude-opus-4-8", toolName: e.toolName, toolDescription: e.toolDescription, shape: e.shape, user, system: "Eres director de arte de Ai Landing Pro. Entrega SOLO invocando la tool." }));
  if (!maq?.html) return null;
  const html = inyectarLogo(maq.html, logo, lead.negocio);
  return { titulo: maq.titulo || lead.negocio, html, origen: sitioTexto ? "redisenio" : ("nueva" as const) };
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

async function main() {
  mkdirSync("salida/mocks", { recursive: true });
  const { data: conMaqueta } = await sb.from("maquetas").select("lead_id");
  const yaMockeados = new Set((conMaqueta ?? []).map((m: any) => m.lead_id));
  const { data: leadsA, error } = await sb
    .from("leads")
    .select("id,negocio,ciudad,rubro,rating,resenas,sitio_web")
    .eq("tier", "A")
    .not("negocio", "ilike", "%(test)%")
    .order("rating", { ascending: false, nullsFirst: false })
    .order("resenas", { ascending: false, nullsFirst: false });
  if (error) { console.error("No se pudieron leer los leads:", error.message); process.exit(1); }
  const pendientes = (leadsA ?? []).filter((l: any) => !yaMockeados.has(l.id)).slice(0, MOCKS);
  log(`Tier A sin maqueta: ${(leadsA ?? []).filter((l: any) => !yaMockeados.has(l.id)).length} — mockeando los mejores ${pendientes.length}…`);
  let ok = 0;
  for (const [i, lead] of pendientes.entries()) {
    log(`  mock [${i + 1}/${pendientes.length}] ${lead.negocio} (${lead.rating ?? "?"}★, ${lead.resenas ?? "?"} reseñas)…`);
    let mock; try { mock = await generarMock(lead, lead.sitio_web); } catch (e: any) { log(`    ⚠ falló: ${e?.message?.slice(0, 60)}`); continue; }
    if (!mock) { log("    ⚠ sin html"); continue; }
    writeFileSync(`salida/mocks/${slug(lead.negocio)}.html`, mock.html);
    const token = randomBytes(32).toString("base64url");
    const { error: e2 } = await sb.from("maquetas").insert({ lead_id: lead.id, token, titulo: mock.titulo, html: mock.html, origen: mock.origen, url_fuente: lead.sitio_web, expira_at: new Date(Date.now() + 14 * 86400e3).toISOString() });
    if (e2) log(`    ⚠ Supabase: ${e2.message}`); else { ok++; log(`    ✓ maqueta guardada (/maqueta/${token.slice(0, 10)}…)`); }
  }
  log(`LISTO. ${ok}/${pendientes.length} maquetas nuevas.`);
}
main().catch((e) => { console.error("FALLÓ:", e?.message ?? e); process.exit(1); });

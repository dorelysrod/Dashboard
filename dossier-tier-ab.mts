/**
 * Corre el DOSSIER OSINT para todos los leads Tier A y B (reales; excluye "(test)").
 * Guarda el dossier + contacto/rating en Supabase (columna `dossier` jsonb).
 * Helper local. Retry ante límites de sesión; backup en salida/dossiers.json.
 */
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
if (process.env.ANTHROPIC_AUTH_TOKEN?.startsWith("sk-ant-oat")) delete process.env.ANTHROPIC_AUTH_TOKEN;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const NS = "landing";
const log = (s: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const shape = { eslogan: z.string().nullable(), categoria: z.string().nullable(), servicios: z.array(z.string()), instagram: z.string().nullable(), facebook: z.string().nullable(), tiktok: z.string().nullable(), sitioWeb: z.string().nullable(), seguidoresIg: z.number().int().nullable(), telefono: z.string().nullable(), email: z.string().nullable(), direccion: z.string().nullable(), rating: z.number().nullable(), resenas: z.number().int().nullable(), brechaWeb: z.enum(["sin_web", "debil", "decente", "fuerte"]).nullable(), ownerOperated: z.boolean().nullable(), cadena: z.boolean().nullable(), premium: z.boolean().nullable(), colores: z.array(z.string()), logoUrl: z.string().nullable(), dolor: z.array(z.string()), ganchoDolor: z.string().nullable(), resumen: z.string() };

async function dossier(negocio: string, ciudad: string | null, rubro: string | null) {
  const giro = rubro || "negocios locales";
  const ac = new AbortController(); let cap: any = null;
  const t = tool("reportar_dossier", "x", shape, async (i: any) => { cap = i; ac.abort(); return { content: [{ type: "text" as const, text: "ok" }] }; });
  const s = createSdkMcpServer({ name: NS, version: "1.0.0", tools: [t] });
  const q = query({ prompt: `Arma el dossier completo del prospecto: ${negocio}${ciudad ? ` en ${ciudad}` : ""} (México).`, options: { model: "claude-sonnet-5", maxTurns: 16, permissionMode: "bypassPermissions", mcpServers: { [NS]: s }, allowedTools: [`mcp__${NS}__reportar_dossier`, "WebSearch"], disallowedTools: ["Bash", "Read", "Write", "Edit", "WebFetch", "Glob", "Grep", "TodoWrite", "Task"], systemPrompt: `Analista de prospectos para una agencia que rehace webs de ${giro}. Reúne TODO lo público con WebSearch (Instagram/Facebook/Google Business/directorios): eslogan, seguidores, categoría, servicios, teléfono, email, dirección, rating, redes, brechaWeb. LO MÁS IMPORTANTE: deduce el DOLOR — qué pierde HOY por su web/presencia, concreto y que se sienta (ej: 'sin web → cuando la buscan en Google agendan con la competencia'; 'sin agenda online → pierde reservas de noche'). dolor=2-4 específicos; ganchoDolor=el #1 en una frase que duela. NO inventes datos duros; SÍ infiere el dolor. Máx 5 búsquedas y reporta.`, settingSources: [], abortController: ac } as any });
  for await (const _ of q as any) { if (cap) break; }
  return cap;
}
async function retry<T>(fn: () => Promise<T>, n = 2): Promise<T> { let last: any; for (let i = 0; i <= n; i++) { try { return await fn(); } catch (e: any) { last = e; if (i === n) throw e; const s = (/session limit/i.test(e?.message || "") ? 25 : 6) * (i + 1); log(`   ↻ retry ${i + 1} en ${s}s`); await sleep(s * 1000); } } throw last; }

async function main() {
  mkdirSync("salida", { recursive: true });
  // SOLO_NUEVOS=1 (flujo diario): solo leads que aún no tienen dossier, para
  // que la corrida diaria sea incremental y no re-investigue toda la base.
  let q = sb.from("leads").select("id,negocio,ciudad,tier,rubro").in("tier", ["A", "B"]).not("negocio", "ilike", "%(test)%");
  if (process.env.SOLO_NUEVOS === "1") q = q.is("dossier", null);
  // LIMITE: cupo por corrida (flujo diario) — Tier A primero, mejores primero.
  if (process.env.LIMITE) q = q.order("tier").order("rating", { ascending: false, nullsFirst: false }).limit(Number(process.env.LIMITE));
  const { data: leads } = await q;
  log(`Dossier para ${leads?.length ?? 0} leads Tier A/B reales${process.env.SOLO_NUEVOS === "1" ? " (solo nuevos)" : ""}…`);
  const out: any[] = [];
  for (const [i, lead] of (leads ?? []).entries()) {
    let d: any;
    try { d = await retry(() => dossier(lead.negocio, lead.ciudad, (lead as any).rubro)); }
    catch (e: any) { log(`[${i + 1}] ${lead.negocio}: falló (${e?.message?.slice(0, 40)}) — salto`); continue; }
    if (!d) { log(`[${i + 1}] ${lead.negocio}: sin dossier`); continue; }
    await sb.from("leads").update({ rating: d.rating, resenas: d.resenas, sitio_web: d.sitioWeb, telefono: d.telefono, dossier: d }).eq("id", lead.id);
    out.push({ negocio: lead.negocio, tier: lead.tier, ...d });
    const campos = [d.telefono && "tel", d.direccion && "dir", d.servicios?.length && `${d.servicios.length} serv`, d.rating && `${d.rating}★`, d.instagram && "IG", d.brechaWeb].filter(Boolean).join(", ");
    log(`[${i + 1}/${leads!.length}] ${lead.tier} ${lead.negocio} → ${campos || "poco confirmado"}`);
    writeFileSync("salida/dossiers.json", JSON.stringify(out, null, 2));
  }
  log(`LISTO. ${out.length} dossiers guardados en Supabase + salida/dossiers.json`);
}
main().catch((e) => { console.error("FALLÓ:", e?.message ?? e); process.exit(1); });

/**
 * Para cada lead Tier A/B real: DOSSIER (contacto + dolor) + extracción determinista
 * de email/tel del sitio (si hay) + genera los 3 MENSAJES por canal (WhatsApp, DM,
 * correo) basados en el DOLOR. Guarda en Supabase (dossier, telefono) y en
 * salida/contacto/<slug>.md para el operador. Helper local.
 */
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { extraerContacto } from "./lib/maquetas/marca";
import { htmlATexto, normalizarUrl } from "./lib/maquetas/texto";
for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
if (process.env.ANTHROPIC_AUTH_TOKEN?.startsWith("sk-ant-oat")) delete process.env.ANTHROPIC_AUTH_TOKEN;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const NS = "landing";
const log = (s: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const dossierShape = { eslogan: z.string().nullable(), categoria: z.string().nullable(), servicios: z.array(z.string()), instagram: z.string().nullable(), facebook: z.string().nullable(), tiktok: z.string().nullable(), sitioWeb: z.string().nullable(), seguidoresIg: z.number().int().nullable(), telefono: z.string().nullable(), email: z.string().nullable(), direccion: z.string().nullable(), rating: z.number().nullable(), resenas: z.number().int().nullable(), brechaWeb: z.enum(["sin_web","debil","decente","fuerte"]).nullable(), ownerOperated: z.boolean().nullable(), cadena: z.boolean().nullable(), premium: z.boolean().nullable(), colores: z.array(z.string()), logoUrl: z.string().nullable(), dolor: z.array(z.string()), ganchoDolor: z.string().nullable(), resumen: z.string() };
const msgShape = { whatsapp: z.string(), dm: z.string(), asunto: z.string(), correo: z.string() };

async function sdk<T = any>(o: { model: string; user: string; system: string; toolName: string; shape: z.ZodRawShape; web?: boolean }): Promise<T | null> {
  const ac = new AbortController(); let cap: T | null = null;
  const t = tool(o.toolName, "x", o.shape, async (i: any) => { cap = i as T; ac.abort(); return { content: [{ type: "text" as const, text: "ok" }] }; });
  const s = createSdkMcpServer({ name: NS, version: "1.0.0", tools: [t] });
  const allow = [`mcp__${NS}__${o.toolName}`]; const dis = ["Bash","Read","Write","Edit","WebFetch","Glob","Grep","TodoWrite","Task"];
  if (o.web) allow.push("WebSearch"); else dis.push("WebSearch");
  const q = query({ prompt: o.user, options: { model: o.model, maxTurns: o.web ? 16 : 6, permissionMode: "bypassPermissions", mcpServers: { [NS]: s }, allowedTools: allow, disallowedTools: dis, systemPrompt: o.system, settingSources: [], abortController: ac } as any });
  // Captura el AbortError que dispara ac.abort() al invocar la tool (si no, en
  // llamadas rápidas escapa y sdk lanza → mensaje null). Igual que generarEstructurado.
  try { for await (const _ of q as any) { if (cap) break; } }
  catch (e: any) { if (!cap && e?.name !== "AbortError") throw e; }
  return cap;
}
async function retry<T>(fn: () => Promise<T>, n = 3): Promise<T> { let last: any; for (let i = 0; i <= n; i++) { try { return await fn(); } catch (e: any) { last = e; if (i === n) throw e; const s = (/session limit|Connection closed/i.test(e?.message || "") ? 30 : 8) * (i + 1); log(`   ↻ retry ${i + 1} en ${s}s`); await sleep(s * 1000); } } throw last; }

async function fetchContacto(url: string) {
  const n = normalizarUrl(url); if (!n) return { email: null, telefono: null };
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 8000);
  try { const r = await fetch(n, { signal: ac.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; AiLandingPro/1.0)" } }); if (!r.ok) return { email: null, telefono: null }; return extraerContacto(await r.text()); }
  catch { return { email: null, telefono: null }; } finally { clearTimeout(to); }
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45);

async function main() {
  mkdirSync("salida/contacto", { recursive: true });
  const { data: leads } = await sb.from("leads").select("id,negocio,ciudad,tier,telefono,dossier").in("tier", ["A", "B"]).not("negocio", "ilike", "%(test)%");
  log(`Contacto+mensajes para ${leads?.length ?? 0} leads A/B…`);
  const resumen: any[] = [];
  for (const [i, lead] of (leads ?? []).entries()) {
    let d: any = (lead as any).dossier;
    // Reutiliza el dossier guardado si ya tiene dolor; si no, lo genera.
    if (d && Array.isArray(d.dolor) && d.dolor.length) {
      log(`[${i + 1}/${leads!.length}] ${lead.tier} ${lead.negocio} — dossier reutilizado`);
    } else
    try { d = await retry(() => sdk({ model: "claude-sonnet-5", web: true, toolName: "reportar_dossier", shape: dossierShape,
      system: "Analista de prospectos para agencia que rehace webs de clínicas de estética. Reúne lo público con WebSearch (Instagram/Facebook/Google Business/directorios/web): categoría, servicios, teléfono, EMAIL (búscalo en su web/Facebook/Google Business), dirección, rating/reseñas, redes, brechaWeb, cadena/owner/premium. Deduce el DOLOR: qué pierde HOY por su web/presencia (concreto, que se sienta). dolor=2-4; ganchoDolor=el #1. NO inventes datos duros; SÍ infiere el dolor. Máx 5 búsquedas.",
      user: `Dossier con contacto y dolor de: ${lead.negocio}${lead.ciudad ? ` en ${lead.ciudad}` : ""} (México).` })); }
    catch (e: any) { log(`[${i + 1}] ${lead.negocio}: dossier falló — salto`); continue; }
    if (!d) continue;
    // Contacto determinista del sitio (si hay).
    if (d.sitioWeb) { const c = await fetchContacto(d.sitioWeb); d.email = d.email || c.email; d.telefono = d.telefono || c.telefono; }

    // 3 mensajes por canal, basados en el dolor.
    let msg: any = null;
    try { msg = await retry(() => sdk({ model: "claude-sonnet-5", toolName: "reportar_mensajes", shape: msgShape,
      system: "Escribes outreach de VENTA POR DOLOR (Problema→Agitar→Solución) para una agencia que rehace webs de clínicas de estética en México. Español MX, cercano, sin spam ni promesas exageradas. Adapta al canal: whatsapp = 2-4 líneas, muy directo, un solo dolor + CTA suave (una pregunta fácil); dm = como whatsapp pero aún más casual (Instagram); correo = asunto (máx 8 palabras que toque el dolor) + cuerpo ~130 palabras con los 4 momentos. Usa el DOLOR provisto. Entrega los 3 mensajes ÚNICAMENTE invocando la tool reportar_mensajes (no escribas texto suelto).",
      user: `Negocio: ${lead.negocio} (${lead.ciudad}). Servicios: ${(d.servicios||[]).join(", ")||"—"}. DOLOR: ${(d.dolor||[]).join(" | ")||d.ganchoDolor||"web débil/inexistente"}. Gancho: ${d.ganchoDolor||"—"}. Escribe los 3 mensajes.` })); }
    catch (e: any) { log(`   mensajes ${lead.negocio}: falló (${(e?.message||"").slice(0,50)})`); }
    if (!msg) log(`   ⚠ ${lead.negocio}: mensajes vacíos (el modelo no invocó la tool)`);

    // Persiste dossier + mensajes en la DB → la Ficha los lee sin re-llamar la API.
    await sb.from("leads").update({ telefono: d.telefono, dossier: d, ...(msg ? { mensajes: msg } : {}) }).eq("id", lead.id);
    const contacto = [d.telefono && `📱 WhatsApp: ${d.telefono}`, d.instagram && `📷 IG: ${d.instagram}`, d.facebook && `📘 FB: ${d.facebook}`, d.email && `✉️ Email: ${d.email}`, d.direccion && `📍 ${d.direccion}`].filter(Boolean).join("\n");
    const md = `# ${lead.negocio} — Tier ${lead.tier}\n\n**Contacto**\n${contacto || "(sin contacto confirmado)"}\n\n**Dolor:** ${d.ganchoDolor || (d.dolor||[])[0] || "—"}\n\n---\n## WhatsApp\n${msg?.whatsapp || "—"}\n\n## Instagram DM\n${msg?.dm || "—"}\n\n## Correo\n**Asunto:** ${msg?.asunto || "—"}\n\n${msg?.correo || "—"}\n\n---\n_Borradores por dolor. Elige el canal según el contacto disponible. No se envió nada._\n`;
    writeFileSync(`salida/contacto/${slug(lead.negocio)}.md`, md);
    resumen.push({ negocio: lead.negocio, tier: lead.tier, tel: d.telefono, ig: d.instagram, email: d.email });
    const canales = [d.telefono && "WA", d.instagram && "IG", d.email && "email"].filter(Boolean).join("/") || "sin contacto";
    log(`[${i + 1}/${leads!.length}] ${lead.tier} ${lead.negocio} → ${canales}`);
    writeFileSync("salida/contacto/_resumen.json", JSON.stringify(resumen, null, 2));
  }
  log(`LISTO. ${resumen.length} leads con contacto + 3 mensajes en salida/contacto/`);
}
main().catch((e) => { console.error("FALLÓ:", e?.message ?? e); process.exit(1); });

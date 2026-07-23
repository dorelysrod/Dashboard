/**
 * Pipeline RESUMIBLE de leads de CALIDAD: descubre prospectos por muchas ciudades,
 * dedup, y para cada uno nuevo corre el DOSSIER (OSINT) + SCORING; solo cuenta los
 * Tier A/B CONFIRMADOS (nunca "web desconocida") hacia el objetivo. Guarda estado
 * en salida/estado-1000.json → se reanuda tras límites de sesión o reinicios.
 * Inserta cada lead calificado en Supabase con su dossier + tier.
 *
 * Config: OBJETIVO (def 1000). Calidad primero: descalificadores estrictos.
 */
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { calificarLead, segmentoDeTier, type SenalesLead } from "./lib/data/scoring";
for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
if (process.env.ANTHROPIC_AUTH_TOKEN?.startsWith("sk-ant-oat")) delete process.env.ANTHROPIC_AUTH_TOKEN;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const OBJETIVO = Number(process.env.OBJETIVO || 1000);
const RUBRO = "Medicina estética";
const NS = "landing";
const ESTADO = "salida/estado-1000.json";
const log = (s: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (s: string) => s.trim().toLowerCase();

const CIUDADES = [
  "Guadalajara","Zapopan","Tlaquepaque","Tonalá","Monterrey","San Pedro Garza García","Apodaca","Puebla","Cholula",
  "Querétaro","El Marqués","Mérida","León","Irapuato","Celaya","Salamanca","San Luis Potosí","Aguascalientes","Culiacán",
  "Mazatlán","Los Mochis","Hermosillo","Ciudad Obregón","Nogales","Chihuahua","Ciudad Juárez","Delicias","Morelia","Uruapan",
  "Toluca","Metepec","Veracruz","Boca del Río","Xalapa","Coatzacoalcos","Córdoba","Orizaba","Poza Rica","Saltillo","Torreón",
  "Gómez Palacio","Monclova","Piedras Negras","Cuernavaca","Cuautla","Ciudad de México","Naucalpan","Tlalnepantla","Ecatepec",
  "Coacalco","Tijuana","Mexicali","Ensenada","Cancún","Playa del Carmen","Cozumel","Chetumal","Oaxaca","Tuxtla Gutiérrez",
  "Tapachula","San Cristóbal de las Casas","Durango","Pachuca","Tepic","Colima","Manzanillo","Villahermosa","Campeche",
  "Ciudad del Carmen","La Paz","Los Cabos","Zacatecas","Fresnillo","Reynosa","Matamoros","Nuevo Laredo","Tampico","Ciudad Victoria",
  "Puerto Vallarta","Acapulco","Chilpancingo","Guanajuato","San Miguel de Allende","Tehuacán","Valladolid","Mérida Norte","Cabo San Lucas",
];

const dossierShape = { eslogan: z.string().nullable(), categoria: z.string().nullable(), servicios: z.array(z.string()), instagram: z.string().nullable(), facebook: z.string().nullable(), tiktok: z.string().nullable(), sitioWeb: z.string().nullable(), seguidoresIg: z.number().int().nullable(), telefono: z.string().nullable(), email: z.string().nullable(), direccion: z.string().nullable(), rating: z.number().nullable(), resenas: z.number().int().nullable(), brechaWeb: z.enum(["sin_web","debil","decente","fuerte"]).nullable(), ownerOperated: z.boolean().nullable(), cadena: z.boolean().nullable(), premium: z.boolean().nullable(), colores: z.array(z.string()), logoUrl: z.string().nullable(), dolor: z.array(z.string()), ganchoDolor: z.string().nullable(), resumen: z.string() };

async function sdk<T = any>(o: { model: string; user: string; system: string; toolName: string; shape: z.ZodRawShape; web?: boolean }): Promise<T | null> {
  const ac = new AbortController(); let cap: T | null = null;
  const t = tool(o.toolName, "x", o.shape, async (i: any) => { cap = i as T; ac.abort(); return { content: [{ type: "text" as const, text: "ok" }] }; });
  const s = createSdkMcpServer({ name: NS, version: "1.0.0", tools: [t] });
  const allow = [`mcp__${NS}__${o.toolName}`]; const dis = ["Bash","Read","Write","Edit","WebFetch","Glob","Grep","TodoWrite","Task"];
  if (o.web) allow.push("WebSearch"); else dis.push("WebSearch");
  const q = query({ prompt: o.user, options: { model: o.model, maxTurns: o.web ? 16 : 3, permissionMode: "bypassPermissions", mcpServers: { [NS]: s }, allowedTools: allow, disallowedTools: dis, systemPrompt: o.system, settingSources: [], abortController: ac } as any });
  for await (const _ of q as any) { if (cap) break; }
  return cap;
}
async function retry<T>(fn: () => Promise<T>, n = 4): Promise<T> { let last: any; for (let i = 0; i <= n; i++) { try { return await fn(); } catch (e: any) { last = e; if (i === n) throw e; const s = (/session limit|Connection closed|overloaded/i.test(e?.message || "") ? 40 : 8) * (i + 1); log(`   ↻ retry ${i + 1}/${n} en ${s}s (${(e?.message || "").slice(0, 40)})`); await sleep(s * 1000); } } throw last; }

async function descubrir(ciudad: string, excluir: string[]) {
  const bloque = excluir.length ? `\n\nYA TENGO (NO los reportes, busca OTROS):\n${excluir.slice(-250).map((n) => `- ${n}`).join("\n")}` : "";
  const r = await retry(() => sdk<{ prospectos: { nombre: string; ciudad: string | null }[] }>({
    model: "claude-sonnet-5", web: true, toolName: "reportar_prospectos",
    system: "Encuentras clínicas/consultorios de medicina estética REALES con WebSearch. Prioriza los que NO tienen web propia o la tienen débil (mejor prospecto). NO inventes; si no hay, lista vacía. Máx 3 búsquedas y reporta.",
    user: `Encuentra hasta 10 negocios reales de "${RUBRO}" en ${ciudad} (México), preferentemente sin web o con web débil.${bloque}`,
    shape: { prospectos: z.array(z.object({ nombre: z.string(), ciudad: z.string().nullable() })) },
  }));
  return r?.prospectos ?? [];
}
async function dossier(negocio: string, ciudad: string | null) {
  return retry(() => sdk<any>({
    model: "claude-sonnet-5", web: true, toolName: "reportar_dossier", shape: dossierShape,
    system: "Analista de prospectos para agencia que rehace webs de clínicas de estética. Reúne lo público con WebSearch (Instagram/Facebook/Google Business/directorios): categoría, servicios, teléfono, dirección, rating/reseñas, redes, brechaWeb (sin_web|debil|decente|fuerte), si es cadena u owner-operated, premium. Deduce el DOLOR: qué pierde HOY por su web/presencia (concreto, que se sienta). dolor=2-4; ganchoDolor=el #1. NO inventes datos duros; SÍ infiere el dolor. Máx 5 búsquedas.",
    user: `Dossier completo del prospecto: ${negocio}${ciudad ? ` en ${ciudad}` : ""} (México).`,
  }));
}

interface Estado { calificados: any[]; vistos: string[]; ciudadIdx: number }
function cargar(): Estado { if (existsSync(ESTADO)) return JSON.parse(readFileSync(ESTADO, "utf8")); return { calificados: [], vistos: [], ciudadIdx: 0 }; }
function guardar(e: Estado) { writeFileSync(ESTADO, JSON.stringify(e, null, 2)); }

async function main() {
  mkdirSync("salida", { recursive: true });
  const est = cargar();
  // Sembrar "vistos" con TODO lo que ya hay en Supabase (dedup global).
  const { data: existentes } = await sb.from("leads").select("negocio");
  const vistos = new Set<string>([...est.vistos, ...(existentes ?? []).map((r: any) => norm(r.negocio))]);
  log(`Reanudando: ${est.calificados.length} calificados (A/B) de ${OBJETIVO}. Vistos: ${vistos.size}. Ciudad idx: ${est.ciudadIdx}.`);

  let idx = est.ciudadIdx;
  while (est.calificados.length < OBJETIVO) {
    const ciudad = CIUDADES[idx % CIUDADES.length];
    idx++;
    let prospectos: { nombre: string; ciudad: string | null }[] = [];
    try { prospectos = await descubrir(ciudad, [...vistos]); }
    catch (e: any) { log(`${ciudad}: descubrir falló (${(e?.message || "").slice(0, 40)}) — sigo`); est.ciudadIdx = idx; guardar(est); continue; }

    let nuevos = 0, ab = 0;
    for (const p of prospectos) {
      if (!p?.nombre || vistos.has(norm(p.nombre))) continue;
      vistos.add(norm(p.nombre)); nuevos++;
      let d: any;
      try { d = await dossier(p.nombre, p.ciudad || ciudad); }
      catch (e: any) { log(`   dossier ${p.nombre}: falló — salto`); continue; }
      if (!d) continue;
      const s: SenalesLead = { brechaWeb: d.brechaWeb, rating: d.rating, resenas: d.resenas, ownerOperated: d.ownerOperated, cadena: d.cadena, premium: d.premium };
      const cal = calificarLead(s);
      // CALIDAD: solo cuenta A/B con brecha web CONFIRMADA y no descalificado.
      const cuenta = (cal.tier === "A" || cal.tier === "B") && !cal.descalificado && d.brechaWeb != null && d.brechaWeb !== "fuerte";
      const fila = { negocio: p.nombre, ciudad: p.ciudad || ciudad, rubro: RUBRO, rating: d.rating, resenas: d.resenas, sitio_web: d.sitioWeb, telefono: d.telefono, tier: cal.tier, segmento: segmentoDeTier(cal.tier), etapa: "nuevo", dossier: d };
      await sb.from("leads").insert(fila).then(({ error }) => { if (error && error.code !== "23505") log(`   ⚠ insert ${p.nombre}: ${error.message}`); });
      if (cuenta) { est.calificados.push({ negocio: p.nombre, ciudad: fila.ciudad, tier: cal.tier, score: cal.score, ganchoDolor: d.ganchoDolor }); ab++; }
      est.vistos = [...vistos].slice(-6000);
      guardar(est);
    }
    est.ciudadIdx = idx; guardar(est);
    log(`${ciudad}: ${prospectos.length} vistos, ${nuevos} nuevos, +${ab} calidad → ${est.calificados.length}/${OBJETIVO}`);
  }
  log(`LISTO. ${est.calificados.length} leads de CALIDAD (Tier A/B confirmados) acumulados.`);
}
main().catch((e) => { console.error("FALLÓ:", e?.message ?? e); process.exit(1); });

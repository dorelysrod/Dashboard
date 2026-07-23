/**
 * Acumula ~100 leads REALES de medicina estética por toda México (Claude+WebSearch),
 * EXCLUYENDO los que ya existen (Supabase + acumulados en esta corrida) para no
 * gastar tokens en repetidos, y los inserta en Supabase (etapa `nuevo`, sin duplicar).
 * Backup incremental en salida/leads-100.json. Helper local (no app).
 */
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
if (process.env.ANTHROPIC_AUTH_TOKEN?.startsWith("sk-ant-oat")) delete process.env.ANTHROPIC_AUTH_TOKEN;

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const model = "claude-sonnet-5";
const RUBRO = "Medicina estética";
const OBJETIVO = Number(process.env.OBJETIVO || 100);
const NS = "landing";
const CIUDADES = [
  "Guadalajara", "Zapopan", "Tlaquepaque", "Monterrey", "San Pedro Garza García", "Puebla",
  "Querétaro", "Mérida", "León", "San Luis Potosí", "Aguascalientes", "Culiacán", "Hermosillo",
  "Chihuahua", "Ciudad Juárez", "Morelia", "Toluca", "Veracruz", "Boca del Río", "Saltillo",
  "Torreón", "Gómez Palacio", "Cuernavaca", "Ciudad de México", "Naucalpan", "Tlalnepantla",
  "Tijuana", "Mexicali", "Ensenada", "Cancún", "Playa del Carmen", "Cozumel", "Oaxaca",
  "Tuxtla Gutiérrez", "Tapachula", "Durango", "Xalapa", "Coatzacoalcos", "Córdoba", "Orizaba",
  "Pachuca", "Tepic", "Colima", "Villahermosa", "Campeche", "La Paz", "Los Cabos", "Mazatlán",
  "Los Mochis", "Ciudad Obregón", "Nogales", "Reynosa", "Matamoros", "Nuevo Laredo", "Tampico",
  "Ciudad Victoria", "Celaya", "Irapuato", "Salamanca", "Uruapan", "Zamora", "Puerto Vallarta",
  "Acapulco", "Chilpancingo", "Cuautla", "Tehuacán", "Poza Rica", "Zacatecas", "Guanajuato",
  "San Miguel de Allende", "Monclova", "Piedras Negras", "Ciudad del Carmen", "Chetumal",
];

const log = (s: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);
const norm = (s: string) => s.trim().toLowerCase();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface P { nombre: string; ciudad: string | null; rating: number | null; resenas: number | null; nota: string }

async function descubrir(ciudad: string, excluir: string[], limite = 8): Promise<P[]> {
  const yaTengo = excluir.slice(-200);
  const bloque = yaTengo.length ? `\n\nYA TENGO estos (NO los reportes, busca OTROS):\n${yaTengo.map((n) => `- ${n}`).join("\n")}` : "";
  const ac = new AbortController(); let cap: any = null;
  const t = tool("reportar_prospectos", "Reporta prospectos reales.",
    { prospectos: z.array(z.object({ nombre: z.string(), ciudad: z.string().nullable(), rating: z.number().nullable(), resenas: z.number().int().nullable(), nota: z.string() })) },
    async (i: any) => { cap = i; ac.abort(); return { content: [{ type: "text" as const, text: "ok" }] }; });
  const server = createSdkMcpServer({ name: NS, version: "1.0.0", tools: [t] });
  const q = query({ prompt: `Encuentra hasta ${limite} negocios reales de "${RUBRO}" en ${ciudad} (México) que sean buenos prospectos para rehacer su web (sin web o web débil).${bloque}`,
    options: { model, maxTurns: 16, permissionMode: "bypassPermissions", mcpServers: { [NS]: server },
      allowedTools: [`mcp__${NS}__reportar_prospectos`, "WebSearch"],
      disallowedTools: ["Bash", "Read", "Write", "Edit", "WebFetch", "Glob", "Grep", "TodoWrite", "Task"],
      systemPrompt: "Encuentras negocios locales REALES con WebSearch. NO inventes; si no hay, lista vacía. Máximo 3 búsquedas y reporta.",
      settingSources: [], abortController: ac } as any });
  for await (const _ of q as any) { if (cap) break; }
  return cap?.prospectos ?? [];
}

async function retry<T>(fn: () => Promise<T>, n = 3): Promise<T> {
  let last: any;
  for (let i = 0; i <= n; i++) {
    try { return await fn(); }
    catch (e: any) { last = e; if (i === n) throw e; const s = (e?.status === 429 ? 20 : 6) * (i + 1); log(`   ↻ retry ${i + 1}/${n} en ${s}s (${e?.message?.slice(0, 60)})`); await sleep(s * 1000); }
  }
  throw last;
}

async function main() {
  mkdirSync("salida", { recursive: true });
  const { data: existentes, error } = await sb.from("leads").select("negocio");
  if (error) { console.error("Supabase leads select falló:", error.message); process.exit(1); }
  const nombresExistentes = (existentes ?? []).map((r: any) => r.negocio);
  const seen = new Set(nombresExistentes.map(norm));
  log(`Existentes en Supabase: ${nombresExistentes.length}. Objetivo: ${OBJETIVO} nuevos.`);

  const acumulados: P[] = [];
  for (const ciudad of CIUDADES) {
    if (acumulados.length >= OBJETIVO) break;
    const excluir = [...nombresExistentes, ...acumulados.map((a) => a.nombre)];
    let nuevos: P[] = [];
    try { nuevos = await retry(() => descubrir(ciudad, excluir)); }
    catch (e: any) { log(`${ciudad}: falló tras retries (${e?.message?.slice(0, 50)}) — sigo`); continue; }
    let add = 0;
    for (const p of nuevos) {
      if (!p?.nombre || seen.has(norm(p.nombre))) continue;
      seen.add(norm(p.nombre)); acumulados.push({ ...p, ciudad: p.ciudad || ciudad }); add++;
    }
    // Insert incremental en Supabase (etapa nuevo). Insert normal: el dedup en
    // código (seen = existentes + acumulados) ya evita repetidos, así no depende
    // de una restricción única que hoy NO está aplicada en la base.
    if (add) {
      const filas = acumulados.slice(-add).map((p) => ({ negocio: p.nombre, ciudad: p.ciudad, rubro: RUBRO, rating: p.rating, resenas: p.resenas, etapa: "nuevo" }));
      const { error: insErr } = await sb.from("leads").insert(filas);
      if (insErr) log(`   ⚠ insert falló: ${insErr.message}`);
    }
    writeFileSync("salida/leads-100.json", JSON.stringify(acumulados, null, 2));
    log(`${ciudad}: +${add} nuevos → total ${acumulados.length}/${OBJETIVO}`);
  }
  log(`LISTO. ${acumulados.length} leads nuevos acumulados e insertados en Supabase (etapa nuevo). Backup: salida/leads-100.json`);
}
main().catch((e) => { console.error("FALLÓ:", e?.message ?? e); process.exit(1); });

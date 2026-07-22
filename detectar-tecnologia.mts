/**
 * Puebla `leads.tecnologia` para todos los leads que aún no la tienen:
 *   - sin sitio_web                       → "Sin web"
 *   - sitio_web de redes/directorio       → "Solo redes/directorio"
 *   - dominio propio → fetch + detectarTecnologia (lib/data/tecnologia.ts);
 *     si el sitio no responde             → "Web caída / no responde" (¡gancho!)
 * Idempotente (solo toca tecnologia IS NULL). Helper local (no app).
 *
 * Uso: node --import tsx detectar-tecnologia.mts [--rubro "<Nicho>"]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { detectarTecnologia } from "./lib/data/tecnologia";
import { clasificarWebMaps } from "./lib/data/nichos";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const log = (s: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);

const argv = process.argv.slice(2);
const rubro = argv.includes("--rubro") ? argv[argv.indexOf("--rubro") + 1] : null;

async function fetchHtml(url: string): Promise<string | null> {
  const u = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(u, { signal: ac.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; AiLandingPro/1.0)" } });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null;
    return await r.text();
  } catch { return null; } finally { clearTimeout(to); }
}

let q = sb.from("leads").select("id, negocio, sitio_web").is("tecnologia", null);
if (rubro) q = q.eq("rubro", rubro);
const { data: leads, error } = await q;
if (error) { console.error("No se pudieron leer los leads:", error.message); process.exit(1); }

const conteo = new Map<string, number>();
let errores = 0;
for (const l of leads ?? []) {
  let tec: string;
  const sitio = (l.sitio_web ?? "").trim();
  if (!sitio) tec = "Sin web";
  else if (clasificarWebMaps(sitio) === "sin_web") tec = "Solo redes/directorio";
  else {
    const html = await fetchHtml(sitio);
    tec = html ? detectarTecnologia(html) : "Web caída / no responde";
  }
  const { error: e } = await sb.from("leads").update({ tecnologia: tec }).eq("id", l.id);
  if (e) { errores++; log(`✗ ${l.negocio}: ${e.message}`); continue; }
  conteo.set(tec, (conteo.get(tec) ?? 0) + 1);
  if (tec !== "Sin web" && tec !== "Solo redes/directorio") log(`${l.negocio} → ${tec}`);
}

log(`Listo: ${(leads ?? []).length} leads${rubro ? ` [${rubro}]` : ""} · ${errores} errores`);
for (const [tec, n] of [...conteo.entries()].sort((a, b) => b[1] - a[1])) log(`  ${String(n).padStart(3)} × ${tec}`);

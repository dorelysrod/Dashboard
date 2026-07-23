/**
 * FLUJO DIARIO DE PROSPECCIÓN — orquestador compacto de los helpers existentes.
 * Cada día ejecuta, EN ORDEN y de forma incremental (solo lo nuevo):
 *
 *   1. scrape     — google-maps-scraper por cada consulta configurada → CSV
 *   2. importar   — prospectar-nicho.mts (importa + clasifica web + tier + dossier inicial)
 *   3. tecnologia — detectar-tecnologia.mts (idempotente; detecta "web caída")
 *   4. dossier    — dossier-tier-ab.mts SOLO_NUEVOS=1 (OSINT solo A/B sin dossier)
 *   5. contacto   — contacto-ab.mts SOLO_NUEVOS=1 (mensajes solo A/B sin mensajes)
 *   6. mocks      — mocks-tier-a.mts (maqueta para los mejores Tier A sin maqueta)
 *   7. resumen    — salida/resumen-diario-<fecha>.md con lo preparado hoy
 *
 * RESUMIBLE: guarda por etapa en salida/estado-diario.json. Si una etapa cae
 * (p. ej. límite de sesión), la siguiente corrida del día reintenta SOLO las
 * etapas pendientes; al día siguiente el estado se reinicia. launchd lo dispara
 * cada hora (ci/flujo-diario.sh): cuando todo está ok, salir cuesta nada.
 * NO envía nada a nadie: deja todo preparado y TÚ decides en el panel.
 *
 * Config en salida/flujo-diario.config.json:
 *   { "consultas": [{ "consulta": "clinica de estetica en Cuernavaca",
 *                     "ciudad": "Cuernavaca", "nicho": "Medicina estética" }],
 *     "mocksPorDia": 3 }
 * Sin config (o sin scraper instalado) se saltan scrape+importar y el resto
 * sigue trabajando sobre los leads ya existentes.
 *
 * Uso: node --import tsx flujo-diario.mts   ·  FORZAR=1 re-corre todo hoy
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const log = (s: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);
const HOY = new Date().toISOString().slice(0, 10);
const ESTADO = "salida/estado-diario.json";
const CONFIG = "salida/flujo-diario.config.json";
const SCRAPER = path.join(os.homedir(), "go/bin/google-maps-scraper");

interface Estado { fecha: string; etapas: Record<string, "ok" | "error" | "saltada">; }
function leerEstado(): Estado {
  try { const e = JSON.parse(readFileSync(ESTADO, "utf8")) as Estado; if (e.fecha === HOY && process.env.FORZAR !== "1") return e; } catch { /* primer uso */ }
  return { fecha: HOY, etapas: {} };
}
const estado = leerEstado();
function marcar(etapa: string, r: "ok" | "error" | "saltada") { estado.etapas[etapa] = r; writeFileSync(ESTADO, JSON.stringify(estado, null, 2)); }

/** Corre un helper .mts como subproceso; hereda stdout para el log de launchd. */
function correr(etapa: string, args: string[], env: Record<string, string> = {}): boolean {
  log(`▶ ${etapa}: ${args.join(" ")}`);
  const r = spawnSync(args[0], args.slice(1), { stdio: "inherit", env: { ...process.env, ...env } });
  const ok = r.status === 0;
  marcar(etapa, ok ? "ok" : "error");
  log(`${ok ? "✓" : "✗"} ${etapa}${ok ? "" : ` (exit ${r.status})`}`);
  return ok;
}
const pendiente = (etapa: string) => estado.etapas[etapa] !== "ok" && estado.etapas[etapa] !== "saltada";

interface Consulta { consulta: string; ciudad: string; nicho: string; }
interface Config { consultas?: Consulta[]; mocksPorDia?: number; dossiersPorDia?: number; contactosPorDia?: number; }
let config: Config = {};
try { config = JSON.parse(readFileSync(CONFIG, "utf8")); } catch { /* sin config: etapas 1-2 se saltan */ }

async function main() {
  mkdirSync("salida", { recursive: true });
  log(`=== flujo diario ${HOY} — etapas hechas: ${Object.keys(estado.etapas).filter((k) => estado.etapas[k] === "ok").join(", ") || "ninguna"} ===`);

  // 1+2. scrape + importar, por consulta configurada
  const consultas = config.consultas ?? [];
  if (!consultas.length || !existsSync(SCRAPER)) {
    if (pendiente("scrape")) { log(consultas.length ? "scraper no instalado — salto scrape/importar" : "sin consultas en config — salto scrape/importar"); marcar("scrape", "saltada"); marcar("importar", "saltada"); }
  } else {
    for (const [i, c] of consultas.entries()) {
      const tag = `scrape:${i}`, tagImp = `importar:${i}`;
      const csv = `salida/maps-${HOY}-${i}.csv`;
      if (pendiente(tag)) {
        const consultasTxt = `salida/consulta-${HOY}-${i}.txt`;
        writeFileSync(consultasTxt, c.consulta + "\n");
        correr(tag, [SCRAPER, "-input", consultasTxt, "-results", csv, "-depth", "3", "-c", "2"]);
      }
      if (estado.etapas[tag] === "ok" && pendiente(tagImp) && existsSync(csv)) {
        correr(tagImp, ["npx", "tsx", "prospectar-nicho.mts", csv, "--ciudad", c.ciudad, "--nicho", c.nicho]);
      }
    }
  }

  // 3. tecnología (idempotente, gratis)
  if (pendiente("tecnologia")) correr("tecnologia", ["npx", "tsx", "detectar-tecnologia.mts"]);

  // 4. dossier OSINT solo para A/B nuevos, con cupo diario (gasta suscripción)
  if (pendiente("dossier")) correr("dossier", ["npx", "tsx", "dossier-tier-ab.mts"], { SOLO_NUEVOS: "1", LIMITE: String(config.dossiersPorDia ?? 15) });

  // 5. maquetas para los mejores Tier A sin maqueta — ANTES que los mensajes,
  //    para que el correo/WhatsApp salgan con el link del portal + código.
  if (pendiente("mocks")) correr("mocks", ["npx", "tsx", "mocks-tier-a.mts"], { MOCKS: String(config.mocksPorDia ?? 3) });

  // 6. mensajes de contacto solo para A/B sin mensajes, con cupo diario
  //    (gasta suscripción); anexa link+código de la maqueta si ya existe
  if (pendiente("contacto")) correr("contacto", ["npx", "tsx", "contacto-ab.mts"], { SOLO_NUEVOS: "1", LIMITE: String(config.contactosPorDia ?? 15) });

  // 7. resumen del día (siempre se reescribe con el estado más fresco)
  await resumen();

  const pendientes = Object.entries(estado.etapas).filter(([, v]) => v === "error").map(([k]) => k);
  log(pendientes.length ? `=== fin con pendientes: ${pendientes.join(", ")} (la próxima corrida reintenta) ===` : "=== día completo ===");
}

async function resumen() {
  const desde = `${HOY}T00:00:00`;
  const n = async (q: any) => (await q).count ?? 0;
  const nuevosHoy = await n(sb.from("leads").select("id", { count: "exact", head: true }).gte("created_at", desde));
  const tierAHoy = await n(sb.from("leads").select("id", { count: "exact", head: true }).eq("tier", "A").gte("created_at", desde));
  const sinContactar = await n(sb.from("leads").select("id", { count: "exact", head: true }).eq("tier", "A").eq("etapa", "nuevo").not("negocio", "ilike", "%(test)%"));
  const maquetasHoy = await n(sb.from("maquetas").select("id", { count: "exact", head: true }).gte("created_at", desde));
  const md = `# Flujo diario — ${HOY}

| Qué | Cuántos |
|---|---|
| Leads nuevos importados hoy | ${nuevosHoy} |
| Nuevos Tier A hoy | ${tierAHoy} |
| Maquetas generadas hoy | ${maquetasHoy} |
| Tier A listos por contactar (etapa: nuevo) | ${sinContactar} |

Etapas: ${Object.entries(estado.etapas).map(([k, v]) => `${k}=${v}`).join(" · ") || "—"}

Siguiente paso tuyo: abre el Pipeline → chip **Mejores calificados** → revisa los ★ dorados,
su maqueta y sus mensajes en salida/contacto/, y decide a quién escribir. Nada se envió solo.
`;
  writeFileSync(`salida/resumen-diario-${HOY}.md`, md);
  marcar("resumen", "ok");
  log(`resumen → salida/resumen-diario-${HOY}.md (${nuevosHoy} nuevos, ${tierAHoy} tier A, ${maquetasHoy} maquetas)`);
}

main().catch((e) => { console.error("FALLÓ:", e?.message ?? e); process.exit(1); });

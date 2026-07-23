/**
 * Califica OFFLINE todos los leads sin tier usando el motor real de la app
 * (lib/data/scoring.ts), con las señales que ya están en la base — sin llamar
 * a la suscripción. brechaWeb se deriva del sitio_web:
 *   - sin sitio, o solo redes/Linktree → "sin_web" (máxima oportunidad)
 *   - web propia → null (desconocido: el dossier del botón ⭐ la evalúa después)
 * Persiste tier + segmento. Helper local (no app).
 *
 * Uso: node --import tsx calificar-offline-maps.mts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { calificarLead, segmentoDeTier, type BrechaWeb } from "./lib/data/scoring";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const log = (s: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);

const SOLO_REDES = /facebook\.com|instagram\.com|tiktok\.com|linktr\.ee|wa\.me|whatsapp\.com|bit\.ly/i;

function brechaDesdeSitio(sitio: string | null): BrechaWeb | null {
  if (!sitio || !sitio.trim()) return "sin_web";
  if (SOLO_REDES.test(sitio)) return "sin_web"; // solo redes = sin web propia
  return null; // web propia: calidad desconocida hasta enriquecer con el dossier
}

const { data: leads, error } = await sb
  .from("leads")
  .select("id, negocio, rating, resenas, sitio_web")
  .is("tier", null);
if (error) { console.error("No se pudieron leer los leads:", error.message); process.exit(1); }

let a = 0, b = 0, c = 0, errores = 0;
for (const l of leads ?? []) {
  const cal = calificarLead({
    brechaWeb: brechaDesdeSitio(l.sitio_web),
    rating: l.rating,
    resenas: l.resenas,
    ownerOperated: null,
    cadena: null,
    premium: null,
  });
  const { error: e } = await sb
    .from("leads")
    .update({ tier: cal.tier, segmento: segmentoDeTier(cal.tier) })
    .eq("id", l.id);
  if (e) { errores++; log(`✗ ${l.negocio}: ${e.message}`); continue; }
  if (cal.tier === "A") { a++; log(`A ${cal.score} ${l.negocio} — ${cal.motivos[0] ?? ""}`); }
  else if (cal.tier === "B") b++;
  else c++;
}

log(`Calificados ${(leads ?? []).length}: ${a} tier A · ${b} tier B · ${c} tier C · ${errores} errores`);
log(`El tier fino (owner/cadena/premium) lo refina el botón ⭐ del panel por lead.`);

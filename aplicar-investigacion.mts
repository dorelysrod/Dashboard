/**
 * Aplica a Supabase el resultado de la investigación profunda (workflow Fable
 * `investigar-tier-a`): re-puntúa cada lead con el motor real de la app
 * (lib/data/scoring.ts) usando las señales VERIFICADAS por WebSearch (calidad
 * de web, owner-operated, cadena, premium), guarda el dossier de evidencia y
 * corrige tier/segmento. Los no existentes / datos de prueba bajan a tier C.
 * Helper local (no app).
 *
 * Uso: node --import tsx aplicar-investigacion.mts <investigados.json>
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { calificarLead, segmentoDeTier, type BrechaWeb } from "./lib/data/scoring";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const log = (s: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);

interface Investigado {
  id: string; negocio: string; existe: boolean;
  calidadWeb: "sin_web" | "debil" | "decente" | "fuerte" | "desconocido";
  sitioWebReal?: string; instagram?: string;
  ownerOperated: "si" | "no" | "desconocido";
  cadena: "si" | "no" | "desconocido";
  premium: "si" | "no" | "desconocido";
  esClientePotencial: boolean; razon: string; gancho: string;
}

const ruta = process.argv[2];
if (!ruta) { console.error("Uso: node --import tsx aplicar-investigacion.mts <investigados.json>"); process.exit(1); }
const investigados: Investigado[] = JSON.parse(readFileSync(ruta, "utf8"));

const aBool = (v: "si" | "no" | "desconocido"): boolean | null =>
  v === "si" ? true : v === "no" ? false : null;
const aBrecha = (v: Investigado["calidadWeb"]): BrechaWeb | null =>
  v === "desconocido" ? null : v;

let confirmadosA = 0, bajanB = 0, bajanC = 0, inexistentes = 0, errores = 0;
for (const inv of investigados) {
  let tier: "A" | "B" | "C", score: number, motivos: string[];
  if (!inv.existe) {
    tier = "C"; score = 0; motivos = ["No existe / dato de prueba (verificado por investigación)."];
    inexistentes++;
  } else {
    const cal = calificarLead({
      brechaWeb: aBrecha(inv.calidadWeb),
      rating: null, // conservar señal de demanda ya presente: no la pisamos aquí
      resenas: null,
      ownerOperated: aBool(inv.ownerOperated),
      cadena: aBool(inv.cadena),
      premium: aBool(inv.premium),
    });
    // Señal de demanda: releer del lead para puntuar completo.
    const { data: lead } = await sb.from("leads").select("rating, resenas").eq("id", inv.id).maybeSingle();
    const calFull = calificarLead({
      brechaWeb: aBrecha(inv.calidadWeb),
      rating: lead?.rating ?? null,
      resenas: lead?.resenas ?? null,
      ownerOperated: aBool(inv.ownerOperated),
      cadena: aBool(inv.cadena),
      premium: aBool(inv.premium),
    });
    tier = calFull.tier; score = calFull.score; motivos = calFull.motivos;
    void cal;
  }

  const dossier = {
    origen: "investigacion-fable",
    fecha: new Date().toISOString().slice(0, 10),
    existe: inv.existe,
    calidadWeb: inv.calidadWeb,
    sitioWeb: inv.sitioWebReal || null,
    instagram: inv.instagram || null,
    ownerOperated: inv.ownerOperated,
    cadena: inv.cadena,
    premium: inv.premium,
    esClientePotencial: inv.esClientePotencial,
    razon: inv.razon,
    ganchoDolor: inv.gancho,
    score,
    motivos,
  };

  const cambios: Record<string, unknown> = { tier, segmento: segmentoDeTier(tier), dossier };
  if (inv.sitioWebReal && inv.sitioWebReal.trim()) cambios.sitio_web = inv.sitioWebReal.trim();

  const { error } = await sb.from("leads").update(cambios).eq("id", inv.id);
  if (error) { errores++; log(`✗ ${inv.negocio}: ${error.message}`); continue; }

  if (!inv.existe) log(`💀 C ${inv.negocio} — no existe / prueba`);
  else if (tier === "A") { confirmadosA++; log(`✅ A ${score} ${inv.negocio} — ${inv.gancho}`); }
  else if (tier === "B") { bajanB++; log(`↓ B ${score} ${inv.negocio} — ${inv.razon.slice(0, 90)}`); }
  else { bajanC++; log(`↓ C ${score} ${inv.negocio} — ${inv.razon.slice(0, 90)}`); }
}

log(`Aplicado: ${confirmadosA} confirmados A · ${bajanB} bajan a B · ${bajanC} bajan a C · ${inexistentes} inexistentes · ${errores} errores`);

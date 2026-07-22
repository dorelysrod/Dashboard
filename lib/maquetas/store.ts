import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Persistencia de maquetas. Ambas operaciones (guardar desde el panel, leer por
 * token desde la vista pública) corren server-side y usan la SERVICE ROLE key,
 * que omite RLS — así el cliente sin login puede ver SU maqueta por token sin
 * exponer el resto de la tabla, y nunca sale una credencial al navegador.
 *
 * Fallback DEV: sin Supabase configurado, guarda en un Map en memoria (vive lo
 * que dure el proceso de `next dev`). Suficiente para probar local; en producción
 * se usa la tabla `maquetas`.
 */

export interface Maqueta {
  token: string;
  numero?: number | null;
  leadId: string | null;
  titulo: string;
  html: string;
  origen: "nueva" | "redisenio";
  urlFuente: string | null;
  expiraAt: string; // ISO
  /** Candado del portal: email del prospecto + código de acceso. */
  email?: string | null;
  codigo?: string | null;
}

function clienteAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Fallback en memoria (solo dev, sin Supabase). Vive en globalThis para
// compartirse entre bundles de rutas distintas (Next empaqueta cada route por
// separado; un `const` a nivel de módulo NO se comparte, globalThis SÍ).
const g = globalThis as unknown as {
  __maquetasMem?: Map<string, Maqueta>;
  __maquetaVistasMem?: { numero: number; at: number }[];
};
const memoria: Map<string, Maqueta> = (g.__maquetasMem ??= new Map());
const vistasMem: { numero: number; at: number }[] = (g.__maquetaVistasMem ??= []);

export interface Vistas {
  /** Cuántas veces se abrió la propuesta (tras el candado). */
  total: number;
  /** ISO de la última apertura, o null si nunca se abrió. */
  ultima: string | null;
}

/** Guarda una maqueta y devuelve su `numero` público (asignado por la BD). */
export async function guardarMaqueta(m: Maqueta): Promise<{ numero: number | null }> {
  const admin = clienteAdmin();
  if (!admin) {
    const numero = memoria.size + 1;
    memoria.set(m.token, { ...m, numero });
    return { numero };
  }
  const { data, error } = await admin
    .from("maquetas")
    .insert({
      lead_id: m.leadId,
      token: m.token,
      titulo: m.titulo,
      html: m.html,
      origen: m.origen,
      url_fuente: m.urlFuente,
      expira_at: m.expiraAt,
      email: m.email ?? null,
      codigo: m.codigo ?? null,
    })
    .select("numero")
    .single();
  if (error) throw error;
  return { numero: (data?.numero as number) ?? null };
}

function aMaqueta(data: any): Maqueta {
  return {
    token: data.token,
    numero: data.numero ?? null,
    leadId: data.lead_id,
    titulo: data.titulo ?? "",
    html: data.html,
    origen: (data.origen as Maqueta["origen"]) ?? "nueva",
    urlFuente: data.url_fuente ?? null,
    expiraAt: data.expira_at,
    email: data.email ?? null,
    codigo: data.codigo ?? null,
  };
}

const norm = (s: string) => s.trim().toLowerCase();

/** Maqueta MÁS RECIENTE de un lead (para el botón "Ver maqueta" del panel). null si no hay. */
export async function maquetaDeLead(
  leadId: string,
): Promise<{ numero: number | null; codigo: string | null; vistas: Vistas } | null> {
  const admin = clienteAdmin();
  if (!admin) {
    let mejor: Maqueta | null = null;
    for (const m of memoria.values()) if (m.leadId === leadId) mejor = m;
    if (!mejor) return null;
    const vistas = mejor.numero ? await vistasDeNumero(mejor.numero) : { total: 0, ultima: null };
    return { numero: mejor.numero ?? null, codigo: mejor.codigo ?? null, vistas };
  }
  const { data } = await admin
    .from("maquetas")
    .select("numero, codigo")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const numero = (data.numero as number) ?? null;
  const vistas = numero ? await vistasDeNumero(numero) : { total: 0, ultima: null };
  return { numero, codigo: (data.codigo as string) ?? null, vistas };
}

/** Lee una maqueta por número (sin verificar acceso); null si no existe/expiró. */
export async function leerMaquetaPorNumero(numero: number): Promise<Maqueta | null> {
  const ahora = Date.now();
  const admin = clienteAdmin();
  if (!admin) {
    for (const m of memoria.values()) if (m.numero === numero) return new Date(m.expiraAt).getTime() > ahora ? m : null;
    return null;
  }
  const { data, error } = await admin.from("maquetas").select("*").eq("numero", numero).maybeSingle();
  if (error || !data) return null;
  if (new Date(data.expira_at).getTime() <= ahora) return null;
  return aMaqueta(data);
}

/**
 * Verifica el candado del portal: email + código correctos y no expirada.
 * Devuelve la maqueta si pasa, null si no. Email case-insensitive; código exacto.
 */
export async function verificarAcceso(numero: number, email: string, codigo: string): Promise<Maqueta | null> {
  const m = await leerMaquetaPorNumero(numero);
  if (!m) return null;
  const emailOk = !m.email || norm(m.email) === norm(email); // si no se fijó email, basta el código
  const codigoOk = Boolean(m.codigo) && m.codigo === codigo.trim();
  return emailOk && codigoOk ? m : null;
}

/**
 * Registra una VISTA del portal (el prospecto abrió su propuesta tras el candado).
 * Fire-and-forget desde /p/[numero]; nunca rompe la vista si falla. No guarda IP
 * ni email (GDPR): solo el número y el momento.
 */
export async function registrarVista(numero: number): Promise<void> {
  const admin = clienteAdmin();
  if (!admin) {
    vistasMem.push({ numero, at: Date.now() });
    return;
  }
  await admin.from("maqueta_vistas").insert({ numero });
}

/** Agregado de vistas de una propuesta: total + última apertura. */
export async function vistasDeNumero(numero: number): Promise<Vistas> {
  const admin = clienteAdmin();
  if (!admin) {
    const propias = vistasMem.filter((v) => v.numero === numero);
    const ultima = propias.length ? Math.max(...propias.map((v) => v.at)) : null;
    return { total: propias.length, ultima: ultima ? new Date(ultima).toISOString() : null };
  }
  const { data, count } = await admin
    .from("maqueta_vistas")
    .select("vista_at", { count: "exact" })
    .eq("numero", numero)
    .order("vista_at", { ascending: false })
    .limit(1);
  return { total: count ?? 0, ultima: (data?.[0]?.vista_at as string) ?? null };
}

/** Lee una maqueta por token si existe y NO ha expirado. null en otro caso. */
export async function leerMaquetaPorToken(token: string): Promise<Maqueta | null> {
  const ahora = Date.now();
  const admin = clienteAdmin();

  if (!admin) {
    const m = memoria.get(token);
    if (!m) return null;
    return new Date(m.expiraAt).getTime() > ahora ? m : null;
  }

  const { data, error } = await admin
    .from("maquetas")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  if (new Date(data.expira_at).getTime() <= ahora) return null;

  return {
    token: data.token,
    leadId: data.lead_id,
    titulo: data.titulo ?? "",
    html: data.html,
    origen: (data.origen as Maqueta["origen"]) ?? "nueva",
    urlFuente: data.url_fuente ?? null,
    expiraAt: data.expira_at,
  };
}

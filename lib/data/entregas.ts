import type { DiaSemana, EtapaLead } from "@/lib/types/db";
import type { EstadoEtapa } from "@/lib/types/dominio";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import { mapearEtapa } from "./mapeo";
import { obtenerTodasLasFilas, type ResultadoLote } from "./lotes";
import { LEADS } from "./seed";

/**
 * Servicio de Entregas (primer corte del motor de Entregas, §M5). Lista los
 * proyectos en marcha (aceptado/en desarrollo) y estima la fecha de entrega
 * contando el esfuerzo en días contra TU disponibilidad real (tabla
 * `disponibilidad`). Con fallback al seed si no hay base cableada.
 */
export interface Entrega {
  id: string;
  cliente: string;
  detalle: string;
  esfuerzoDias: number;
  entregaEstimada: string | null;
  etapa: EstadoEtapa;
}

// Solo proyectos EN MARCHA: un lead 'entregado' se quedaba listado para
// siempre con una fecha estimada futura recalculada cada día (ficticia).
const ETAPAS_PROYECTO: EtapaLead[] = ["aceptado", "en_desarrollo"];

/** Código de día (`disponibilidad`) → índice de getDay() (0=domingo). */
const DIA_A_GETDAY: Record<DiaSemana, number> = {
  DO: 0,
  LU: 1,
  MA: 2,
  MI: 3,
  JU: 4,
  VI: 5,
  SA: 6,
};

const fechaCorta = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/**
 * Suma `esfuerzoDias` días hábiles a `desde`, donde "hábil" = un día con
 * disponibilidad (`diasHabiles`, índices de getDay()). Devuelve la fecha de
 * entrega estimada. Si no hay disponibilidad, asume lunes–viernes.
 */
function estimarEntrega(
  esfuerzoDias: number,
  diasHabiles: Set<number>,
  desde: Date,
): Date {
  const habiles = diasHabiles.size > 0 ? diasHabiles : new Set([1, 2, 3, 4, 5]);
  let restante = Math.ceil(esfuerzoDias);
  const d = new Date(desde);
  let guarda = 0;
  while (restante > 0 && guarda < 3650) {
    d.setDate(d.getDate() + 1);
    if (habiles.has(d.getDay())) restante--;
    guarda++;
  }
  return d;
}

function entregasDesdeSeed(): Entrega[] {
  return LEADS.filter((l) => l.etapa.css === "st-dev" || l.etapa.css === "st-ac").map(
    (l) => {
      const fecha = estimarEntrega(l.esfuerzoDias, new Set(), new Date());
      return {
        id: l.id,
        cliente: l.nombre,
        detalle: l.modulos.join(" + ") || l.tecnologia || "—",
        esfuerzoDias: l.esfuerzoDias,
        entregaEstimada: fechaCorta.format(fecha),
        etapa: l.etapa,
      };
    },
  );
}

interface FilaProyecto {
  id: string;
  negocio: string;
  esfuerzo_dias: number | null;
  etapa: EtapaLead;
  tecnologia: string | null;
  cotizaciones: { modulos: string[]; created_at: string }[] | null;
}

export async function obtenerEntregas(): Promise<Entrega[]> {
  if (!supabaseConfigurado()) return entregasDesdeSeed();

  const supabase = await crearClienteServidor();

  // Proyectos por LOTES (T-008): sin .range() se truncaba en silencio a 1000 y
  // el plan de entregas ignoraría proyectos reales. `disponibilidad` son ≤7
  // filas (una por día) — un select directo basta. No degradar en silencio:
  // un error en cualquier lote o en dispo se propaga (sin este check, un fallo
  // de `disponibilidad` calculaba fechas con el fallback lunes–viernes mientras
  // el aviso de capacidad decía otra cosa).
  const [proyectos, dispoRes] = await Promise.all([
    obtenerTodasLasFilas<FilaProyecto>((desde, hasta) =>
      supabase
        .from("leads")
        .select("id, negocio, esfuerzo_dias, etapa, tecnologia, cotizaciones(modulos, created_at)")
        .in("etapa", ETAPAS_PROYECTO)
        .order("esfuerzo_dias", { ascending: true })
        .order("id", { ascending: true })
        .range(desde, hasta) as unknown as PromiseLike<ResultadoLote<FilaProyecto>>,
    ),
    supabase.from("disponibilidad").select("dia, horas"),
  ]);
  if (dispoRes.error) throw dispoRes.error;

  const diasHabiles = new Set(
    (dispoRes.data ?? [])
      .filter((d) => Number(d.horas) > 0)
      .map((d) => DIA_A_GETDAY[d.dia as DiaSemana]),
  );

  const hoy = new Date();
  return proyectos.map((p) => {
    const cotz = [...(p.cotizaciones ?? [])].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )[0];
    const esfuerzo = p.esfuerzo_dias ?? 0;
    const fecha =
      esfuerzo > 0 ? estimarEntrega(esfuerzo, diasHabiles, hoy) : null;
    return {
      id: p.id,
      cliente: p.negocio,
      detalle: cotz?.modulos?.join(" + ") || p.tecnologia || "—",
      esfuerzoDias: esfuerzo,
      entregaEstimada: fecha ? fechaCorta.format(fecha) : null,
      etapa: mapearEtapa(p.etapa),
    };
  });
}

/** Nº de días/semana con disponibilidad (para el aviso de capacidad). */
export async function diasPorSemana(): Promise<number> {
  if (!supabaseConfigurado()) return 5;
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("disponibilidad")
    .select("dia, horas");
  // Ante error, lanzar: devolver 0 pintaba "0 días/semana de capacidad" junto
  // a fechas calculadas con 5 días — datos contradictorios en la misma vista.
  if (error) throw error;
  return (data ?? []).filter((d) => Number(d.horas) > 0).length;
}

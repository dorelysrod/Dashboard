import type { EstadoFactura, TipoFactura } from "@/lib/types/db";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";
import { obtenerTodasLasFilas, type ResultadoLote } from "./lotes";

/**
 * Servicio de Facturación. Lee `facturas` (join con `clientes` para el nombre) y
 * las presenta para la vista. La UI no consulta Supabase directo (CLAUDE.md §1).
 * Fallback: lista vacía si no hay base cableada (el seed no trae facturas demo
 * fuera de Supabase). El PDF/CFDI es un módulo aparte (M6).
 */
export interface Factura {
  id: string;
  cliente: string;
  concepto: string;
  eur: number;
  mxn: number;
  tipo: TipoFactura;
  estado: EstadoFactura;
  fecha: string | null;
}

export interface ResumenFacturas {
  facturas: Factura[];
  totalPagadoEur: number;
  totalPendienteEur: number;
}

interface FilaFactura {
  id: string;
  concepto: string | null;
  mxn: number | null;
  eur: number | null;
  tipo: TipoFactura;
  estado: EstadoFactura;
  fecha: string | null;
  clientes: { nombre: string | null } | { nombre: string | null }[] | null;
}

function nombreCliente(c: FilaFactura["clientes"]): string {
  const obj = Array.isArray(c) ? c[0] : c;
  return obj?.nombre ?? "—";
}

/** Una factura por id (vista imprimible). Null si no existe o no hay base. */
export async function obtenerFactura(id: string): Promise<Factura | null> {
  if (!supabaseConfigurado()) return null;

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("facturas")
    .select("id, concepto, mxn, eur, tipo, estado, fecha, clientes(nombre)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const f = data as FilaFactura;
  return {
    id: f.id,
    cliente: nombreCliente(f.clientes),
    concepto: f.concepto ?? "—",
    eur: f.eur ?? 0,
    mxn: f.mxn ?? 0,
    tipo: f.tipo,
    estado: f.estado,
    fecha: f.fecha,
  };
}

export async function obtenerFacturas(): Promise<ResumenFacturas> {
  if (!supabaseConfigurado()) {
    return { facturas: [], totalPagadoEur: 0, totalPendienteEur: 0 };
  }

  const supabase = await crearClienteServidor();
  // Por LOTES (T-008): sin .range() la lista y los totales se truncaban en
  // silencio a la factura #1000. `id` como desempate: fecha puede repetirse y
  // el paginado por lotes exige orden total estable.
  const data = await obtenerTodasLasFilas<FilaFactura>((desde, hasta) =>
    supabase
      .from("facturas")
      .select("id, concepto, mxn, eur, tipo, estado, fecha, clientes(nombre)")
      .order("fecha", { ascending: false })
      .order("id", { ascending: true })
      .range(desde, hasta) as unknown as PromiseLike<ResultadoLote<FilaFactura>>,
  );

  const facturas: Factura[] = data.map((f) => ({
    id: f.id,
    cliente: nombreCliente(f.clientes),
    concepto: f.concepto ?? "—",
    eur: f.eur ?? 0,
    mxn: f.mxn ?? 0,
    tipo: f.tipo,
    estado: f.estado,
    fecha: f.fecha,
  }));

  const totalPagadoEur = facturas
    .filter((f) => f.estado === "pagada")
    .reduce((s, f) => s + f.eur, 0);
  const totalPendienteEur = facturas
    .filter((f) => f.estado === "pendiente")
    .reduce((s, f) => s + f.eur, 0);

  return { facturas, totalPagadoEur, totalPendienteEur };
}

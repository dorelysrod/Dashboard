import type { EstadoFactura, TipoFactura } from "@/lib/types/db";
import { crearClienteServidor } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/configurado";

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

export async function obtenerFacturas(): Promise<ResumenFacturas> {
  if (!supabaseConfigurado()) {
    return { facturas: [], totalPagadoEur: 0, totalPendienteEur: 0 };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("facturas")
    .select("id, concepto, mxn, eur, tipo, estado, fecha, clientes(nombre)")
    .order("fecha", { ascending: false });

  if (error) throw error;

  const facturas: Factura[] = (data as FilaFactura[]).map((f) => ({
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

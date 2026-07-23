import Link from "next/link";
import type { Nicho } from "@/lib/types/dominio";
import { obtenerLeadsPagina } from "@/lib/data/leads";
import { esNicho, mapearNicho, NICHOS } from "@/lib/data/mapeo";
import { normalizarPagina } from "@/lib/data/paginacion";
import { LeadRow } from "@/components/panel/LeadRow";

/** Estado de filtros del pipeline; la URL es la única fuente de verdad. */
interface FiltrosPipeline {
  nicho: Nicho | null;
  calificados: boolean;
  conResenas: boolean;
  inspeccionados: boolean;
}

/**
 * URL del pipeline con filtros/página. Omite cada param en su valor por
 * defecto (filtro apagado / página 1) para URLs limpias y compartibles.
 */
function urlPipeline(filtros: FiltrosPipeline, pagina: number): string {
  const q = new URLSearchParams();
  if (filtros.nicho) q.set("nicho", filtros.nicho);
  if (filtros.calificados) q.set("calificados", "1");
  if (filtros.conResenas) q.set("resenas", "1");
  if (filtros.inspeccionados) q.set("inspeccionados", "1");
  if (pagina > 1) q.set("pagina", String(pagina));
  const s = q.toString();
  return s ? `/pipeline?${s}` : "/pipeline";
}

/** Chips de calidad: texto visible + toggle sobre el estado actual. */
const CHIPS_CALIDAD = [
  { clave: "calificados", label: "Mejores calificados" },
  { clave: "conResenas", label: "Con reseñas" },
  { clave: "inspeccionados", label: "Inspeccionados" },
] as const;

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{
    nicho?: string;
    pagina?: string;
    calificados?: string;
    resenas?: string;
    inspeccionados?: string;
  }>;
}) {
  const params = await searchParams;
  const filtros: FiltrosPipeline = {
    nicho: esNicho(params.nicho) ? params.nicho : null,
    calificados: params.calificados === "1",
    conResenas: params.resenas === "1",
    inspeccionados: params.inspeccionados === "1",
  };
  const hayFiltros =
    filtros.nicho !== null ||
    filtros.calificados ||
    filtros.conResenas ||
    filtros.inspeccionados;

  const { items: leads, total, pagina, totalPaginas } = await obtenerLeadsPagina({
    pagina: normalizarPagina(params.pagina),
    nicho: filtros.nicho ?? undefined,
    calificados: filtros.calificados,
    conResenas: filtros.conResenas,
    inspeccionados: filtros.inspeccionados,
  });

  return (
    <section className="view">
      <h2 className="vh">Pipeline</h2>
      <div className="vsub">
        Toca un lead para ver inspección, cotización, correo y seguimiento.
      </div>
      <nav className="chips" aria-label="Filtrar por nicho">
        <Link
          href={urlPipeline({ ...filtros, nicho: null }, 1)}
          className={`chip ${filtros.nicho === null ? "on" : ""}`}
          aria-current={filtros.nicho === null ? "true" : undefined}
        >
          Todos
        </Link>
        {NICHOS.map((n) => (
          <Link
            key={n}
            href={urlPipeline({ ...filtros, nicho: n }, 1)}
            className={`chip ${filtros.nicho === n ? "on" : ""}`}
            aria-current={filtros.nicho === n ? "true" : undefined}
          >
            {mapearNicho(n).label}
          </Link>
        ))}
      </nav>
      <nav className="chips" aria-label="Filtrar por calidad">
        {CHIPS_CALIDAD.map(({ clave, label }) => {
          const activo = filtros[clave];
          return (
            <Link
              key={clave}
              href={urlPipeline({ ...filtros, [clave]: !activo }, 1)}
              className={`chip ${activo ? "on" : ""}`}
              aria-current={activo ? "true" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="panel">
        {leads.map((l) => (
          <LeadRow key={l.id} lead={l} mostrarEtapa />
        ))}
        {leads.length === 0 && (
          <div className="note" role="status">
            {hayFiltros
              ? "No hay leads que coincidan con los filtros seleccionados. Prueba otra combinación o búscalos en la vista Buscar."
              : "No hay leads todavía. Búscalos en la vista Buscar."}
          </div>
        )}
      </div>
      {totalPaginas > 1 && (
        <nav className="pag" aria-label="Paginación de leads">
          {pagina > 1 ? (
            <Link className="pbtn" href={urlPipeline(filtros, pagina - 1)}>
              ← Anterior
            </Link>
          ) : (
            <span className="pbtn off" aria-disabled="true">
              ← Anterior
            </span>
          )}
          <span className="pinfo" aria-live="polite">
            Página {pagina} de {totalPaginas} · {total} leads
          </span>
          {pagina < totalPaginas ? (
            <Link className="pbtn" href={urlPipeline(filtros, pagina + 1)}>
              Siguiente →
            </Link>
          ) : (
            <span className="pbtn off" aria-disabled="true">
              Siguiente →
            </span>
          )}
        </nav>
      )}
    </section>
  );
}

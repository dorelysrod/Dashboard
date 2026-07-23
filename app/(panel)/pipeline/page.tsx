import Link from "next/link";
import type { Nicho } from "@/lib/types/dominio";
import { obtenerLeadsPagina } from "@/lib/data/leads";
import { esNicho, mapearNicho, NICHOS } from "@/lib/data/mapeo";
import { normalizarPagina } from "@/lib/data/paginacion";
import { LeadRow } from "@/components/panel/LeadRow";

/** URL del pipeline con filtro/página (omite params en su valor por defecto). */
function urlPipeline(nicho: Nicho | null, pagina: number): string {
  const q = new URLSearchParams();
  if (nicho) q.set("nicho", nicho);
  if (pagina > 1) q.set("pagina", String(pagina));
  const s = q.toString();
  return s ? `/pipeline?${s}` : "/pipeline";
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ nicho?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const nicho = esNicho(params.nicho) ? params.nicho : null;
  const { items: leads, total, pagina, totalPaginas } = await obtenerLeadsPagina({
    pagina: normalizarPagina(params.pagina),
    nicho: nicho ?? undefined,
  });

  return (
    <section className="view">
      <h2 className="vh">Pipeline</h2>
      <div className="vsub">
        Toca un lead para ver inspección, cotización, correo y seguimiento.
      </div>
      <nav className="chips" aria-label="Filtrar por nicho">
        <Link
          href={urlPipeline(null, 1)}
          className={`chip ${nicho === null ? "on" : ""}`}
          aria-current={nicho === null ? "true" : undefined}
        >
          Todos
        </Link>
        {NICHOS.map((n) => (
          <Link
            key={n}
            href={urlPipeline(n, 1)}
            className={`chip ${nicho === n ? "on" : ""}`}
            aria-current={nicho === n ? "true" : undefined}
          >
            {mapearNicho(n).label}
          </Link>
        ))}
      </nav>
      <div className="panel">
        {leads.map((l) => (
          <LeadRow key={l.id} lead={l} mostrarEtapa />
        ))}
        {leads.length === 0 && (
          <div className="note" role="status">
            No hay leads en este nicho todavía. Búscalos en la vista Buscar.
          </div>
        )}
      </div>
      {totalPaginas > 1 && (
        <nav className="pag" aria-label="Paginación de leads">
          {pagina > 1 ? (
            <Link className="pbtn" href={urlPipeline(nicho, pagina - 1)}>
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
            <Link className="pbtn" href={urlPipeline(nicho, pagina + 1)}>
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

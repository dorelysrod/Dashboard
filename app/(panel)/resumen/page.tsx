import { obtenerLeads } from "@/lib/data/leads";
import { accionesDeHoy, obtenerResumen } from "@/lib/data/resumen";
import { LeadRow } from "@/components/panel/LeadRow";
import { fE } from "@/lib/format";

export default async function ResumenPage() {
  const [kpis, leads] = await Promise.all([obtenerResumen(), obtenerLeads()]);
  const calientes = [...leads]
    .sort((a, b) => b.aperturas - a.aperturas || b.mxn - a.mxn)
    .slice(0, 4);
  const acciones = accionesDeHoy(leads);

  return (
    <section className="view">
      <div className="kpis">
        <div className="kpi">
          <div className="k">Leads</div>
          <div className="v">{kpis.totalLeads}</div>
          <div className="s">+{kpis.leadsSemana} esta semana</div>
        </div>
        <div className="kpi">
          <div className="k">Cotiz. enviadas</div>
          <div className="v">{kpis.cotizEnviadas}</div>
          <div className="s">de {kpis.totalLeads}</div>
        </div>
        <div className="kpi">
          <div className="k">% abiertas</div>
          <div className="v">{kpis.pctAbiertas}%</div>
          <div className="s">
            {kpis.correosAbiertos} de {kpis.correosEnviados}
          </div>
        </div>
        <div className="kpi win">
          <div className="k">Aceptadas</div>
          <div className="v">{kpis.aceptadas}</div>
          <div className="s">en desarrollo</div>
        </div>
        <div className="kpi">
          <div className="k">En pipeline</div>
          <div className="v">{fE.format(kpis.pipelineEur)}</div>
          <div className="s">abierto</div>
        </div>
        <div className="kpi mrr">
          <div className="k">MRR dashboards</div>
          <div className="v">{fE.format(kpis.mrrEur)}</div>
          <div className="s">{kpis.suscripcionesActivas} activos</div>
        </div>
      </div>

      <div className="cols">
        <div className="panel">
          <h3>
            Acciones de hoy <span className="pill">{acciones.length}</span>
          </h3>
          {acciones.length === 0 && (
            <div className="note">Sin acciones urgentes ahora mismo.</div>
          )}
          {acciones.map((a) => (
            <div className="todo" key={a.id}>
              <span className={`dt ${a.tono}`} />
              <div>
                {a.motivo} <span>{a.sugerencia}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <h3>
            Leads calientes <span className="pill">dinero × esfuerzo</span>
          </h3>
          {calientes.map((l) => (
            <LeadRow key={l.id} lead={l} mostrarEtapa={false} />
          ))}
        </div>
      </div>
    </section>
  );
}

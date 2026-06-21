import { obtenerLeadsCalientes } from "@/lib/data/leads";
import { LeadRow } from "@/components/panel/LeadRow";

export default async function ResumenPage() {
  const calientes = await obtenerLeadsCalientes(4);

  return (
    <section className="view">
      <div className="kpis">
        <div className="kpi">
          <div className="k">Leads</div>
          <div className="v">47</div>
          <div className="s">+12 esta semana</div>
        </div>
        <div className="kpi">
          <div className="k">Cotiz. enviadas</div>
          <div className="v">9</div>
          <div className="s">de 47</div>
        </div>
        <div className="kpi">
          <div className="k">% abiertas</div>
          <div className="v">67%</div>
          <div className="s">6 de 9</div>
        </div>
        <div className="kpi win">
          <div className="k">Aceptadas</div>
          <div className="v">2</div>
          <div className="s">en desarrollo</div>
        </div>
        <div className="kpi">
          <div className="k">En pipeline</div>
          <div className="v">€3.1k</div>
          <div className="s">abierto</div>
        </div>
        <div className="kpi mrr">
          <div className="k">MRR dashboards</div>
          <div className="v">€90</div>
          <div className="s">2 activos</div>
        </div>
      </div>

      <div className="cols">
        <div className="panel">
          <h3>
            Acciones de hoy <span className="pill">4</span>
          </h3>
          <div className="todo">
            <span className="dt hot" />
            <div>
              <b>Dra. Valeria Núñez</b> abrió la cotización <b>3 veces</b>, sin
              responder. <span>→ Mándale seguimiento.</span>
            </div>
          </div>
          <div className="todo">
            <span className="dt hot" />
            <div>
              <b>Dr. Mateo Ríos</b> hizo clic en el link.{" "}
              <span>→ Lead caliente, agéndale llamada.</span>
            </div>
          </div>
          <div className="todo">
            <span className="dt warn" />
            <div>
              <b>Clínica Lumina</b> lleva 3 días sin abrir el correo.{" "}
              <span>→ Reenvía con otro asunto.</span>
            </div>
          </div>
          <div className="todo">
            <span className="dt go" />
            <div>
              Entrega de <b>Dra. Camila Reyes</b> vence en <b>4 días</b>.{" "}
              <span>→ En desarrollo.</span>
            </div>
          </div>
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

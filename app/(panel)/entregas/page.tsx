import { diasPorSemana, obtenerEntregas } from "@/lib/data/entregas";

/** Entregas: proyectos en marcha con fecha estimada contra tu disponibilidad real. */
export default async function EntregasPage() {
  const [entregas, dias] = await Promise.all([
    obtenerEntregas(),
    diasPorSemana(),
  ]);

  return (
    <section className="view">
      <h2 className="vh">Entregas</h2>
      <div className="vsub">
        Fechas calculadas del alcance contra tu disponibilidad real.
      </div>
      <div className="panel">
        {entregas.length === 0 ? (
          <div className="note">No tienes proyectos en marcha ahora mismo.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Esfuerzo</th>
                <th>Entrega estimada</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {entregas.map((e) => (
                <tr key={e.id}>
                  <td>
                    <b>{e.cliente}</b>
                    <br />
                    <small style={{ color: "var(--muted)" }}>{e.detalle}</small>
                  </td>
                  <td>{e.esfuerzoDias} días</td>
                  <td>
                    <b>{e.entregaEstimada ?? "—"}</b>
                  </td>
                  <td>
                    <span className={`stage ${e.etapa.css}`}>{e.etapa.label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="note">
          ⚠️ Con {dias} días/semana de capacidad, las fechas se recalculan contra
          tu disponibilidad real. El sistema te avisa antes de aceptar un proyecto
          que empuje las entregas.
        </div>
      </div>
    </section>
  );
}

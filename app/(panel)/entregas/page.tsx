/** Contenido estático del contrato visual; cobra vida con el motor de Entregas (M5). */
export default function EntregasPage() {
  return (
    <section className="view">
      <h2 className="vh">Entregas</h2>
      <div className="vsub">
        Fechas calculadas del alcance contra tu disponibilidad real.
      </div>
      <div className="panel">
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
            <tr>
              <td>
                <b>Dr. Mateo Ríos</b>
                <br />
                <small style={{ color: "var(--muted)" }}>
                  React + agenda + bilingüe
                </small>
              </td>
              <td>10 días</td>
              <td>
                <b>vie 4 jul</b>
              </td>
              <td>
                <span className="stage st-dev">En desarrollo</span>
              </td>
            </tr>
            <tr>
              <td>
                <b>Dra. Camila Reyes</b>
                <br />
                <small style={{ color: "var(--muted)" }}>React + agenda</small>
              </td>
              <td>8 días</td>
              <td>
                <b>mié 25 jun</b>
              </td>
              <td>
                <span className="stage st-dev">En desarrollo</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="note">
          ⚠️ Con 3 días/semana, aceptar un 3.er proyecto ahora empujaría la
          entrega a mediados de julio. El sistema te avisa antes de aceptar.
        </div>
      </div>
    </section>
  );
}

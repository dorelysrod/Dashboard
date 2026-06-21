/** Contenido estático del contrato visual; las acciones (Ver PDF) se cablean en M5/M6. */
export default function FacturaPage() {
  return (
    <section className="view">
      <h2 className="vh">Facturación</h2>
      <div className="vsub">
        Se genera la factura al aceptar. Seguimiento de pagos y MRR.
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Concepto</th>
              <th>Monto</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Dr. Mateo Ríos</td>
              <td>Build + agenda + bilingüe</td>
              <td className="mono">€905</td>
              <td className="pend">Pendiente</td>
              <td>
                <button className="btn" style={{ padding: "5px 10px" }}>
                  Ver PDF
                </button>
              </td>
            </tr>
            <tr>
              <td>Dra. Camila Reyes</td>
              <td>Build + agenda</td>
              <td className="mono">€745</td>
              <td className="paid">Pagada</td>
              <td>
                <button className="btn" style={{ padding: "5px 10px" }}>
                  Ver PDF
                </button>
              </td>
            </tr>
            <tr>
              <td>Dr. Mateo Ríos</td>
              <td>Dashboard métricas (mes)</td>
              <td className="mono">€45</td>
              <td className="paid">Pagada</td>
              <td>
                <button className="btn" style={{ padding: "5px 10px" }}>
                  Ver PDF
                </button>
              </td>
            </tr>
            <tr>
              <td>Dra. Camila Reyes</td>
              <td>Dashboard métricas (mes)</td>
              <td className="mono">€45</td>
              <td className="paid">Pagada</td>
              <td>
                <button className="btn" style={{ padding: "5px 10px" }}>
                  Ver PDF
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="note">
          Factura/proforma en PDF lista. Para CFDI fiscal (MX) o factura con BTW
          (NL) se conecta un módulo aparte según tu entidad.
        </div>
      </div>
    </section>
  );
}

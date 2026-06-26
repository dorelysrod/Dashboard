import { obtenerFacturas } from "@/lib/data/facturas";
import { FacturaEstado } from "@/components/panel/FacturaEstado";
import { fE } from "@/lib/format";

/** Facturación: facturas reales desde Supabase, con seguimiento de pagos. */
export default async function FacturaPage() {
  const { facturas, totalPagadoEur, totalPendienteEur } = await obtenerFacturas();

  return (
    <section className="view">
      <h2 className="vh">Facturación</h2>
      <div className="vsub">
        Se genera la factura al aceptar. Seguimiento de pagos y MRR.
      </div>
      <div className="panel">
        {facturas.length === 0 ? (
          <div className="note">Aún no hay facturas.</div>
        ) : (
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
              {facturas.map((f) => (
                <tr key={f.id}>
                  <td>{f.cliente}</td>
                  <td>{f.concepto}</td>
                  <td className="mono">{fE.format(f.eur)}</td>
                  <td>
                    <FacturaEstado facturaId={f.id} estadoInicial={f.estado} />
                  </td>
                  <td>
                    <button className="btn" style={{ padding: "5px 10px" }} disabled>
                      Ver PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="note">
          Cobrado {fE.format(totalPagadoEur)} · Pendiente{" "}
          {fE.format(totalPendienteEur)}. Para CFDI fiscal (MX) o factura con BTW
          (NL) se conecta un módulo aparte según tu entidad.
        </div>
      </div>
    </section>
  );
}

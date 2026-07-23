import { obtenerFacturas } from "@/lib/data/facturas";
import { obtenerFacturasVe } from "@/lib/data/facturas-ve";
import { FacturaEstado } from "@/components/panel/FacturaEstado";
import { FacturaVeEstado } from "@/components/panel/FacturaVeEstado";
import { FacturaVeForm } from "@/components/panel/FacturaVeForm";
import { ParametrosVeForm } from "@/components/panel/ParametrosVeForm";
import { fE } from "@/lib/format";
import { fBs, fUsd } from "@/lib/data/fiscal-ve-calculos";

/** Facturación: facturas del pipeline (MXN→€) + facturación Venezuela (RIF). */
export default async function FacturaPage() {
  const [{ facturas, totalPagadoEur, totalPendienteEur }, ve] =
    await Promise.all([obtenerFacturas(), obtenerFacturasVe()]);

  return (
    <section className="view">
      <h2 className="vh">Facturación</h2>
      <div className="vsub">
        Seguimiento de pagos y MRR del pipeline, y emisión de facturas
        Venezuela (persona natural con RIF).
      </div>
      <div className="panel">
        <h3>Facturas del pipeline</h3>
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
                    <a
                      className="btn"
                      style={{ padding: "5px 10px" }}
                      href={`/imprimir/factura/${f.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="note">
          Cobrado {fE.format(totalPagadoEur)} · Pendiente{" "}
          {fE.format(totalPendienteEur)}. Para CFDI fiscal (MX) o factura con
          BTW (NL) se conecta un módulo aparte según tu entidad.
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>
          Facturas Venezuela <span className="pill">persona natural · RIF</span>
        </h3>
        {!ve.disponible ? (
          <div className="note">
            Falta aplicar la migración{" "}
            <b>20260720200000_facturas_ve.sql</b> en Supabase (
            <span className="mono">supabase db push</span>) para activar la
            facturación Venezuela.
          </div>
        ) : (
          <>
            {ve.facturas.length === 0 ? (
              <div className="note">Aún no has emitido facturas VE.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>N.º</th>
                    <th>Cliente</th>
                    <th>Concepto</th>
                    <th>Total Bs</th>
                    <th>USD</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ve.facturas.map((f) => (
                    <tr key={f.id}>
                      <td className="mono">
                        {String(f.numero).padStart(4, "0")}
                      </td>
                      <td>
                        {f.clienteNombre}
                        {f.clienteRif && (
                          <>
                            {" "}
                            <small style={{ color: "var(--muted)" }}>
                              {f.clienteRif}
                            </small>
                          </>
                        )}
                      </td>
                      <td>{f.concepto}</td>
                      <td className="mono">{fBs.format(f.totalBs)}</td>
                      <td className="mono">{fUsd.format(f.totalUsd)}</td>
                      <td>
                        <FacturaVeEstado
                          facturaId={f.id}
                          estadoInicial={f.estado}
                        />
                      </td>
                      <td>
                        <a
                          className="btn"
                          style={{ padding: "5px 10px" }}
                          href={`/imprimir/factura-ve/${f.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Imprimir
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {ve.facturas.length > 0 && (
              <div className="note">
                Cobrado {fBs.format(ve.totalCobradoBs)} · Pendiente{" "}
                {fBs.format(ve.totalPendienteBs)}.
              </div>
            )}
            <div style={{ marginTop: 14 }}>
              <FacturaVeForm
                siguienteNumero={ve.siguienteNumero}
                parametros={ve.parametros}
              />
            </div>
            <ParametrosVeForm parametros={ve.parametros} />
          </>
        )}
      </div>
    </section>
  );
}

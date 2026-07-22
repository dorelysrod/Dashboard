import { notFound } from "next/navigation";
import { obtenerFactura } from "@/lib/data/facturas";
import { fE, fM } from "@/lib/format";
import { BotonImprimir } from "@/components/panel/BotonImprimir";

const fFecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" });

/**
 * Vista imprimible de una factura del pipeline (MXN→€). Hace funcional el
 * botón "Ver PDF" de Facturación sin API externa: imprimir → guardar como PDF.
 * Para CFDI (MX) o factura BTW (NL) sigue aplicando el módulo aparte (M6).
 */
export default async function ImprimirFacturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const f = await obtenerFactura(id);
  if (!f) notFound();

  return (
    <main className="doc-wrap">
      <div className="doc">
        <header className="doc-head">
          <div className="doc-emisor">
            <b>Ai Landing Pro</b>
            <div>Factura de servicios web</div>
          </div>
          <div className="doc-id">
            <div className="doc-titulo">FACTURA</div>
            <div className="mono">Ref. {f.id.slice(0, 8).toUpperCase()}</div>
            {f.fecha && (
              <div>{fFecha.format(new Date(`${f.fecha}T00:00:00`))}</div>
            )}
          </div>
        </header>

        <section className="doc-cliente">
          <div className="doc-l">Cliente</div>
          <b>{f.cliente}</b>
        </section>

        <table className="doc-tabla">
          <thead>
            <tr>
              <th>Descripción</th>
              <th className="num">MXN</th>
              <th className="num">EUR</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {f.concepto}
                {f.tipo === "suscripcion" ? " (suscripción)" : ""}
              </td>
              <td className="num mono">{fM.format(f.mxn)}</td>
              <td className="num mono">{fE.format(f.eur)}</td>
            </tr>
          </tbody>
        </table>

        <section className="doc-totales">
          <div className="doc-total">
            <span>TOTAL</span>
            <b className="mono">{fE.format(f.eur)}</b>
          </div>
          <div>
            <span>Estado</span>
            <b>{f.estado === "pagada" ? "Pagada" : "Pendiente"}</b>
          </div>
        </section>

        <footer className="doc-pie">
          Documento informativo de cobro. Para comprobante fiscal (CFDI MX /
          BTW NL) se emite por el módulo correspondiente.
        </footer>
      </div>

      <div
        className="no-print"
        style={{ display: "flex", gap: 10, margin: "18px auto", maxWidth: 720 }}
      >
        <BotonImprimir />
        <a className="btn" href="/factura">
          ← Volver a Facturación
        </a>
      </div>
    </main>
  );
}

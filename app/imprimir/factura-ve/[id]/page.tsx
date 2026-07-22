import { notFound } from "next/navigation";
import { obtenerFacturaVe } from "@/lib/data/facturas-ve";
import { fBs, fUsd } from "@/lib/data/fiscal-ve-calculos";
import { BotonImprimir } from "@/components/panel/BotonImprimir";

const fFecha = new Intl.DateTimeFormat("es-VE", { dateStyle: "long" });
const fTasa = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/**
 * Factura Venezuela imprimible (persona natural con RIF). Fuera del shell del
 * panel para imprimir limpia; protegida por el middleware (requiere sesión).
 * Requisitos de forma (Providencia SENIAT 00071): "FACTURA", numeración
 * correlativa, N.º de control, fecha, identificación de emisor y cliente con
 * RIF, base imponible, IVA discriminado, IGTF si aplica y equivalencia en Bs
 * a tasa BCV.
 */
export default async function ImprimirFacturaVePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const datos = await obtenerFacturaVe(id);
  if (!datos) notFound();
  const { factura: f, emisor } = datos;

  return (
    <main className="doc-wrap">
      <div className="doc">
        <header className="doc-head">
          <div>
            <div className="doc-emisor">
              <b>{emisor.nombre || "Emisor sin configurar"}</b>
              {emisor.rif && <div>RIF: {emisor.rif}</div>}
              {emisor.domicilio && <div>{emisor.domicilio}</div>}
            </div>
          </div>
          <div className="doc-id">
            <div className="doc-titulo">FACTURA</div>
            <div className="mono">N.º {String(f.numero).padStart(6, "0")}</div>
            <div className="mono">N.º de control {f.numeroControl}</div>
            <div>{fFecha.format(new Date(`${f.fecha}T00:00:00`))}</div>
          </div>
        </header>

        <section className="doc-cliente">
          <div className="doc-l">Cliente</div>
          <b>{f.clienteNombre}</b>
          {f.clienteRif && <div>RIF / C.I.: {f.clienteRif}</div>}
          {f.clienteDomicilio && <div>{f.clienteDomicilio}</div>}
        </section>

        <table className="doc-tabla">
          <thead>
            <tr>
              <th>Descripción</th>
              <th className="num">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{f.concepto}</td>
              <td className="num mono">
                {f.moneda === "USD"
                  ? fUsd.format(f.monto)
                  : fBs.format(f.monto)}
              </td>
            </tr>
          </tbody>
        </table>

        <section className="doc-totales">
          <div>
            <span>Base imponible</span>
            <b className="mono">{fBs.format(f.baseBs)}</b>
          </div>
          <div>
            <span>IVA ({Math.round(f.ivaPct * 100)}%)</span>
            <b className="mono">{fBs.format(f.ivaBs)}</b>
          </div>
          {f.igtfBs > 0 && (
            <div>
              <span>IGTF ({Math.round(f.igtfPct * 100)}%) — pago en divisas</span>
              <b className="mono">{fBs.format(f.igtfBs)}</b>
            </div>
          )}
          <div className="doc-total">
            <span>TOTAL</span>
            <b className="mono">{fBs.format(f.totalBs)}</b>
          </div>
          <div>
            <span>Equivalente en USD</span>
            <b className="mono">{fUsd.format(f.totalUsd)}</b>
          </div>
        </section>

        <footer className="doc-pie">
          Montos expresados en bolívares a la tasa de cambio de referencia BCV
          de {fTasa.format(f.tasaBcv)} Bs/USD del{" "}
          {fFecha.format(new Date(`${f.fecha}T00:00:00`))}.
          {f.moneda === "USD" && " Monto del servicio pactado en USD."}
        </footer>
      </div>

      <div className="no-print" style={{ display: "flex", gap: 10, margin: "18px auto", maxWidth: 720 }}>
        <BotonImprimir />
        <a className="btn" href="/factura">
          ← Volver a Facturación
        </a>
      </div>
      <div className="note no-print" style={{ maxWidth: 720, margin: "0 auto" }}>
        Si usas formatos de imprenta autorizada (forma libre), el N.º de control
        debe ser el preimpreso. Verifica los requisitos vigentes de la
        Providencia 00071 con tu contador.
      </div>
    </main>
  );
}

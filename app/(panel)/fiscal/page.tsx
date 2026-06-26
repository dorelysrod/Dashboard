import { obtenerFiscal } from "@/lib/data/fiscal";
import { fE } from "@/lib/format";

const nMxn = new Intl.NumberFormat("es-ES");
const nTc = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

/** Fiscal y contabilidad: BTW trimestral + inkomstenbelasting anual, desde Supabase. */
export default async function FiscalPage() {
  const f = await obtenerFiscal();
  const pctHoras = Math.min(
    100,
    Math.round((f.horasRegistradas / f.horasObjetivo) * 100),
  );
  const btwTexto =
    f.btwResultadoEur < 0
      ? `a recuperar ${fE.format(-f.btwResultadoEur)}`
      : `a pagar ${fE.format(f.btwResultadoEur)}`;

  return (
    <section className="view">
      <h2 className="vh">Fiscal y contabilidad</h2>
      <div className="vsub">
        Tu propia administración, aparte de tu empleo. Orientación — confirma con
        un boekhouder.
      </div>

      <div className="note" style={{ margin: "0 0 14px", fontSize: ".85rem" }}>
        💡 <b>Dos impuestos distintos:</b> el <b>BTW</b> lo cobras al cliente y lo
        declaras <b>cada trimestre</b> (a México no le cobras → casi siempre
        recuperas). La <b>inkomstenbelasting</b> la pagas tú sobre tu{" "}
        <b>ganancia</b>, una vez al <b>año</b> — ahí se declara tu trabajo.
      </div>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi">
          <div className="k">Ingresos (año)</div>
          <div className="v">{fE.format(f.ingresosEur)}</div>
          <div className="s">ya en euros</div>
        </div>
        <div className="kpi">
          <div className="k">Gastos</div>
          <div className="v">{fE.format(f.gastosEur)}</div>
          <div className="s">deducibles</div>
        </div>
        <div className="kpi win">
          <div className="k">Ganancia</div>
          <div className="v">{fE.format(f.gananciaEur)}</div>
          <div className="s">base de tu renta</div>
        </div>
        <div className="kpi">
          <div className="k">Apartar</div>
          <div className="v" style={{ color: "var(--amber)" }}>
            {fE.format(f.apartarEur)}
          </div>
          <div className="s">~40% (con margen)</div>
        </div>
      </div>

      <div className="cols">
        <div className="panel">
          <h3>
            BTW · trimestral <span className="pill">cobras al cliente</span>
          </h3>
          <div className="pstat">
            <span>Omzet México (servicios)</span>
            <b className="mono">{fE.format(f.ingresosEur)}</b>
          </div>
          <div className="pstat">
            <span>BTW cobrado</span>
            <b style={{ color: "var(--mint)" }}>{fE.format(f.btwCobradoEur)}</b>
          </div>
          <div className="pstat">
            <span>BTW de gastos (recuperable)</span>
            <b className="mono">+{fE.format(f.btwRecuperableEur)}</b>
          </div>
          <div className="pstat">
            <span>Resultado del trimestre</span>
            <b style={{ color: "var(--mint)" }}>{btwTexto}</b>
          </div>
          <div className="note">
            México no genera BTW a pagar. Presentas la aangifte igual — sobre todo
            para <b>recuperar</b> el BTW de tus gastos.
          </div>
        </div>

        <div className="panel">
          <h3>
            Inkomstenbelasting · anual{" "}
            <span className="pill">sobre tu ganancia</span>
          </h3>
          <div className="pstat" style={{ padding: "6px 0" }}>
            <span>Ganancia (winst)</span>
            <b className="mono">{fE.format(f.gananciaEur)}</b>
          </div>
          <div className="pstat" style={{ padding: "6px 0" }}>
            <span>− mkb-winstvrijstelling 12,7%</span>
            <b className="mono">−{fE.format(f.mkbVrijstellingEur)}</b>
          </div>
          <div className="pstat" style={{ padding: "6px 0" }}>
            <span>Base gravable</span>
            <b className="mono">{fE.format(f.baseGravableEur)}</b>
          </div>
          <div className="pstat" style={{ padding: "6px 0" }}>
            <span>IB estimado (tipo ~37%)</span>
            <b className="mono">{fE.format(f.ibEur)}</b>
          </div>
          <div className="pstat" style={{ padding: "6px 0" }}>
            <span>Zvw 4,85%</span>
            <b className="mono">{fE.format(f.zvwEur)}</b>
          </div>
          <div className="pstat" style={{ padding: "6px 0" }}>
            <span>A apartar</span>
            <b style={{ color: "var(--amber)" }}>≈ {fE.format(f.apartarIbEur)}</b>
          </div>
          <div className="note">
            Aquí <b>declaras tu trabajo</b>, una vez al año. Ajusta el tipo a tu
            escalón real (sube con tu sueldo).
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Tus facturas · conversión MXN → €</h3>
        {f.facturas.length === 0 ? (
          <div className="note">Aún no hay facturas que convertir.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Factura</th>
                <th>MXN</th>
                <th>Tipo</th>
                <th>EUR</th>
                <th>BTW</th>
              </tr>
            </thead>
            <tbody>
              {f.facturas.map((fa) => (
                <tr key={fa.id}>
                  <td>{fa.etiqueta}</td>
                  <td className="mono">{nMxn.format(fa.mxn)}</td>
                  <td className="mono">{nTc.format(fa.tipoCambio)}</td>
                  <td className="mono">{fE.format(fa.eur)}</td>
                  <td>—</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="note">
          Cada factura se guarda en € al <b>tipo del día</b> (lo conservas como
          prueba). El BTW va en &quot;—&quot; por ser servicio a México.
        </div>
      </div>

      <div className="cols" style={{ marginTop: 16 }}>
        <div className="panel">
          <h3>
            Horas del negocio <span className="pill">urencriterium</span>
          </h3>
          <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
            <span>Registradas este año</span>
            <b className="mono">
              {nMxn.format(f.horasRegistradas)} / {nMxn.format(f.horasObjetivo)} h
            </b>
          </div>
          <div className="tbar">
            <i style={{ width: `${pctHoras}%` }} />
          </div>
          <div className="note">
            Para zelfstandigenaftrek/startersaftrek necesitas 1.225 h{" "}
            <b>y ≥50% de tu tiempo total</b> en el negocio. Con tu empleo, casi
            seguro <b>no calificas</b> a esas dos — pero igual obtienes la{" "}
            <b>mkb-winstvrijstelling (12,7%)</b>. Registra horas igual: la
            Belastingdienst puede pedírtelas.
          </div>
        </div>

        <div className="panel">
          <h3>Calendario y pendientes</h3>
          <div className="pstat">
            <span>
              <span
                className="dt warn"
                style={{
                  display: "inline-block",
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "var(--amber)",
                  marginRight: 8,
                }}
              />
              Aangifte BTW · 2º trimestre
            </span>
            <b>antes del 31 jul</b>
          </div>
          <div className="pstat">
            <span>Aangifte inkomstenbelasting · 2026</span>
            <b>2027 (anual)</b>
          </div>
          <div className="pstat">
            <span>Inscripción KVK</span>
            <span className="stage st-new">Pendiente</span>
          </div>
          <div className="pstat">
            <span>KOR — probablemente no conviene</span>
            <span className="stage st-ac">Decidido</span>
          </div>
          <div className="note">
            Guía completa con tus 9 acciones en <b>fiscal-holanda-guia.md</b>.
          </div>
        </div>
      </div>
    </section>
  );
}

/** Contenido estático del contrato visual; cobra vida con el motor Fiscal (M5). */
export default function FiscalPage() {
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
          <div className="v">€2,980</div>
          <div className="s">ya en euros</div>
        </div>
        <div className="kpi">
          <div className="k">Gastos</div>
          <div className="v">€420</div>
          <div className="s">deducibles</div>
        </div>
        <div className="kpi win">
          <div className="k">Ganancia</div>
          <div className="v">€2,560</div>
          <div className="s">base de tu renta</div>
        </div>
        <div className="kpi">
          <div className="k">Apartar</div>
          <div className="v" style={{ color: "var(--amber)" }}>
            €1,024
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
            <b className="mono">€2,980</b>
          </div>
          <div className="pstat">
            <span>BTW cobrado</span>
            <b style={{ color: "var(--mint)" }}>€0</b>
          </div>
          <div className="pstat">
            <span>BTW de gastos (recuperable)</span>
            <b className="mono">+€88</b>
          </div>
          <div className="pstat">
            <span>Resultado del trimestre</span>
            <b style={{ color: "var(--mint)" }}>a recuperar €88</b>
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
            <b className="mono">€2,560</b>
          </div>
          <div className="pstat" style={{ padding: "6px 0" }}>
            <span>− mkb-winstvrijstelling 12,7%</span>
            <b className="mono">−€325</b>
          </div>
          <div className="pstat" style={{ padding: "6px 0" }}>
            <span>Base gravable</span>
            <b className="mono">€2,235</b>
          </div>
          <div className="pstat" style={{ padding: "6px 0" }}>
            <span>IB estimado (tipo ~37%)</span>
            <b className="mono">€827</b>
          </div>
          <div className="pstat" style={{ padding: "6px 0" }}>
            <span>Zvw 4,85%</span>
            <b className="mono">€124</b>
          </div>
          <div className="pstat" style={{ padding: "6px 0" }}>
            <span>A apartar</span>
            <b style={{ color: "var(--amber)" }}>≈ €951</b>
          </div>
          <div className="note">
            Aquí <b>declaras tu trabajo</b>, una vez al año. Ajusta el tipo a tu
            escalón real (sube con tu sueldo).
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Tus facturas · conversión MXN → €</h3>
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
            <tr>
              <td>2026-001 · Dra. Camila Reyes</td>
              <td className="mono">14.900</td>
              <td className="mono">0,0500</td>
              <td className="mono">€745</td>
              <td>—</td>
            </tr>
            <tr>
              <td>2026-002 · Dr. Mateo Ríos</td>
              <td className="mono">18.150</td>
              <td className="mono">0,0497</td>
              <td className="mono">€902</td>
              <td>—</td>
            </tr>
            <tr>
              <td>2026-003 · Clínica Lumina</td>
              <td className="mono">14.900</td>
              <td className="mono">0,0500</td>
              <td className="mono">€745</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
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
            <b className="mono">240 / 1.225 h</b>
          </div>
          <div className="tbar">
            <i style={{ width: "19.5%" }} />
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

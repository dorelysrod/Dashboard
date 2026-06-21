/** Contenido estático del contrato visual; cobra vida con el motor de Análisis (M5). */
export default function AnalisisPage() {
  return (
    <section className="view">
      <h2 className="vh">Por qué se cae el negocio</h2>
      <div className="vsub">
        Cada lead perdido guarda su razón. Aquí ves el patrón — para ajustar
        pitch, precio o segmento.
      </div>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="kpi">
          <div className="k">Tasa de cierre</div>
          <div className="v">22%</div>
          <div className="s">2 de 9 cotizadas</div>
        </div>
        <div className="kpi">
          <div className="k">Perdidos</div>
          <div className="v">5</div>
          <div className="s">este mes</div>
        </div>
        <div className="kpi">
          <div className="k">Fuga principal</div>
          <div
            className="v"
            style={{ fontSize: "1rem", fontFamily: "var(--display)" }}
          >
            Precio
          </div>
          <div className="s">32% de las pérdidas</div>
        </div>
      </div>

      <div className="cols">
        <div className="panel">
          <h3>Razones de pérdida</h3>
          <div style={{ marginTop: 6 }}>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>Precio (muy caro)</span>
              <b className="mono">32%</b>
            </div>
            <div className="tbar">
              <i style={{ width: "32%", background: "var(--rose)" }} />
            </div>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>No respondió (fantasma)</span>
              <b className="mono">28%</b>
            </div>
            <div className="tbar">
              <i style={{ width: "28%", background: "var(--amber)" }} />
            </div>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>Eligió otro proveedor</span>
              <b className="mono">18%</b>
            </div>
            <div className="tbar">
              <i style={{ width: "18%", background: "var(--blue)" }} />
            </div>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>No era el momento</span>
              <b className="mono">12%</b>
            </div>
            <div className="tbar">
              <i style={{ width: "12%" }} />
            </div>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>No ve valor en una web</span>
              <b className="mono">10%</b>
            </div>
            <div className="tbar" style={{ marginBottom: 0 }}>
              <i style={{ width: "10%" }} />
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>
            Dónde se caen <span className="pill">embudo</span>
          </h3>
          <div style={{ marginTop: 6 }}>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>Cotizaciones enviadas</span>
              <b className="mono">9</b>
            </div>
            <div className="tbar">
              <i style={{ width: "100%" }} />
            </div>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>Abrieron el correo</span>
              <b className="mono">6</b>
            </div>
            <div className="tbar">
              <i style={{ width: "67%" }} />
            </div>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>Respondieron</span>
              <b className="mono">4</b>
            </div>
            <div className="tbar">
              <i style={{ width: "44%" }} />
            </div>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>Vieron la cotización</span>
              <b className="mono">3</b>
            </div>
            <div className="tbar">
              <i style={{ width: "33%" }} />
            </div>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>Aceptaron</span>
              <b className="mono">2</b>
            </div>
            <div className="tbar" style={{ marginBottom: 0 }}>
              <i style={{ width: "22%", background: "var(--green)" }} />
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Patrón por segmento</h3>
        <table>
          <thead>
            <tr>
              <th>Segmento</th>
              <th>Enviados</th>
              <th>Cerrados</th>
              <th>Razón principal de pérdida</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1 · Ya tiene web</td>
              <td className="mono">4</td>
              <td className="mono">1</td>
              <td>Precio</td>
            </tr>
            <tr>
              <td>2 · No tiene web</td>
              <td className="mono">2</td>
              <td className="mono">1</td>
              <td>No era el momento</td>
            </tr>
            <tr>
              <td>3 · Tuvo web</td>
              <td className="mono">0</td>
              <td className="mono">—</td>
              <td>—</td>
            </tr>
            <tr>
              <td>4 · Con otro proveedor</td>
              <td className="mono">3</td>
              <td className="mono">0</td>
              <td>Ya tienen quien</td>
            </tr>
          </tbody>
        </table>
        <div className="note">
          📌 <b>Tu patrón:</b> pierdes sobre todo por <b>precio</b> en clínicas
          que ya tienen web (segmento 1), y el segmento 4 cerró <b>0 de 3</b> —
          confirma bajarlo de prioridad. <b>Acción:</b> carga más leads del
          segmento 2 (sin web), que cierran mejor y son quick win.
        </div>
      </div>
    </section>
  );
}

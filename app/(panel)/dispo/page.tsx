/**
 * Contenido estático del contrato visual. En fase 1 es seed; el busy/free real
 * lo dará TU calendario (Calendly + Google Calendar) en fase 2 — NO confundir
 * con el Cal.com del sitio del cliente (pacientes de la clínica). Ver §8/§10.
 */
export default function DispoPage() {
  return (
    <section className="view">
      <h2 className="vh">Tu disponibilidad</h2>
      <div className="vsub">
        Tu insumo más importante: sin esto, ninguna fecha de entrega es creíble.
      </div>
      <div className="panel">
        <h3>Días que trabajas el negocio</h3>
        <div className="days">
          <div className="day on">
            <div className="dn">Lun</div>
            <div className="dh">—</div>
          </div>
          <div className="day on">
            <div className="dn">Mar</div>
            <div className="dh">4 h</div>
          </div>
          <div className="day">
            <div className="dn">Mié</div>
            <div className="dh">—</div>
          </div>
          <div className="day on">
            <div className="dn">Jue</div>
            <div className="dh">4 h</div>
          </div>
          <div className="day">
            <div className="dn">Vie</div>
            <div className="dh">—</div>
          </div>
          <div className="day on">
            <div className="dn">Sáb</div>
            <div className="dh">6 h</div>
          </div>
          <div className="day">
            <div className="dn">Dom</div>
            <div className="dh">—</div>
          </div>
        </div>
        <div className="cap">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: ".85rem",
            }}
          >
            <span>
              <b>Capacidad usada</b> · 2 proyectos activos
            </span>
            <span className="mono">~80%</span>
          </div>
          <div className="bar">
            <i style={{ width: "80%" }} />
          </div>
          <div className="note">
            Estás cerca del tope. El sistema marcará &quot;fecha realista&quot;
            más lejana si aceptas otro proyecto esta semana.
          </div>
        </div>
      </div>
    </section>
  );
}

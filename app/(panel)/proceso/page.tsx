/** Contenido estático del contrato visual; cobra vida con el motor de Proceso (M5). */
export default function ProcesoPage() {
  return (
    <section className="view">
      <h2 className="vh">Mi proceso</h2>
      <div className="vsub">
        Tus tiempos y dificultades reales por paso — para estimar mejor y ver
        dónde se te va el tiempo.
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Proyecto activo · Dr. Mateo Ríos</h3>
        <div className="note" style={{ margin: "0 0 12px" }}>
          ⏱️ El reloj de entrega arranca al marcar <b>&quot;Accesos completos&quot;</b>.
          Estado: <b style={{ color: "var(--mint)" }}>Accesos completos</b> · día
          3 de ~10.
        </div>
        <table>
          <thead>
            <tr>
              <th>Paso</th>
              <th>Estimado</th>
              <th>Real</th>
              <th>Dificultad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Intake (accesos/info)</td>
              <td>—</td>
              <td className="mono">2 d</td>
              <td>—</td>
              <td>
                <span className="stage st-ac">Completo</span>
              </td>
            </tr>
            <tr>
              <td>Diseño base (plantilla)</td>
              <td className="mono">0.5 d</td>
              <td className="mono">0.5 d</td>
              <td>
                <span className="dif dif-f">Fácil</span>
              </td>
              <td>
                <span className="stage st-ac">Completo</span>
              </td>
            </tr>
            <tr>
              <td>Contenido (textos/fotos)</td>
              <td className="mono">1 d</td>
              <td className="mono">1.5 d</td>
              <td>
                <span className="dif dif-m">Media</span>
              </td>
              <td>
                <span className="stage st-dev">En curso</span>
              </td>
            </tr>
            <tr>
              <td>Desarrollo + módulos</td>
              <td className="mono">2 d</td>
              <td>—</td>
              <td>
                <span className="dif dif-d">Difícil</span>
              </td>
              <td>
                <span className="stage st-new">Pendiente</span>
              </td>
            </tr>
            <tr>
              <td>Medición (GA4/eventos)</td>
              <td className="mono">0.5 d</td>
              <td>—</td>
              <td>
                <span className="dif dif-f">Fácil</span>
              </td>
              <td>
                <span className="stage st-new">Pendiente</span>
              </td>
            </tr>
            <tr>
              <td>Revisión cliente</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>
                <span className="stage st-new">Pendiente</span>
              </td>
            </tr>
            <tr>
              <td>Publicación + dashboard</td>
              <td className="mono">0.5 d</td>
              <td>—</td>
              <td>
                <span className="dif dif-f">Fácil</span>
              </td>
              <td>
                <span className="stage st-new">Pendiente</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="cols">
        <div className="panel">
          <h3>
            Dónde se te va el tiempo <span className="pill">promedio</span>
          </h3>
          <div style={{ marginTop: 6 }}>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>Desarrollo + módulos</span>
              <b className="mono">38%</b>
            </div>
            <div className="tbar">
              <i style={{ width: "38%" }} />
            </div>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>Contenido (espera fotos)</span>
              <b className="mono">27%</b>
            </div>
            <div className="tbar">
              <i style={{ width: "27%" }} />
            </div>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>Diseño base</span>
              <b className="mono">14%</b>
            </div>
            <div className="tbar">
              <i style={{ width: "14%" }} />
            </div>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>Medición</span>
              <b className="mono">11%</b>
            </div>
            <div className="tbar">
              <i style={{ width: "11%" }} />
            </div>
            <div className="pstat" style={{ border: "none", paddingBottom: 0 }}>
              <span>Publicación</span>
              <b className="mono">10%</b>
            </div>
            <div className="tbar" style={{ marginBottom: 0 }}>
              <i style={{ width: "10%" }} />
            </div>
          </div>
        </div>
        <div className="panel">
          <h3>Aprendizajes</h3>
          <div className="pstat">
            <span>Pasos más difíciles</span>
            <span style={{ display: "flex", gap: 6 }}>
              <span className="dif dif-d">Desarrollo</span>
              <span className="dif dif-m">Contenido</span>
            </span>
          </div>
          <div className="pstat">
            <span>Tu promedio real / proyecto</span>
            <b className="mono">4.5 d</b>
          </div>
          <div className="pstat">
            <span>Lo que estimabas</span>
            <b className="mono">4.0 d</b>
          </div>
          <div className="note">
            Tu real va <b>~12% arriba</b> del estimado → el sistema sube tus ETAs
            +12% para que prometas fechas que sí cumples. El cuello recurrente:{" "}
            <b>esperar las fotos del cliente</b> — por eso el reloj arranca solo
            con accesos completos.
          </div>
        </div>
      </div>
    </section>
  );
}

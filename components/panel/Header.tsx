import { BotonSalir } from "./BotonSalir";

/** Barra superior del panel (logo + operadora + salir). */
export function Header() {
  return (
    <header className="appbar">
      <div className="wrap">
        <div className="logo">
          Ai Landing <b>Pro</b> · Panel
        </div>
        <div className="me">
          <span>Dorelys</span>
          <div className="av">D</div>
          <BotonSalir />
        </div>
      </div>
    </header>
  );
}

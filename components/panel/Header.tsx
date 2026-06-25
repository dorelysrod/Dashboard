import Link from "next/link";
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
          <Link href="/perfil" className="me-link" title="Perfil y contraseña">
            <span>Dorelys</span>
            <div className="av">D</div>
          </Link>
          <BotonSalir />
        </div>
      </div>
    </header>
  );
}

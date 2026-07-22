"use client";

import { useActionState } from "react";
import { fijarNuevaContrasena, type EstadoRestablecer } from "./actions";

const estadoInicial: EstadoRestablecer = { error: null };

/**
 * Fijar nueva contraseña tras el enlace de recuperación. La sesión de
 * recuperación la garantiza el middleware (esta ruta no es pública): si alguien
 * llega sin sesión, ya fue redirigido a /login.
 */
export default function RestablecerPage() {
  const [estado, accion, pendiente] = useActionState(fijarNuevaContrasena, estadoInicial);

  return (
    <main className="login-wrap">
      <form className="auth-card" action={accion}>
        <div className="logo">
          Ai Landing <b>Pro</b>
        </div>
        <p className="vsub" style={{ marginBottom: 4 }}>
          Elige tu nueva contraseña
        </p>

        <div className="field">
          <label className="l" htmlFor="nueva">
            Nueva contraseña
          </label>
          <input
            id="nueva"
            name="nueva"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="auth-input"
          />
        </div>

        <div className="field">
          <label className="l" htmlFor="confirmar">
            Confirmar contraseña
          </label>
          <input
            id="confirmar"
            name="confirmar"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="auth-input"
          />
        </div>

        {estado.error && (
          <p className="auth-error" role="alert">
            {estado.error}
          </p>
        )}

        <button className="btn-g btn" type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </main>
  );
}

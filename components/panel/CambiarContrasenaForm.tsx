"use client";

import { useActionState } from "react";
import { cambiarContrasena, type EstadoPerfil } from "@/app/(panel)/perfil/actions";

const estadoInicial: EstadoPerfil = { error: null, ok: false };

/** Formulario de cambio de contraseña (perfil del operador). */
export function CambiarContrasenaForm() {
  const [estado, accion, pendiente] = useActionState(
    cambiarContrasena,
    estadoInicial,
  );

  return (
    <form className="panel" action={accion} style={{ maxWidth: 420 }}>
      <div className="field">
        <label className="l" htmlFor="actual">
          Contraseña actual
        </label>
        <input
          id="actual"
          name="actual"
          type="password"
          autoComplete="current-password"
          required
          className="auth-input"
        />
      </div>

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
          Confirmar nueva contraseña
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
      {estado.ok && (
        <p className="note" role="status" style={{ color: "var(--mint)" }}>
          Contraseña actualizada correctamente.
        </p>
      )}

      <button className="btn-g btn" type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

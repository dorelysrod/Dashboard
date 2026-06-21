"use client";

import { cerrarSesion } from "@/app/login/actions";

/** Cierra la sesión de Supabase (form → server action) y vuelve a /login. */
export function BotonSalir() {
  return (
    <form action={cerrarSesion}>
      <button className="btn-salir" type="submit">
        Salir
      </button>
    </form>
  );
}

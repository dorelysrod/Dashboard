/**
 * Hook de arranque de Next (corre UNA vez al iniciar el servidor, antes de
 * servir requests). Fail-fast de config en producción (T-014): mejor un deploy
 * que no arranca que un panel sin login mostrando datos de seed como reales.
 */
export async function register() {
  const { envsFaltantes } = await import("@/lib/config/requerida");
  const faltan = envsFaltantes(process.env, process.env.NODE_ENV);
  if (faltan.length) {
    throw new Error(
      `Config de producción incompleta — faltan: ${faltan.join(", ")}. ` +
        "Sin estas envs el panel serviría sin autenticación y con datos de seed. " +
        "Defínelas en el entorno del deploy (ver .env.example).",
    );
  }
}

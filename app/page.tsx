/**
 * Placeholder de M0 (scaffold). El shell real del panel y las 10 vistas llegan
 * en M2, leyendo del seed. Estado honesto: sin métricas fabricadas (principles.md).
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6">
      <p className="text-sm font-medium text-violet">Ai Landing Pro</p>
      <h1 className="font-display text-3xl font-semibold text-ink">
        Panel operativo
      </h1>
      <p className="text-base text-ink/70">
        Scaffold listo (M0): Next 15 · TypeScript · Tailwind (tema claro) ·
        cliente Supabase · tabla <code className="font-medium">config</code>.
      </p>
      <div className="mt-2 rounded-xl border border-ink/10 bg-card p-4">
        <p className="text-sm text-ink/60">
          El shell del panel y las 10 vistas llegan en M2, leyendo del seed.
        </p>
      </div>
    </main>
  );
}

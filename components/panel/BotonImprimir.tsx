"use client";

/** Imprime la página actual (PDF vía el diálogo del navegador — sin API externa). */
export function BotonImprimir({ etiqueta = "Imprimir / guardar PDF" }: { etiqueta?: string }) {
  return (
    <button type="button" className="btn btn-g no-print" onClick={() => window.print()}>
      {etiqueta}
    </button>
  );
}

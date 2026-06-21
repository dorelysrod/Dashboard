"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Las 9 vistas navegables (la 10ª, Detalle, es el drawer). Orden del mockup. */
const TABS = [
  { href: "/resumen", label: "Resumen" },
  { href: "/buscar", label: "Buscar" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/entregas", label: "Entregas" },
  { href: "/proceso", label: "Proceso" },
  { href: "/analisis", label: "Análisis" },
  { href: "/factura", label: "Facturación" },
  { href: "/fiscal", label: "Fiscal" },
  { href: "/dispo", label: "Disponibilidad" },
] as const;

export function NavTabs() {
  const path = usePathname();
  return (
    <nav className="tabs">
      <div className="wrap">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`tab ${path === t.href ? "on" : ""}`}
            aria-current={path === t.href ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

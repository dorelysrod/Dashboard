"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { Lead } from "@/lib/types/dominio";

interface LeadDrawerCtx {
  lead: Lead | null;
  abrir: (lead: Lead) => void;
  cerrar: () => void;
}

const Ctx = createContext<LeadDrawerCtx | null>(null);

/** Estado del drawer de detalle (reemplaza openD/closeD del mockup). */
export function LeadDrawerProvider({ children }: { children: React.ReactNode }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const abrir = useCallback((l: Lead) => setLead(l), []);
  const cerrar = useCallback(() => setLead(null), []);
  return <Ctx.Provider value={{ lead, abrir, cerrar }}>{children}</Ctx.Provider>;
}

export function useLeadDrawer(): LeadDrawerCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLeadDrawer debe usarse dentro de LeadDrawerProvider");
  return ctx;
}

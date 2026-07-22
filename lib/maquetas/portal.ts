import "server-only";
import { createHmac } from "node:crypto";

/**
 * Firma de acceso al portal de propuestas. Tras verificar email+código, se pone
 * una cookie firmada (HMAC) de vida corta; la página la valida en cada carga.
 * Si el código se revoca/cambia, la firma vieja deja de coincidir → re-verificar.
 * El secreto nunca sale al cliente (server-only).
 */
const SECRETO = process.env.PORTAL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-portal-secret";

/** Minutos que dura el acceso antes de re-pedir email+código. */
export const ACCESO_MINUTOS = Number(process.env.PORTAL_ACCESO_MINUTOS ?? 30);

export function cookieAcceso(numero: number): string {
  return `acc_${numero}`;
}

/** Firma que ata el acceso a ESTE número + su código actual. */
export function firmarAcceso(numero: number, codigo: string): string {
  return createHmac("sha256", SECRETO).update(`${numero}:${codigo}`).digest("hex").slice(0, 32);
}

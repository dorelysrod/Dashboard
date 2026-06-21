import { randomBytes, randomUUID } from "node:crypto";

/**
 * IDs aleatorios para datos creados por la app (server-side). La BD ya usa
 * gen_random_uuid() para las PK; usa esto cuando necesites un id/token en código
 * (p. ej. el token del portal de intake, §11.B). Cripto-aleatorio, no Math.random.
 */

/** UUID v4 cripto-aleatorio. */
export function nuevoId(): string {
  return randomUUID();
}

/**
 * Token opaco URL-safe (base64url) para enlaces públicos (p. ej. /intake/[token]).
 * 32 bytes de entropía por defecto.
 */
export function nuevoToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

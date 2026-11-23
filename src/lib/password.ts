import crypto from "crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

/** Vérifie un mot de passe en temps constant (pas de fuite d'information par la durée de comparaison). */
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash || !/^[0-9a-f]+$/i.test(hash)) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length || KEY_LENGTH);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

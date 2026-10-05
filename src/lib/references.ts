import { randomBytes, randomInt } from "node:crypto";

// No 0/O, 1/I/L, 2/Z, 5/S, 8/B: easy to read out over the phone.
const ALPHABET = "ACDEFGHJKMNPQRTUVWXY34679";

/** A six-character reference for orders, bookings and enquiries. Not a secret. */
export function shortReference(): string {
  return Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/** The secret in a private link: 192 random bits. */
export function privateToken(): string {
  return randomBytes(24).toString("base64url");
}

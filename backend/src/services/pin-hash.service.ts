import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(pin, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${key.toString(
    'hex',
  )}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6) {
    return false;
  }

  const [scheme, nStr, rStr, pStr, saltHex, keyHex] = parts;
  if (scheme !== 'scrypt' || !saltHex || !keyHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const key = Buffer.from(keyHex, 'hex');

  if (salt.length === 0 || key.length === 0) {
    return false;
  }

  const N = Number.parseInt(nStr, 10) || SCRYPT_N;
  const r = Number.parseInt(rStr, 10) || SCRYPT_R;
  const p = Number.parseInt(pStr, 10) || SCRYPT_P;

  const derived = scryptSync(pin, salt, key.length, { N, r, p });

  if (derived.length !== key.length) {
    return false;
  }

  return timingSafeEqual(derived, key);
}

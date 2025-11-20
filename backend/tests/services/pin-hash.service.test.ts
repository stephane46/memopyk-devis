import { describe, expect, it } from 'vitest';

import { hashPin, verifyPin } from '../../src/services/pin-hash.service';

describe('pin-hash.service', () => {
  it('hashes and verifies a PIN correctly', () => {
    const pin = '123456';
    const hash = hashPin(pin);

    expect(hash).toMatch(/^scrypt\$/);
    expect(verifyPin(pin, hash)).toBe(true);
    expect(verifyPin('000000', hash)).toBe(false);
  });

  it('produces different hashes for the same PIN (random salt)', () => {
    const pin = '123456';
    const hash1 = hashPin(pin);
    const hash2 = hashPin(pin);

    expect(hash1).not.toEqual(hash2);
  });
});

import { describe, expect, it } from 'vitest';

import { parseLineCreate, parseLineUpdate } from '../../src/api/validators/lines';
import { HttpError } from '../../src/utils/http-error';

describe('lines validators', () => {
  it('parses a valid line create payload', () => {
    const payload = {
      product_id: undefined,
      description: 'Service',
      qty: 1,
      unit_amount_cents: 1000,
      tax_rate_bps: 2000,
      position: 1,
    };

    const result = parseLineCreate(payload);

    expect(result).toEqual(payload);
  });

  it('rejects invalid line create payload with non-positive qty', () => {
    const payload = {
      description: 'Invalid',
      qty: 0,
      unit_amount_cents: 1000,
      tax_rate_bps: 2000,
    };

    expect(() => parseLineCreate(payload)).toThrow(HttpError);
  });

  it('parses a partial line update payload', () => {
    const payload = {
      description: 'Updated description',
    };

    const result = parseLineUpdate(payload);

    expect(result).toEqual(payload);
  });

  it('rejects an empty line update payload', () => {
    expect(() => parseLineUpdate({})).toThrow(HttpError);
  });
});

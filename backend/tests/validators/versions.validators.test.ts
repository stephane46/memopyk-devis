import { describe, expect, it } from 'vitest';

import { parseVersionCreate } from '../../src/api/validators/versions';
import { HttpError } from '../../src/utils/http-error';

describe('versions validators', () => {
  it('parses a valid version create payload', () => {
    const payload = {
      quote_id: '11111111-1111-1111-1111-111111111111',
      from_version_id: '22222222-2222-2222-2222-222222222222',
    };

    const result = parseVersionCreate(payload);

    expect(result).toEqual(payload);
  });

  it('rejects invalid quote_id', () => {
    const payload = {
      quote_id: 'not-a-uuid',
    };

    expect(() => parseVersionCreate(payload)).toThrow(HttpError);
  });
});

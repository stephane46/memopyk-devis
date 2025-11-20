import { describe, expect, it } from 'vitest';

import { parseAdminPublicLinkUpdate, parsePublicPinSubmit } from '../../src/api/validators/public-links';
import { HttpError } from '../../src/utils/http-error';

describe('public links validators', () => {
  it('parses a valid admin public link update payload with PIN', () => {
    const payload = {
      enabled: true,
      pin: '123456',
    };

    const result = parseAdminPublicLinkUpdate(payload);

    expect(result).toEqual(payload);
  });

  it('parses a valid admin public link update payload without PIN', () => {
    const payload = {
      enabled: false,
      pin: null,
    };

    const result = parseAdminPublicLinkUpdate(payload);

    expect(result).toEqual(payload);
  });

  it('rejects admin public link update with invalid PIN format', () => {
    const payload = {
      enabled: true,
      pin: 'abcd',
    };

    expect(() => parseAdminPublicLinkUpdate(payload)).toThrow(HttpError);
  });

  it('parses a valid public PIN submit payload', () => {
    const payload = {
      pin: '123456',
    };

    const result = parsePublicPinSubmit(payload);

    expect(result).toEqual(payload);
  });

  it('rejects public PIN submit with non-numeric PIN', () => {
    const payload = {
      pin: 'abcdef',
    };

    expect(() => parsePublicPinSubmit(payload)).toThrow(HttpError);
  });

  it('rejects public PIN submit with wrong length', () => {
    const payload = {
      pin: '1234',
    };

    expect(() => parsePublicPinSubmit(payload)).toThrow(HttpError);
  });
});

import { describe, expect, it } from 'vitest';

import { parseAdminPaperAcceptance, parsePublicAcceptance } from '../../src/api/validators/acceptance';
import { HttpError } from '../../src/utils/http-error';

describe('acceptance validators', () => {
  it('parses a valid public acceptance payload', () => {
    const payload = {
      full_name: 'John Doe',
      accept_cgv: true,
    };

    const result = parsePublicAcceptance(payload);

    expect(result).toEqual(payload);
  });

  it('rejects public acceptance when CGV not accepted', () => {
    const payload = {
      full_name: 'John Doe',
      accept_cgv: false,
    };

    expect(() => parsePublicAcceptance(payload)).toThrow(HttpError);
    try {
      parsePublicAcceptance(payload);
    } catch (error) {
      const err = error as HttpError;
      expect(err.status).toBe(400);
      expect(err.code).toBe('cgv_not_accepted');
    }
  });

  it('rejects public acceptance with empty full_name', () => {
    const payload = {
      full_name: '',
      accept_cgv: true,
    };

    expect(() => parsePublicAcceptance(payload)).toThrow(HttpError);
  });

  it('parses a valid admin paper acceptance payload', () => {
    const payload = {
      full_name: 'Admin User',
      accepted_at: '2024-01-01T00:00:00.000Z',
      notes: 'Signed on paper',
    };

    const result = parseAdminPaperAcceptance(payload);

    expect(result).toEqual(payload);
  });

  it('allows admin paper acceptance without accepted_at (defaults later to now)', () => {
    const payload = {
      full_name: 'Admin User',
    };

    const result = parseAdminPaperAcceptance(payload);

    expect(result).toEqual(payload);
  });

  it('rejects admin paper acceptance with invalid accepted_at', () => {
    const payload = {
      full_name: 'Admin User',
      accepted_at: 'not-a-date',
    };

    expect(() => parseAdminPaperAcceptance(payload)).toThrow(HttpError);
  });
});

import { describe, expect, it } from 'vitest';

import {
  parseQuoteCreate,
  parseQuoteListQuery,
  parseQuoteUpdate,
} from '../../src/api/validators/quotes';
import { HttpError } from '../../src/utils/http-error';

describe('quotes validators', () => {
  it('parses a valid quote create payload', () => {
    const payload = {
      customer_name: 'Acme',
      title: 'Consulting',
      notes: 'Test',
      currency: 'EUR',
      lines: [
        {
          description: 'Service',
          qty: 1,
          unit_amount_cents: 1000,
          tax_rate_bps: 2000,
        },
      ],
    };

    const result = parseQuoteCreate(payload);

    expect(result).toEqual(payload);
  });

  it('rejects invalid quote create payload', () => {
    const payload = {
      customer_name: '',
      title: '',
      currency: 'XXX',
      lines: [],
    };

    expect(() => parseQuoteCreate(payload)).toThrow(HttpError);
  });

  it('parses a valid quote update payload', () => {
    const payload = {
      title: 'Updated',
      currency: 'USD',
      status: 'sent',
      valid_until: '2024-01-01T00:00:00.000Z',
    };

    const result = parseQuoteUpdate(payload);

    expect(result).toEqual(payload);
  });

  it('rejects invalid valid_until date', () => {
    const payload = {
      valid_until: 'not-a-date',
    };

    expect(() => parseQuoteUpdate(payload)).toThrow(HttpError);
  });

  it('parses quote list query with all parameters', () => {
    const query = {
      status: 'draft,sent',
      q: 'Acme',
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-01-31T00:00:00.000Z',
      limit: '20',
      offset: '5',
    } as Record<string, unknown>;

    const result = parseQuoteListQuery(query);

    expect(result).toEqual({
      status: ['draft', 'sent'],
      q: 'Acme',
      from: new Date('2024-01-01T00:00:00.000Z'),
      to: new Date('2024-01-31T00:00:00.000Z'),
      limit: 20,
      offset: 5,
    });
  });

  it('rejects invalid status in query', () => {
    const query = {
      status: 'draft,invalid',
    } as Record<string, unknown>;

    expect(() => parseQuoteListQuery(query)).toThrow(HttpError);
  });
});

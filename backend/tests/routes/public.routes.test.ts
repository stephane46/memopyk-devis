import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

import type { QuotePublicView } from '../../src/repositories/public-access.repo';

vi.mock('../../src/repositories/acceptance.repo', () => ({
  acceptQuoteOnlineByToken: vi.fn(),
}));

vi.mock('../../src/repositories/public-access.repo', () => ({
  getPublicQuoteViewByToken: vi.fn(),
  verifyPublicPinByToken: vi.fn(),
}));

let app: ReturnType<typeof express>;
let acceptanceRepo: Awaited<ReturnType<typeof importAcceptanceRepo>>;
let publicAccessRepo: Awaited<ReturnType<typeof importPublicAccessRepo>>;

async function importAcceptanceRepo() {
  return vi.mocked(await import('../../src/repositories/acceptance.repo'));
}

async function importPublicAccessRepo() {
  return vi.mocked(await import('../../src/repositories/public-access.repo'));
}

beforeAll(async () => {
  const { default: publicRouter } = await import('../../src/routes/v1/public');
  acceptanceRepo = await importAcceptanceRepo();
  publicAccessRepo = await importPublicAccessRepo();

  app = express();
  app.use(express.json());
  app.use('/v1/public', publicRouter);

  // Minimal error handler mirroring server.js behaviour
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = typeof err?.status === 'number' ? err.status : 500;
    const code = typeof err?.code === 'string' ? err.code : 'internal_server_error';
    const message =
      status >= 500
        ? 'An unexpected error occurred. Please try again later.'
        : err?.message || 'Request failed.';

    const payload: any = { code, message };
    if (err?.details) {
      payload.details = err.details;
    }

    res.status(status).json({ error: payload });
  });
});

describe('v1/public quote view and PIN routes', () => {
  it('returns a public quote view when no PIN is required', async () => {
    const view: QuotePublicView = {
      quote: {
        number: 'MPK-2025-001',
        customer_name: 'Acme',
        status: 'sent',
        acceptance_mode: null,
        accepted_at: null,
        accepted_by_name: null,
        created_at: '2024-01-01T00:00:00.000Z',
        valid_until: null,
        currency_code: 'EUR',
      },
      current_version: null,
      lines: [],
    };

    publicAccessRepo.getPublicQuoteViewByToken.mockResolvedValue(view);

    const response = await request(app).get('/v1/public/quotes/public-token-123');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: view });
    expect(publicAccessRepo.getPublicQuoteViewByToken).toHaveBeenCalledWith('public-token-123');
  });

  it('returns public_link_not_found when token is unknown', async () => {
    publicAccessRepo.getPublicQuoteViewByToken.mockRejectedValue(
      Object.assign(new Error('Public link not found.'), {
        status: 404,
        code: 'public_link_not_found',
      }),
    );

    const response = await request(app).get('/v1/public/quotes/unknown-token');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('public_link_not_found');
  });

  it('returns pin_required when PIN is configured but not yet validated', async () => {
    publicAccessRepo.getPublicQuoteViewByToken.mockRejectedValue(
      Object.assign(new Error('PIN is required.'), {
        status: 403,
        code: 'pin_required',
      }),
    );

    const response = await request(app).get('/v1/public/quotes/public-token-123');

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('pin_required');
  });

  it('returns pin_locked when link is locked', async () => {
    publicAccessRepo.getPublicQuoteViewByToken.mockRejectedValue(
      Object.assign(new Error('PIN is temporarily locked.'), {
        status: 403,
        code: 'pin_locked',
        details: { unlock_at: '2024-01-01T00:15:00.000Z' },
      }),
    );

    const response = await request(app).get('/v1/public/quotes/public-token-123');

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('pin_locked');
    expect(response.body.error.details.unlock_at).toBe('2024-01-01T00:15:00.000Z');
  });

  it('validates PIN successfully', async () => {
    publicAccessRepo.verifyPublicPinByToken.mockResolvedValue({ pin_valid: true });

    const response = await request(app)
      .post('/v1/public/quotes/public-token-123/pin')
      .send({ pin: '123456' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { pin_valid: true } });
    expect(publicAccessRepo.verifyPublicPinByToken).toHaveBeenCalledWith('public-token-123', {
      pin: '123456',
    });
  });

  it('returns pin_invalid on wrong PIN', async () => {
    publicAccessRepo.verifyPublicPinByToken.mockRejectedValue(
      Object.assign(new Error('Invalid PIN.'), {
        status: 403,
        code: 'pin_invalid',
        details: { remaining_attempts: 3 },
      }),
    );

    const response = await request(app)
      .post('/v1/public/quotes/public-token-123/pin')
      .send({ pin: '000000' });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('pin_invalid');
    expect(response.body.error.details.remaining_attempts).toBe(3);
  });

  it('locks after too many wrong attempts and returns pin_locked', async () => {
    publicAccessRepo.verifyPublicPinByToken.mockRejectedValue(
      Object.assign(new Error('PIN is temporarily locked.'), {
        status: 403,
        code: 'pin_locked',
        details: { unlock_at: '2024-01-01T00:15:00.000Z' },
      }),
    );

    const response = await request(app)
      .post('/v1/public/quotes/public-token-123/pin')
      .send({ pin: '000000' });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('pin_locked');
    expect(response.body.error.details.unlock_at).toBe('2024-01-01T00:15:00.000Z');
  });

  it('returns pin_not_required when PIN endpoint is called for a link without PIN', async () => {
    publicAccessRepo.verifyPublicPinByToken.mockRejectedValue(
      Object.assign(new Error('No PIN is configured for this public link.'), {
        status: 400,
        code: 'pin_not_required',
      }),
    );

    const response = await request(app)
      .post('/v1/public/quotes/public-token-123/pin')
      .send({ pin: '123456' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('pin_not_required');
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('v1/public acceptance route', () => {
  it('accepts a quote online via public token when no PIN is required', async () => {
    const view: QuotePublicView = {
      quote: {
        number: 'MPK-2025-001',
        customer_name: 'Acme',
        status: 'accepted',
        acceptance_mode: 'online',
        accepted_at: '2024-01-01T00:00:00.000Z',
        accepted_by_name: 'John Doe',
        created_at: '2023-12-31T00:00:00.000Z',
        valid_until: null,
        currency_code: 'EUR',
      },
      current_version: null,
      lines: [],
    };

    acceptanceRepo.acceptQuoteOnlineByToken.mockResolvedValue(view);

    const payload = {
      full_name: 'John Doe',
      accept_cgv: true,
    };

    const response = await request(app)
      .post('/v1/public/quotes/public-token-123/accept')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: view });
    expect(acceptanceRepo.acceptQuoteOnlineByToken).toHaveBeenCalledWith('public-token-123', payload);
  });

  it('accepts a PIN-protected quote when PIN has been validated', async () => {
    const view: QuotePublicView = {
      quote: {
        number: 'MPK-2025-002',
        customer_name: 'Acme',
        status: 'accepted',
        acceptance_mode: 'online',
        accepted_at: '2024-01-02T00:00:00.000Z',
        accepted_by_name: 'Jane Doe',
        created_at: '2023-12-31T00:00:00.000Z',
        valid_until: null,
        currency_code: 'EUR',
      },
      current_version: null,
      lines: [],
    };

    acceptanceRepo.acceptQuoteOnlineByToken.mockResolvedValue(view);

    const payload = {
      full_name: 'Jane Doe',
      accept_cgv: true,
    };

    const response = await request(app)
      .post('/v1/public/quotes/pin-protected-token/accept')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: view });
    expect(acceptanceRepo.acceptQuoteOnlineByToken).toHaveBeenCalledWith('pin-protected-token', payload);
  });

  it('returns pin_required when PIN validation is missing', async () => {
    acceptanceRepo.acceptQuoteOnlineByToken.mockRejectedValue(
      Object.assign(new Error('PIN is required to accept this quote.'), {
        status: 403,
        code: 'pin_required',
      }),
    );

    const payload = {
      full_name: 'John Doe',
      accept_cgv: true,
    };

    const response = await request(app)
      .post('/v1/public/quotes/pin-protected-token/accept')
      .send(payload);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('pin_required');
  });

  it('returns pin_locked when PIN is locked', async () => {
    acceptanceRepo.acceptQuoteOnlineByToken.mockRejectedValue(
      Object.assign(new Error('PIN is temporarily locked.'), {
        status: 403,
        code: 'pin_locked',
        details: { unlock_at: '2024-01-01T00:15:00.000Z' },
      }),
    );

    const payload = {
      full_name: 'John Doe',
      accept_cgv: true,
    };

    const response = await request(app)
      .post('/v1/public/quotes/pin-locked-token/accept')
      .send(payload);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('pin_locked');
    expect(response.body.error.details.unlock_at).toBe('2024-01-01T00:15:00.000Z');
  });

  it('returns already_accepted when quote is already accepted', async () => {
    acceptanceRepo.acceptQuoteOnlineByToken.mockRejectedValue(
      Object.assign(new Error('Quote is already accepted.'), {
        status: 409,
        code: 'already_accepted',
      }),
    );

    const payload = {
      full_name: 'John Doe',
      accept_cgv: true,
    };

    const response = await request(app)
      .post('/v1/public/quotes/public-token-123/accept')
      .send(payload);

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('already_accepted');
  });

  it('propagates public_link_not_found from repository', async () => {
    acceptanceRepo.acceptQuoteOnlineByToken.mockRejectedValue(
      Object.assign(new Error('Public link not found.'), {
        status: 404,
        code: 'public_link_not_found',
      }),
    );

    const payload = {
      full_name: 'John Doe',
      accept_cgv: true,
    };

    const response = await request(app)
      .post('/v1/public/quotes/unknown-token/accept')
      .send(payload);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('public_link_not_found');
  });

  it('returns cgv_not_accepted when CGV is not accepted', async () => {
    const payload = {
      full_name: 'John Doe',
      accept_cgv: false,
    };

    const response = await request(app)
      .post('/v1/public/quotes/public-token-123/accept')
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('cgv_not_accepted');
    expect(acceptanceRepo.acceptQuoteOnlineByToken).not.toHaveBeenCalled();
  });

  it('returns validation_error for structurally invalid payload', async () => {
    const payload = {
      accept_cgv: false,
    } as any;

    const response = await request(app)
      .post('/v1/public/quotes/public-token-123/accept')
      .send(payload);

    expect(response.status).toBe(422);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('validation_error');
    expect(acceptanceRepo.acceptQuoteOnlineByToken).not.toHaveBeenCalled();
  });
});

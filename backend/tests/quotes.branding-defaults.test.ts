import { describe, expect, it } from 'vitest'

import type { BrandingConfig } from '../src/db/schema'
import type { QuoteCreateDTO } from '../src/api/validators/quotes'
import { computeQuoteBrandingDefaults } from '../src/repositories/quotes.repo'

describe('computeQuoteBrandingDefaults', () => {
  it('applies branding defaults when payload does not specify validity or deposit', () => {
    const now = new Date('2024-01-01T10:00:00.000Z')

    const dto: QuoteCreateDTO = {
      customer_name: 'Acme',
      title: 'Test',
      notes: 'Notes',
      currency: 'EUR',
      lines: [
        {
          description: 'Service',
          qty: 1,
          unit_amount_cents: 1000,
          tax_rate_bps: 2000,
        },
      ],
    }

    const branding: BrandingConfig = {
      id: '11111111-1111-1111-1111-111111111111',
      label: 'default',
      companyName: 'MEMOPYK',
      logoUrl: null,
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      pdfFooterText: null,
      defaultValidityDays: 30,
      defaultDepositPct: 50,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = computeQuoteBrandingDefaults(now, dto, branding)

    expect(result.depositPct).toBe('50')
    expect(result.validUntil).toBe('2024-01-31')
  })

  it('does not override explicit validity or deposit from payload', () => {
    const now = new Date('2024-01-01T10:00:00.000Z')

    const dto: QuoteCreateDTO = {
      customer_name: 'Acme',
      title: 'Test',
      notes: 'Notes',
      currency: 'EUR',
      lines: [
        {
          description: 'Service',
          qty: 1,
          unit_amount_cents: 1000,
          tax_rate_bps: 2000,
        },
      ],
      valid_until: '2024-02-15T00:00:00.000Z',
      deposit_pct: 30,
    }

    const branding: BrandingConfig = {
      id: '11111111-1111-1111-1111-111111111111',
      label: 'default',
      companyName: 'MEMOPYK',
      logoUrl: null,
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      pdfFooterText: null,
      defaultValidityDays: 45,
      defaultDepositPct: 60,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = computeQuoteBrandingDefaults(now, dto, branding)

    expect(result.depositPct).toBe('30')
    expect(result.validUntil).toBe('2024-02-15T00:00:00.000Z')
  })

  it('allows explicit null validity to disable branding default but still applies deposit default', () => {
    const now = new Date('2024-01-01T10:00:00.000Z')

    const dto: QuoteCreateDTO = {
      customer_name: 'Acme',
      title: 'Test',
      notes: 'Notes',
      currency: 'EUR',
      lines: [
        {
          description: 'Service',
          qty: 1,
          unit_amount_cents: 1000,
          tax_rate_bps: 2000,
        },
      ],
      valid_until: null,
    }

    const branding: BrandingConfig = {
      id: '11111111-1111-1111-1111-111111111111',
      label: 'default',
      companyName: 'MEMOPYK',
      logoUrl: null,
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      pdfFooterText: null,
      defaultValidityDays: 30,
      defaultDepositPct: 10,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = computeQuoteBrandingDefaults(now, dto, branding)

    expect(result.validUntil).toBeNull()
    expect(result.depositPct).toBe('10')
  })
})

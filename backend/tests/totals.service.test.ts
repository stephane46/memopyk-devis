// Vitest unit tests for totals.service.ts
import { describe, it, expect } from 'vitest';
import { computeLineTotals, computeVersionTotals } from '../src/services/totals.service';

describe('computeLineTotals', () => {
  it('handles integer qty', () => {
    const t = computeLineTotals({ unit_cents: 1000, quantity: 2, tax_rate_pct: 20 });
    expect(t).toEqual({ net_cents: 2000, tax_cents: 400, gross_cents: 2400 });
  });

  it('handles fractional qty safely', () => {
    const t = computeLineTotals({ unit_cents: 999, quantity: 1.5, tax_rate_pct: 20 });
    // net = 999 * 1.5 = 1498.5 → 1499
    // tax = 1499 * 0.20 = 299.8 → 300
    // gross = 1499 + 300 = 1799
    expect(t).toEqual({ net_cents: 1499, tax_cents: 300, gross_cents: 1799 });
  });

  it('0% tax edge case', () => {
    const t = computeLineTotals({ unit_cents: 2500, quantity: 3, tax_rate_pct: 0 });
    expect(t).toEqual({ net_cents: 7500, tax_cents: 0, gross_cents: 7500 });
  });
});

describe('computeVersionTotals', () => {
  it('sums many lines', () => {
    const lines = [
      { unit_cents: 1000, quantity: 1,   tax_rate_pct: 20 }, // net 1000, tax 200, gross 1200
      { unit_cents:  500, quantity: 2.5, tax_rate_pct: 10 }, // net 1250, tax 125, gross 1375
    ];
    const v = computeVersionTotals(lines);
    expect(v).toEqual({
      lines_net_cents: 2250,
      lines_tax_cents: 325,
      lines_gross_cents: 2575,
    });
  });
});

export type LineInput = {
  unit_cents: number;     // price per unit in cents (integer)
  quantity: number;       // can be fractional (e.g., 1.5 hours)
  tax_rate_pct: number;   // e.g., 20 for 20%
};

export type LineTotals = {
  net_cents: number;
  tax_cents: number;
  gross_cents: number;
};

/**
 * Safe rounding for cents. Works with floats (e.g., when quantity is fractional).
 */
function roundCents(value: number): number {
  // Avoid floating point drift using Math.round on value * 100, then /100, then *100 again.
  // But since we operate in cents already most of the time, we just round to nearest integer.
  return Math.round(value);
}

/**
 * Compute totals for a single line.
 * net = unit_cents * quantity
 * tax = net * (tax_rate_pct/100)
 * gross = net + tax
 */
export function computeLineTotals(input: LineInput): LineTotals {
  const net = input.unit_cents * input.quantity;     // may be fractional
  const net_cents = roundCents(net);

  const tax = net_cents * (input.tax_rate_pct / 100);
  const tax_cents = roundCents(tax);

  const gross_cents = net_cents + tax_cents;

  return { net_cents, tax_cents, gross_cents };
}

export type VersionTotals = {
  lines_net_cents: number;
  lines_tax_cents: number;
  lines_gross_cents: number;
};

/**
 * Sum totals across many lines.
 */
export function computeVersionTotals(lines: LineInput[]): VersionTotals {
  let net = 0, tax = 0, gross = 0;

  for (const line of lines) {
    const t = computeLineTotals(line);
    net   += t.net_cents;
    tax   += t.tax_cents;
    gross += t.gross_cents;
  }

  return {
    lines_net_cents: roundCents(net),
    lines_tax_cents: roundCents(tax),
    lines_gross_cents: roundCents(gross),
  };
}

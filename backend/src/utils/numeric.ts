export function toFixedString(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

export function toPercentageString(value: number): string {
  return toFixedString(value, 4);
}

export function toCurrencyString(value: number): string {
  return toFixedString(value, 2);
}

export function parseNumeric(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

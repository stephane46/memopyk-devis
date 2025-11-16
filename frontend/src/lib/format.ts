export function formatMoney(cents: number | null | undefined, currency: string) {
  const value = (cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${(value).toFixed(2)} ${currency}`;
  }
}

export function formatISO(date?: string | null) {
  if (!date) return '—';
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString();
}

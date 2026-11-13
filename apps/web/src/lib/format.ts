const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const currencyCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

/** 123456 → "R$ 1.234,56" */
export function formatCurrency(cents: number): string {
  return currency.format(cents / 100);
}

/** 123456 → "R$ 1.235" (no centavos; for axes and compact summaries). */
export function formatCurrencyCompact(cents: number): string {
  return currencyCompact.format(cents / 100);
}

/** "1.234,56" → 123456. Returns null when the text is not a valid amount. */
export function parseCurrencyToCents(text: string): number | null {
  const normalized = text
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  if (normalized === '' || normalized === '-') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

/** 95 → "1h 35min", 60 → "1h", 20 → "20min" */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}min`;
}

/** 0.42 → "42%" */
export function formatPercent(ratio: number): string {
  return percent.format(ratio);
}

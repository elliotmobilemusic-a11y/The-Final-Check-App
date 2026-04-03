export function uid(prefix = 'id') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function safe(value: unknown) {
  return String(value ?? '').trim();
}

export function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function fmtCurrency(value: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(num(value));
}

export function fmtPercent(value: number, digits = 1) {
  return `${num(value).toFixed(digits)}%`;
}

export function lines(text: string) {
  return safe(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function downloadText(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

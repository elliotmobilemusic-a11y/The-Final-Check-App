import { fmtCurrency, fmtPercent, num } from '../utils';

export function pdfText(value: unknown, fallback = 'Not recorded') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function pdfOptionalText(value: unknown) {
  return String(value ?? '').trim();
}

export function pdfCurrency(value: number) {
  return fmtCurrency(num(value));
}

export function pdfPercent(value: number, digits = 1) {
  return fmtPercent(num(value), digits);
}

export function pdfDate(value?: string | null, fallback = 'Not set') {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

export function safeFilenamePart(value: unknown, fallback = 'Document') {
  const cleaned = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return cleaned || fallback;
}

export function buildPdfFilename(kind: string, clientName: string, date?: string | null) {
  const datePart = date && !Number.isNaN(new Date(date).getTime())
    ? new Date(date).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return `The-Final-Check-${safeFilenamePart(kind)}-${safeFilenamePart(clientName, 'Client')}-${datePart}.pdf`;
}

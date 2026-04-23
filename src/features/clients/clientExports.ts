import type {
  AuditFormState,
  ClientInvoice,
  ClientProfile,
  MenuProjectState,
  SupabaseRecord
} from '../../types';
import { fmtCurrency, num } from '../../lib/utils';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not set';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

export function invoiceTotal(invoice: ClientInvoice) {
  const subtotal = invoice.lines.reduce(
    (sum, line) => sum + num(line.quantity) * num(line.unitPrice),
    0
  );

  if (!invoice.taxEnabled) return subtotal;
  return subtotal + subtotal * (num(invoice.taxRate) / 100);
}

function listMarkup(title: string, items: string[]) {
  const content = items.length
    ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="muted">No entries recorded.</p>';

  return `<section><h3>${escapeHtml(title)}</h3>${content}</section>`;
}

function paragraph(title: string, text?: string) {
  return `<section><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text || 'Not recorded')}</p></section>`;
}

function invoiceTable(invoice: ClientInvoice) {
  if (!invoice.lines.length) {
    return '<p class="muted">No line items recorded.</p>';
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.lines
          .map(
            (line) => `
              <tr>
                <td>${escapeHtml(line.description || 'Untitled line')}</td>
                <td>${num(line.quantity)}</td>
                <td>${escapeHtml(fmtCurrency(num(line.unitPrice)))}</td>
                <td>${escapeHtml(fmtCurrency(num(line.quantity) * num(line.unitPrice)))}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

type ReportHeroCard = {
  label: string;
  value: string;
  detail?: string;
};

export function buildReportHeroHtml(options: {
  eyebrow: string;
  title: string;
  leadHtml?: string;
  description?: string;
  chips?: string[];
  cards: ReportHeroCard[];
}) {
  const chipsHtml = options.chips?.filter(Boolean).length
    ? `
      <div class="report-chip-row">
        ${options.chips
          ?.filter(Boolean)
          .map((chip) => `<span class="report-chip">${escapeHtml(chip)}</span>`)
          .join('')}
      </div>
    `
    : '';

  return `
    <div class="report-hero">
      <div class="report-hero-main">
        <div class="eyebrow">${escapeHtml(options.eyebrow)}</div>
        <h1>${escapeHtml(options.title)}</h1>
        ${options.leadHtml ? `<p class="report-hero-lead">${options.leadHtml}</p>` : ''}
        ${
          options.description
            ? `<p class="report-section-lead">${escapeHtml(options.description)}</p>`
            : ''
        }
        ${chipsHtml}
      </div>
      <aside class="report-hero-side">
        ${options.cards
          .map(
            (card) => `
              <div class="report-summary-card">
                <span>${escapeHtml(card.label)}</span>
                <strong>${escapeHtml(card.value)}</strong>
                ${card.detail ? `<p>${escapeHtml(card.detail)}</p>` : ''}
              </div>
            `
          )
          .join('')}
      </aside>
    </div>
  `;
}

type PrintLayoutOptions = {
  landscape?: boolean;
  autoPrint?: boolean;
  showCloseButton?: boolean;
  formatLabel?: string;
};

export function buildReportDocumentHtml(
  title: string,
  bodyHtml: string,
  options: PrintLayoutOptions = {}
) {
  const generatedOn = formatDate(new Date().toISOString());
  const safeTitle = escapeHtml(title);
  const pageSize = options.landscape ? 'A4 landscape' : 'A4';
  const documentWidth = options.landscape ? '1240px' : '960px';
  const showCloseButton = options.showCloseButton ?? true;
  const autoPrint = options.autoPrint ?? false;
  const formatLabel =
    options.formatLabel ??
    (options.landscape ? 'Landscape client-ready PDF' : 'Client-ready PDF');
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${safeTitle}</title>
      <style>
@page {
  size: ${pageSize};
  margin: 14mm 14mm 16mm 14mm;
  marks: none;
}

:root {
  color-scheme: light;
  --ink: #19222c;
  --ink-soft: #2d3945;
  --muted: #667281;
  --muted-strong: #4b5866;
  --accent: #b97f33;
  --accent-deep: #94601d;
  --accent-soft: #f6ecde;
  --line-soft: #e7ebef;
  --line-medium: #d9dfe5;
  --line-strong: #c4ccd5;
  --background-canvas: #f1f3f5;
  --background-soft: #ffffff;
  --background-subtle: #fafbfc;
  --shadow-page: 0 16px 40px rgba(18, 28, 38, 0.08);
  --shadow-toolbar: 0 12px 28px rgba(18, 28, 38, 0.08);
  --document-width: ${documentWidth};
  font-family: "Inter", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
}
        html {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background: var(--background-canvas);
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 22px 20px 30px;
          color: var(--ink);
          background:
            radial-gradient(circle at top, rgba(185, 127, 51, 0.08), transparent 26%),
            linear-gradient(180deg, #f5f6f8 0%, #eceff3 100%);
        }
        .print-toolbar {
          position: sticky;
          top: 18px;
          z-index: 10;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          max-width: var(--document-width);
          margin: 0 auto 18px;
        }
        .print-toolbar button {
          appearance: none;
          border: 1px solid rgba(22, 32, 43, 0.08);
          background: rgba(255, 255, 255, 0.92);
          color: var(--ink);
          padding: 11px 16px;
          border-radius: 999px;
          font: inherit;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          box-shadow: var(--shadow-toolbar);
        }
        main {
          max-width: var(--document-width);
          margin: 0 auto;
        }
        .report-document {
          padding: 0;
          border-radius: 0;
          background: transparent;
          border: 0;
          box-shadow: none;
          -webkit-box-decoration-break: clone;
          box-decoration-break: clone;
        }
        .report-sheet {
          padding: 0;
          border-radius: 0;
          background: transparent;
          border: 0;
          box-shadow: none;
          -webkit-box-decoration-break: clone;
          box-decoration-break: clone;
        }
        .report-masthead {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: end;
          gap: 18px;
          padding: 0 0 14px;
          margin: 0 0 14px;
          border-bottom: 2px solid var(--accent);
          page-break-inside: avoid;
          break-inside: avoid-page;
        }
        .report-brand {
          display: grid;
          gap: 6px;
          min-width: 0;
          align-content: start;
        }
        .report-brand-mark {
          display: grid;
          gap: 4px;
        }
        .report-brand-mark span {
          color: var(--muted);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .report-brand-mark strong {
          color: var(--ink);
          font-size: 24px;
          line-height: 1;
          letter-spacing: -0.03em;
          text-transform: uppercase;
        }
        .report-kicker {
          color: var(--accent-deep);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .report-meta-block {
          display: grid;
          gap: 5px;
          min-width: 160px;
          justify-items: end;
          align-self: start;
          text-align: right;
        }
        .report-meta-block span {
          color: var(--muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .report-meta-block strong {
          font-size: 12px;
          line-height: 1.4;
        }
        .report-section-lead {
          margin-top: 0;
          color: var(--muted);
          font-size: 11.5px;
          line-height: 1.72;
          max-width: 72ch;
        }
        header {
          display: grid;
          gap: 8px;
          margin: 0 0 14px;
          padding: 0 0 12px;
          border-bottom: 1px solid var(--line-medium);
        }
        .report-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(220px, 0.85fr);
          gap: 14px;
          margin: 0 0 14px;
          align-items: start;
          page-break-inside: avoid;
          break-inside: avoid-page;
        }
        .report-hero-main {
          display: grid;
          gap: 8px;
          min-height: 100%;
          padding: 18px 18px 16px;
          border-radius: 0;
          border: 1px solid var(--line-medium);
          border-top: 4px solid var(--accent);
          background: #ffffff;
          box-shadow: none;
          page-break-inside: avoid;
          break-inside: avoid-page;
        }
        .report-hero-lead {
          color: var(--ink);
          font-size: 15px;
          font-weight: 700;
          line-height: 1.45;
          max-width: 42ch;
        }
        .report-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 2px;
        }
        .report-chip {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 0 9px;
          border-radius: 4px;
          border: 1px solid rgba(185, 127, 51, 0.22);
          background: var(--accent-soft);
          color: var(--accent-deep);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .report-hero-side {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          align-content: start;
        }
        .report-summary-card {
          min-height: 0;
          padding: 12px 12px 13px;
          border-radius: 0;
          border: 1px solid var(--line-medium);
          background: #ffffff;
          page-break-inside: avoid;
          break-inside: avoid-page;
        }
        .report-summary-card span {
          display: block;
          margin-bottom: 6px;
          color: var(--muted);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .report-summary-card strong {
          display: block;
          color: var(--ink);
          font-size: 16px;
          line-height: 1.2;
          letter-spacing: -0.03em;
        }
        .report-summary-card p {
          margin-top: 5px;
          color: var(--muted);
          font-size: 10px;
          line-height: 1.45;
        }
         .report-page,
         .report-page-block {
           display: flex;
           flex-direction: column;
           gap: 10px;
           min-height: 0;
           position: relative;
           padding: 12mm 12mm 13mm;
           margin: 0 0 14px;
           border-radius: 20px;
           border: 1px solid var(--line-medium);
           background: #ffffff;
           box-shadow: var(--shadow-page);
           page-break-after: always;
           break-after: page;
         }
        .report-page.report-page-last,
        .report-page-block.report-page-block-final {
          page-break-after: auto;
          break-after: auto;
        }
        .report-cover-block {
          padding: 12px 14px 14px;
          border-radius: 16px;
          border: 1px solid var(--line-medium);
          background: #ffffff;
          page-break-inside: avoid;
          break-inside: avoid-page;
        }
        .report-cover-heading {
          color: var(--ink);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .report-cover-divider {
          height: 1px;
          margin: 10px 0 12px;
          background: var(--line-medium);
        }
        .report-cover-top {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 1.2fr);
          gap: 14px;
          align-items: stretch;
        }
        .report-cover-mini-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .report-cover-mini-card,
        .report-cover-stat-card,
        .report-cover-commercial {
          display: grid;
          gap: 8px;
          align-content: start;
          min-height: 60px;
          padding: 11px 12px;
          border-radius: 16px;
          border: 1px solid var(--line-medium);
          background: #ffffff;
        }
        .report-cover-mini-label,
        .report-cover-commercial-label,
        .report-cover-stat-card span {
          color: var(--muted);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .report-cover-mini-value,
        .report-cover-stat-card strong {
          color: var(--ink);
          font-size: 13px;
          font-weight: 700;
          line-height: 1.45;
        }
        .report-cover-commercial {
          min-height: 140px;
          padding: 14px 15px;
        }
        .report-cover-commercial-label {
          color: var(--muted);
          font-size: 11px;
        }
        .report-cover-commercial-value {
          margin-top: 8px;
          color: var(--ink);
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .report-cover-commercial-detail {
          margin-top: auto;
          color: var(--muted);
          font-size: 12px;
          letter-spacing: 0;
        }
        .report-cover-pill-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }
        .report-cover-pill {
          display: grid;
          place-items: center;
          min-height: 40px;
          padding: 0 12px;
          border-radius: 0;
          border: 1px solid rgba(182, 122, 43, 0.24);
          background: var(--accent-soft);
          color: #85551a;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-align: center;
          text-transform: uppercase;
        }
        .report-cover-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }
        .report-cover-stat-card {
          min-height: 78px;
          text-align: center;
          align-content: center;
          justify-items: center;
        }
        .report-story-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .report-story-card {
          padding: 12px 13px 14px;
          border-radius: 16px;
          border: 1px solid var(--line-medium);
          background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
        }
        .report-story-card h3 {
          margin-bottom: 10px;
          font-size: 13px;
          letter-spacing: -0.01em;
        }
        .report-story-card p,
        .report-story-card li {
          font-size: 12px;
          line-height: 1.7;
        }
        .report-photo-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 12px;
          align-items: start;
        }
        .report-photo-grid-featured .report-photo-card:first-child {
          grid-column: 1 / -1;
        }
        .report-photo-card {
          margin: 0;
          border: 1px solid var(--line-medium);
          border-radius: 18px;
          overflow: hidden;
          background: linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%);
          box-shadow: 0 12px 24px rgba(18, 28, 38, 0.06);
          page-break-inside: avoid;
          break-inside: avoid-page;
        }
        .report-photo-card img {
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          display: block;
          background: #f3eee7;
        }
        .report-photo-grid-featured .report-photo-card:first-child img {
          aspect-ratio: 16 / 9;
        }
        .report-photo-card figcaption {
          display: grid;
          gap: 5px;
          padding: 12px 13px 13px;
          border-top: 1px solid rgba(25, 34, 44, 0.06);
        }
        .report-photo-card figcaption strong {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .report-photo-card figcaption span {
          font-size: 12px;
          line-height: 1.55;
          color: var(--ink);
        }
        .report-photo-section {
          margin-top: 12px;
          break-inside: avoid-page;
          page-break-inside: avoid;
        }
        .report-photo-section-heading {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: baseline;
          margin-bottom: 8px;
        }
        .report-photo-section-heading span {
          color: var(--muted);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .report-photo-section-heading strong {
          font-size: 13px;
          letter-spacing: -0.02em;
        }
        .report-story-card ul {
          margin-top: 0;
        }
        h1, h2, h3, p { margin: 0; }
        h1 {
          font-size: 28px;
          line-height: 1.02;
          letter-spacing: -0.04em;
          max-width: 15ch;
        }
        h2 {
          font-size: 17px;
          margin-bottom: 0;
          color: var(--ink);
          letter-spacing: -0.025em;
          line-height: 1.18;
        }
        h3 {
          font-size: 13px;
          margin-bottom: 6px;
          color: var(--ink);
          line-height: 1.28;
        }
        .eyebrow {
          color: var(--accent);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .muted { color: var(--muted); }
        .muted-copy { color: var(--muted); }
        .meta-grid, .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 0 0 14px;
          page-break-inside: avoid;
          break-inside: avoid-page;
        }
        .meta-card {
          padding: 11px 12px 12px;
          border-radius: 16px;
          border: 1px solid var(--line-medium);
          background: #ffffff;
          page-break-inside: avoid;
          break-inside: avoid-page;
        }
        .meta-card span {
          display: block;
          margin-bottom: 5px;
          color: var(--muted);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .meta-card strong {
          font-size: 14px;
          line-height: 1.3;
          letter-spacing: -0.02em;
        }
        section {
          margin-top: 0;
          padding: 12px 0 0;
          border-radius: 0;
          border: 0;
          border-top: 1px solid var(--line-soft);
          background: transparent;
          page-break-inside: auto;
          break-inside: auto;
        }
        section + section {
          margin-top: 14px;
        }
        section > h2,
        section > h3 {
          page-break-after: avoid;
          break-after: avoid-page;
        }
        section > h2 {
          color: var(--ink);
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.025em;
          line-height: 1.18;
        }
        section > h2 + *,
        section > h3 + * {
          margin-top: 11px;
        }
        .report-section-heading {
          padding-top: 0;
          border-top: 0;
          margin-bottom: 14px;
        }
        .report-empty-note {
          margin-top: 8px;
          font-size: 10.5px;
          line-height: 1.55;
          font-style: italic;
        }
        .report-meta,
        .report-columns,
        .report-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin: 10px 0 0;
          page-break-inside: avoid;
          break-inside: avoid-page;
        }
        .report-meta.columns-4,
        .report-grid.columns-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .report-meta > div,
        .report-columns > div,
        .report-grid > div {
          padding: 11px 12px 12px;
          border-radius: 16px;
          border: 1px solid var(--line-medium);
          background: #ffffff;
          page-break-inside: avoid;
          break-inside: avoid-page;
        }
        .report-meta > div strong,
        .report-columns > div strong,
        .report-grid > div strong {
          display: block;
          margin-bottom: 6px;
        }
        ul {
          margin: 0;
          padding-left: 18px;
          color: var(--ink);
          line-height: 1.55;
          page-break-inside: auto;
          break-inside: auto;
        }
        p {
          line-height: 1.58;
        }
        p,
        li {
          orphans: 3;
          widows: 3;
        }
        li + li {
          margin-top: 7px;
        }
        table,
        .report-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 12px;
          overflow: visible;
          border: 1px solid var(--line-medium);
          border-radius: 16px;
          background: #ffffff;
          page-break-inside: auto;
          break-inside: auto;
        }
        thead {
          display: table-header-group;
        }
        tbody {
          break-inside: auto;
        }
        tfoot {
          display: table-footer-group;
        }
        th, td {
          padding: 8px 9px;
          border-bottom: 1px solid var(--line-soft);
          text-align: left;
          vertical-align: top;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        th {
          color: var(--muted);
          font-size: 8px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: #f4f6f8;
        }
        tbody tr:nth-child(even) td {
          background: #fafbfc;
        }
        tbody tr:last-child td,
        table tr:last-child td,
        .report-table tr:last-child td {
          border-bottom: none;
        }
        tr {
          page-break-inside: avoid;
          break-inside: avoid-page;
        }
        td, th {
          page-break-inside: auto;
          break-inside: auto;
        }
        .report-table-compact {
          font-size: 11px;
        }
        .report-table-compact th,
        .report-table-compact td {
          padding: 7px 8px;
        }
        .report-cover-page-minimal {
          display: block;
          min-height: 0;
          page-break-after: always;
          break-after: page;
        }
        .report-cover-hero {
          display: grid;
          align-content: start;
          gap: 10px;
          min-height: 0;
          padding: 0;
        }
        .report-cover-title {
          font-size: 32px;
          line-height: 0.98;
          letter-spacing: -0.045em;
          margin: 0;
        }
        .report-cover-title span {
          display: block;
        }
        .report-cover-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          color: var(--muted);
          font-size: 11px;
        }
        .report-cover-meta span {
          position: relative;
        }
        .report-kpi-pair {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 12px;
          align-items: end;
          padding: 6mm 0 4mm;
          border-top: 1px solid var(--line-medium);
          border-bottom: 1px solid var(--line-medium);
        }
        .report-kpi-primary span,
        .report-kpi-secondary span,
        .report-metric-card span {
          display: block;
          color: var(--muted);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .report-kpi-primary strong {
          display: block;
          font-size: 34px;
          line-height: 0.92;
          letter-spacing: -0.045em;
        }
        .report-kpi-secondary strong {
          display: block;
          font-size: 21px;
          line-height: 1;
          letter-spacing: -0.04em;
        }
        .report-executive-summary {
          max-width: 132mm;
          font-size: 12px;
          line-height: 1.6;
          color: var(--ink);
        }
        .report-support-grid,
        .report-metric-grid {
          display: grid;
          gap: 10px;
        }
        .report-support-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .report-metric-grid-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .report-metric-card {
          padding: 11px 12px 12px;
          border: 1px solid var(--line-medium);
          border-radius: 0;
          background: #fff;
        }
        .report-metric-card strong {
          display: block;
          font-size: 16px;
          line-height: 1.15;
          letter-spacing: -0.03em;
        }
        .report-metric-card-primary {
          background: linear-gradient(180deg, #fff7ed 0%, #f8ecdc 100%);
          border-color: rgba(182, 122, 43, 0.24);
        }
        .report-editorial-section {
          padding: 0;
          border: 0;
          background: transparent;
          margin-top: 0;
        }
        .report-editorial-section + .report-editorial-section {
          margin-top: 14px;
        }
        .report-cover {
          display: grid;
          gap: 14px;
          min-height: 0;
          padding: 14mm 13mm 13mm;
          margin: 0 0 14px;
          border: 1px solid var(--line-medium);
          border-radius: 20px;
          background: #ffffff;
          box-shadow: var(--shadow-page);
          page-break-after: always;
          break-after: page;
        }
        .report-cover-intro {
          display: grid;
          gap: 10px;
          max-width: 145mm;
        }
        .report-cover-kicker {
          color: var(--accent);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .report-cover-title-block {
          display: grid;
          gap: 8px;
        }
        .report-cover-title-block h1 {
          max-width: 11ch;
          font-size: 33px;
          line-height: 0.96;
          letter-spacing: -0.05em;
        }
        .report-cover-title-block p {
          color: var(--muted-strong);
          font-size: 13px;
          line-height: 1.7;
          max-width: 70ch;
        }
        .report-cover-keyline {
          height: 1px;
          background: linear-gradient(90deg, var(--accent) 0%, rgba(185, 127, 51, 0.12) 60%, transparent 100%);
        }
        .report-chapter {
          display: grid;
          gap: 12px;
          margin: 0 0 14px;
          padding: 12mm 12mm 13mm;
          border: 1px solid var(--line-medium);
          border-radius: 20px;
          background: #ffffff;
          box-shadow: var(--shadow-page);
        }
        .report-chapter-break {
          page-break-before: always;
          break-before: page;
        }
        .report-chapter-header {
          display: grid;
          gap: 6px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--line-medium);
          page-break-after: avoid;
          break-after: avoid-page;
        }
        .report-chapter-kicker {
          color: var(--muted);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .report-chapter-header h2 {
          font-size: 24px;
          line-height: 1.02;
          letter-spacing: -0.04em;
        }
        .report-chapter-header p {
          color: var(--muted-strong);
          max-width: 78ch;
          font-size: 12px;
          line-height: 1.7;
        }
        .report-section-block {
          display: grid;
          gap: 10px;
          page-break-inside: auto;
          break-inside: auto;
        }
        .report-section-block + .report-section-block {
          margin-top: 12px;
        }
        .report-section-header {
          display: grid;
          gap: 4px;
          page-break-after: avoid;
          break-after: avoid-page;
        }
        .report-section-header h3 {
          font-size: 15px;
          line-height: 1.18;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .report-section-header p {
          color: var(--muted);
          font-size: 11px;
          line-height: 1.65;
        }
        .report-page-block-action {
          gap: 12px;
        }
        .report-story-grid-editorial {
          margin-top: 10px;
        }
        .report-table-tight {
          table-layout: fixed;
        }
        .report-table-tight td strong {
          font-size: 12px;
          line-height: 1.35;
        }
        .report-page-block table,
        .report-page-block .report-story-grid {
          margin-top: 10px;
        }
        .report-page-block > *:last-child,
        .report-page > *:last-child {
          margin-bottom: 0;
        }
        .totals {
          display: flex;
          justify-content: flex-end;
          margin-top: 12px;
        }
        .totals strong {
          padding: 11px 14px;
          border-radius: 0;
          background: #f9f2e7;
          border: 1px solid rgba(182, 122, 43, 0.22);
        }
        .report-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
          padding-top: 10px;
          border-top: 1px solid var(--line-medium);
          color: var(--muted);
          font-size: 11px;
          line-height: 1.6;
          page-break-inside: avoid;
          break-inside: avoid-page;
        }
        .report-metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }
        .report-metric-cell {
          padding: 12px 13px;
          border: 1px solid var(--line-medium);
          border-radius: 0;
          background: #ffffff;
        }
        .report-label {
          color: var(--muted);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .report-value-large {
          margin-top: 6px;
          color: var(--ink);
          font-size: 24px;
          font-weight: 800;
          line-height: 0.98;
          letter-spacing: -0.04em;
        }
        @media print {
          .print-toolbar {
            display: none;
          }
          body {
            padding: 0;
            background: white;
          }
          main {
            max-width: none;
            padding: 0;
            width: 100%;
          }
          .report-document {
            padding: 0;
            border: 0;
            border-radius: 0;
            box-shadow: none;
            background: transparent;
          }
          .report-sheet {
            min-height: auto;
            padding: 0;
            border-radius: 0;
            border: 0;
            box-shadow: none;
            overflow: visible;
            background: transparent;
          }
          .report-masthead {
            margin-bottom: 10px;
            padding-bottom: 10px;
          }
          .report-cover,
          .report-chapter {
            margin: 0;
            padding: 6mm 6mm 6.5mm;
            border-radius: 0;
            box-shadow: none;
            background: #ffffff;
          }
          .report-cover {
            break-after: page;
            page-break-after: always;
          }
          .report-chapter-break {
            break-before: page;
            page-break-before: always;
          }
          .report-cover-page,
          .report-page,
          .report-page-block {
            margin: 0;
            padding: 4.5mm 5mm 5mm;
            border: 1px solid var(--line-medium);
            border-radius: 0;
            box-shadow: none;
            background: #ffffff;
          }
          .report-cover-page::before,
          .report-page::before,
          .report-page-block::before {
            content: "";
            position: absolute;
            inset: 2.5mm;
            border: 0.5pt solid #d7dde3;
            pointer-events: none;
          }
          .report-hero {
            gap: 10px;
            margin-bottom: 10px;
          }
          .report-hero-main {
            padding: 13px 13px 11px;
          }
          .report-summary-card {
            padding: 9px 10px 10px;
          }
          .meta-grid,
          .summary-grid {
            gap: 8px;
            margin-bottom: 10px;
          }
          .meta-card,
          .report-meta > div,
          .report-columns > div,
          .report-grid > div,
          .report-metric-card,
          .report-metric-cell,
          .report-story-card,
          .report-cover-block,
          .report-cover-mini-card,
          .report-cover-stat-card,
          .report-cover-commercial {
            padding: 9px 10px 10px;
          }
          section {
            padding-top: 10px;
            border-top-color: var(--line-medium);
          }
          section + section {
            margin-top: 10px;
          }
          .report-section-block + .report-section-block {
            margin-top: 10px;
          }
          .report-grid,
          .report-columns,
          .report-meta,
          .report-metric-grid,
          .report-support-grid,
          .report-story-grid,
          .report-photo-grid,
          .report-metrics-grid,
          .report-cover-top,
          .report-cover-pill-row,
          .report-cover-stat-grid,
          .report-cover-mini-grid {
            gap: 8px;
          }
          .report-grid,
          .report-columns,
          .report-meta {
            margin-top: 8px;
          }
          .report-page-block table,
          .report-page-block .report-story-grid {
            margin-top: 8px;
          }
          table,
          .report-table {
            font-size: 12px;
          }
          th,
          td {
            padding: 8px 9px;
          }
          .report-photo-card,
          .meta-card,
          .report-story-card,
          .report-meta > div,
          .report-columns > div,
          .report-grid > div,
          .report-table,
          table,
          .report-cover,
          .report-chapter {
            border-radius: 0;
            box-shadow: none;
          }
          .report-empty-note {
            margin-top: 2mm;
            font-size: 10px;
          }
          .report-footer {
            display: none;
          }
        }
        @media screen and (max-width: 760px) {
          body {
            padding: 14px;
          }
          .report-document {
            padding: 0;
          }
          .report-masthead,
          .report-footer {
            flex-direction: column;
            align-items: flex-start;
          }
          .report-hero {
            display: grid;
            grid-template-columns: 1fr;
          }
          .report-hero-side,
          .report-kpi-pair,
          .report-support-grid,
          .report-metric-grid-4,
          .report-metrics-grid {
            grid-template-columns: 1fr;
          }
          .report-cover-top,
          .report-cover-pill-row,
          .report-cover-stat-grid,
          .report-cover-mini-grid,
          .report-story-grid,
          .report-photo-grid,
          .report-metrics-grid {
            grid-template-columns: 1fr;
          }
          .report-photo-grid-featured .report-photo-card:first-child {
            grid-column: auto;
          }
          .meta-grid,
          .summary-grid,
          .report-meta,
          .report-columns,
          .report-grid,
          .report-meta.columns-4,
          .report-grid.columns-4 {
            grid-template-columns: 1fr;
          }
          .report-cover-page,
          .report-page,
          .report-page-block,
          .report-cover,
          .report-chapter {
            padding: 18px;
            border-radius: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-toolbar">
        <button type="button" onclick="window.print()">Print / Save PDF</button>
        ${showCloseButton ? '<button type="button" onclick="window.close()">Close</button>' : ''}
      </div>
      <main>
        <article class="report-document">
          <div class="report-sheet">
            <div class="report-masthead">
              <div class="report-brand">
                <div class="report-brand-mark">
                  <span>Jason Wardill</span>
                  <strong>The Final Check</strong>
                </div>
                <span class="report-kicker">Profit and performance consultancy</span>
              </div>

              <div class="report-meta-block">
                <span>Prepared</span>
                <strong>${escapeHtml(generatedOn)}</strong>
                <span>Format</span>
                <strong>${escapeHtml(formatLabel)}</strong>
              </div>
            </div>

            ${bodyHtml}
          </div>
        </article>
      </main>
      ${
        autoPrint
          ? `<script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            try {
              window.focus();
              window.print();
            } catch (error) {
              console.error('Automatic print failed', error);
            }
          }, 350);
        });
      </script>`
          : ''
      }
    </body>
  </html>`;
}

export function openPrintableHtmlDocument(
  title: string,
  bodyHtml: string,
  options: PrintLayoutOptions = {}
) {
  const popup = window.open('', '_blank', 'width=1200,height=900');
  if (!popup) {
    throw new Error('Enable pop-ups to export PDFs from this workspace.');
  }

  try {
    popup.opener = null;
  } catch {
    // Ignore browsers that prevent rewriting opener after opening the window.
  }

  popup.document.open();
  popup.document.write(buildReportDocumentHtml(title, bodyHtml, { ...options, autoPrint: true }));
  popup.document.close();
  popup.focus();
}

export function buildClientPdfHtml(
  client: ClientProfile,
  audits: SupabaseRecord<AuditFormState>[] = [],
  menus: SupabaseRecord<MenuProjectState>[] = []
) {
  const paidInvoices = client.data.invoices.filter((invoice) => invoice.status === 'Paid');
  const openInvoices = client.data.invoices.filter((invoice) => invoice.status !== 'Paid');
  const pipelineValue = client.data.deals
    .filter((deal) => deal.stage !== 'Lost')
    .reduce((sum, deal) => sum + num(deal.value), 0);
  const outstandingValue = openInvoices.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
  const siteCount = Math.max(client.data.sites.length, client.data.siteCountEstimate || 0);
  const openTasks = client.data.tasks.filter((task) => task.status !== 'Done');

  return `
    ${buildReportHeroHtml({
      eyebrow: 'Client CRM export',
      title: client.companyName || 'Client profile',
      leadHtml: `<strong>${escapeHtml(client.industry || 'Industry not set')}</strong> • ${escapeHtml(client.location || 'Location not set')} • ${escapeHtml(client.status || 'Status not set')}`,
      description:
        'Account profile, commercial context, and delivery summary prepared for operational handover.',
      chips: [
        client.data.accountScope || 'Single site',
        `${siteCount} site${siteCount === 1 ? '' : 's'}`,
        `${audits.length} audits linked`,
        `${menus.length} menu projects linked`
      ],
      cards: [
        {
          label: 'Account owner',
          value: client.data.accountOwner || client.contactName || 'Not set'
        },
        {
          label: 'Next review',
          value: formatDate(client.nextReviewDate)
        },
        {
          label: 'Monthly value',
          value: fmtCurrency(num(client.data.estimatedMonthlyValue))
        },
        {
          label: 'Outstanding value',
          value: fmtCurrency(outstandingValue),
          detail: `${openInvoices.length} open invoice${openInvoices.length === 1 ? '' : 's'}`
        }
      ]
    })}

    <div class="summary-grid">
      <div class="meta-card"><span>Account scope</span><strong>${escapeHtml(client.data.accountScope || 'Single site')}</strong></div>
      <div class="meta-card"><span>Relationship health</span><strong>${escapeHtml(client.data.relationshipHealth || 'Stable')}</strong></div>
      <div class="meta-card"><span>Pipeline value</span><strong>${escapeHtml(fmtCurrency(pipelineValue))}</strong></div>
      <div class="meta-card"><span>Operating country</span><strong>${escapeHtml(client.data.operatingCountry || 'United Kingdom')}</strong></div>
      <div class="meta-card"><span>Outstanding invoices</span><strong>${openInvoices.length} open / ${escapeHtml(fmtCurrency(outstandingValue))}</strong></div>
      <div class="meta-card"><span>Linked work</span><strong>${audits.length} audits / ${menus.length} menu projects</strong></div>
      <div class="meta-card"><span>Site count</span><strong>${escapeHtml(String(siteCount))}</strong></div>
    </div>

    <section>
      <h2>Account overview</h2>
      <p class="report-section-lead">Core account context, contact details, and relationship notes for operational handover.</p>
      <div class="report-columns">
        <div>
          <h3>Profile summary</h3>
          <p>${escapeHtml(client.data.profileSummary || client.notes || 'Not recorded')}</p>
        </div>
        <div>
          <h3>Relationship notes</h3>
          <p>${escapeHtml(client.data.internalNotes || 'Not recorded')}</p>
        </div>
      </div>
      <div class="report-grid columns-4">
        <div><h3>Main contact</h3><p>${escapeHtml(client.contactName || 'Not recorded')}</p></div>
        <div><h3>Email</h3><p>${escapeHtml(client.contactEmail || 'Not recorded')}</p></div>
        <div><h3>Phone</h3><p>${escapeHtml(client.contactPhone || 'Not recorded')}</p></div>
        <div><h3>Website</h3><p>${escapeHtml(client.website || 'Not recorded')}</p></div>
      </div>
      <div class="report-grid columns-4">
        <div><h3>Registered name</h3><p>${escapeHtml(client.data.registeredName || client.companyName || 'Not recorded')}</p></div>
        <div><h3>Company number</h3><p>${escapeHtml(client.data.companyNumber || 'Not recorded')}</p></div>
        <div><h3>VAT number</h3><p>${escapeHtml(client.data.vatNumber || 'Not recorded')}</p></div>
        <div><h3>Country</h3><p>${escapeHtml(client.data.operatingCountry || 'United Kingdom')}</p></div>
      </div>
    </section>

    <section>
      <h2>Commercial and billing</h2>
      <p class="report-section-lead">Billing ownership, commercial exposure, and invoice position at the point of export.</p>
      <div class="report-columns">
        <div>
          <h3>Billing details</h3>
          <p>${escapeHtml(client.data.billingName || 'Billing name not set')}</p>
          <p class="muted-copy">${escapeHtml(client.data.billingEmail || 'Billing email not set')}</p>
          <p class="muted-copy">${escapeHtml(client.data.billingAddress || 'Billing address not set')}</p>
        </div>
        <div>
          <h3>Commercial snapshot</h3>
          <p>${escapeHtml(fmtCurrency(pipelineValue))} in active pipeline.</p>
          <p class="muted-copy">${openInvoices.length} open invoices totalling ${escapeHtml(fmtCurrency(outstandingValue))}.</p>
          <p class="muted-copy">${paidInvoices.length} paid invoices recorded.</p>
        </div>
      </div>
    </section>

    <section>
      <h2>Account priorities</h2>
      <p class="report-section-lead">Current goals, risks, and opportunities shaping the account plan.</p>
      <div class="report-story-grid">
        <div class="report-story-card"><h3>Goals</h3>${client.data.goals.length ? `<ul>${client.data.goals.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>No entries recorded.</p>'}</div>
        <div class="report-story-card"><h3>Risks</h3>${client.data.risks.length ? `<ul>${client.data.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>No entries recorded.</p>'}</div>
        <div class="report-story-card"><h3>Opportunities</h3>${client.data.opportunities.length ? `<ul>${client.data.opportunities.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>No entries recorded.</p>'}</div>
        <div class="report-story-card"><h3>Tags and account signals</h3>${client.tags.length ? `<ul>${client.tags.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<p>No tags recorded.</p>'}</div>
      </div>
    </section>

    ${listMarkup(
      'Sites',
      client.data.sites.map((site) =>
        `${site.name || 'Unnamed site'}${site.address ? ` — ${site.address}` : ''}${site.website ? `, ${site.website}` : ''}${site.notes ? `, ${site.notes}` : ''}`
      )
    )}
    ${listMarkup(
      'Contacts',
      client.data.contacts.map((contact) =>
        `${contact.name || 'Unnamed contact'}${contact.role ? `, ${contact.role}` : ''}${contact.email ? `, ${contact.email}` : ''}${contact.phone ? `, ${contact.phone}` : ''}`
      )
    )}
    ${listMarkup(
      'Open tasks',
      openTasks.map((task) => `${task.title || 'Untitled task'} — ${task.status}${task.dueDate ? `, due ${formatDate(task.dueDate)}` : ''}`)
    )}
    ${listMarkup(
      'CRM pipeline',
      client.data.deals.map((deal) =>
        `${deal.title || 'Untitled deal'} — ${deal.stage}, ${fmtCurrency(num(deal.value))}${deal.closeDate ? `, close ${formatDate(deal.closeDate)}` : ''}`
      )
    )}
    ${listMarkup(
      'Invoices',
      client.data.invoices.map((invoice) =>
        `${invoice.number || 'Draft invoice'} — ${invoice.title || 'Invoice'}, ${invoice.status}, ${fmtCurrency(invoiceTotal(invoice))}`
      )
    )}
    ${listMarkup(
      'Timeline',
      client.data.timeline.map((item) =>
        `${formatDate(item.date)} — ${item.type}: ${item.title || item.summary || 'Untitled update'}`
      )
    )}
  `;
}

export function buildInvoicePdfHtml(client: ClientProfile, invoice: ClientInvoice) {
  const subtotal = invoice.lines.reduce(
    (sum, line) => sum + num(line.quantity) * num(line.unitPrice),
    0
  );
  const taxAmount = invoice.taxEnabled ? subtotal * (num(invoice.taxRate) / 100) : 0;
  const total = invoiceTotal(invoice);
  const linesHtml = invoice.lines.length
    ? invoiceTable(invoice).replace('<table>', '<table class="report-table report-table-compact">')
    : invoiceTable(invoice);

  return `
    ${buildReportHeroHtml({
      eyebrow: 'Invoice export',
      title: invoice.number || 'Invoice',
      leadHtml: `<strong>${escapeHtml(client.companyName || 'Client')}</strong> • ${escapeHtml(invoice.title || 'Consultancy services')}`,
      description: 'Billing summary and charge breakdown prepared for finance issue and PDF handover.',
      chips: [
        invoice.status,
        `${invoice.paymentTermsDays || client.data.paymentTermsDays} day terms`,
        formatDate(invoice.dueDate)
      ],
      cards: [
        {
          label: 'Bill to',
          value: client.data.billingName || client.companyName || 'Client'
        },
        {
          label: 'Issue date',
          value: formatDate(invoice.issueDate)
        },
        {
          label: 'Due date',
          value: formatDate(invoice.dueDate)
        },
        {
          label: 'Total due',
          value: fmtCurrency(total)
        }
      ]
    })}

    <div class="meta-grid">
      <div class="meta-card"><span>Status</span><strong>${escapeHtml(invoice.status)}</strong></div>
      <div class="meta-card"><span>Billing email</span><strong>${escapeHtml(client.data.billingEmail || client.contactEmail || 'Not set')}</strong></div>
      <div class="meta-card"><span>Payment terms</span><strong>${invoice.paymentTermsDays || client.data.paymentTermsDays} days</strong></div>
      <div class="meta-card"><span>Billing address</span><strong>${escapeHtml(client.data.billingAddress || 'Not recorded')}</strong></div>
      <div class="meta-card"><span>Client contact</span><strong>${escapeHtml(client.contactName || 'Not recorded')}</strong></div>
      <div class="meta-card"><span>Finance contact</span><strong>${escapeHtml(client.data.billingName || client.companyName || 'Client')}</strong></div>
      ${
        invoice.sourceQuoteId
          ? `<div class="meta-card"><span>Quote reference</span><strong>${escapeHtml(invoice.quoteReference || invoice.sourceQuoteId)}</strong></div>`
          : ''
      }
    </div>

    <section>
      <h2>Billing summary</h2>
      <p class="report-section-lead">Billing contact, invoice timing, and status snapshot for finance handover.</p>
      <div class="report-columns">
        <div>
          <h3>Bill to</h3>
          <p>${escapeHtml(client.data.billingName || client.companyName || 'Client')}</p>
          <p class="muted-copy">${escapeHtml(client.data.billingEmail || client.contactEmail || 'Not set')}</p>
          <p class="muted-copy">${escapeHtml(client.data.billingAddress || 'Not recorded')}</p>
        </div>
        <div>
          <h3>Invoice status</h3>
          <p>${escapeHtml(invoice.status)}</p>
          <p class="muted-copy">Issue date ${escapeHtml(formatDate(invoice.issueDate))}</p>
          <p class="muted-copy">Due date ${escapeHtml(formatDate(invoice.dueDate))}</p>
        </div>
      </div>
    </section>

    <section>
      <h2>Payment snapshot</h2>
      <p class="report-section-lead">Commercial summary for issue, approval, and accounts follow-up.</p>
      <div class="report-grid columns-4">
        <div><strong>Invoice number</strong><br />${escapeHtml(invoice.number || 'Draft')}</div>
        <div><strong>Quote reference</strong><br />${escapeHtml(invoice.quoteReference || invoice.sourceQuoteId || 'Not linked')}</div>
        <div><strong>Subtotal</strong><br />${escapeHtml(fmtCurrency(subtotal))}</div>
        <div><strong>VAT / tax</strong><br />${escapeHtml(fmtCurrency(taxAmount))}</div>
        <div><strong>Total due</strong><br />${escapeHtml(fmtCurrency(total))}</div>
        <div><strong>Issue date</strong><br />${escapeHtml(formatDate(invoice.issueDate))}</div>
        <div><strong>Due date</strong><br />${escapeHtml(formatDate(invoice.dueDate))}</div>
      </div>
    </section>

    <section>
      <h2>Invoice lines</h2>
      <p class="report-section-lead">Charge breakdown prepared for client issue and PDF handover.</p>
      ${linesHtml}
      <div class="totals">
        <strong>Subtotal: ${escapeHtml(fmtCurrency(subtotal))}</strong>
        ${
          invoice.taxEnabled
            ? `<strong>VAT (${num(invoice.taxRate)}%): ${escapeHtml(fmtCurrency(taxAmount))}</strong>`
            : ''
        }
        <strong>Total due: ${escapeHtml(fmtCurrency(total))}</strong>
      </div>
    </section>

    ${paragraph('Notes', invoice.notes)}
  `;
}

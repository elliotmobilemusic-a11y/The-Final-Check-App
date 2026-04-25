export function escapeReportHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatReportDate(value?: string | null) {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not set';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

type ReportHeroCard = {
  label: string;
  value: string;
  detail?: string;
};

type PrintLayoutOptions = {
  landscape?: boolean;
  autoPrint?: boolean;
  showCloseButton?: boolean;
  formatLabel?: string;
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
          .map((chip) => `<span class="report-chip">${escapeReportHtml(chip)}</span>`)
          .join('')}
      </div>
    `
    : '';

  return `
    <div class="report-hero">
      <div class="report-hero-main">
        <div class="eyebrow">${escapeReportHtml(options.eyebrow)}</div>
        <h1>${escapeReportHtml(options.title)}</h1>
        ${options.leadHtml ? `<p class="report-hero-lead">${options.leadHtml}</p>` : ''}
        ${
          options.description
            ? `<p class="report-section-lead">${escapeReportHtml(options.description)}</p>`
            : ''
        }
        ${chipsHtml}
      </div>
      <aside class="report-hero-side">
        ${options.cards
          .map(
            (card) => `
              <div class="report-summary-card">
                <span>${escapeReportHtml(card.label)}</span>
                <strong>${escapeReportHtml(card.value)}</strong>
                ${card.detail ? `<p>${escapeReportHtml(card.detail)}</p>` : ''}
              </div>
            `
          )
          .join('')}
      </aside>
    </div>
  `;
}

export function buildReportDocumentHtml(
  title: string,
  bodyHtml: string,
  options: PrintLayoutOptions = {}
) {
  const generatedOn = formatReportDate(new Date().toISOString());
  const safeTitle = escapeReportHtml(title);
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
  --muted: #667281;
  --accent: #b97f33;
  --accent-deep: #94601d;
  --accent-soft: #f6ecde;
  --line-soft: #e7ebef;
  --line-medium: #d9dfe5;
  --background-canvas: #f1f3f5;
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
        main { max-width: var(--document-width); margin: 0 auto; }
        .report-document,
        .report-sheet {
          padding: 0;
          border-radius: 0;
          background: transparent;
          border: 0;
          box-shadow: none;
        }
        .report-masthead {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: end;
          gap: 18px;
          padding: 0 0 14px;
          margin: 0 0 14px;
          border-bottom: 2px solid var(--accent);
        }
        .report-brand-mark span,
        .report-kicker,
        .meta-card span,
        .report-summary-card span,
        th,
        .eyebrow {
          text-transform: uppercase;
        }
        .report-brand-mark span {
          color: var(--muted);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.18em;
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
        }
        .report-meta-block {
          display: grid;
          gap: 5px;
          min-width: 160px;
          justify-items: end;
          text-align: right;
        }
        .report-meta-block span {
          color: var(--muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .report-meta-block strong { font-size: 12px; line-height: 1.4; }
        .report-section-lead { margin-top: 0; color: var(--muted); font-size: 11.5px; line-height: 1.72; max-width: 72ch; }
        .report-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(220px, 0.85fr);
          gap: 14px;
          margin: 0 0 14px;
          align-items: start;
        }
        .report-hero-main,
        .report-summary-card,
        .meta-card,
        .report-grid > div {
          background: #ffffff;
          border: 1px solid var(--line-medium);
        }
        .report-hero-main {
          display: grid;
          gap: 8px;
          padding: 18px 18px 16px;
          border-top: 4px solid var(--accent);
        }
        .report-hero-lead { color: var(--ink); font-size: 15px; font-weight: 700; line-height: 1.45; max-width: 42ch; }
        .report-chip-row { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 2px; }
        .report-chip {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 0 9px;
          border: 1px solid rgba(185, 127, 51, 0.22);
          background: var(--accent-soft);
          color: var(--accent-deep);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .report-hero-side { display: grid; gap: 8px; }
        .report-summary-card { min-height: 0; padding: 12px 12px 13px; }
        .report-summary-card span {
          display: block;
          margin-bottom: 6px;
          color: var(--muted);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }
        .report-summary-card strong { display: block; color: var(--ink); font-size: 16px; line-height: 1.2; letter-spacing: -0.03em; }
        .report-summary-card p { margin-top: 5px; color: var(--muted); font-size: 10px; line-height: 1.45; }
        h1, h2, h3, p { margin: 0; }
        h1 { font-size: 28px; line-height: 1.02; letter-spacing: -0.04em; max-width: 15ch; }
        h2 { font-size: 17px; color: var(--ink); letter-spacing: -0.025em; line-height: 1.18; }
        h3 { font-size: 13px; margin-bottom: 6px; color: var(--ink); line-height: 1.28; }
        .eyebrow { color: var(--accent); font-size: 9px; font-weight: 800; letter-spacing: 0.16em; }
        .meta-grid, .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 0 0 14px; }
        .meta-card { padding: 11px 12px 12px; }
        .meta-card span {
          display: block;
          margin-bottom: 5px;
          color: var(--muted);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }
        .meta-card strong { font-size: 14px; line-height: 1.3; letter-spacing: -0.02em; }
        section { padding: 12px 0 0; border-top: 1px solid var(--line-soft); }
        section + section { margin-top: 14px; }
        section > h2 + *, section > h3 + * { margin-top: 11px; }
        .report-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 10px 0 0; }
        .report-grid.columns-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .report-grid > div { padding: 11px 12px 12px; }
        .report-grid > div strong { display: block; margin-bottom: 6px; }
        ul { margin: 0; padding-left: 18px; color: var(--ink); line-height: 1.55; }
        li + li { margin-top: 7px; }
        table, .report-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 12px;
          border: 1px solid var(--line-medium);
          background: #ffffff;
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
          background: #f4f6f8;
        }
        tbody tr:nth-child(even) td { background: #fafbfc; }
        tbody tr:last-child td { border-bottom: none; }
        .report-table-compact { font-size: 11px; }
        .report-table-compact th, .report-table-compact td { padding: 7px 8px; }
      </style>
    </head>
    <body>
      <div class="print-toolbar">
        <button type="button" onclick="window.print()">Print / Save PDF</button>
        ${showCloseButton ? `<button type="button" onclick="window.close()">Close</button>` : ''}
      </div>
      <main>
        <article class="report-document">
          <div class="report-sheet">
            <div class="report-masthead">
              <div class="report-brand">
                <div class="report-brand-mark">
                  <span>The Final Check</span>
                  <strong>The Final Check</strong>
                </div>
                <div class="report-kicker">${safeTitle}</div>
              </div>
              <div class="report-meta-block">
                <span>Prepared</span>
                <strong>${escapeReportHtml(generatedOn)}</strong>
                <span>Format</span>
                <strong>${escapeReportHtml(formatLabel)}</strong>
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

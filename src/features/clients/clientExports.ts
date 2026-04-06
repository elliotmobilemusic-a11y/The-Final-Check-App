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
  return invoice.lines.reduce(
    (sum, line) => sum + num(line.quantity) * num(line.unitPrice),
    0
  );
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
};

function shellHtml(title: string, bodyHtml: string, options: PrintLayoutOptions = {}) {
  const generatedOn = formatDate(new Date().toISOString());
  const safeTitle = escapeHtml(title);
  const pageSize = options.landscape ? 'A4 landscape' : 'A4';
  const documentWidth = options.landscape ? '1240px' : '960px';
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${safeTitle}</title>
      <style>
        @page {
          size: ${pageSize};
          margin: 12mm;
        }
        :root {
          color-scheme: light;
          --ink: #2d2b31;
          --muted: #6d6863;
          --accent: #c6a161;
          --accent-strong: #8e6b2c;
          --panel: #ffffff;
          --line: rgba(86, 81, 91, 0.12);
          --paper: #e7ddd1;
          --paper-strong: #f7f1e8;
          --paper-line: rgba(178, 158, 125, 0.56);
          --sheet-line: rgba(190, 171, 142, 0.62);
          --card-line: rgba(190, 171, 142, 0.52);
          --shadow: 0 22px 48px rgba(36, 31, 38, 0.08);
          --radius-xl: 18px;
          --radius-lg: 12px;
          --radius-md: 10px;
          --document-width: ${documentWidth};
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        html {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 20px;
          color: var(--ink);
          background: linear-gradient(180deg, #e7ddd1 0%, #e3d8ca 100%);
        }
        .print-toolbar {
          position: sticky;
          top: 14px;
          z-index: 10;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          max-width: var(--document-width);
          margin: 0 auto 14px;
        }
        .print-toolbar button {
          appearance: none;
          border: 1px solid rgba(86, 81, 91, 0.12);
          background: rgba(255, 255, 255, 0.98);
          color: var(--ink);
          padding: 10px 14px;
          border-radius: 999px;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(36, 31, 38, 0.05);
        }
        main {
          max-width: var(--document-width);
          margin: 0 auto;
        }
        .report-document {
          padding: 16px;
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(248, 242, 234, 0.98), rgba(240, 232, 222, 0.94));
          border: 2px solid var(--paper-line);
          box-shadow: var(--shadow);
        }
        .report-sheet {
          min-height: calc(100vh - 92px);
          padding: 20px 22px 18px;
          border-radius: 20px;
          background: linear-gradient(180deg, #fffefe 0%, #fcfaf6 100%);
          border: 2px solid var(--sheet-line);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.72);
        }
        .report-masthead {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: start;
          gap: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(86, 81, 91, 0.08);
        }
        .report-brand {
          display: grid;
          gap: 5px;
          min-width: 0;
          align-content: start;
        }
        .report-brand-mark {
          display: grid;
          gap: 5px;
        }
        .report-brand-mark span {
          color: var(--muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .report-brand-mark strong {
          color: var(--ink);
          font-size: 22px;
          line-height: 1;
          letter-spacing: 0.035em;
          text-transform: uppercase;
        }
        .report-kicker {
          color: var(--accent-strong);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .report-meta-block {
          display: grid;
          gap: 5px;
          min-width: 180px;
          justify-items: end;
          align-self: start;
          text-align: right;
        }
        .report-meta-block span {
          color: var(--muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .report-meta-block strong {
          font-size: 12px;
          line-height: 1.4;
        }
        .report-section-lead {
          margin-top: 4px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.6;
        }
        header {
          display: grid;
          gap: 6px;
          margin: 18px 0 20px;
          padding: 0 0 14px;
          border-bottom: 1px solid rgba(86, 81, 91, 0.1);
        }
        .report-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);
          gap: 18px;
          margin: 18px 0 20px;
          align-items: start;
        }
        .report-hero-main {
          display: grid;
          gap: 10px;
          min-height: 100%;
          padding: 20px 22px;
          border-radius: 16px;
          border: 1px solid var(--card-line);
          background: linear-gradient(180deg, #fffdfa 0%, #fbf7f1 100%);
        }
        .report-hero-lead {
          color: var(--ink);
          font-size: 16px;
          font-weight: 700;
          line-height: 1.45;
        }
        .report-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }
        .report-chip {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(198, 161, 97, 0.3);
          background: #f8f0e1;
          color: var(--accent-strong);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .report-hero-side {
          display: grid;
          gap: 12px;
          align-content: start;
        }
        .report-summary-card {
          padding: 16px;
          border-radius: 14px;
          border: 1px solid var(--card-line);
          background: linear-gradient(180deg, #ffffff 0%, #fbf8f2 100%);
        }
        .report-summary-card span {
          display: block;
          margin-bottom: 6px;
          color: var(--muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .report-summary-card strong {
          display: block;
          color: var(--ink);
          font-size: 16px;
          line-height: 1.3;
        }
        .report-summary-card p {
          margin-top: 6px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.55;
        }
        h1, h2, h3, p { margin: 0; }
        h1 { font-size: 32px; line-height: 1.02; letter-spacing: -0.035em; }
        h2 {
          font-size: 17px;
          margin-bottom: 10px;
          color: var(--ink);
          letter-spacing: -0.02em;
        }
        h3 {
          font-size: 14px;
          margin-bottom: 6px;
          color: var(--ink);
        }
        .eyebrow {
          color: var(--accent-strong);
          font-size: 10px;
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
          margin: 12px 0 18px;
        }
        .meta-card {
          padding: 14px 14px;
          border-radius: 12px;
          border: 1px solid var(--card-line);
          background: #fcfaf6;
        }
        .meta-card span {
          display: block;
          margin-bottom: 5px;
          color: var(--muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .meta-card strong {
          font-size: 15px;
          line-height: 1.3;
        }
        section {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(86, 81, 91, 0.08);
          page-break-inside: avoid;
        }
        .report-meta,
        .report-columns,
        .report-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin: 12px 0 18px;
        }
        .report-meta.columns-4,
        .report-grid.columns-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .report-meta > div,
        .report-columns > div,
        .report-grid > div {
          padding: 14px 14px;
          border-radius: 12px;
          border: 1px solid var(--card-line);
          background: #fcfaf6;
        }
        .report-meta > div strong,
        .report-columns > div strong,
        .report-grid > div strong {
          display: block;
          margin-bottom: 4px;
        }
        ul {
          margin: 0;
          padding-left: 18px;
          color: var(--ink);
          line-height: 1.65;
        }
        li + li {
          margin-top: 8px;
        }
        table,
        .report-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
          overflow: hidden;
          border: 1px solid var(--card-line);
          border-radius: 14px;
          background: #ffffff;
        }
        th, td {
          padding: 11px 12px;
          border-bottom: 1px solid rgba(86, 81, 91, 0.08);
          text-align: left;
          vertical-align: top;
        }
        th {
          color: var(--accent-strong);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          background: #f2e9db;
        }
        tbody tr:nth-child(even) td {
          background: #fcfaf6;
        }
        tbody tr:last-child td,
        table tr:last-child td,
        .report-table tr:last-child td {
          border-bottom: none;
        }
        .totals {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }
        .totals strong {
          padding: 12px 16px;
          border-radius: 10px;
          background: #fcf6ea;
          border: 1px solid rgba(198, 161, 97, 0.3);
        }
        .report-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid rgba(86, 81, 91, 0.08);
          color: var(--muted);
          font-size: 11px;
          line-height: 1.6;
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
          }
          .report-document {
            padding: 10px;
            border-radius: 18px;
            border: 2px solid var(--paper-line);
            box-shadow: none;
            background: linear-gradient(180deg, rgba(248, 242, 234, 0.98), rgba(240, 232, 222, 0.94));
          }
          .report-sheet {
            min-height: auto;
            padding: 16px 18px 14px;
            border-radius: 14px;
            border: 2px solid var(--sheet-line);
            box-shadow: none;
          }
          .print-toolbar {
            display: none;
          }
        }
        @media screen and (max-width: 760px) {
          body {
            padding: 14px;
          }
          .report-document {
            padding: 16px;
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
          .meta-grid,
          .summary-grid,
          .report-meta,
          .report-columns,
          .report-grid,
          .report-meta.columns-4,
          .report-grid.columns-4 {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-toolbar">
        <button type="button" onclick="window.print()">Print / Save PDF</button>
        <button type="button" onclick="window.close()">Close</button>
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
                <strong>${options.landscape ? 'Landscape client-ready PDF' : 'Client-ready PDF'}</strong>
              </div>
            </div>

            ${bodyHtml}
            <div class="report-footer">
              <span>The Final Check</span>
              <span>Prepared ${escapeHtml(generatedOn)}</span>
            </div>
          </div>
        </article>
      </main>
      <script>
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
      </script>
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
  popup.document.write(shellHtml(title, bodyHtml, options));
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

    ${listMarkup('Goals', client.data.goals)}
    ${listMarkup('Risks', client.data.risks)}
    ${listMarkup('Opportunities', client.data.opportunities)}
    ${listMarkup('Tags', client.tags)}
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
      client.data.tasks
        .filter((task) => task.status !== 'Done')
        .map((task) => `${task.title || 'Untitled task'} — ${task.status}${task.dueDate ? `, due ${formatDate(task.dueDate)}` : ''}`)
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
  const total = invoiceTotal(invoice);

  return `
    ${buildReportHeroHtml({
      eyebrow: 'Invoice export',
      title: invoice.number || 'Invoice',
      leadHtml: `<strong>${escapeHtml(client.companyName || 'Client')}</strong> • ${escapeHtml(invoice.title || 'Consultancy services')}`,
      description: 'Billing summary and charge breakdown prepared for finance issue and PDF handover.',
      chips: [
        invoice.status,
        `${client.data.paymentTermsDays} day terms`,
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
      <div class="meta-card"><span>Payment terms</span><strong>${client.data.paymentTermsDays} days</strong></div>
      <div class="meta-card"><span>Billing address</span><strong>${escapeHtml(client.data.billingAddress || 'Not recorded')}</strong></div>
      <div class="meta-card"><span>Client contact</span><strong>${escapeHtml(client.contactName || 'Not recorded')}</strong></div>
      <div class="meta-card"><span>Finance contact</span><strong>${escapeHtml(client.data.billingName || client.companyName || 'Client')}</strong></div>
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
      <h2>Invoice lines</h2>
      <p class="report-section-lead">Charge breakdown prepared for client issue and PDF handover.</p>
      ${invoiceTable(invoice)}
      <div class="totals">
        <strong>Total due: ${escapeHtml(fmtCurrency(total))}</strong>
      </div>
    </section>

    ${paragraph('Notes', invoice.notes)}
  `;
}

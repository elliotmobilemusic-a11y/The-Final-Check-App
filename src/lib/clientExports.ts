import type {
  AuditFormState,
  ClientInvoice,
  ClientProfile,
  MenuProjectState,
  SupabaseRecord
} from '../types';
import { fmtCurrency, num } from './utils';

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

function shellHtml(title: string, bodyHtml: string) {
  const generatedOn = formatDate(new Date().toISOString());
  const safeTitle = escapeHtml(title);
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${safeTitle}</title>
      <style>
        @page {
          size: A4;
          margin: 16mm 14mm 18mm;
        }
        :root {
          color-scheme: light;
          --ink: #2d2b31;
          --muted: #6d6863;
          --accent: #c6a161;
          --accent-strong: #8e6b2c;
          --accent-soft: rgba(198, 161, 97, 0.1);
          --panel: #ffffff;
          --line: rgba(86, 81, 91, 0.14);
          --paper: #f3efe9;
          --paper-strong: #fbf8f4;
          --shadow: 0 26px 60px rgba(36, 31, 38, 0.08);
          --radius-xl: 28px;
          --radius-lg: 20px;
          --radius-md: 16px;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 32px;
          color: var(--ink);
          background: linear-gradient(180deg, #ece6de 0%, var(--paper) 100%);
        }
        .print-toolbar {
          position: sticky;
          top: 18px;
          z-index: 10;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          max-width: 1080px;
          margin: 0 auto 20px;
        }
        .print-toolbar button {
          appearance: none;
          border: 1px solid rgba(86, 81, 91, 0.14);
          background: rgba(255, 255, 255, 0.94);
          color: var(--ink);
          padding: 11px 15px;
          border-radius: 999px;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(36, 31, 38, 0.06);
        }
        main {
          max-width: 1080px;
          margin: 0 auto;
        }
        .report-document {
          padding: 34px 36px 28px;
          border-radius: var(--radius-xl);
          background: var(--panel);
          border: 1px solid rgba(86, 81, 91, 0.08);
          box-shadow: var(--shadow);
        }
        .report-masthead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(86, 81, 91, 0.12);
        }
        .report-brand {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .report-brand-mark {
          width: 60px;
          height: 60px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          padding: 5px;
          border-radius: 20px;
          background: var(--paper-strong);
          border: 1px solid rgba(198, 161, 97, 0.18);
        }
        .report-brand-mark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 16px;
        }
        .report-brand-copy {
          display: grid;
          gap: 5px;
        }
        .report-brand-copy strong {
          font-size: 18px;
          line-height: 1.05;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .report-brand-copy span {
          color: var(--muted);
          font-size: 11px;
          line-height: 1.5;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .report-meta-block {
          display: grid;
          gap: 8px;
          justify-items: end;
          text-align: right;
        }
        .report-meta-block span {
          color: var(--muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .report-meta-block strong {
          font-size: 14px;
          line-height: 1.5;
        }
        .report-title-block {
          display: grid;
          gap: 10px;
          padding: 22px 0 28px;
          border-bottom: 2px solid var(--accent);
        }
        .report-title-block span {
          color: var(--accent-strong);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .report-title-block h1 {
          margin: 0;
          font-size: 38px;
          line-height: 0.98;
          letter-spacing: -0.04em;
        }
        .report-title-block p {
          max-width: 760px;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.7;
        }
        header {
          display: grid;
          gap: 10px;
          margin: 28px 0 24px;
          padding: 0 0 18px;
          border-bottom: 1px solid rgba(86, 81, 91, 0.12);
        }
        h1, h2, h3, p { margin: 0; }
        h1 { font-size: 34px; line-height: 1; letter-spacing: -0.04em; }
        h2 {
          font-size: 20px;
          margin-bottom: 14px;
          color: var(--ink);
          letter-spacing: -0.02em;
        }
        h3 {
          font-size: 15px;
          margin-bottom: 10px;
          color: var(--ink);
        }
        .eyebrow {
          color: var(--accent-strong);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .muted { color: var(--muted); }
        .muted-copy { color: var(--muted); }
        .meta-grid, .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin: 22px 0 28px;
        }
        .meta-card {
          padding: 18px 18px 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--line);
          background: linear-gradient(180deg, rgba(251, 248, 244, 0.92), rgba(255, 255, 255, 0.98));
        }
        .meta-card span {
          display: block;
          margin-bottom: 6px;
          color: var(--muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .meta-card strong {
          font-size: 16px;
          line-height: 1.35;
        }
        section {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(86, 81, 91, 0.1);
          page-break-inside: avoid;
        }
        .report-meta,
        .report-columns,
        .report-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0 24px;
        }
        .report-meta.columns-4,
        .report-grid.columns-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .report-meta > div,
        .report-columns > div,
        .report-grid > div {
          padding: 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--line);
          background: var(--paper-strong);
        }
        ul {
          margin: 0;
          padding-left: 18px;
          color: var(--ink);
          line-height: 1.7;
        }
        li + li {
          margin-top: 10px;
        }
        table,
        .report-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 14px;
          overflow: hidden;
          border: 1px solid rgba(86, 81, 91, 0.1);
          border-radius: 16px;
          background: #ffffff;
        }
        th, td {
          padding: 12px 12px;
          border-bottom: 1px solid rgba(86, 81, 91, 0.1);
          text-align: left;
          vertical-align: top;
        }
        th {
          color: var(--accent-strong);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: rgba(198, 161, 97, 0.08);
        }
        .totals {
          display: flex;
          justify-content: flex-end;
          margin-top: 18px;
        }
        .totals strong {
          padding: 14px 18px;
          border-radius: 16px;
          background: linear-gradient(180deg, #fcf7ef, #fffdf8);
          border: 1px solid rgba(198, 161, 97, 0.28);
        }
        .report-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 28px;
          padding-top: 16px;
          border-top: 1px solid rgba(86, 81, 91, 0.1);
          color: var(--muted);
          font-size: 12px;
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
            padding: 0;
            border: none;
            box-shadow: none;
          }
          .print-toolbar {
            display: none;
          }
        }
        @media (max-width: 760px) {
          body {
            padding: 18px;
          }
          .report-document {
            padding: 24px;
          }
          .report-masthead,
          .report-footer {
            flex-direction: column;
            align-items: flex-start;
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
          <div class="report-masthead">
            <div class="report-brand">
              <div class="report-brand-mark">
                <img src="/the-final-check-logo.png" alt="The Final Check logo" />
              </div>
              <div class="report-brand-copy">
                <strong>The Final Check</strong>
                <span>Profit and Performance Consultancy</span>
              </div>
            </div>

            <div class="report-meta-block">
              <span>Prepared</span>
              <strong>${escapeHtml(generatedOn)}</strong>
            </div>
          </div>

          <div class="report-title-block">
            <span>Client-ready document</span>
            <h1>${safeTitle}</h1>
            <p>
              Branded working export prepared for presentation, review, record keeping, and PDF handover.
            </p>
          </div>

          ${bodyHtml}
          <div class="report-footer">
            <span>The Final Check • Profit and Performance Consultancy</span>
            <span>Prepared ${escapeHtml(generatedOn)}</span>
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

export function openPrintableHtmlDocument(title: string, bodyHtml: string) {
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
  popup.document.write(shellHtml(title, bodyHtml));
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

  return `
    <header>
      <div class="eyebrow">Client CRM export</div>
      <h1>${escapeHtml(client.companyName || 'Client profile')}</h1>
      <p class="muted">
        ${escapeHtml(client.industry || 'Industry not set')} • ${escapeHtml(client.location || 'Location not set')} • ${escapeHtml(client.status || 'Status not set')}
      </p>
    </header>

    <div class="summary-grid">
      <div class="meta-card"><span>Account owner</span><strong>${escapeHtml(client.data.accountOwner || client.contactName || 'Not set')}</strong></div>
      <div class="meta-card"><span>Next review</span><strong>${escapeHtml(formatDate(client.nextReviewDate))}</strong></div>
      <div class="meta-card"><span>Monthly value</span><strong>${escapeHtml(fmtCurrency(num(client.data.estimatedMonthlyValue)))}</strong></div>
      <div class="meta-card"><span>Pipeline value</span><strong>${escapeHtml(fmtCurrency(pipelineValue))}</strong></div>
      <div class="meta-card"><span>Outstanding invoices</span><strong>${openInvoices.length} open / ${escapeHtml(fmtCurrency(outstandingValue))}</strong></div>
      <div class="meta-card"><span>Linked work</span><strong>${audits.length} audits / ${menus.length} menu projects</strong></div>
    </div>

    ${paragraph('Profile summary', client.data.profileSummary || client.notes)}
    ${paragraph('Relationship notes', client.data.internalNotes)}
    ${paragraph('Billing details', `${client.data.billingName || 'Billing name not set'} | ${client.data.billingEmail || 'Billing email not set'} | ${client.data.billingAddress || 'Billing address not set'}`)}
    ${listMarkup('Goals', client.data.goals)}
    ${listMarkup('Risks', client.data.risks)}
    ${listMarkup('Opportunities', client.data.opportunities)}
    ${listMarkup('Tags', client.tags)}
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
    <header>
      <div class="eyebrow">Invoice export</div>
      <h1>${escapeHtml(invoice.number || 'Invoice')}</h1>
      <p class="muted">${escapeHtml(client.companyName || 'Client')} • ${escapeHtml(invoice.title || 'Consultancy services')}</p>
    </header>

    <div class="meta-grid">
      <div class="meta-card"><span>Bill to</span><strong>${escapeHtml(client.data.billingName || client.companyName || 'Client')}</strong></div>
      <div class="meta-card"><span>Issue date</span><strong>${escapeHtml(formatDate(invoice.issueDate))}</strong></div>
      <div class="meta-card"><span>Due date</span><strong>${escapeHtml(formatDate(invoice.dueDate))}</strong></div>
      <div class="meta-card"><span>Status</span><strong>${escapeHtml(invoice.status)}</strong></div>
      <div class="meta-card"><span>Billing email</span><strong>${escapeHtml(client.data.billingEmail || client.contactEmail || 'Not set')}</strong></div>
      <div class="meta-card"><span>Payment terms</span><strong>${client.data.paymentTermsDays} days</strong></div>
    </div>

    ${paragraph('Billing address', client.data.billingAddress)}

    <section>
      <h2>Invoice lines</h2>
      ${invoiceTable(invoice)}
      <div class="totals">
        <strong>Total due: ${escapeHtml(fmtCurrency(total))}</strong>
      </div>
    </section>

    ${paragraph('Notes', invoice.notes)}
  `;
}

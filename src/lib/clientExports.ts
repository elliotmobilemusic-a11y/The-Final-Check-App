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
        :root {
          color-scheme: light;
          --ink: #2f2c33;
          --muted: #706962;
          --accent: #c6a161;
          --accent-strong: #8f6d2f;
          --accent-soft: rgba(198, 161, 97, 0.12);
          --panel: #ffffff;
          --line: rgba(86, 81, 91, 0.14);
          --paper: #f6f2ee;
          --paper-strong: #fcf8f3;
          --shadow: 0 30px 80px rgba(36, 31, 38, 0.12);
          --radius-xl: 32px;
          --radius-lg: 24px;
          --radius-md: 18px;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 40px;
          color: var(--ink);
          background:
            radial-gradient(circle at top left, rgba(198, 161, 97, 0.12), transparent 0 22%),
            linear-gradient(180deg, #efe8df 0%, var(--paper) 36%, #f8f4ef 100%);
        }
        .print-toolbar {
          position: sticky;
          top: 16px;
          z-index: 10;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          max-width: 960px;
          margin: 0 auto 18px;
        }
        .print-toolbar button {
          appearance: none;
          border: 1px solid rgba(86, 81, 91, 0.14);
          background: rgba(255, 255, 255, 0.9);
          color: var(--ink);
          padding: 12px 16px;
          border-radius: 999px;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(36, 31, 38, 0.08);
        }
        main {
          max-width: 960px;
          margin: 0 auto;
          display: grid;
          gap: 18px;
        }
        .brand-hero {
          position: relative;
          overflow: hidden;
          display: grid;
          gap: 22px;
          padding: 28px 30px;
          border-radius: var(--radius-xl);
          color: #ffffff;
          background:
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.16), transparent 0 26%),
            linear-gradient(135deg, #403c46 0%, #625b68 100%);
          box-shadow: var(--shadow);
        }
        .brand-hero::after {
          content: "";
          position: absolute;
          right: -44px;
          top: -56px;
          width: 180px;
          height: 180px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.16), transparent 70%);
          pointer-events: none;
        }
        .brand-hero > * {
          position: relative;
          z-index: 1;
        }
        .brand-hero-top {
          display: flex;
          justify-content: space-between;
          align-items: start;
          gap: 20px;
        }
        .brand-lockup {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }
        .brand-logo-shell {
          width: 72px;
          height: 72px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          padding: 6px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 18px 32px rgba(19, 14, 24, 0.16);
        }
        .brand-logo-shell img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 20px;
        }
        .brand-copy {
          display: grid;
          gap: 6px;
        }
        .brand-copy strong {
          font-size: 22px;
          line-height: 1.02;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .brand-copy span {
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
          line-height: 1.45;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .brand-meta {
          display: grid;
          gap: 8px;
          justify-items: end;
        }
        .brand-meta-chip {
          padding: 9px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.92);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .brand-title {
          display: grid;
          gap: 10px;
          max-width: 720px;
        }
        .brand-title h1 {
          margin: 0;
          font-size: 38px;
          line-height: 0.98;
          letter-spacing: -0.04em;
        }
        .brand-title p {
          color: rgba(255, 255, 255, 0.84);
          font-size: 15px;
          line-height: 1.7;
        }
        .report-document {
          padding: 40px;
          border-radius: 28px;
          background: var(--panel);
          box-shadow: 0 24px 60px rgba(36, 31, 38, 0.08);
        }
        header {
          display: grid;
          gap: 12px;
          margin-bottom: 28px;
          padding: 24px;
          border-radius: var(--radius-lg);
          background:
            linear-gradient(180deg, rgba(248, 243, 236, 0.94), rgba(255, 255, 255, 0.9));
          border: 1px solid rgba(198, 161, 97, 0.16);
        }
        h1, h2, h3, p { margin: 0; }
        h1 { font-size: 34px; line-height: 1; letter-spacing: -0.04em; }
        h2 {
          font-size: 22px;
          margin-bottom: 14px;
          color: var(--accent-strong);
          letter-spacing: -0.02em;
        }
        h3 { font-size: 15px; margin-bottom: 10px; }
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
          gap: 12px;
          margin: 22px 0 28px;
        }
        .meta-card {
          padding: 18px;
          border-radius: var(--radius-md);
          border: 1px solid var(--line);
          background:
            linear-gradient(180deg, rgba(252, 248, 243, 0.98), rgba(255, 255, 255, 0.94));
          box-shadow: 0 10px 26px rgba(36, 31, 38, 0.04);
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
          padding: 24px;
          border-radius: var(--radius-lg);
          border: 1px solid rgba(86, 81, 91, 0.08);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(251, 247, 242, 0.9));
          box-shadow: 0 10px 26px rgba(36, 31, 38, 0.04);
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
          border-radius: 18px;
          background: #ffffff;
        }
        th, td {
          padding: 12px 10px;
          border-bottom: 1px solid rgba(86, 81, 91, 0.1);
          text-align: left;
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
          margin-top: 22px;
          padding-top: 14px;
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
            box-shadow: none;
            border-radius: 0;
            padding: 0;
          }
          .brand-hero,
          .report-document,
          section,
          header {
            box-shadow: none;
          }
        }
        @media (max-width: 760px) {
          body {
            padding: 18px;
          }
          .brand-hero,
          .report-document,
          header,
          section {
            padding: 22px;
          }
          .brand-hero-top,
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
        <section class="brand-hero">
          <div class="brand-hero-top">
            <div class="brand-lockup">
              <div class="brand-logo-shell">
                <img src="/the-final-check-logo.png" alt="The Final Check logo" />
              </div>
              <div class="brand-copy">
                <strong>The Final Check</strong>
                <span>Profit and Performance Consultancy</span>
              </div>
            </div>

            <div class="brand-meta">
              <div class="brand-meta-chip">Branded report export</div>
              <div class="brand-meta-chip">Generated ${escapeHtml(generatedOn)}</div>
            </div>
          </div>

          <div class="brand-title">
            <h1>${safeTitle}</h1>
            <p>
              Client-ready document styling for exports, presentations, and PDF handover packs.
            </p>
          </div>
        </section>

        <article class="report-document">
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

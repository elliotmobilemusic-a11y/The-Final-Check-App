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
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)}</title>
      <style>
        :root {
          color-scheme: light;
          --ink: #2f2c33;
          --muted: #706962;
          --accent: #c6a161;
          --panel: #ffffff;
          --line: rgba(86, 81, 91, 0.14);
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 40px;
          color: var(--ink);
          background: #f6f2ee;
        }
        main {
          max-width: 960px;
          margin: 0 auto;
          padding: 40px;
          border-radius: 28px;
          background: var(--panel);
          box-shadow: 0 24px 60px rgba(36, 31, 38, 0.08);
        }
        header {
          display: grid;
          gap: 10px;
          margin-bottom: 28px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--line);
        }
        h1, h2, h3, p { margin: 0; }
        h1 { font-size: 34px; line-height: 1; }
        h2 { font-size: 22px; margin-bottom: 12px; }
        h3 { font-size: 15px; margin-bottom: 10px; }
        .eyebrow {
          color: #8c6b2c;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .muted { color: var(--muted); }
        .meta-grid, .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 22px 0 28px;
        }
        .meta-card {
          padding: 16px;
          border-radius: 18px;
          border: 1px solid var(--line);
          background: #fcfaf8;
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
          border-top: 1px solid rgba(86, 81, 91, 0.08);
        }
        ul {
          margin: 0;
          padding-left: 18px;
          color: var(--ink);
          line-height: 1.7;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        th, td {
          padding: 12px 10px;
          border-bottom: 1px solid rgba(86, 81, 91, 0.1);
          text-align: left;
        }
        th {
          color: var(--muted);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .totals {
          display: flex;
          justify-content: flex-end;
          margin-top: 18px;
        }
        .totals strong {
          padding: 14px 18px;
          border-radius: 16px;
          background: #fcf7ef;
          border: 1px solid rgba(198, 161, 97, 0.28);
        }
        @media print {
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
        }
      </style>
    </head>
    <body>
      <main>${bodyHtml}</main>
      <script>
        window.addEventListener('load', () => {
          setTimeout(() => window.print(), 200);
        });
      </script>
    </body>
  </html>`;
}

export function openPrintableHtmlDocument(title: string, bodyHtml: string) {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
  if (!popup) {
    throw new Error('Enable pop-ups to export PDFs from this workspace.');
  }

  popup.document.open();
  popup.document.write(shellHtml(title, bodyHtml));
  popup.document.close();
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

import type {
  AuditFormState,
  ClientInvoice,
  ClientProfile,
  MenuProjectState,
  SupabaseRecord
} from '../../types';
import { fmtCurrency, num } from '../../lib/utils';
import {
  buildReportDocumentHtml,
  buildReportHeroHtml,
  escapeReportHtml as escapeHtml,
  formatReportDate as formatDate,
  openPrintableHtmlDocument
} from '../../reports/htmlDocument';

export { buildReportDocumentHtml, buildReportHeroHtml, openPrintableHtmlDocument };

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

import { QuoteCalculatorModule } from '../../quotes/QuoteCalculatorModule';
import { invoiceTotal } from '../../../features/clients/clientExports';
import { quoteServices } from '../../../features/quotes/config';
import type { ClientInvoice, ClientInvoiceLine, ClientProfile, ClientQuote } from '../../../types';
import { fmtCurrency } from '../../../lib/utils';

type PersistProfileOptions = {
  successMessage: string;
  activity: {
    kicker: string;
    title: string;
    detail: string;
  };
};

type ClientPricingTabProps = {
  client: ClientProfile;
  editing: boolean;
  currentUserName: string;
  selectedInvoiceId: string | null;
  requestNewQuoteToken: number;
  externalQuoteToEditId: string | null;
  onPersistClientProfile: (
    nextClient: ClientProfile,
    options: PersistProfileOptions
  ) => Promise<ClientProfile>;
  onRequestNewQuote: () => void;
  onRequestNewInvoice: () => void;
  onEditQuote: (quoteId: string) => void;
  onDuplicateQuote: (quote: ClientQuote) => void;
  onArchiveQuote: (quote: ClientQuote) => void;
  onCreateInvoiceFromQuote: (quote: ClientQuote) => void;
  onToggleQuotePortalVisibility: (quoteId: string, visible: boolean) => void;
  onSelectInvoice: (invoiceId: string) => void;
  onUpdateInvoiceField: (
    invoiceId: string,
    key: keyof Omit<ClientInvoice, 'lines'>,
    value: string | number | boolean | null
  ) => void;
  onUpdateInvoiceLine: (
    invoiceId: string,
    lineId: string,
    key: keyof ClientInvoiceLine,
    value: string | number
  ) => void;
  onAddInvoiceLine: (invoiceId: string) => void;
  onRemoveInvoiceLine: (invoiceId: string, lineId: string) => void;
  onDuplicateInvoice: (invoice: ClientInvoice) => void;
  onMarkInvoicePaid: (invoice: ClientInvoice) => void;
  onToggleInvoicePortalVisibility: (invoiceId: string, visible: boolean) => void;
  onExportInvoicePdf: (invoice: ClientInvoice) => void;
};

function formatShortDate(value?: string | null) {
  if (!value) return 'No date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No date';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

function quoteStatusLabel(quote: ClientQuote) {
  if (quote.archivedAt) return 'Archived';
  return quote.status;
}

function quoteValueLabel(quote: ClientQuote) {
  if (quote.calculation.finalPriceHidden) return 'Custom quote';
  return fmtCurrency(quote.calculation.totalWithTax || quote.calculation.finalTotal);
}

function invoicePortalVisible(client: ClientProfile, invoiceId: string) {
  return !client.data.portal.hiddenInvoiceIds.includes(invoiceId);
}

function quotePortalVisible(client: ClientProfile, quoteId: string) {
  return !client.data.portal.hiddenQuoteIds.includes(quoteId);
}

function parseNumericValue(value: string) {
  if (!value.trim()) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ClientPricingTab({
  client,
  editing,
  currentUserName,
  selectedInvoiceId,
  requestNewQuoteToken,
  externalQuoteToEditId,
  onPersistClientProfile,
  onRequestNewQuote,
  onRequestNewInvoice,
  onEditQuote,
  onDuplicateQuote,
  onArchiveQuote,
  onCreateInvoiceFromQuote,
  onToggleQuotePortalVisibility,
  onSelectInvoice,
  onUpdateInvoiceField,
  onUpdateInvoiceLine,
  onAddInvoiceLine,
  onRemoveInvoiceLine,
  onDuplicateInvoice,
  onMarkInvoicePaid,
  onToggleInvoicePortalVisibility,
  onExportInvoicePdf
}: ClientPricingTabProps) {
  const quotes = [...client.data.quotes].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const invoices = [...client.data.invoices].sort((left, right) => right.issueDate.localeCompare(left.issueDate));
  const selectedInvoice =
    client.data.invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? client.data.invoices[0] ?? null;

  return (
    <div className="client-tab-layout client-pricing-layout">
      <section className="client-tab-section">
        <div className="client-tab-section-heading">
          <div>
            <h2>Invoices & pricing</h2>
            <p>Quotes, invoice drafts, sent invoices, and the calculator all live together here.</p>
          </div>
          <div className="client-top-action-row">
            <button className="button button-secondary" onClick={onRequestNewQuote} type="button">
              New quote
            </button>
            <button className="button button-secondary" onClick={onRequestNewInvoice} type="button">
              New invoice
            </button>
            <button
              className="button button-ghost"
              disabled={!quotes.length}
              onClick={() => onCreateInvoiceFromQuote(quotes[0])}
              type="button"
            >
              Create invoice from quote
            </button>
          </div>
        </div>

        <div className="client-data-table-shell">
          <div className="client-data-table client-pricing-table">
            <div className="client-data-table-head">
              <span>Quote title</span>
              <span>Service</span>
              <span>Site</span>
              <span>Created</span>
              <span>Value</span>
              <span>Status</span>
              <span>Linked invoice</span>
              <span>Actions</span>
            </div>

            {quotes.length === 0 ? (
              <div className="dashboard-empty">No saved quotes yet.</div>
            ) : (
              quotes.map((quote) => (
                <div className={`client-data-row ${quote.archivedAt ? 'is-muted' : ''}`} key={quote.quoteId}>
                  <strong>{quote.quoteTitle}</strong>
                  <span>{quoteServices[quote.serviceType].label}</span>
                  <span>{quote.location || 'Account level'}</span>
                  <span>{formatShortDate(quote.createdAt)}</span>
                  <span>{quoteValueLabel(quote)}</span>
                  <span>{quoteStatusLabel(quote)}</span>
                  <span>{quote.linkedInvoiceId || 'Not linked'}</span>
                  <div className="client-row-actions">
                    <button className="button button-ghost" onClick={() => onEditQuote(quote.quoteId)} type="button">
                      Open
                    </button>
                    <button className="button button-ghost" onClick={() => onEditQuote(quote.quoteId)} type="button">
                      Edit
                    </button>
                    <button className="button button-ghost" onClick={() => onDuplicateQuote(quote)} type="button">
                      Duplicate
                    </button>
                    <button className="button button-ghost" onClick={() => onArchiveQuote(quote)} type="button">
                      {quote.archivedAt ? 'Restore' : 'Archive'}
                    </button>
                    <button
                      className="button button-ghost"
                      disabled={!editing}
                      onClick={() =>
                        onToggleQuotePortalVisibility(
                          quote.quoteId,
                          !quotePortalVisible(client, quote.quoteId)
                        )
                      }
                      type="button"
                    >
                      {quotePortalVisible(client, quote.quoteId) ? 'Hide from portal' : 'Send to portal'}
                    </button>
                    <button
                      className="button button-ghost"
                      disabled={Boolean(quote.linkedInvoiceId)}
                      onClick={() => onCreateInvoiceFromQuote(quote)}
                      type="button"
                    >
                      Convert
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="client-tab-section">
        <div className="client-tab-section-heading">
          <div>
            <h2>Invoices</h2>
            <p>Drafts, sent invoices, outstanding balance, and edits for the selected invoice.</p>
          </div>
        </div>

        <div className="client-data-table-shell">
          <div className="client-data-table client-pricing-table">
            <div className="client-data-table-head">
              <span>Invoice number</span>
              <span>Related quote</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Sent</span>
              <span>Due</span>
              <span>Portal</span>
              <span>Actions</span>
            </div>

            {invoices.length === 0 ? (
              <div className="dashboard-empty">No invoices created yet.</div>
            ) : (
              invoices.map((invoice) => (
                <div className="client-data-row" key={invoice.id}>
                  <strong>{invoice.number}</strong>
                  <span>{invoice.sourceQuoteTitle || invoice.quoteReference || 'Not linked'}</span>
                  <span>{fmtCurrency(invoiceTotal(invoice))}</span>
                  <span>{invoice.status}</span>
                  <span>{formatShortDate(invoice.issueDate)}</span>
                  <span>{formatShortDate(invoice.dueDate)}</span>
                  <span>{invoicePortalVisible(client, invoice.id) ? 'Visible' : 'Hidden'}</span>
                  <div className="client-row-actions">
                    <button className="button button-ghost" onClick={() => onSelectInvoice(invoice.id)} type="button">
                      Open
                    </button>
                    <button className="button button-ghost" onClick={() => onSelectInvoice(invoice.id)} type="button">
                      Edit
                    </button>
                    <button
                      className="button button-ghost"
                      disabled={!editing}
                      onClick={() =>
                        onToggleInvoicePortalVisibility(
                          invoice.id,
                          !invoicePortalVisible(client, invoice.id)
                        )
                      }
                      type="button"
                    >
                      {invoicePortalVisible(client, invoice.id) ? 'Hide from portal' : 'Send to portal'}
                    </button>
                    <button className="button button-ghost" onClick={() => onMarkInvoicePaid(invoice)} type="button">
                      Mark paid
                    </button>
                    <button className="button button-ghost" onClick={() => onDuplicateInvoice(invoice)} type="button">
                      Duplicate
                    </button>
                    <button className="button button-ghost" onClick={() => onExportInvoicePdf(invoice)} type="button">
                      Export PDF
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {selectedInvoice ? (
        <section className="client-tab-section">
          <div className="client-tab-section-heading">
            <div>
              <h2>Invoice editor</h2>
              <p>Use the page save action to keep edits to the selected invoice draft.</p>
            </div>
            <div className="client-inline-actions">
              <span className="soft-pill">{selectedInvoice.number}</span>
              <span className="soft-pill">{fmtCurrency(invoiceTotal(selectedInvoice))}</span>
            </div>
          </div>

          <div className="client-form-grid client-form-grid-wide">
            <label className="field">
              <span>Title</span>
              <input
                className="input"
                disabled={!editing}
                value={selectedInvoice.title}
                onChange={(event) => onUpdateInvoiceField(selectedInvoice.id, 'title', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                className="input"
                disabled={!editing}
                value={selectedInvoice.status}
                onChange={(event) => onUpdateInvoiceField(selectedInvoice.id, 'status', event.target.value)}
              >
                <option>Draft</option>
                <option>Sent</option>
                <option>Paid</option>
                <option>Overdue</option>
                <option>Cancelled</option>
              </select>
            </label>
            <label className="field">
              <span>Issue date</span>
              <input
                className="input"
                disabled={!editing}
                type="date"
                value={selectedInvoice.issueDate}
                onChange={(event) => onUpdateInvoiceField(selectedInvoice.id, 'issueDate', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Due date</span>
              <input
                className="input"
                disabled={!editing}
                type="date"
                value={selectedInvoice.dueDate}
                onChange={(event) => onUpdateInvoiceField(selectedInvoice.id, 'dueDate', event.target.value)}
              />
            </label>
            <label className="field">
              <span>VAT enabled</span>
              <button
                className={`quote-toggle-button ${selectedInvoice.taxEnabled ? 'active' : ''}`}
                disabled={!editing}
                onClick={() =>
                  onUpdateInvoiceField(selectedInvoice.id, 'taxEnabled', !selectedInvoice.taxEnabled)
                }
                type="button"
              >
                {selectedInvoice.taxEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </label>
            <label className="field">
              <span>Tax rate</span>
              <input
                className="input"
                disabled={!editing}
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={selectedInvoice.taxRate ?? 0}
                onChange={(event) =>
                  onUpdateInvoiceField(selectedInvoice.id, 'taxRate', parseNumericValue(event.target.value))
                }
              />
            </label>
            <label className="field client-field-span-2">
              <span>Notes</span>
              <textarea
                className="input textarea"
                disabled={!editing}
                value={selectedInvoice.notes}
                onChange={(event) => onUpdateInvoiceField(selectedInvoice.id, 'notes', event.target.value)}
              />
            </label>
          </div>

          <div className="stack gap-12">
            {selectedInvoice.lines.map((line) => (
              <div className="invoice-line-grid quote-line-grid" key={line.id}>
                <label className="field client-field-span-2">
                  <span>Description</span>
                  <input
                    className="input"
                    disabled={!editing}
                    value={line.description}
                    onChange={(event) =>
                      onUpdateInvoiceLine(selectedInvoice.id, line.id, 'description', event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>Qty</span>
                  <input
                    className="input"
                    disabled={!editing}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={line.quantity}
                    onChange={(event) =>
                      onUpdateInvoiceLine(
                        selectedInvoice.id,
                        line.id,
                        'quantity',
                        parseNumericValue(event.target.value)
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>Unit price</span>
                  <input
                    className="input"
                    disabled={!editing}
                    type="text"
                    inputMode="decimal"
                    pattern="-?[0-9]*[.,]?[0-9]*"
                    value={line.unitPrice}
                    onChange={(event) =>
                      onUpdateInvoiceLine(
                        selectedInvoice.id,
                        line.id,
                        'unitPrice',
                        parseNumericValue(event.target.value)
                      )
                    }
                  />
                </label>
                <div className="crm-inline-stat">
                  <span>Line total</span>
                  <strong>{fmtCurrency(line.quantity * line.unitPrice)}</strong>
                </div>
                <button
                  className="button button-ghost danger-text self-end"
                  disabled={!editing}
                  onClick={() => onRemoveInvoiceLine(selectedInvoice.id, line.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}

            <div className="client-inline-actions">
              <button
                className="button button-secondary"
                disabled={!editing}
                onClick={() => onAddInvoiceLine(selectedInvoice.id)}
                type="button"
              >
                Add invoice line
              </button>
              <button
                className="button button-ghost"
                onClick={() => onExportInvoicePdf(selectedInvoice)}
                type="button"
              >
                Export current invoice
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <QuoteCalculatorModule
        client={client}
        currentUserName={currentUserName}
        onPersistClientProfile={onPersistClientProfile}
        requestNewQuoteToken={requestNewQuoteToken}
        externalQuoteToEditId={externalQuoteToEditId}
        showSavedQuotesList={false}
      />
    </div>
  );
}

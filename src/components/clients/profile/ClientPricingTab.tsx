import { QuoteCalculatorModule } from '../../quotes/QuoteCalculatorModule';
import { invoiceTotal } from '../../../features/clients/clientExports';
import { quoteServices } from '../../../features/quotes/config';
import type { ClientInvoice, ClientInvoiceLine, ClientProfile, ClientQuote } from '../../../types';
import { fmtCurrency } from '../../../lib/utils';
import {
  SectionCard,
  SectionHeader,
  ActionRow,
  StatusBadge,
  DataTable,
  FieldGroup,
  StatCard
} from '../../ui';

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
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
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

function getQuoteStatusVariant(quote: ClientQuote) {
  if (quote.archivedAt) return 'archived' as const;
  switch (quote.status) {
    case 'draft': return 'draft' as const;
    case 'sent': return 'sent' as const;
    case 'accepted': return 'accepted' as const;
    case 'rejected': return 'declined' as const;
    case 'invoiced': return 'invoiced' as const;
    default: return 'neutral' as const;
  }
}

function getInvoiceStatusVariant(status: ClientInvoice['status']) {
  switch (status) {
    case 'Draft': return 'draft' as const;
    case 'Sent': return 'sent' as const;
    case 'Paid': return 'paid' as const;
    case 'Overdue': return 'overdue' as const;
    case 'Cancelled': return 'cancelled' as const;
  }
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
  const quotes = [...client.data.quotes].sort((l, r) => r.updatedAt.localeCompare(l.updatedAt));
  const invoices = [...client.data.invoices].sort((l, r) => r.issueDate.localeCompare(l.issueDate));
  const selectedInvoice =
    client.data.invoices.find((inv) => inv.id === selectedInvoiceId) ??
    client.data.invoices[0] ??
    null;

  const activeQuotes = quotes.filter((q) => !q.archivedAt);
  const quotedValue = activeQuotes
    .filter((q) => !q.calculation.finalPriceHidden)
    .reduce((sum, q) => sum + (q.calculation.totalWithTax || q.calculation.finalTotal || 0), 0);
  const openInvoices = invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue');
  const outstandingValue = openInvoices.reduce((sum, i) => sum + invoiceTotal(i), 0);
  const paidValue = invoices
    .filter((i) => i.status === 'Paid')
    .reduce((sum, i) => sum + invoiceTotal(i), 0);

  const quoteColumns = [
    {
      key: 'title',
      header: 'Quote',
      render: (q: ClientQuote) => (
        <strong className={q.archivedAt ? 'muted-copy' : ''}>{q.quoteTitle}</strong>
      )
    },
    {
      key: 'service',
      header: 'Service',
      hideOnMobile: true,
      render: (q: ClientQuote) => <span>{quoteServices[q.serviceType]?.label ?? q.serviceType}</span>
    },
    {
      key: 'site',
      header: 'Site',
      hideOnMobile: true,
      render: (q: ClientQuote) => <span>{q.location || 'Account level'}</span>
    },
    {
      key: 'created',
      header: 'Created',
      hideOnMobile: true,
      render: (q: ClientQuote) => <span>{formatShortDate(q.createdAt)}</span>
    },
    {
      key: 'value',
      header: 'Value',
      render: (q: ClientQuote) => <span>{quoteValueLabel(q)}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (q: ClientQuote) => (
        <StatusBadge variant={getQuoteStatusVariant(q)}>{quoteStatusLabel(q)}</StatusBadge>
      )
    },
    {
      key: 'portal',
      header: 'Portal',
      hideOnMobile: true,
      render: (q: ClientQuote) => (
        <StatusBadge variant={quotePortalVisible(client, q.quoteId) ? 'visible' : 'hidden'}>
          {quotePortalVisible(client, q.quoteId) ? 'Visible' : 'Hidden'}
        </StatusBadge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (q: ClientQuote) => (
        <div className="client-row-actions">
          <button
            className="button button-ghost"
            onClick={() => onEditQuote(q.quoteId)}
            type="button"
          >
            Open
          </button>
          <button
            className="button button-ghost"
            onClick={() => onDuplicateQuote(q)}
            type="button"
          >
            Duplicate
          </button>
          <button
            className="button button-ghost"
            onClick={() => onArchiveQuote(q)}
            type="button"
          >
            {q.archivedAt ? 'Restore' : 'Archive'}
          </button>
          <button
            className="button button-ghost"
            disabled={!editing}
            onClick={() =>
              onToggleQuotePortalVisibility(q.quoteId, !quotePortalVisible(client, q.quoteId))
            }
            type="button"
          >
            {quotePortalVisible(client, q.quoteId) ? 'Hide from portal' : 'Send to portal'}
          </button>
          <button
            className="button button-ghost"
            disabled={Boolean(q.linkedInvoiceId)}
            onClick={() => onCreateInvoiceFromQuote(q)}
            type="button"
          >
            Convert
          </button>
        </div>
      )
    }
  ];

  const invoiceColumns = [
    {
      key: 'number',
      header: 'Invoice',
      render: (inv: ClientInvoice) => <strong>{inv.number}</strong>
    },
    {
      key: 'quote',
      header: 'Related quote',
      hideOnMobile: true,
      render: (inv: ClientInvoice) => (
        <span>{inv.sourceQuoteTitle || inv.quoteReference || '—'}</span>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (inv: ClientInvoice) => <span>{fmtCurrency(invoiceTotal(inv))}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv: ClientInvoice) => (
        <StatusBadge variant={getInvoiceStatusVariant(inv.status)}>{inv.status}</StatusBadge>
      )
    },
    {
      key: 'sent',
      header: 'Issued',
      hideOnMobile: true,
      render: (inv: ClientInvoice) => <span>{formatShortDate(inv.issueDate)}</span>
    },
    {
      key: 'due',
      header: 'Due',
      hideOnMobile: true,
      render: (inv: ClientInvoice) => <span>{formatShortDate(inv.dueDate)}</span>
    },
    {
      key: 'portal',
      header: 'Portal',
      hideOnMobile: true,
      render: (inv: ClientInvoice) => (
        <StatusBadge variant={invoicePortalVisible(client, inv.id) ? 'visible' : 'hidden'}>
          {invoicePortalVisible(client, inv.id) ? 'Visible' : 'Hidden'}
        </StatusBadge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (inv: ClientInvoice) => (
        <div className="client-row-actions">
          <button
            className="button button-ghost"
            onClick={() => onSelectInvoice(inv.id)}
            type="button"
          >
            Open
          </button>
          <button
            className="button button-ghost"
            disabled={!editing}
            onClick={() =>
              onToggleInvoicePortalVisibility(inv.id, !invoicePortalVisible(client, inv.id))
            }
            type="button"
          >
            {invoicePortalVisible(client, inv.id) ? 'Hide from portal' : 'Send to portal'}
          </button>
          <button
            className="button button-ghost"
            onClick={() => onMarkInvoicePaid(inv)}
            type="button"
          >
            Mark paid
          </button>
          <button
            className="button button-ghost"
            onClick={() => onDuplicateInvoice(inv)}
            type="button"
          >
            Duplicate
          </button>
          <button
            className="button button-ghost"
            onClick={() => onExportInvoicePdf(inv)}
            type="button"
          >
            Export PDF
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="client-tab-layout client-pricing-layout">

      {/* Commercial summary — only shown when there is data */}
      {(quotes.length > 0 || invoices.length > 0) && (
        <SectionCard padding="compact">
          <div className="stats-grid">
            <StatCard
              label="Active quotes"
              value={String(activeQuotes.length)}
              hint="Quotes that have not been archived"
            />
            {quotedValue > 0 && (
              <StatCard
                label="Quoted value"
                value={fmtCurrency(quotedValue)}
                hint="Total value of active, non-custom quotes"
              />
            )}
            {openInvoices.length > 0 && (
              <StatCard
                label="Outstanding"
                value={fmtCurrency(outstandingValue)}
                hint={`${openInvoices.length} sent or overdue invoice${openInvoices.length === 1 ? '' : 's'}`}
              />
            )}
            {paidValue > 0 && (
              <StatCard
                label="Paid"
                value={fmtCurrency(paidValue)}
                hint="Total received from paid invoices"
              />
            )}
          </div>
        </SectionCard>
      )}

      {/* Saved quotes */}
      <SectionCard>
        <SectionHeader
          title="Saved quotes"
          description="All quotes for this client. Convert to an invoice when a quote is accepted."
          action={
            <ActionRow gap="small">
              <button
                className="button button-ghost"
                disabled={!quotes.length}
                onClick={() => onCreateInvoiceFromQuote(quotes[0])}
                type="button"
              >
                Convert to invoice
              </button>
              <button className="button button-secondary" onClick={onRequestNewQuote} type="button">
                New quote
              </button>
            </ActionRow>
          }
        />
        <DataTable
          columns={quoteColumns}
          data={quotes}
          keyExtractor={(q) => q.quoteId}
          emptyMessage="No saved quotes yet."
          emptyAction={
            <button className="button button-secondary" onClick={onRequestNewQuote} type="button">
              New quote
            </button>
          }
        />
      </SectionCard>

      {/* Invoices */}
      <SectionCard>
        <SectionHeader
          title="Invoices"
          description="Drafts, sent invoices, outstanding balances, and payment records."
          action={
            <ActionRow gap="small">
              <button
                className="button button-secondary"
                onClick={onRequestNewInvoice}
                type="button"
              >
                New invoice
              </button>
            </ActionRow>
          }
        />
        <DataTable
          columns={invoiceColumns}
          data={invoices}
          keyExtractor={(inv) => inv.id}
          emptyMessage="No invoices created yet."
          emptyAction={
            <button className="button button-secondary" onClick={onRequestNewInvoice} type="button">
              New invoice
            </button>
          }
        />
      </SectionCard>

      {/* Invoice editor */}
      {selectedInvoice ? (
        <SectionCard>
          <SectionHeader
            title="Invoice editor"
            description="Use the page save action to keep edits to the selected invoice."
            action={
              <ActionRow gap="small">
                <span className="soft-pill">{selectedInvoice.number}</span>
                <span className="soft-pill">{fmtCurrency(invoiceTotal(selectedInvoice))}</span>
              </ActionRow>
            }
          />

          <div className="client-form-grid client-form-grid-wide">
            <FieldGroup label="Title">
              <input
                className="input"
                disabled={!editing}
                value={selectedInvoice.title}
                onChange={(event) =>
                  onUpdateInvoiceField(selectedInvoice.id, 'title', event.target.value)
                }
              />
            </FieldGroup>
            <FieldGroup label="Status">
              <select
                className="input"
                disabled={!editing}
                value={selectedInvoice.status}
                onChange={(event) =>
                  onUpdateInvoiceField(selectedInvoice.id, 'status', event.target.value)
                }
              >
                <option>Draft</option>
                <option>Sent</option>
                <option>Paid</option>
                <option>Overdue</option>
                <option>Cancelled</option>
              </select>
            </FieldGroup>
            <FieldGroup label="Issue date">
              <input
                className="input"
                disabled={!editing}
                type="date"
                value={selectedInvoice.issueDate}
                onChange={(event) =>
                  onUpdateInvoiceField(selectedInvoice.id, 'issueDate', event.target.value)
                }
              />
            </FieldGroup>
            <FieldGroup label="Due date">
              <input
                className="input"
                disabled={!editing}
                type="date"
                value={selectedInvoice.dueDate}
                onChange={(event) =>
                  onUpdateInvoiceField(selectedInvoice.id, 'dueDate', event.target.value)
                }
              />
            </FieldGroup>
            <FieldGroup label="VAT">
              <div className="client-inline-actions">
                <StatusBadge variant={selectedInvoice.taxEnabled ? 'visible' : 'hidden'}>
                  {selectedInvoice.taxEnabled ? 'Enabled' : 'Disabled'}
                </StatusBadge>
                {editing && (
                  <button
                    className="button button-ghost"
                    onClick={() =>
                      onUpdateInvoiceField(
                        selectedInvoice.id,
                        'taxEnabled',
                        !selectedInvoice.taxEnabled
                      )
                    }
                    type="button"
                  >
                    {selectedInvoice.taxEnabled ? 'Disable VAT' : 'Enable VAT'}
                  </button>
                )}
              </div>
            </FieldGroup>
            <FieldGroup label="Tax rate">
              <input
                className="input"
                disabled={!editing}
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={selectedInvoice.taxRate ?? 0}
                onChange={(event) =>
                  onUpdateInvoiceField(
                    selectedInvoice.id,
                    'taxRate',
                    parseNumericValue(event.target.value)
                  )
                }
              />
            </FieldGroup>
            <FieldGroup label="Notes" className="client-field-span-2">
              <textarea
                className="input textarea"
                disabled={!editing}
                value={selectedInvoice.notes}
                onChange={(event) =>
                  onUpdateInvoiceField(selectedInvoice.id, 'notes', event.target.value)
                }
              />
            </FieldGroup>
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
                      onUpdateInvoiceLine(
                        selectedInvoice.id,
                        line.id,
                        'description',
                        event.target.value
                      )
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

            <ActionRow align="start" gap="small">
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
                Export PDF
              </button>
            </ActionRow>
          </div>
        </SectionCard>
      ) : null}

      {/* Quote Calculator — separate section, not polished in this pass */}
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

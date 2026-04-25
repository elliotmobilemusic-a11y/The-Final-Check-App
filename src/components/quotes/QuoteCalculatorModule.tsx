import { useCallback, useEffect, useMemo, useState } from 'react';
import { fmtCurrency, num, uid } from '../../lib/utils';
import type {
  ClientProfile,
  ClientQuote,
  QuoteInputAnswers,
  QuoteLineItem,
  QuoteStatus
} from '../../types';
import { quoteServices } from '../../features/quotes/config';
import {
  buildQuotePricingPreview,
  buildQuoteRenderedSummary,
  buildQuoteScopeSummary,
  type QuotePricingDraftState
} from '../../features/quotes/engine';
import {
  createEmptyQuoteInput,
  quoteFormSections,
  type QuoteFieldDefinition
} from '../../features/quotes/formSchema';
import { createInvoiceDraftFromQuote } from '../../features/quotes/invoices';
import { quoteSeedTemplates } from '../../features/quotes/seeds';

type PersistProfileOptions = {
  successMessage: string;
  activity: {
    kicker: string;
    title: string;
    detail: string;
  };
};

type QuoteComposerState = QuotePricingDraftState & {
  editingQuoteId: string | null;
};

type QuoteCalculatorModuleProps = {
  client: ClientProfile;
  currentUserName: string;
  onPersistClientProfile: (
    nextClient: ClientProfile,
    options: PersistProfileOptions
  ) => Promise<ClientProfile>;
  requestNewQuoteToken?: number;
  externalQuoteToEditId?: string | null;
  showSavedQuotesList?: boolean;
};

function labelForService(serviceType: ClientQuote['serviceType'] | QuoteInputAnswers['serviceType']) {
  return serviceType ? quoteServices[serviceType].label : 'Service not set';
}

function formatShortDate(value?: string | null) {
  if (!value) return 'No date set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No date set';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

function sortedQuotes(quotes: ClientQuote[]) {
  return [...quotes].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function buildCollapsedState() {
  return Object.fromEntries(
    [...quoteFormSections.map((section) => [section.id, Boolean(section.defaultCollapsed)]), ['line-items', false]]
  ) as Record<string, boolean>;
}

function createManualLineItem(): QuoteLineItem {
  return {
    id: uid('quote-line'),
    key: uid('manual'),
    label: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    total: 0,
    type: 'manual'
  };
}

function quoteCardTone(status: QuoteStatus) {
  if (status === 'accepted' || status === 'invoiced') return 'status-pill status-success';
  if (status === 'rejected') return 'status-pill status-danger';
  return 'status-pill status-warning';
}

function mergeQuoteIntoCollection(quotes: ClientQuote[], nextQuote: ClientQuote) {
  const existingIndex = quotes.findIndex((quote) => quote.quoteId === nextQuote.quoteId);
  if (existingIndex === -1) {
    return sortedQuotes([nextQuote, ...quotes]);
  }

  const nextQuotes = [...quotes];
  nextQuotes[existingIndex] = nextQuote;
  return sortedQuotes(nextQuotes);
}

function lineLabelKey(line: QuoteLineItem) {
  return `${line.label}|${line.total.toFixed(2)}`;
}

function parseNumericValue(value: string) {
  if (!value.trim()) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildHistoryEntry(options: {
  previousQuote?: ClientQuote | null;
  nextLineItems: QuoteLineItem[];
  nextTotal: number;
  actor: string;
  action: 'created' | 'updated' | 'invoice_draft_created';
  manualOverrideUsed: boolean;
  note: string;
}) {
  const previousLineItems = options.previousQuote?.lineItems ?? [];
  const previousKeys = new Set(previousLineItems.map(lineLabelKey));
  const nextKeys = new Set(options.nextLineItems.map(lineLabelKey));

  return {
    id: uid('quote-history'),
    action: options.action,
    actor: options.actor,
    at: new Date().toISOString(),
    previousTotal: options.previousQuote ? options.previousQuote.calculation.finalTotal : null,
    nextTotal: options.nextTotal,
    manualOverrideUsed: options.manualOverrideUsed,
    addedLineLabels: options.nextLineItems
      .filter((line) => !previousKeys.has(lineLabelKey(line)))
      .map((line) => line.label),
    removedLineLabels: previousLineItems
      .filter((line) => !nextKeys.has(lineLabelKey(line)))
      .map((line) => line.label),
    note: options.note
  };
}

export function QuoteCalculatorModule({
  client,
  currentUserName,
  onPersistClientProfile,
  requestNewQuoteToken,
  externalQuoteToEditId,
  showSavedQuotesList = true
}: QuoteCalculatorModuleProps) {
  const [composer, setComposer] = useState<QuoteComposerState | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(
    buildCollapsedState()
  );
  const [message, setMessage] = useState(
    'Create structured quotes, store the calculation snapshot, and turn approved quotes into invoice drafts.'
  );
  const [saving, setSaving] = useState(false);

  const preview = useMemo(
    () => (composer ? buildQuotePricingPreview(composer) : null),
    [composer]
  );

  const quotes = useMemo(() => sortedQuotes(client.data.quotes ?? []), [client.data.quotes]);

  const openNewQuote = useCallback((seedId?: string) => {
    const base = createEmptyQuoteInput(client, currentUserName);
    const seed = quoteSeedTemplates.find((template) => template.id === seedId);

    setComposer({
      editingQuoteId: null,
      values: seed ? { ...base, ...seed.values } : base,
      manualLineItems: seed?.manualLineItems ?? [],
      hiddenAutoLineItemKeys: [],
      autoLineItemOverrides: {}
    });
    setCollapsedSections(buildCollapsedState());
    setMessage(
      seed
        ? `Loaded the ${seed.label.toLowerCase()} seeded quote.`
        : 'New quote draft opened.'
    );
  }, [client, currentUserName]);

  const openExistingQuote = useCallback((quote: ClientQuote) => {
    setComposer({
      editingQuoteId: quote.quoteId,
      values: quote.calculation.allInputAnswers,
      manualLineItems: quote.calculation.manualLineItems ?? [],
      hiddenAutoLineItemKeys: quote.calculation.hiddenAutoLineItemKeys ?? [],
      autoLineItemOverrides: quote.calculation.autoLineItemOverrides ?? {}
    });
    setCollapsedSections(buildCollapsedState());
    setMessage(`Loaded quote "${quote.quoteTitle}" for editing.`);
  }, []);

  useEffect(() => {
    if (!requestNewQuoteToken) return;
    openNewQuote();
  }, [openNewQuote, requestNewQuoteToken]);

  useEffect(() => {
    if (!externalQuoteToEditId) return;
    const targetQuote = quotes.find((quote) => quote.quoteId === externalQuoteToEditId);
    if (targetQuote) {
      openExistingQuote(targetQuote);
    }
  }, [externalQuoteToEditId, openExistingQuote, quotes]);

  function closeComposer() {
    setComposer(null);
    setMessage('Quote composer closed.');
  }

  function toggleSection(sectionId: string) {
    setCollapsedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId]
    }));
  }

  function updateValue<K extends keyof QuoteInputAnswers>(key: K, value: QuoteInputAnswers[K]) {
    setComposer((current) =>
      current
        ? {
            ...current,
            values: {
              ...current.values,
              [key]: value
            }
          }
        : current
    );
  }

  function toggleMultiSelect<K extends keyof QuoteInputAnswers>(
    key: K,
    value: string,
    checked: boolean
  ) {
    setComposer((current) => {
      if (!current) return current;

      const values = new Set((current.values[key] as string[]) ?? []);
      if (checked) values.add(value);
      else values.delete(value);

      return {
        ...current,
        values: {
          ...current.values,
          [key]: [...values]
        }
      };
    });
  }

  function updateAutoLineOverride(
    key: string,
    field: 'label' | 'description' | 'quantity' | 'unitPrice',
    value: string | number
  ) {
    setComposer((current) =>
      current
        ? {
            ...current,
            autoLineItemOverrides: {
              ...current.autoLineItemOverrides,
              [key]: {
                ...(current.autoLineItemOverrides[key] ?? {}),
                [field]: field === 'quantity' || field === 'unitPrice' ? num(value) : String(value)
              }
            }
          }
        : current
    );
  }

  function toggleAutoLineItem(key: string) {
    setComposer((current) => {
      if (!current) return current;
      const hidden = new Set(current.hiddenAutoLineItemKeys);
      if (hidden.has(key)) hidden.delete(key);
      else hidden.add(key);

      return {
        ...current,
        hiddenAutoLineItemKeys: [...hidden]
      };
    });
  }

  function addManualLineItem() {
    setComposer((current) =>
      current
        ? {
            ...current,
            manualLineItems: [...current.manualLineItems, createManualLineItem()]
          }
        : current
    );
  }

  function updateManualLineItem(
    id: string,
    field: keyof QuoteLineItem,
    value: string | number
  ) {
    setComposer((current) =>
      current
        ? {
            ...current,
            manualLineItems: current.manualLineItems.map((line) => {
              if (line.id !== id) return line;

              const next = {
                ...line,
                [field]:
                  field === 'quantity' || field === 'unitPrice' ? num(value) : String(value)
              };

              return {
                ...next,
                total: num(next.quantity) * num(next.unitPrice)
              };
            })
          }
        : current
    );
  }

  function removeManualLineItem(id: string) {
    setComposer((current) =>
      current
        ? {
            ...current,
            manualLineItems: current.manualLineItems.filter((line) => line.id !== id)
          }
        : current
    );
  }

  function buildQuoteRecord(nextStatus: QuoteStatus, linkedInvoiceId?: string | null) {
    if (!composer || !preview || !composer.values.serviceType) return null;

    const existingQuote =
      client.data.quotes.find((quote) => quote.quoteId === composer.editingQuoteId) ?? null;
    const nextQuoteId = existingQuote?.quoteId ?? uid('quote');
    const now = new Date().toISOString();
    const nextQuote: ClientQuote = {
      quoteId: nextQuoteId,
      clientId: client.id ?? '',
      clientName: composer.values.clientName || client.companyName,
      quoteTitle: composer.values.quoteTitle,
      serviceType: composer.values.serviceType,
      status: nextStatus,
      createdAt: existingQuote?.createdAt ?? now,
      updatedAt: now,
      consultantName: composer.values.consultantName,
      quoteDate: composer.values.quoteDate,
      validUntil: composer.values.validUntil,
      location: composer.values.location,
      scopeSummary: buildQuoteScopeSummary(composer.values),
      internalNotes: composer.values.internalNotes,
      clientFacingNotes: composer.values.clientFacingNotes,
      calculation: {
        basePrice: preview.basePrice,
        multipliersUsed: preview.multipliersUsed,
        allInputAnswers: composer.values,
        generatedLineItems: preview.generatedLineItems,
        manualLineItems: preview.manualLineItems,
        hiddenAutoLineItemKeys: preview.hiddenAutoLineItemKeys,
        autoLineItemOverrides: preview.autoLineItemOverrides,
        addOns: preview.addOns,
        discountAmount: preview.discountAmount,
        discountPercentage: preview.discountPercentage,
        appliedDiscountAmount: preview.appliedDiscountAmount,
        adjustmentAmount: preview.adjustmentAmount,
        suggestedSubtotal: preview.suggestedSubtotal,
        suggestedTotal: preview.suggestedTotal,
        overrideTotal: preview.overrideTotal,
        finalTotal: preview.finalTotal,
        finalPriceHidden: preview.finalPriceHidden,
        validationErrors: preview.validationErrors,
        taxEnabled: preview.taxEnabled,
        taxRate: preview.taxRate,
        taxAmount: preview.taxAmount,
        totalWithTax: preview.totalWithTax,
        calculationVersion: preview.calculationVersion,
        finalLineItems: preview.finalLineItems
      },
      lineItems: preview.finalLineItems,
      renderedSummary: buildQuoteRenderedSummary(
        composer.values.quoteTitle,
        composer.values,
        preview
      ),
      history: [
        ...(existingQuote?.history ?? []),
        buildHistoryEntry({
          previousQuote: existingQuote,
          nextLineItems: preview.finalLineItems,
          nextTotal: preview.finalTotal,
          actor: currentUserName,
          action: existingQuote ? 'updated' : 'created',
          manualOverrideUsed: composer.values.manualOverrideEnabled,
          note: existingQuote ? 'Quote updated in calculator.' : 'Quote created in calculator.'
        })
      ],
      linkedInvoiceId: linkedInvoiceId ?? existingQuote?.linkedInvoiceId ?? null
    };

    return nextQuote;
  }

  async function persistQuote(nextStatus: QuoteStatus, createInvoiceDraft: boolean) {
    if (!composer || !preview) return;

    if (preview.validationErrors.length) {
      setMessage(preview.validationErrors[0]);
      return;
    }

    const nextQuote = buildQuoteRecord(nextStatus);
    if (!nextQuote) {
      setMessage('Select a service type before saving the quote.');
      return;
    }

    const existingQuote = client.data.quotes.find((quote) => quote.quoteId === nextQuote.quoteId);
    if (createInvoiceDraft && existingQuote?.linkedInvoiceId) {
      setMessage('This quote is already linked to an invoice draft.');
      return;
    }

    const nextInvoices = [...client.data.invoices];
    let finalQuote = nextQuote;

    if (createInvoiceDraft) {
      const invoiceDraft = createInvoiceDraftFromQuote(client, nextQuote, nextInvoices.length);
      finalQuote = {
        ...nextQuote,
        status: 'invoiced',
        linkedInvoiceId: invoiceDraft.id,
        history: [
          ...nextQuote.history,
          buildHistoryEntry({
            previousQuote: nextQuote,
            nextLineItems: nextQuote.lineItems,
            nextTotal: nextQuote.calculation.finalTotal,
            actor: currentUserName,
            action: 'invoice_draft_created',
            manualOverrideUsed: nextQuote.calculation.overrideTotal !== null,
            note: `Invoice draft ${invoiceDraft.number} created from quote.`
          })
        ]
      };
      nextInvoices.unshift(invoiceDraft);
    }

    const nextClient: ClientProfile = {
      ...client,
      data: {
        ...client.data,
        quotes: mergeQuoteIntoCollection(client.data.quotes, finalQuote),
        invoices: nextInvoices
      }
    };

    try {
      setSaving(true);
      await onPersistClientProfile(nextClient, {
        successMessage: createInvoiceDraft
          ? 'Quote saved and invoice draft created.'
          : finalQuote.status === 'draft'
            ? 'Quote draft saved to the client profile.'
            : 'Quote saved to the client profile.',
        activity: {
          kicker: 'Quote calculator',
          title: createInvoiceDraft ? 'Saving quote and drafting invoice' : 'Saving quote',
          detail: createInvoiceDraft
            ? 'Saving the quote snapshot to the client record and creating a linked invoice draft.'
            : 'Saving the quote record, calculation snapshot, and line items to the client profile.'
        }
      });

      setComposer(null);
      setMessage(
        createInvoiceDraft
          ? 'Quote saved and linked to a new invoice draft.'
          : finalQuote.status === 'draft'
            ? 'Quote draft saved.'
            : 'Quote saved.'
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save quote.');
    } finally {
      setSaving(false);
    }
  }

  async function createInvoiceFromSavedQuote(quote: ClientQuote) {
    if (quote.linkedInvoiceId) {
      setMessage('This quote is already linked to an invoice draft.');
      return;
    }

    const invoiceDraft = createInvoiceDraftFromQuote(client, quote, client.data.invoices.length);
    const nextQuote: ClientQuote = {
      ...quote,
      status: 'invoiced',
      linkedInvoiceId: invoiceDraft.id,
      updatedAt: new Date().toISOString(),
      history: [
        ...quote.history,
        buildHistoryEntry({
          previousQuote: quote,
          nextLineItems: quote.lineItems,
          nextTotal: quote.calculation.finalTotal,
          actor: currentUserName,
          action: 'invoice_draft_created',
          manualOverrideUsed: quote.calculation.overrideTotal !== null,
          note: `Invoice draft ${invoiceDraft.number} created from saved quote.`
        })
      ]
    };

    const nextClient: ClientProfile = {
      ...client,
      data: {
        ...client.data,
        quotes: mergeQuoteIntoCollection(client.data.quotes, nextQuote),
        invoices: [invoiceDraft, ...client.data.invoices]
      }
    };

    try {
      setSaving(true);
      await onPersistClientProfile(nextClient, {
        successMessage: 'Invoice draft created from quote.',
        activity: {
          kicker: 'Quote conversion',
          title: 'Creating invoice draft from quote',
          detail: 'Copying quote line items into the invoice section and linking the draft back to the saved quote.'
        }
      });
      setMessage(`Invoice draft ${invoiceDraft.number} created from quote.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create invoice draft.');
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: QuoteFieldDefinition) {
    if (!composer) return null;
    if (field.condition && !field.condition(composer.values)) return null;

    const value = composer.values[field.key];
    const fieldClassName = field.width === 'full' ? 'field quote-field-full' : 'field';

    if (field.type === 'toggle') {
      return (
        <label className={`${fieldClassName} quote-toggle-field`} key={String(field.key)}>
          <span>{field.label}</span>
          <button
            type="button"
            className={`quote-toggle-button ${value ? 'active' : ''}`}
            onClick={() => updateValue(field.key, !value as QuoteInputAnswers[typeof field.key])}
          >
            {value ? 'Included' : 'Not included'}
          </button>
        </label>
      );
    }

    if (field.type === 'multi-select') {
      const selectedValues = (value as string[]) ?? [];

      return (
        <label className={`${fieldClassName} quote-field-full`} key={String(field.key)}>
          <span>{field.label}</span>
          <div className="quote-checkbox-grid">
            {(field.options ?? []).map((option) => (
              <label className="quote-checkbox" key={option.value}>
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={(event) =>
                    toggleMultiSelect(field.key, option.value, event.target.checked)
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </label>
      );
    }

    if (field.type === 'textarea') {
      return (
        <label className={`${fieldClassName} quote-field-full`} key={String(field.key)}>
          <span>{field.label}</span>
          <textarea
            className="input textarea"
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(event) =>
              updateValue(field.key, event.target.value as QuoteInputAnswers[typeof field.key])
            }
          />
        </label>
      );
    }

    if (field.type === 'select') {
      return (
        <label className={fieldClassName} key={String(field.key)}>
          <span>{field.label}</span>
          <select
            className="input"
            value={String(value ?? '')}
            onChange={(event) =>
              updateValue(field.key, event.target.value as QuoteInputAnswers[typeof field.key])
            }
          >
            <option value="">Select</option>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
    }
    
    if (field.type === 'text') {
      return (
        <label className={fieldClassName} key={String(field.key)}>
          <span>{field.label}</span>
          <input
            className="input"
            type="text"
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(event) =>
              updateValue(field.key, event.target.value as QuoteInputAnswers[typeof field.key])
            }
          />
        </label>
      );
    }
    
    if (field.type === 'number' || field.type === 'currency') {
      return (
        <label className={fieldClassName} key={String(field.key)}>
          <span>{field.label}</span>
          <input
            className="input"
            type="text"
            inputMode={field.type === 'currency' || field.step === 0.01 ? 'decimal' : 'numeric'}
            pattern={field.type === 'currency' || field.step === 0.01 ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
            value={String(num(value))}
            onChange={(event) =>
              updateValue(
                field.key,
                parseNumericValue(event.target.value) as QuoteInputAnswers[typeof field.key]
              )
            }
          />
        </label>
      );
    }

    // Fallback for safety - always render a plain text input
    return (
      <label className={fieldClassName} key={String(field.key)}>
        <span>{field.label}</span>
        <input
          className="input"
          type="text"
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(event) =>
            updateValue(field.key, event.target.value as QuoteInputAnswers[typeof field.key])
          }
        />
      </label>
    );
  }

  return (
    <article className="feature-card quote-calculator-card" id="client-quotes">
      <div className="feature-top">
        <div>
          <h3>Quote calculator</h3>
          <p>
            Build hospitality consultancy quotes from structured inputs, keep the calculation
            snapshot, and convert saved quotes into invoice drafts.
          </p>
        </div>
        <div className="invoice-card-actions">
          <span className="soft-pill">
            {quotes.length} saved quote{quotes.length === 1 ? '' : 's'}
          </span>
          <button className="button button-secondary" onClick={() => openNewQuote()}>
            Create quote
          </button>
        </div>
      </div>

      <div className="page-inline-note">{message}</div>

      {!composer ? (
        <div className="quote-seed-strip">
          {quoteSeedTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="quote-seed-button"
              onClick={() => openNewQuote(template.id)}
            >
              <strong>{template.label}</strong>
              <span>{template.description}</span>
            </button>
          ))}
        </div>
      ) : null}

      {composer && preview ? (
        <div className="quote-builder-layout">
          <div className="quote-builder-main">
            {quoteFormSections.map((section) => {
              if (section.condition && !section.condition(composer.values)) return null;
              const isCollapsed = collapsedSections[section.id];

              return (
                <section className="sub-panel quote-sub-panel" key={section.id}>
                  <div className="sub-panel-header">
                    <div>
                      <h4>{section.title}</h4>
                      <p className="muted-copy">{section.description}</p>
                    </div>
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => toggleSection(section.id)}
                    >
                      {isCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                  </div>

                  {!isCollapsed ? (
                    <div className="form-grid three-balance">
                      {section.fields.map((field) => renderField(field))}
                    </div>
                  ) : null}
                </section>
              );
            })}

            <section className="sub-panel quote-sub-panel">
              <div className="sub-panel-header">
                <div>
                  <h4>Line items</h4>
                  <p className="muted-copy">
                    Edit auto-generated lines, remove any you do not want to include, and add
                    custom items before saving.
                  </p>
                </div>
                <div className="invoice-card-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={addManualLineItem}
                  >
                    Add manual line
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => toggleSection('line-items')}
                  >
                    {collapsedSections['line-items'] ? 'Expand' : 'Collapse'}
                  </button>
                </div>
              </div>

              {!collapsedSections['line-items'] ? (
                <div className="stack gap-12">
                  {preview.generatedLineItems.map((line) => {
                    const hidden = composer.hiddenAutoLineItemKeys.includes(line.key || '');
                    const override = composer.autoLineItemOverrides[line.key || ''] ?? {};

                    return (
                      <div className={`invoice-line-grid quote-line-grid ${hidden ? 'is-muted' : ''}`} key={line.key}>
                        <label className="field">
                          <span>Label</span>
                          <input
                            className="input"
                            value={override.label ?? line.label}
                            onChange={(event) =>
                              updateAutoLineOverride(line.key || '', 'label', event.target.value)
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Qty</span>
                          <input
                            className="input"
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            value={override.quantity ?? line.quantity}
                            onChange={(event) =>
                              updateAutoLineOverride(
                                line.key || '',
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
                            type="text"
                            inputMode="decimal"
                            pattern="-?[0-9]*[.,]?[0-9]*"
                            value={override.unitPrice ?? line.unitPrice}
                            onChange={(event) =>
                              updateAutoLineOverride(
                                line.key || '',
                                'unitPrice',
                                parseNumericValue(event.target.value)
                              )
                            }
                          />
                        </label>
                        <div className="crm-inline-stat">
                          <span>Type</span>
                          <strong>{line.source || line.type}</strong>
                        </div>
                        <button
                          type="button"
                          className={`button ${hidden ? 'button-secondary' : 'button-ghost danger-text'} self-end`}
                          onClick={() => toggleAutoLineItem(line.key || '')}
                        >
                          {hidden ? 'Restore' : 'Remove'}
                        </button>
                      </div>
                    );
                  })}

                  {composer.manualLineItems.length ? (
                    composer.manualLineItems.map((line) => (
                      <div className="invoice-line-grid quote-line-grid" key={line.id}>
                        <label className="field">
                          <span>Label</span>
                          <input
                            className="input"
                            value={line.label}
                            onChange={(event) =>
                              updateManualLineItem(line.id, 'label', event.target.value)
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Description</span>
                          <input
                            className="input"
                            value={line.description}
                            onChange={(event) =>
                              updateManualLineItem(line.id, 'description', event.target.value)
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Qty</span>
                          <input
                            className="input"
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            value={line.quantity}
                            onChange={(event) =>
                              updateManualLineItem(
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
                            type="text"
                            inputMode="decimal"
                            pattern="-?[0-9]*[.,]?[0-9]*"
                            value={line.unitPrice}
                            onChange={(event) =>
                              updateManualLineItem(
                                line.id,
                                'unitPrice',
                                parseNumericValue(event.target.value)
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="button button-ghost danger-text self-end"
                          onClick={() => removeManualLineItem(line.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="dashboard-empty">No manual line items added.</div>
                  )}
                </div>
              ) : null}
            </section>
          </div>

          <aside className="quote-builder-side">
            <div className="panel quote-summary-panel">
              <div className="panel-header">
                <div>
                  <h3>Live pricing summary</h3>
                  <p className="muted-copy">
                    Base price, multipliers, add-ons, discounts, and final output are all visible
                    here before save.
                  </p>
                </div>
              </div>
              <div className="panel-body stack gap-12">
                <div className="mini-grid">
                  <div className="mini-box">
                    <span>Service</span>
                    <strong>{labelForService(composer.values.serviceType)}</strong>
                  </div>
                  <div className="mini-box">
                    <span>Suggested total</span>
                    <strong>{fmtCurrency(preview.finalTotal)}</strong>
                  </div>
                  <div className="mini-box">
                    <span>Total with VAT</span>
                    <strong>{fmtCurrency(preview.totalWithTax)}</strong>
                  </div>
                </div>

                <div className="quote-summary-strip">
                  <div>
                    <span>Base price</span>
                    <strong>{fmtCurrency(preview.basePrice)}</strong>
                  </div>
                  <div>
                    <span>Subtotal</span>
                    <strong>{fmtCurrency(preview.suggestedSubtotal)}</strong>
                  </div>
                  <div>
                    <span>Discount</span>
                    <strong>{fmtCurrency(preview.appliedDiscountAmount)}</strong>
                  </div>
                  <div>
                    <span>Adjustment</span>
                    <strong>{fmtCurrency(preview.adjustmentAmount)}</strong>
                  </div>
                  <div>
                    <span>Manual override</span>
                    <strong>{preview.overrideTotal === null ? 'Off' : fmtCurrency(preview.overrideTotal)}</strong>
                  </div>
                  <div>
                    <span>Price visibility</span>
                    <strong>{preview.finalPriceHidden ? 'Hidden' : 'Shown'}</strong>
                  </div>
                </div>

                <div className="quote-summary-block">
                  <h4>Multipliers used</h4>
                  <div className="stack gap-8">
                    {preview.multipliersUsed.map((item) => (
                      <div className="saved-item quote-summary-item" key={item.key}>
                        <strong>{item.label}</strong>
                        <div className="saved-meta">
                          {item.reason} • x{item.value.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="quote-summary-block">
                  <h4>Final line items</h4>
                  <div className="stack gap-8">
                    {preview.finalLineItems.map((line) => (
                      <div className="saved-item quote-summary-item" key={line.id}>
                        <div>
                          <strong>{line.label || 'Untitled line'}</strong>
                          <div className="saved-meta">
                            {line.quantity} x {fmtCurrency(line.unitPrice)}
                          </div>
                        </div>
                        <strong>{fmtCurrency(line.total)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {preview.validationErrors.length ? (
                  <div className="quote-validation-list">
                    {preview.validationErrors.map((error) => (
                      <div className="quote-validation-item" key={error}>
                        {error}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="page-inline-note">
                    Ready to save. The calculation snapshot and line items will be stored with the
                    quote history.
                  </div>
                )}
              </div>
              <div className="panel-footer">
                <button type="button" className="button button-secondary" onClick={closeComposer}>
                  Cancel
                </button>
                <div className="button-row">
                  <button
                    type="button"
                    className="button button-ghost"
                    disabled={saving}
                    onClick={() => persistQuote('draft', false)}
                  >
                    Save quote only
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={saving}
                    onClick={() => persistQuote('saved', false)}
                  >
                    Save and attach
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={saving}
                    onClick={() => persistQuote('saved', true)}
                  >
                    {saving ? 'Saving...' : 'Save and create invoice draft'}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {showSavedQuotesList ? <div className="stack gap-12">
        {quotes.length === 0 ? (
          <div className="dashboard-empty">No saved quotes for this client yet.</div>
        ) : null}

        {quotes.map((quote) => (
          <details className="repeat-card quote-history-card" key={quote.quoteId}>
            <summary className="quote-history-summary">
              <div>
                <strong>{quote.quoteTitle || 'Untitled quote'}</strong>
                <div className="saved-meta">
                  {labelForService(quote.serviceType)} • {formatShortDate(quote.quoteDate)} •{' '}
                  {quote.calculation.finalPriceHidden
                    ? 'Price hidden externally'
                    : fmtCurrency(quote.calculation.finalTotal)}
                </div>
              </div>
              <div className="invoice-card-actions">
                <span className={quoteCardTone(quote.status)}>{quote.status}</span>
                {quote.linkedInvoiceId ? <span className="soft-pill">Invoice linked</span> : null}
              </div>
            </summary>

            <div className="stack gap-12">
              <div className="mini-grid">
                <div className="mini-box">
                  <span>Suggested total</span>
                  <strong>{fmtCurrency(quote.calculation.finalTotal)}</strong>
                </div>
                <div className="mini-box">
                  <span>VAT total</span>
                  <strong>{fmtCurrency(quote.calculation.totalWithTax)}</strong>
                </div>
                <div className="mini-box">
                  <span>Updated</span>
                  <strong>{formatShortDate(quote.updatedAt)}</strong>
                </div>
              </div>

              <p className="muted-copy">{quote.scopeSummary || 'No scope summary recorded.'}</p>

              <div className="saved-actions">
                <button className="button button-secondary" onClick={() => openExistingQuote(quote)}>
                  Edit quote
                </button>
                <button
                  className="button button-ghost"
                  disabled={saving || Boolean(quote.linkedInvoiceId)}
                  onClick={() => createInvoiceFromSavedQuote(quote)}
                >
                  {quote.linkedInvoiceId
                    ? 'Added to client invoice section'
                    : 'Create invoice draft from quote'}
                </button>
              </div>

              <div className="quote-history-grid">
                <div className="stack gap-8">
                  <h4>Rendered summary</h4>
                  <div className="saved-item quote-summary-item">
                    <div>
                      <strong>{quote.renderedSummary.headline}</strong>
                      <div className="saved-meta">{quote.renderedSummary.pricingSummary}</div>
                    </div>
                  </div>
                  {quote.renderedSummary.lineItemSummary.map((line) => (
                    <div className="saved-item quote-summary-item" key={line}>
                      {line}
                    </div>
                  ))}
                </div>

                <div className="stack gap-8">
                  <h4>Audit trail</h4>
                  {quote.history.map((entry) => (
                    <div className="saved-item quote-summary-item" key={entry.id}>
                      <div>
                        <strong>{entry.action.replace(/_/g, ' ')}</strong>
                        <div className="saved-meta">
                          {entry.actor} • {formatShortDate(entry.at)}
                        </div>
                      </div>
                      <div className="saved-meta">
                        {entry.previousTotal === null ? 'New' : fmtCurrency(entry.previousTotal)} →{' '}
                        {entry.nextTotal === null ? 'None' : fmtCurrency(entry.nextTotal)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>
        ))}
      </div> : null}
    </article>
  );
}

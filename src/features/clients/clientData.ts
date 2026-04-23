import type {
  ClientContact,
  ClientDeal,
  ClientQuote,
  ClientInvoice,
  ClientInvoiceLine,
  ClientProfile,
  ClientProfileData,
  ClientRecord,
  ClientSite,
  ClientTask,
  ClientTimelineItem
} from '../../types';

function normalizeContacts(value: ClientContact[] | undefined) {
  return (value ?? []).map((contact) => ({
    ...contact,
    category: contact.category ?? (contact.isPrimary ? 'Primary' : 'General')
  }));
}

function normalizeSites(value: ClientSite[] | undefined) {
  return (value ?? []).map((site) => ({
    ...site,
    website: site.website ?? '',
    managerName: site.managerName ?? ''
  }));
}

function normalizeTimeline(value: ClientTimelineItem[] | undefined) {
  return value ?? [];
}

function normalizeTasks(value: ClientTask[] | undefined) {
  return value ?? [];
}

function normalizeDeals(value: ClientDeal[] | undefined) {
  return value ?? [];
}

function normalizeQuoteLineItems(value: ClientQuote['lineItems'] | undefined) {
  return (value ?? []).map((line) => ({
    ...line,
    quantity: Number(line.quantity ?? 0) || 0,
    unitPrice: Number(line.unitPrice ?? 0) || 0,
    total: Number(line.total ?? 0) || 0
  }));
}

function normalizeQuotes(value: ClientQuote[] | undefined): ClientQuote[] {
  return (value ?? []).map((quote) => ({
    ...quote,
    location: quote.location ?? '',
    scopeSummary: quote.scopeSummary ?? '',
    internalNotes: quote.internalNotes ?? '',
    clientFacingNotes: quote.clientFacingNotes ?? '',
    lineItems: normalizeQuoteLineItems(quote.lineItems),
    renderedSummary: {
      headline: quote.renderedSummary?.headline ?? quote.quoteTitle ?? 'Quote summary',
      scopeSummary: quote.renderedSummary?.scopeSummary ?? quote.scopeSummary ?? '',
      pricingSummary: quote.renderedSummary?.pricingSummary ?? '',
      lineItemSummary: quote.renderedSummary?.lineItemSummary ?? [],
      externalPriceLabel: quote.renderedSummary?.externalPriceLabel ?? '',
      generatedAt: quote.renderedSummary?.generatedAt ?? quote.updatedAt ?? quote.createdAt ?? ''
    },
    history: (quote.history ?? []).map((entry) => ({
      ...entry,
      previousTotal:
        entry.previousTotal === null || entry.previousTotal === undefined
          ? null
          : Number(entry.previousTotal) || 0,
      nextTotal:
        entry.nextTotal === null || entry.nextTotal === undefined
          ? null
          : Number(entry.nextTotal) || 0,
      addedLineLabels: entry.addedLineLabels ?? [],
      removedLineLabels: entry.removedLineLabels ?? []
    })),
    calculation: {
      ...quote.calculation,
      basePrice: Number(quote.calculation?.basePrice ?? 0) || 0,
      multipliersUsed: quote.calculation?.multipliersUsed ?? [],
      allInputAnswers: quote.calculation?.allInputAnswers,
      generatedLineItems: normalizeQuoteLineItems(quote.calculation?.generatedLineItems),
      manualLineItems: normalizeQuoteLineItems(quote.calculation?.manualLineItems),
      hiddenAutoLineItemKeys: quote.calculation?.hiddenAutoLineItemKeys ?? [],
      autoLineItemOverrides: quote.calculation?.autoLineItemOverrides ?? {},
      addOns: normalizeQuoteLineItems(quote.calculation?.addOns),
      discountAmount: Number(quote.calculation?.discountAmount ?? 0) || 0,
      discountPercentage: Number(quote.calculation?.discountPercentage ?? 0) || 0,
      appliedDiscountAmount: Number(quote.calculation?.appliedDiscountAmount ?? 0) || 0,
      adjustmentAmount: Number(quote.calculation?.adjustmentAmount ?? 0) || 0,
      suggestedSubtotal: Number(quote.calculation?.suggestedSubtotal ?? 0) || 0,
      suggestedTotal: Number(quote.calculation?.suggestedTotal ?? 0) || 0,
      overrideTotal:
        quote.calculation?.overrideTotal === null || quote.calculation?.overrideTotal === undefined
          ? null
          : Number(quote.calculation.overrideTotal) || 0,
      finalTotal: Number(quote.calculation?.finalTotal ?? 0) || 0,
      finalPriceHidden: Boolean(quote.calculation?.finalPriceHidden),
      validationErrors: quote.calculation?.validationErrors ?? [],
      taxEnabled: Boolean(quote.calculation?.taxEnabled),
      taxRate: Number(quote.calculation?.taxRate ?? 0) || 0,
      taxAmount: Number(quote.calculation?.taxAmount ?? 0) || 0,
      totalWithTax: Number(quote.calculation?.totalWithTax ?? 0) || 0,
      calculationVersion: Number(quote.calculation?.calculationVersion ?? 1) || 1,
      finalLineItems: normalizeQuoteLineItems(quote.calculation?.finalLineItems)
    },
    archivedAt: quote.archivedAt ?? null
  }));
}

function normalizeInvoiceLines(value: ClientInvoiceLine[] | undefined) {
  return value ?? [];
}

function isPastDue(value?: string) {
  if (!value) return false;

  const dueDate = new Date(value);
  if (Number.isNaN(dueDate.getTime())) return false;

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDue = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate()
  ).getTime();

  return startDue < startToday;
}

function normalizeInvoices(value: ClientInvoice[] | undefined): ClientInvoice[] {
  return (value ?? []).map((invoice) => ({
    ...invoice,
    status:
      invoice.status !== 'Paid' &&
      invoice.status !== 'Cancelled' &&
      isPastDue(invoice.dueDate)
        ? 'Overdue'
        : invoice.status,
    lines: normalizeInvoiceLines(invoice.lines),
    taxEnabled: Boolean(invoice.taxEnabled),
    taxRate: Number(invoice.taxRate ?? 0) || 0,
    paymentTermsDays: Number(invoice.paymentTermsDays ?? 0) || 0,
    sourceQuoteId: invoice.sourceQuoteId ?? null,
    sourceQuoteTitle: invoice.sourceQuoteTitle ?? '',
    quoteReference: invoice.quoteReference ?? '',
    archivedAt: invoice.archivedAt ?? null
  }));
}

export function createEmptyClientData(): ClientProfileData {
  return {
    profileSummary: '',
    tradingName: '',
    businessType: '',
    goals: [],
    risks: [],
    opportunities: [],
    internalNotes: '',
    clientBackground: '',
    clientContext: '',
    painPoints: '',
    priorWorkHistory: '',
    importantNotes: '',
    internalRelationshipNotes: '',
    contacts: [],
    sites: [],
    timeline: [],
    tasks: [],
    accountOwner: '',
    leadSource: '',
    accountScope: 'Single site',
    operatingCountry: 'United Kingdom',
    relationshipHealth: 'Strong',
    estimatedMonthlyValue: 0,
    siteCountEstimate: 1,
    registeredName: '',
    registeredAddress: '',
    billingName: '',
    billingEmail: '',
    billingAddress: '',
    paymentTermsDays: 30,
    vatNumber: '',
    companyNumber: '',
    deals: [],
    quotes: [],
    invoices: [],
    archivedWorkItemIds: [],
    portal: {
      enabled: true,
      token: '',
      welcomeTitle: 'Welcome back',
      welcomeMessage:
        'Your latest reviews, actions, and shared commercial work will appear here as they are released.',
      portalNote: '',
      visibilityMode: 'all',
      hiddenAuditIds: [],
      hiddenFoodSafetyIds: [],
      hiddenMysteryShopIds: [],
      hiddenMenuIds: [],
      hiddenQuoteIds: [],
      hiddenInvoiceIds: [],
      showReports: true,
      showActionPlans: true,
      lastPublishedAt: ''
    }
  };
}

export function normalizeClientData(data?: Partial<ClientProfileData> | null): ClientProfileData {
  const empty = createEmptyClientData();

  return {
    ...empty,
    ...data,
    goals: data?.goals ?? [],
    risks: data?.risks ?? [],
    opportunities: data?.opportunities ?? [],
    contacts: normalizeContacts(data?.contacts),
    sites: normalizeSites(data?.sites),
    timeline: normalizeTimeline(data?.timeline),
    tasks: normalizeTasks(data?.tasks),
    estimatedMonthlyValue: Number(data?.estimatedMonthlyValue ?? empty.estimatedMonthlyValue) || 0,
    siteCountEstimate: Number(data?.siteCountEstimate ?? empty.siteCountEstimate) || 0,
    paymentTermsDays: Number(data?.paymentTermsDays ?? empty.paymentTermsDays) || 30,
    deals: normalizeDeals(data?.deals),
    quotes: normalizeQuotes(data?.quotes),
    invoices: normalizeInvoices(data?.invoices),
    archivedWorkItemIds: data?.archivedWorkItemIds ?? [],
    portal: {
      ...empty.portal,
      ...data?.portal,
      hiddenAuditIds: data?.portal?.hiddenAuditIds ?? [],
      hiddenFoodSafetyIds: data?.portal?.hiddenFoodSafetyIds ?? [],
      hiddenMysteryShopIds: data?.portal?.hiddenMysteryShopIds ?? [],
      hiddenMenuIds: data?.portal?.hiddenMenuIds ?? [],
      hiddenQuoteIds: data?.portal?.hiddenQuoteIds ?? [],
      hiddenInvoiceIds: data?.portal?.hiddenInvoiceIds ?? []
    },
    accountScope: data?.accountScope ?? empty.accountScope,
    operatingCountry: data?.operatingCountry ?? empty.operatingCountry,
    relationshipHealth: data?.relationshipHealth ?? 'Strong'
  };
}

export function selectableSitesForClient(record?: ClientRecord | null): ClientSite[] {
  if (!record) return [];

  const data = normalizeClientData(record.data);
  if (data.sites.length > 0) {
    return data.sites;
  }

  if (data.accountScope !== 'Single site') {
    return [];
  }

  const derivedName = record.company_name?.trim() || '';
  const derivedAddress =
    record.location?.trim() || data.registeredAddress.trim() || data.billingAddress.trim();
  const derivedWebsite = record.website?.trim() || '';

  if (!derivedName && !derivedAddress && !derivedWebsite) {
    return [];
  }

  return [
    {
      id: 'primary-site',
      name: derivedName || 'Primary site',
      address: derivedAddress,
      website: derivedWebsite,
      status: 'Active',
      notes: 'Primary site derived from the main client record.'
    }
  ];
}

export function clientRecordToProfile(record: ClientRecord): ClientProfile {
  return {
    id: record.id,
    companyName: record.company_name ?? '',
    contactName: record.contact_name ?? '',
    contactEmail: record.contact_email ?? '',
    contactPhone: record.contact_phone ?? '',
    location: record.location ?? '',
    notes: record.notes ?? '',
    logoUrl: record.logo_url ?? '',
    coverUrl: record.cover_url ?? '',
    status: record.status ?? 'Active',
    tier: record.tier ?? 'Standard',
    industry: record.industry ?? '',
    website: record.website ?? '',
    nextReviewDate: record.next_review_date ?? '',
    tags: record.tags ?? [],
    data: normalizeClientData(record.data),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

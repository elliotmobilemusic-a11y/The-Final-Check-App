import type {
  ClientContact,
  ClientDeal,
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
  return value ?? [];
}

function normalizeSites(value: ClientSite[] | undefined) {
  return (value ?? []).map((site) => ({
    ...site,
    website: site.website ?? ''
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
    lines: normalizeInvoiceLines(invoice.lines)
  }));
}

export function createEmptyClientData(): ClientProfileData {
  return {
    profileSummary: '',
    goals: [],
    risks: [],
    opportunities: [],
    internalNotes: '',
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
    invoices: [],
    portal: {
      enabled: true,
      token: '',
      welcomeTitle: 'Welcome back',
      welcomeMessage:
        'Your latest reviews, actions, and shared commercial work will appear here as they are released.',
      portalNote: '',
      visibilityMode: 'all',
      hiddenAuditIds: [],
      hiddenMenuIds: [],
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
    invoices: normalizeInvoices(data?.invoices),
    portal: {
      ...empty.portal,
      ...data?.portal,
      hiddenAuditIds: data?.portal?.hiddenAuditIds ?? [],
      hiddenMenuIds: data?.portal?.hiddenMenuIds ?? []
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

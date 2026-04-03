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
} from '../types';

function normalizeContacts(value: ClientContact[] | undefined) {
  return value ?? [];
}

function normalizeSites(value: ClientSite[] | undefined) {
  return value ?? [];
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

function normalizeInvoices(value: ClientInvoice[] | undefined): ClientInvoice[] {
  return (value ?? []).map((invoice) => ({
    ...invoice,
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
    relationshipHealth: 'Strong',
    estimatedMonthlyValue: 0,
    billingName: '',
    billingEmail: '',
    billingAddress: '',
    paymentTermsDays: 30,
    vatNumber: '',
    companyNumber: '',
    deals: [],
    invoices: []
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
    paymentTermsDays: Number(data?.paymentTermsDays ?? empty.paymentTermsDays) || 30,
    deals: normalizeDeals(data?.deals),
    invoices: normalizeInvoices(data?.invoices),
    relationshipHealth: data?.relationshipHealth ?? 'Strong'
  };
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

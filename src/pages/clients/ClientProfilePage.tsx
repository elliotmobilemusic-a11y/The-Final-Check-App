import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatCard } from '../../components/ui/StatCard';
import { buildClientPdfHtml, buildInvoicePdfHtml, invoiceTotal, openPrintableHtmlDocument } from '../../features/clients/clientExports';
import { clientRecordToProfile } from '../../features/clients/clientData';
import {
  getBusinessProfile,
  searchBusinessProfiles,
  type BusinessLookupProfile,
  type BusinessLookupResult
} from '../../features/clients/businessLookup';
import { getClientById, updateClient } from '../../services/clients';
import { listAudits } from '../../services/audits';
import { listMenuProjects } from '../../services/menus';
import type {
  AuditFormState,
  ClientContact,
  ClientDeal,
  ClientInvoice,
  ClientInvoiceLine,
  ClientProfile,
  ClientProfileData,
  ClientSite,
  ClientTask,
  ClientTimelineItem,
  MenuProjectState,
  SupabaseRecord
} from '../../types';
import { fmtCurrency, num, safe, todayIso, uid } from '../../lib/utils';

type LookupScopeFilter = 'group' | 'site' | 'all';
type ClientSectionKey =
  | 'profile'
  | 'contacts'
  | 'sites'
  | 'commercial'
  | 'strategy'
  | 'activity';

function isClientSectionKey(value?: string): value is ClientSectionKey {
  return (
    value === 'profile' ||
    value === 'contacts' ||
    value === 'sites' ||
    value === 'commercial' ||
    value === 'strategy' ||
    value === 'activity'
  );
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(values: string[]) {
  return values.join('\n');
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

function daysUntil(value?: string | null) {
  if (!value) return null;

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();

  return Math.round((startTarget - startToday) / (1000 * 60 * 60 * 24));
}

function reviewLabel(value?: string | null) {
  const delta = daysUntil(value);
  if (delta === null) return 'Not scheduled';
  if (delta < 0) return `${Math.abs(delta)} day${Math.abs(delta) === 1 ? '' : 's'} overdue`;
  if (delta === 0) return 'Due today';
  return `Due in ${delta} day${delta === 1 ? '' : 's'}`;
}

function blankContact(): ClientContact {
  return {
    id: uid('contact'),
    name: '',
    role: '',
    email: '',
    phone: '',
    isPrimary: false,
    notes: ''
  };
}

function blankSite(): ClientSite {
  return {
    id: uid('site'),
    name: '',
    address: '',
    website: '',
    status: 'Active',
    notes: ''
  };
}

function blankTimeline(): ClientTimelineItem {
  return {
    id: uid('timeline'),
    date: '',
    type: 'Note',
    title: '',
    summary: ''
  };
}

function blankTask(): ClientTask {
  return {
    id: uid('task'),
    title: '',
    dueDate: '',
    owner: '',
    status: 'Open'
  };
}

function blankDeal(): ClientDeal {
  return {
    id: uid('deal'),
    title: '',
    stage: 'Lead',
    value: 0,
    closeDate: '',
    owner: '',
    notes: ''
  };
}

function blankInvoiceLine(): ClientInvoiceLine {
  return {
    id: uid('invoice-line'),
    description: '',
    quantity: 1,
    unitPrice: 0
  };
}

function buildInvoiceNumber(existingCount: number) {
  return `INV-${new Date().getFullYear()}-${String(existingCount + 1).padStart(3, '0')}`;
}

function blankInvoice(existingCount: number, paymentTermsDays: number): ClientInvoice {
  const issueDate = todayIso();
  const due = new Date();
  due.setDate(due.getDate() + (paymentTermsDays || 30));

  return {
    id: uid('invoice'),
    number: buildInvoiceNumber(existingCount),
    title: 'Consultancy services',
    issueDate,
    dueDate: due.toISOString().slice(0, 10),
    status: 'Draft',
    notes: '',
    lines: [blankInvoiceLine()]
  };
}

function stageTone(stage: ClientDeal['stage']) {
  if (stage === 'Won') return 'status-pill status-success';
  if (stage === 'Lost') return 'status-pill status-danger';
  return 'status-pill status-warning';
}

function invoiceTone(status: ClientInvoice['status']) {
  if (status === 'Paid') return 'status-pill status-success';
  if (status === 'Overdue' || status === 'Cancelled') return 'status-pill status-danger';
  return 'status-pill status-warning';
}

function relationshipTone(health: ClientProfileData['relationshipHealth']) {
  if (health === 'Strong') return 'status-pill status-success';
  if (health === 'Watch') return 'status-pill status-warning';
  return 'status-pill status-danger';
}

function mergeLookupIntoClient(current: ClientProfile, lookup: BusinessLookupProfile): ClientProfile {
  const nextTags = [...new Set([lookup.industry, ...current.tags].filter(Boolean))];
  const nextSites = current.data.sites.length
    ? current.data.sites
    : lookup.sites.map((site, index) => ({
        id: `site-${lookup.id}-${index}`,
        name: site.name,
        address: site.address,
        website: site.website,
        status: site.status || 'Active',
        notes: site.notes || 'Imported from AI business search.'
      }));

  return {
    ...current,
    companyName: lookup.name || current.companyName,
    location: lookup.location || current.location,
    logoUrl: lookup.logoUrl || current.logoUrl,
    coverUrl: lookup.coverUrl || current.coverUrl || lookup.logoUrl,
    industry: lookup.industry || current.industry,
    website: lookup.website || current.website,
    contactEmail: lookup.email || current.contactEmail,
    contactPhone: lookup.phone || current.contactPhone,
    tags: nextTags,
    data: {
      ...current.data,
      profileSummary: current.data.profileSummary || lookup.summary,
      sites: nextSites,
      accountScope: lookup.accountScope || current.data.accountScope,
      operatingCountry: lookup.country || current.data.operatingCountry,
      siteCountEstimate:
        current.data.siteCountEstimate > 1
          ? current.data.siteCountEstimate
          : lookup.siteCountEstimate || nextSites.length || current.data.siteCountEstimate,
      registeredName: current.data.registeredName || lookup.officialName || lookup.name,
      registeredAddress:
        current.data.registeredAddress || lookup.registeredAddress || lookup.addressLine,
      billingName: current.data.billingName || lookup.name,
      billingEmail: current.data.billingEmail || lookup.email,
      billingAddress: current.data.billingAddress || lookup.registeredAddress || lookup.addressLine,
      companyNumber: current.data.companyNumber || lookup.companyNumber,
      vatNumber: current.data.vatNumber || lookup.vatNumber,
      leadSource: current.data.leadSource || 'AI business search'
    }
  };
}

export function ClientProfilePage() {
  const { clientId = '', section } = useParams();

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ClientProfile | null>(null);
  const [audits, setAudits] = useState<SupabaseRecord<AuditFormState>[]>([]);
  const [menus, setMenus] = useState<SupabaseRecord<MenuProjectState>[]>([]);
  const [message, setMessage] = useState('Client loaded.');
  const [saving, setSaving] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<BusinessLookupResult[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupScope, setLookupScope] = useState<LookupScopeFilter>('group');
  const [lookupMessage, setLookupMessage] = useState(
    'Use the business finder to refresh the company name, logo, website, location, and profile summary from the strongest matched record.'
  );
  const [lookupSelectionId, setLookupSelectionId] = useState('');

  useEffect(() => {
    async function load() {
      const [clientRow, auditRows, menuRows] = await Promise.all([
        getClientById(clientId),
        listAudits(clientId),
        listMenuProjects(clientId)
      ]);

      if (!clientRow) return;

      const profile = clientRecordToProfile(clientRow);
      setClient(profile);
      setForm(profile);
      setAudits(auditRows);
      setMenus(menuRows);
    }

    if (clientId) {
      load().catch((error) => {
        setMessage(error instanceof Error ? error.message : 'Could not load client.');
      });
    }
  }, [clientId]);

  const stats = useMemo(() => {
    if (!client) {
      return {
        contacts: 0,
        sites: 0,
        tasksOpen: 0,
        timeline: 0,
        deals: 0,
        invoicesOpen: 0
      };
    }

    return {
      contacts: client.data.contacts.length,
      sites: client.data.sites.length,
      tasksOpen: client.data.tasks.filter((task) => task.status !== 'Done').length,
      timeline: client.data.timeline.length,
      deals: client.data.deals.filter((deal) => deal.stage !== 'Won' && deal.stage !== 'Lost').length,
      invoicesOpen: client.data.invoices.filter((invoice) => invoice.status !== 'Paid').length
    };
  }, [client]);

  const nextReviewState = useMemo(() => daysUntil(form?.nextReviewDate), [form?.nextReviewDate]);
  const linkedWorkstreams = audits.length + menus.length;
  const primaryContact =
    form?.data.contacts.find((contact) => contact.isPrimary) ?? form?.data.contacts[0] ?? null;
  const pipelineValue = useMemo(
    () =>
      form?.data.deals
        .filter((deal) => deal.stage !== 'Won' && deal.stage !== 'Lost')
        .reduce((sum, deal) => sum + num(deal.value), 0) ?? 0,
    [form?.data.deals]
  );
  const outstandingInvoiceValue = useMemo(
    () =>
      form?.data.invoices
        .filter((invoice) => invoice.status !== 'Paid')
        .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0) ?? 0,
    [form?.data.invoices]
  );
  const invoiceSnapshot = useMemo(() => {
    const invoices = form?.data.invoices ?? [];

    return {
      overdueCount: invoices.filter((invoice) => invoice.status === 'Overdue').length,
      overdueValue: invoices
        .filter((invoice) => invoice.status === 'Overdue')
        .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
      paidValue: invoices
        .filter((invoice) => invoice.status === 'Paid')
        .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0)
    };
  }, [form?.data.invoices]);
  const scopedLookupResults = useMemo(() => {
    if (lookupScope === 'all') return lookupResults;
    return lookupResults.filter((result) =>
      lookupScope === 'group' ? result.resultType === 'group' : result.resultType === 'site'
    );
  }, [lookupResults, lookupScope]);
  const visibleLookupResults = useMemo(() => {
    if (lookupScope === 'all') return lookupResults;
    return scopedLookupResults.length ? scopedLookupResults : lookupResults;
  }, [lookupResults, lookupScope, scopedLookupResults]);
  const isLookupFallbackVisible =
    lookupScope !== 'all' && lookupResults.length > 0 && scopedLookupResults.length === 0;
  const activeSection = isClientSectionKey(section) ? section : null;

  if (!client || !form) {
    return (
      <div className="screen-center">
        <div className="loading-card">
          <h2>Loading client profile...</h2>
          <p>{message}</p>
        </div>
      </div>
    );
  }

  function updateField<K extends keyof ClientProfile>(key: K, value: ClientProfile[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateData<K extends keyof ClientProfileData>(
    key: K,
    value: ClientProfileData[K]
  ) {
    setForm((current) =>
      current
        ? {
            ...current,
            data: {
              ...current.data,
              [key]: value
            }
          }
        : current
    );
  }

  function updateContact(id: string, key: keyof ClientContact, value: string | boolean) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            contacts: current.data.contacts.map((item) =>
              item.id === id ? { ...item, [key]: value } : item
            )
          }
        }
      : current
  );
}

function updateSite(id: string, key: keyof ClientSite, value: string) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            sites: current.data.sites.map((item) =>
              item.id === id ? { ...item, [key]: value } : item
            )
          }
        }
      : current
  );
}

function removeSite(id: string) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            sites: current.data.sites.filter((item) => item.id !== id)
          }
        }
      : current
  );
}

function updateTimeline(id: string, key: keyof ClientTimelineItem, value: string) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            timeline: current.data.timeline.map((item) =>
              item.id === id ? { ...item, [key]: value } : item
            )
          }
        }
      : current
  );
}

function updateTask(id: string, key: keyof ClientTask, value: string) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            tasks: current.data.tasks.map((item) =>
              item.id === id ? { ...item, [key]: value } : item
            )
          }
        }
      : current
  );
}

function updateDeal(id: string, key: keyof ClientDeal, value: string | number) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            deals: current.data.deals.map((item) =>
              item.id === id ? { ...item, [key]: value } : item
            )
          }
        }
      : current
  );
}

function updateInvoice(
  id: string,
  key: keyof Omit<ClientInvoice, 'lines'>,
  value: string
) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            invoices: current.data.invoices.map((item) =>
              item.id === id ? { ...item, [key]: value } : item
            )
          }
        }
      : current
  );
}

function updateInvoiceLine(
  invoiceId: string,
  lineId: string,
  key: keyof ClientInvoiceLine,
  value: string | number
) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            invoices: current.data.invoices.map((invoice) =>
              invoice.id === invoiceId
                ? {
                    ...invoice,
                    lines: invoice.lines.map((line) =>
                      line.id === lineId ? { ...line, [key]: value } : line
                    )
                  }
                : invoice
            )
          }
        }
      : current
  );
}

function addInvoiceLine(invoiceId: string) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            invoices: current.data.invoices.map((invoice) =>
              invoice.id === invoiceId
                ? {
                    ...invoice,
                    lines: [...invoice.lines, blankInvoiceLine()]
                  }
                : invoice
            )
          }
        }
      : current
  );
}

function removeInvoiceLine(invoiceId: string, lineId: string) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            invoices: current.data.invoices.map((invoice) =>
              invoice.id === invoiceId
                ? {
                    ...invoice,
                    lines: invoice.lines.filter((line) => line.id !== lineId)
                  }
                : invoice
            )
          }
        }
      : current
  );
}

function removeInvoice(invoiceId: string) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            invoices: current.data.invoices.filter((invoice) => invoice.id !== invoiceId)
          }
        }
      : current
  );
}

  async function handleSave() {
  if (!client?.id || !form) return;

  try {
    setSaving(true);
    const updated = await updateClient(client.id, form);
    const next = clientRecordToProfile(updated);
    setClient(next);
    setForm(next);
    setEditing(false);
    setMessage('Client profile updated.');
  } catch (error) {
    setMessage(error instanceof Error ? error.message : 'Could not save client.');
  } finally {
    setSaving(false);
  }
  }

  async function handleBusinessLookup() {
    const query = lookupQuery.trim();
    if (query.length < 2) {
      setLookupMessage('Enter at least two characters to search for a business.');
      setLookupResults([]);
      return;
    }

    try {
      setLookupLoading(true);
      setLookupSelectionId('');
      const results = await searchBusinessProfiles(query, lookupScope);
      setLookupResults(results);
      setLookupMessage(
        results.length
          ? `Found ${results.length} business match${results.length === 1 ? '' : 'es'}. Start with the strongest match and review the record before saving.`
          : 'No recognised business matches found. Try the trading name, location, or website.'
      );
    } catch (error) {
      setLookupMessage(error instanceof Error ? error.message : 'Business lookup failed.');
      setLookupResults([]);
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleUseLookup(result: BusinessLookupResult) {
    if (!form) return;

    try {
      setLookupLoading(true);
      setLookupSelectionId(result.id);
      const profile = await getBusinessProfile(result);
      setForm((current) => (current ? mergeLookupIntoClient(current, profile) : current));
      setLookupMessage(`Loaded business details for ${profile.name}. Save the profile to keep the updated account data.`);
      setMessage(`Business details loaded for ${profile.name}.`);
    } catch (error) {
      setLookupMessage(error instanceof Error ? error.message : 'Could not load business details.');
    } finally {
      setLookupLoading(false);
    }
  }

  function exportClientPdf() {
    if (!form) return;
    openPrintableHtmlDocument(
      `${form.companyName} CRM export`,
      buildClientPdfHtml(form, audits, menus)
    );
  }

  function exportInvoicePdf(invoice: ClientInvoice) {
    if (!form) return;
    openPrintableHtmlDocument(
      `${invoice.number} invoice export`,
      buildInvoicePdfHtml(form, invoice)
    );
  }

  const sectionCards: Array<{
    key: ClientSectionKey;
    label: string;
    description: string;
    value: string;
    meta: string;
  }> = [
    {
      key: 'profile',
      label: 'Profile and business record',
      description: 'Business finder, account basics, and the primary relationship details.',
      value: form.status || 'Active',
      meta: form.data.accountScope
    },
    {
      key: 'contacts',
      label: 'Contact information',
      description: 'Decision-makers, operators, finance contacts, and the day-to-day relationship list.',
      value: `${stats.contacts} contact${stats.contacts === 1 ? '' : 's'}`,
      meta: primaryContact?.name || form.contactName || 'No primary contact'
    },
    {
      key: 'sites',
      label: 'Locations and sites',
      description: 'Single-site and multi-site venue records kept separate from the core account.',
      value: `${Math.max(stats.sites, form.data.siteCountEstimate || 0)} site${Math.max(stats.sites, form.data.siteCountEstimate || 0) === 1 ? '' : 's'}`,
      meta: form.location || 'No location set'
    },
    {
      key: 'commercial',
      label: 'Commercial and billing',
      description: 'Billing controls, pipeline, invoice drafts, and commercial account ownership.',
      value: fmtCurrency(outstandingInvoiceValue),
      meta: `${stats.invoicesOpen} open invoice${stats.invoicesOpen === 1 ? '' : 's'}`
    },
    {
      key: 'strategy',
      label: 'Account strategy',
      description: 'Goals, risks, opportunities, and internal notes for client planning.',
      value: `${form.data.relationshipHealth}`,
      meta: `${form.data.goals.length} goals / ${form.data.opportunities.length} opportunities`
    },
    {
      key: 'activity',
      label: 'Activity and follow-up',
      description: 'Timeline updates, open tasks, linked audits, and linked menu reviews.',
      value: `${stats.tasksOpen} open task${stats.tasksOpen === 1 ? '' : 's'}`,
      meta: `${linkedWorkstreams} linked workstream${linkedWorkstreams === 1 ? '' : 's'}`
    }
  ];
  const activeSectionCard = activeSection
    ? sectionCards.find((item) => item.key === activeSection) ?? null
    : null;

  return (
    <div className="page-stack">
      <section className="record-header">
        <div className="record-header-main">
          <div className="record-header-brand">
            <div className="client-logo-shell">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt={form.companyName} className="client-logo-lg" />
              ) : (
                <div className="client-logo-fallback">
                  {safe(form.companyName).slice(0, 2).toUpperCase() || 'CL'}
                </div>
              )}
            </div>

            <div className="record-header-copy">
              <div className="record-header-topline">
                <span className="brand-badge">{form.status}</span>
                <span className="soft-pill">{form.data.accountScope}</span>
                {activeSectionCard ? <span className="soft-pill">{activeSectionCard.label}</span> : null}
              </div>
              <h2>{form.companyName}</h2>
              <p>
                {form.industry || 'Industry not set'} • {form.location || 'Location not set'} •{' '}
                {form.tier || 'Standard'}
              </p>
              {form.tags.length ? (
                <div className="client-tag-row">
                  {form.tags.map((tag) => (
                    <span className="soft-pill" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="record-header-actions">
            <Link className="button button-secondary" to="/clients">
              Back to client list
            </Link>
            {activeSection ? (
              <Link className="button button-secondary" to={`/clients/${client.id}`}>
                Back to CRM hub
              </Link>
            ) : null}
            <button
              className="button button-secondary"
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? 'Close edit mode' : 'Edit client'}
            </button>
            <button
              className="button button-primary"
              disabled={!editing || saving}
              onClick={handleSave}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <Link className="button button-secondary" to={`/audit?client=${client.id}`}>
              New audit
            </Link>
            <Link className="button button-secondary" to={`/menu?client=${client.id}`}>
              New menu
            </Link>
            <button className="button button-secondary" onClick={exportClientPdf}>
              Export CRM PDF
            </button>
            {form.website ? (
              <a className="button button-ghost" href={form.website} rel="noreferrer" target="_blank">
                Open website
              </a>
            ) : null}
          </div>
        </div>

        <aside className="record-header-side">
          <div className="record-header-summary">
            <span className="soft-pill">Account snapshot</span>
            <strong>{activeSectionCard ? activeSectionCard.label : 'CRM hub'}</strong>
            <div className="record-header-grid">
              <div>
                <span>Workstreams</span>
                <strong>{linkedWorkstreams}</strong>
                <small>{audits.length} audits and {menus.length} menu projects</small>
              </div>
              <div>
                <span>Review cadence</span>
                <strong>{reviewLabel(form.nextReviewDate)}</strong>
                <small>{formatShortDate(form.nextReviewDate)}</small>
              </div>
              <div>
                <span>Pipeline</span>
                <strong>{fmtCurrency(pipelineValue)}</strong>
                <small>{stats.deals} open opportunit{stats.deals === 1 ? 'y' : 'ies'}</small>
              </div>
              <div>
                <span>Outstanding</span>
                <strong>{fmtCurrency(outstandingInvoiceValue)}</strong>
                <small>{stats.invoicesOpen} invoice{stats.invoicesOpen === 1 ? '' : 's'} not paid</small>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <nav className="client-section-nav" aria-label="Client CRM sections">
        <Link
          className={`client-section-link ${activeSection === null ? 'active' : ''}`}
          to={`/clients/${client.id}`}
        >
          CRM hub
        </Link>
        {sectionCards.map((item) => (
          <Link
            key={item.key}
            className={`client-section-link ${activeSection === item.key ? 'active' : ''}`}
            to={`/clients/${client.id}/${item.key}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <section className="stats-grid">
        <StatCard label="Contacts" value={String(stats.contacts)} hint="Key people" />
        <StatCard
          label="Sites"
          value={String(Math.max(stats.sites, form.data.siteCountEstimate || 0))}
          hint="Locations and venues"
        />
        <StatCard label="Open tasks" value={String(stats.tasksOpen)} hint="Follow-up actions" />
        <StatCard
          label="Open deals"
          value={String(stats.deals)}
          hint="Pipeline opportunities in play"
        />
      </section>

      {activeSection === null ? (
        <section className="section-stack">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>CRM sections</h3>
                <p className="muted-copy">
                  Use the client hub as the control point, then open the exact CRM area you need.
                </p>
              </div>
            </div>
            <div className="panel-body">
              <div className="card-grid two-columns client-hub-grid">
                {sectionCards.map((item) => (
                  <article className="feature-card client-hub-card" key={item.key}>
                    <div className="feature-top">
                      <div>
                        <h3>{item.label}</h3>
                        <p>{item.description}</p>
                      </div>
                      <span className="soft-pill">{item.value}</span>
                    </div>
                    <div className="client-hub-meta">
                      <span>{item.meta}</span>
                    </div>
                    <div className="header-actions">
                      <Link className="button button-primary" to={`/clients/${client.id}/${item.key}`}>
                        Open section
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <section className="workspace-grid client-workspace">
            <div className="workspace-main section-stack">
              <div className="card-grid two-columns">
                <article className="feature-card">
                  <div className="feature-top">
                    <div>
                      <h3>Relationship snapshot</h3>
                      <p>The main contact and current account position at a glance.</p>
                    </div>
                  </div>
                  <div className="client-summary-list">
                    <div className="client-summary-row">
                      <span>Primary contact</span>
                      <strong>{form.contactName || primaryContact?.name || 'Not set'}</strong>
                    </div>
                    <div className="client-summary-row">
                      <span>Email</span>
                      <strong>{form.contactEmail || primaryContact?.email || 'Not set'}</strong>
                    </div>
                    <div className="client-summary-row">
                      <span>Website</span>
                      <strong>{form.website || 'Not set'}</strong>
                    </div>
                    <div className="client-summary-row">
                      <span>Account owner</span>
                      <strong>{form.data.accountOwner || 'Not set'}</strong>
                    </div>
                  </div>
                </article>

                <article className="feature-card">
                  <div className="feature-top">
                    <div>
                      <h3>Commercial position</h3>
                      <p>Pipeline, invoices, and review status before you open a deeper section.</p>
                    </div>
                  </div>
                  <div className="mini-grid">
                    <div className="mini-box">
                      <span>Pipeline</span>
                      <strong>{fmtCurrency(pipelineValue)}</strong>
                    </div>
                    <div className="mini-box">
                      <span>Outstanding</span>
                      <strong>{fmtCurrency(outstandingInvoiceValue)}</strong>
                    </div>
                    <div className="mini-box">
                      <span>Review</span>
                      <strong>{reviewLabel(form.nextReviewDate)}</strong>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            <aside className="workspace-side section-stack">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Linked audits</h3>
                    <p className="muted-copy">Operational reviews already connected to this account.</p>
                  </div>
                </div>
                <div className="panel-body stack gap-12">
                  {audits.length === 0 ? <div className="muted-copy">No audits yet.</div> : null}
                  {audits.map((audit) => (
                    <div className="saved-item saved-item-rich" key={audit.id}>
                      <div>
                        <strong>{audit.title}</strong>
                        <div className="saved-meta">
                          {formatShortDate(audit.review_date || audit.updated_at)}
                        </div>
                      </div>
                      <Link className="button button-ghost" to={`/audit?client=${client.id}&load=${audit.id}`}>
                        Open
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Linked menu projects</h3>
                    <p className="muted-copy">Commercial menu work already attached to this business record.</p>
                  </div>
                </div>
                <div className="panel-body stack gap-12">
                  {menus.length === 0 ? <div className="muted-copy">No menu projects yet.</div> : null}
                  {menus.map((menu) => (
                    <div className="saved-item saved-item-rich" key={menu.id}>
                      <div>
                        <strong>{menu.title}</strong>
                        <div className="saved-meta">
                          {formatShortDate(menu.review_date || menu.updated_at)}
                        </div>
                      </div>
                      <Link className="button button-ghost" to={`/menu?client=${client.id}&load=${menu.id}`}>
                        Open
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        </section>
      ) : (
        <section className="section-stack">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>{activeSectionCard?.label}</h3>
                <p className="muted-copy">{activeSectionCard?.description}</p>
              </div>
            </div>
            <div className="panel-body">
              {activeSection === 'profile' ? (
                <div className="section-stack">
                  <article className="feature-card">
                    <div className="feature-top">
                      <div>
                        <h3>Core profile</h3>
                        <p>Primary business information for this client.</p>
                      </div>
                    </div>

                    <section className="crm-lookup-shell">
                      <div className="crm-lookup-top">
                        <div>
                          <h4>AI-assisted business finder</h4>
                          <p className="muted-copy">
                            Search for UK hospitality groups, pub companies, restaurant brands,
                            hotels, or individual venues, then refresh this account with the
                            strongest matched operating record.
                          </p>
                        </div>
                        <span className="soft-pill">Smart enrichment</span>
                      </div>

                      <div className="crm-lookup-bar">
                        <label className="field">
                          <span>Business name search</span>
                          <input
                            className="input"
                            disabled={!editing}
                            placeholder="Search by venue, group, brand, or website"
                            value={lookupQuery}
                            onChange={(e) => setLookupQuery(e.target.value)}
                          />
                        </label>
                        <label className="field">
                          <span>Show results for</span>
                          <select
                            className="input"
                            disabled={!editing}
                            value={lookupScope}
                            onChange={(event) =>
                              setLookupScope(event.target.value as LookupScopeFilter)
                            }
                          >
                            <option value="group">Groups and head office</option>
                            <option value="site">Single sites</option>
                            <option value="all">All UK matches</option>
                          </select>
                        </label>
                        <button
                          className="button button-secondary self-end"
                          disabled={!editing || lookupLoading}
                          onClick={handleBusinessLookup}
                          type="button"
                        >
                          {lookupLoading ? 'Searching...' : 'Find business'}
                        </button>
                      </div>

                      <p className="muted-copy">{lookupMessage}</p>

                      {visibleLookupResults.length ? (
                        <div className="crm-lookup-results">
                          {visibleLookupResults.map((result) => (
                            <article className="crm-lookup-card" key={result.id}>
                              <div className="crm-lookup-card-top">
                                <div className="crm-lookup-logo-shell">
                                  {result.logoUrl ? (
                                    <img
                                      alt={`${result.name} logo`}
                                      className="crm-lookup-logo"
                                      src={result.logoUrl}
                                    />
                                  ) : (
                                    <span className="crm-lookup-logo-fallback">
                                      {result.name.slice(0, 2).toUpperCase()}
                                    </span>
                                  )}
                                </div>

                                <div className="stack gap-12">
                                  <div>
                                    <strong>{result.name}</strong>
                                    <p className="crm-lookup-description">
                                      {result.description || 'Public business profile recognised.'}
                                    </p>
                                  </div>

                                  <div className="crm-lookup-meta-row">
                                    <span className="crm-lookup-confidence">{result.confidenceLabel}</span>
                                    <span className="crm-alert-chip">
                                      {result.resultType === 'group' ? 'Group match' : 'Site match'}
                                    </span>
                                    <span className="crm-alert-chip">{result.accountScope}</span>
                                    <span className="crm-alert-chip">UK</span>
                                    <span className="crm-alert-chip">{result.sourceLabel}</span>
                                    {result.phone ? (
                                      <span className="crm-alert-chip">{result.phone}</span>
                                    ) : null}
                                  </div>

                                  <div className="crm-alert-row">
                                    {result.industry ? (
                                      <span className="crm-alert-chip is-stable">{result.industry}</span>
                                    ) : null}
                                    {result.location ? (
                                      <span className="crm-alert-chip is-warning">{result.location}</span>
                                    ) : null}
                                    {result.website ? (
                                      <span className="crm-alert-chip">
                                        {result.website.replace(/^https?:\/\//, '')}
                                      </span>
                                    ) : null}
                                    {result.email ? (
                                      <span className="crm-alert-chip">{result.email}</span>
                                    ) : null}
                                    {result.siteCountEstimate > 1 ? (
                                      <span className="crm-alert-chip is-stable">
                                        {result.siteCountEstimate} known sites
                                      </span>
                                    ) : null}
                                    {result.companyNumber ? (
                                      <span className="crm-alert-chip">Co. {result.companyNumber}</span>
                                    ) : null}
                                  </div>

                                  {result.signals.length ? (
                                    <p className="crm-lookup-note">{result.signals.join(' • ')}</p>
                                  ) : null}

                                  {result.registeredAddress || result.addressLine ? (
                                    <p className="crm-lookup-note">
                                      {result.registeredAddress || result.addressLine}
                                    </p>
                                  ) : null}

                                  {result.sites.length ? (
                                    <div className="crm-lookup-site-list">
                                      {result.sites.slice(0, 4).map((site) => (
                                        <div className="crm-lookup-site-item" key={`${result.id}-${site.name}`}>
                                          <strong>{site.name}</strong>
                                          <span>{site.address || 'UK site address not captured yet'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <div className="saved-actions">
                                <button
                                  className="button button-primary"
                                  disabled={!editing || lookupLoading}
                                  onClick={() => handleUseLookup(result)}
                                  type="button"
                                >
                                  {lookupSelectionId === result.id && lookupLoading ? 'Loading...' : 'Apply match'}
                                </button>
                                <a
                                  className="button button-ghost"
                                  href={result.sourceUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  Source
                                </a>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : null}

                      {isLookupFallbackVisible ? (
                        <p className="muted-copy">
                          No exact {lookupScope === 'group' ? 'group' : 'site'} matches were returned, so the closest UK hospitality results are being shown instead.
                        </p>
                      ) : null}
                    </section>

                    <div className="form-grid two-columns">
                      <label className="field">
                        <span>Company name</span>
                        <input
                          className="input"
                          value={form.companyName}
                          onChange={(e) => updateField('companyName', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Industry</span>
                        <input
                          className="input"
                          value={form.industry}
                          onChange={(e) => updateField('industry', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Status</span>
                        <select
                          className="input"
                          value={form.status}
                          onChange={(e) => updateField('status', e.target.value)}
                          disabled={!editing}
                        >
                          <option>Active</option>
                          <option>Prospect</option>
                          <option>Onboarding</option>
                          <option>Paused</option>
                          <option>Completed</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Tier</span>
                        <select
                          className="input"
                          value={form.tier}
                          onChange={(e) => updateField('tier', e.target.value)}
                          disabled={!editing}
                        >
                          <option>Standard</option>
                          <option>Growth</option>
                          <option>Premium</option>
                          <option>Enterprise</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Account scope</span>
                        <select
                          className="input"
                          value={form.data.accountScope}
                          onChange={(e) =>
                            updateData(
                              'accountScope',
                              e.target.value as ClientProfileData['accountScope']
                            )
                          }
                          disabled={!editing}
                        >
                          <option>Single site</option>
                          <option>Multi-site group</option>
                          <option>Group / head office</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Website</span>
                        <input
                          className="input"
                          value={form.website}
                          onChange={(e) => updateField('website', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Next review date</span>
                        <input
                          className="input"
                          type="date"
                          value={form.nextReviewDate}
                          onChange={(e) => updateField('nextReviewDate', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Operating country</span>
                        <input
                          className="input"
                          value={form.data.operatingCountry}
                          onChange={(e) => updateData('operatingCountry', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Logo image URL</span>
                        <input
                          className="input"
                          value={form.logoUrl}
                          onChange={(e) => updateField('logoUrl', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Cover image URL</span>
                        <input
                          className="input"
                          value={form.coverUrl}
                          onChange={(e) => updateField('coverUrl', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                    </div>

                    <label className="field">
                      <span>Profile summary</span>
                      <textarea
                        className="input textarea"
                        value={form.data.profileSummary}
                        onChange={(e) => updateData('profileSummary', e.target.value)}
                        disabled={!editing}
                      />
                    </label>
                  </article>

                  <article className="feature-card">
                    <div className="feature-top">
                      <div>
                        <h3>Main relationship details</h3>
                        <p>The core contact details you use most often.</p>
                      </div>
                    </div>

                    <div className="form-grid two-columns">
                      <label className="field">
                        <span>Main contact</span>
                        <input
                          className="input"
                          value={form.contactName}
                          onChange={(e) => updateField('contactName', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Email</span>
                        <input
                          className="input"
                          value={form.contactEmail}
                          onChange={(e) => updateField('contactEmail', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Phone</span>
                        <input
                          className="input"
                          value={form.contactPhone}
                          onChange={(e) => updateField('contactPhone', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Location</span>
                        <input
                          className="input"
                          value={form.location}
                          onChange={(e) => updateField('location', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                    </div>

                    <label className="field">
                      <span>Tags (one per line)</span>
                      <textarea
                        className="input textarea"
                        value={joinLines(form.tags)}
                        onChange={(e) => updateField('tags', splitLines(e.target.value))}
                        disabled={!editing}
                      />
                    </label>
                  </article>
                </div>
              ) : null}

              {activeSection === 'contacts' ? (
                <article className="feature-card">
                  <div className="feature-top">
                    <div>
                      <h3>Contact information</h3>
                      <p>Keep more than one decision-maker on the profile.</p>
                    </div>
                    {editing ? (
                      <button
                        className="button button-secondary"
                        onClick={() => updateData('contacts', [...form.data.contacts, blankContact()])}
                      >
                        Add contact
                      </button>
                    ) : null}
                  </div>

                  <div className="stack gap-12">
                    {form.data.contacts.length === 0 ? (
                      <div className="dashboard-empty">No contacts recorded yet.</div>
                    ) : null}

                    {form.data.contacts.map((contact) => (
                      <div className="repeat-card" key={contact.id}>
                        <div className="form-grid two-columns">
                          <label className="field">
                            <span>Name</span>
                            <input
                              className="input"
                              value={contact.name}
                              onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                              disabled={!editing}
                            />
                          </label>
                          <label className="field">
                            <span>Role</span>
                            <input
                              className="input"
                              value={contact.role}
                              onChange={(e) => updateContact(contact.id, 'role', e.target.value)}
                              disabled={!editing}
                            />
                          </label>
                          <label className="field">
                            <span>Email</span>
                            <input
                              className="input"
                              value={contact.email}
                              onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                              disabled={!editing}
                            />
                          </label>
                          <label className="field">
                            <span>Phone</span>
                            <input
                              className="input"
                              value={contact.phone}
                              onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                              disabled={!editing}
                            />
                          </label>
                        </div>
                        <label className="checkbox-row">
                          <input
                            checked={contact.isPrimary}
                            type="checkbox"
                            onChange={(e) => updateContact(contact.id, 'isPrimary', e.target.checked)}
                            disabled={!editing}
                          />
                          <span>Primary contact</span>
                        </label>
                        <label className="field">
                          <span>Notes</span>
                          <textarea
                            className="input textarea"
                            value={contact.notes}
                            onChange={(e) => updateContact(contact.id, 'notes', e.target.value)}
                            disabled={!editing}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}

              {activeSection === 'sites' ? (
                <article className="feature-card">
                  <div className="feature-top">
                    <div>
                      <h3>Locations and sites</h3>
                      <p>Useful when one client has multiple venues or kitchens.</p>
                    </div>
                    {editing ? (
                      <button
                        className="button button-secondary"
                        onClick={() => updateData('sites', [...form.data.sites, blankSite()])}
                      >
                        Add site
                      </button>
                    ) : null}
                  </div>

                  <div className="stack gap-12">
                    {form.data.sites.length === 0 ? (
                      <div className="dashboard-empty">No site records added yet.</div>
                    ) : null}

                    {form.data.sites.map((site) => (
                      <div className="repeat-card" key={site.id}>
                        <div className="saved-actions">
                          <span className="soft-pill">{site.status || 'Active'}</span>
                          {editing ? (
                            <button
                              className="button button-ghost danger-text"
                              onClick={() => removeSite(site.id)}
                              type="button"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <div className="form-grid two-columns">
                          <label className="field">
                            <span>Site name</span>
                            <input
                              className="input"
                              value={site.name}
                              onChange={(e) => updateSite(site.id, 'name', e.target.value)}
                              disabled={!editing}
                            />
                          </label>
                          <label className="field">
                            <span>Status</span>
                            <input
                              className="input"
                              value={site.status}
                              onChange={(e) => updateSite(site.id, 'status', e.target.value)}
                              disabled={!editing}
                            />
                          </label>
                          <label className="field">
                            <span>Website</span>
                            <input
                              className="input"
                              value={site.website}
                              onChange={(e) => updateSite(site.id, 'website', e.target.value)}
                              disabled={!editing}
                            />
                          </label>
                        </div>
                        <label className="field">
                          <span>Address</span>
                          <input
                            className="input"
                            value={site.address}
                            onChange={(e) => updateSite(site.id, 'address', e.target.value)}
                            disabled={!editing}
                          />
                        </label>
                        <label className="field">
                          <span>Notes</span>
                          <textarea
                            className="input textarea"
                            value={site.notes}
                            onChange={(e) => updateSite(site.id, 'notes', e.target.value)}
                            disabled={!editing}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}

              {activeSection === 'commercial' ? (
                <div className="section-stack">
                  <article className="feature-card">
                    <div className="feature-top">
                      <div>
                        <h3>CRM and billing controls</h3>
                        <p>
                          Use this client record for account ownership, billing data, value
                          tracking, and relationship health.
                        </p>
                      </div>
                      <span className={relationshipTone(form.data.relationshipHealth)}>
                        {form.data.relationshipHealth}
                      </span>
                    </div>

                    <div className="form-grid three-balance">
                      <label className="field">
                        <span>Account owner</span>
                        <input
                          className="input"
                          value={form.data.accountOwner}
                          onChange={(e) => updateData('accountOwner', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Lead source</span>
                        <input
                          className="input"
                          value={form.data.leadSource}
                          onChange={(e) => updateData('leadSource', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Relationship health</span>
                        <select
                          className="input"
                          value={form.data.relationshipHealth}
                          onChange={(e) =>
                            updateData(
                              'relationshipHealth',
                              e.target.value as ClientProfileData['relationshipHealth']
                            )
                          }
                          disabled={!editing}
                        >
                          <option>Strong</option>
                          <option>Watch</option>
                          <option>At Risk</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Estimated monthly value</span>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={form.data.estimatedMonthlyValue}
                          onChange={(e) => updateData('estimatedMonthlyValue', Number(e.target.value))}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Estimated site count</span>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={form.data.siteCountEstimate}
                          onChange={(e) => updateData('siteCountEstimate', Number(e.target.value))}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Registered name</span>
                        <input
                          className="input"
                          value={form.data.registeredName}
                          onChange={(e) => updateData('registeredName', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Billing name</span>
                        <input
                          className="input"
                          value={form.data.billingName}
                          onChange={(e) => updateData('billingName', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Billing email</span>
                        <input
                          className="input"
                          value={form.data.billingEmail}
                          onChange={(e) => updateData('billingEmail', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Payment terms (days)</span>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={form.data.paymentTermsDays}
                          onChange={(e) => updateData('paymentTermsDays', Number(e.target.value))}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>VAT number</span>
                        <input
                          className="input"
                          value={form.data.vatNumber}
                          onChange={(e) => updateData('vatNumber', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                      <label className="field">
                        <span>Company number</span>
                        <input
                          className="input"
                          value={form.data.companyNumber}
                          onChange={(e) => updateData('companyNumber', e.target.value)}
                          disabled={!editing}
                        />
                      </label>
                    </div>

                    <label className="field">
                      <span>Registered address</span>
                      <textarea
                        className="input textarea"
                        value={form.data.registeredAddress}
                        onChange={(e) => updateData('registeredAddress', e.target.value)}
                        disabled={!editing}
                      />
                    </label>

                    <label className="field">
                      <span>Billing address</span>
                      <textarea
                        className="input textarea"
                        value={form.data.billingAddress}
                        onChange={(e) => updateData('billingAddress', e.target.value)}
                        disabled={!editing}
                      />
                    </label>
                  </article>

                  <article className="feature-card" id="client-deals">
                    <div className="feature-top">
                      <div>
                        <h3>Pipeline and CRM deals</h3>
                        <p>Track proposals, negotiations, renewals, and new opportunities from the same client record.</p>
                      </div>
                      {editing ? (
                        <button
                          className="button button-secondary"
                          onClick={() => updateData('deals', [...form.data.deals, blankDeal()])}
                        >
                          Add deal
                        </button>
                      ) : null}
                    </div>

                    <div className="stack gap-12">
                      {form.data.deals.length === 0 ? (
                        <div className="dashboard-empty">No opportunities tracked yet.</div>
                      ) : null}

                      {form.data.deals.map((deal) => (
                        <div className="repeat-card crm-deal-card" key={deal.id}>
                          <div className="crm-deal-top">
                            <strong>{deal.title || 'Untitled deal'}</strong>
                            <div className="invoice-card-actions">
                              <span className={stageTone(deal.stage)}>{deal.stage}</span>
                              {editing ? (
                                <button
                                  className="button button-ghost danger-text"
                                  onClick={() =>
                                    updateData(
                                      'deals',
                                      form.data.deals.filter((item) => item.id !== deal.id)
                                    )
                                  }
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <div className="form-grid three-balance">
                            <label className="field">
                              <span>Deal title</span>
                              <input
                                className="input"
                                value={deal.title}
                                onChange={(e) => updateDeal(deal.id, 'title', e.target.value)}
                                disabled={!editing}
                              />
                            </label>
                            <label className="field">
                              <span>Stage</span>
                              <select
                                className="input"
                                value={deal.stage}
                                onChange={(e) => updateDeal(deal.id, 'stage', e.target.value)}
                                disabled={!editing}
                              >
                                <option>Lead</option>
                                <option>Qualified</option>
                                <option>Proposal</option>
                                <option>Negotiation</option>
                                <option>Won</option>
                                <option>Lost</option>
                              </select>
                            </label>
                            <label className="field">
                              <span>Value</span>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                value={deal.value}
                                onChange={(e) => updateDeal(deal.id, 'value', Number(e.target.value))}
                                disabled={!editing}
                              />
                            </label>
                            <label className="field">
                              <span>Target close date</span>
                              <input
                                className="input"
                                type="date"
                                value={deal.closeDate}
                                onChange={(e) => updateDeal(deal.id, 'closeDate', e.target.value)}
                                disabled={!editing}
                              />
                            </label>
                            <label className="field">
                              <span>Owner</span>
                              <input
                                className="input"
                                value={deal.owner}
                                onChange={(e) => updateDeal(deal.id, 'owner', e.target.value)}
                                disabled={!editing}
                              />
                            </label>
                            <div className="crm-inline-stat">
                              <span>Deal value</span>
                              <strong>{fmtCurrency(num(deal.value))}</strong>
                            </div>
                          </div>

                          <label className="field">
                            <span>Notes</span>
                            <textarea
                              className="input textarea"
                              value={deal.notes}
                              onChange={(e) => updateDeal(deal.id, 'notes', e.target.value)}
                              disabled={!editing}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="feature-card" id="client-invoices">
                    <div className="feature-top">
                      <div>
                        <h3>Invoices and billing exports</h3>
                        <p>Create invoice drafts inside the client record and export them as printable PDF documents.</p>
                      </div>
                      {editing ? (
                        <button
                          className="button button-secondary"
                          onClick={() =>
                            updateData('invoices', [
                              ...form.data.invoices,
                              blankInvoice(form.data.invoices.length, form.data.paymentTermsDays)
                            ])
                          }
                        >
                          Add invoice
                        </button>
                      ) : null}
                    </div>

                    <div className="stack gap-12">
                      <div className="mini-grid">
                        <div className="mini-box">
                          <span>Outstanding</span>
                          <strong>{fmtCurrency(outstandingInvoiceValue)}</strong>
                        </div>
                        <div className="mini-box">
                          <span>Overdue</span>
                          <strong>
                            {invoiceSnapshot.overdueCount
                              ? `${invoiceSnapshot.overdueCount} • ${fmtCurrency(invoiceSnapshot.overdueValue)}`
                              : 'None'}
                          </strong>
                        </div>
                        <div className="mini-box">
                          <span>Paid to date</span>
                          <strong>{fmtCurrency(invoiceSnapshot.paidValue)}</strong>
                        </div>
                      </div>

                      {form.data.invoices.length === 0 ? (
                        <div className="dashboard-empty">No invoices drafted yet.</div>
                      ) : null}

                      {form.data.invoices.map((invoice) => (
                        <div className="repeat-card invoice-card" key={invoice.id}>
                          <div className="invoice-card-top">
                            <div>
                              <strong>{invoice.number || 'Draft invoice'}</strong>
                              <div className="saved-meta">
                                {invoice.title || 'Consultancy services'} • {fmtCurrency(invoiceTotal(invoice))}
                              </div>
                            </div>
                            <div className="invoice-card-actions">
                              <span className={invoiceTone(invoice.status)}>{invoice.status}</span>
                              <button
                                className="button button-ghost"
                                onClick={() => exportInvoicePdf(invoice)}
                              >
                                PDF
                              </button>
                            </div>
                          </div>

                          <div className="form-grid three-balance">
                            <label className="field">
                              <span>Invoice number</span>
                              <input
                                className="input"
                                value={invoice.number}
                                onChange={(e) => updateInvoice(invoice.id, 'number', e.target.value)}
                                disabled={!editing}
                              />
                            </label>
                            <label className="field">
                              <span>Issue date</span>
                              <input
                                className="input"
                                type="date"
                                value={invoice.issueDate}
                                onChange={(e) => updateInvoice(invoice.id, 'issueDate', e.target.value)}
                                disabled={!editing}
                              />
                            </label>
                            <label className="field">
                              <span>Due date</span>
                              <input
                                className="input"
                                type="date"
                                value={invoice.dueDate}
                                onChange={(e) => updateInvoice(invoice.id, 'dueDate', e.target.value)}
                                disabled={!editing}
                              />
                            </label>
                            <label className="field">
                              <span>Invoice title</span>
                              <input
                                className="input"
                                value={invoice.title}
                                onChange={(e) => updateInvoice(invoice.id, 'title', e.target.value)}
                                disabled={!editing}
                              />
                            </label>
                            <label className="field">
                              <span>Status</span>
                              <select
                                className="input"
                                value={invoice.status}
                                onChange={(e) =>
                                  updateInvoice(
                                    invoice.id,
                                    'status',
                                    e.target.value as ClientInvoice['status']
                                  )
                                }
                                disabled={!editing}
                              >
                                <option>Draft</option>
                                <option>Sent</option>
                                <option>Paid</option>
                                <option>Overdue</option>
                                <option>Cancelled</option>
                              </select>
                            </label>
                            <div className="crm-inline-stat">
                              <span>Total due</span>
                              <strong>{fmtCurrency(invoiceTotal(invoice))}</strong>
                            </div>
                          </div>

                          <label className="field">
                            <span>Invoice notes</span>
                            <textarea
                              className="input textarea"
                              value={invoice.notes}
                              onChange={(e) => updateInvoice(invoice.id, 'notes', e.target.value)}
                              disabled={!editing}
                            />
                          </label>

                          <div className="stack gap-12">
                            {invoice.lines.map((line) => (
                              <div className="invoice-line-grid" key={line.id}>
                                <label className="field">
                                  <span>Description</span>
                                  <input
                                    className="input"
                                    value={line.description}
                                    onChange={(e) =>
                                      updateInvoiceLine(invoice.id, line.id, 'description', e.target.value)
                                    }
                                    disabled={!editing}
                                  />
                                </label>
                                <label className="field">
                                  <span>Qty</span>
                                  <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    value={line.quantity}
                                    onChange={(e) =>
                                      updateInvoiceLine(invoice.id, line.id, 'quantity', Number(e.target.value))
                                    }
                                    disabled={!editing}
                                  />
                                </label>
                                <label className="field">
                                  <span>Unit price</span>
                                  <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    value={line.unitPrice}
                                    onChange={(e) =>
                                      updateInvoiceLine(invoice.id, line.id, 'unitPrice', Number(e.target.value))
                                    }
                                    disabled={!editing}
                                  />
                                </label>
                                <div className="crm-inline-stat">
                                  <span>Line total</span>
                                  <strong>{fmtCurrency(num(line.quantity) * num(line.unitPrice))}</strong>
                                </div>
                                {editing ? (
                                  <button
                                    className="button button-ghost danger-text self-end"
                                    onClick={() => removeInvoiceLine(invoice.id, line.id)}
                                  >
                                    Remove line
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>

                          {editing ? (
                            <div className="saved-actions">
                              <button
                                className="button button-secondary"
                                onClick={() => addInvoiceLine(invoice.id)}
                              >
                                Add line
                              </button>
                              <button
                                className="button button-ghost danger-text"
                                onClick={() => removeInvoice(invoice.id)}
                              >
                                Delete invoice
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              ) : null}

              {activeSection === 'strategy' ? (
                <article className="feature-card">
                  <div className="client-inline-summary">
                    <div className="client-inline-summary-item">
                      <span>Status</span>
                      <strong>{form.status}</strong>
                    </div>
                    <div className="client-inline-summary-item">
                      <span>Tier</span>
                      <strong>{form.tier}</strong>
                    </div>
                    <div className="client-inline-summary-item">
                      <span>Last updated</span>
                      <strong>{formatShortDate(form.updatedAt)}</strong>
                    </div>
                  </div>

                  <div className="feature-top">
                    <div>
                      <h3>Goals, risks and opportunities</h3>
                      <p>This turns the client profile into a real account strategy view.</p>
                    </div>
                  </div>

                  <div className="form-grid two-columns">
                    <label className="field">
                      <span>Goals</span>
                      <textarea
                        className="input textarea"
                        value={joinLines(form.data.goals)}
                        onChange={(e) => updateData('goals', splitLines(e.target.value))}
                        disabled={!editing}
                      />
                    </label>
                    <label className="field">
                      <span>Risks</span>
                      <textarea
                        className="input textarea"
                        value={joinLines(form.data.risks)}
                        onChange={(e) => updateData('risks', splitLines(e.target.value))}
                        disabled={!editing}
                      />
                    </label>
                    <label className="field">
                      <span>Opportunities</span>
                      <textarea
                        className="input textarea"
                        value={joinLines(form.data.opportunities)}
                        onChange={(e) => updateData('opportunities', splitLines(e.target.value))}
                        disabled={!editing}
                      />
                    </label>
                    <label className="field">
                      <span>Internal notes</span>
                      <textarea
                        className="input textarea"
                        value={form.data.internalNotes}
                        onChange={(e) => updateData('internalNotes', e.target.value)}
                        disabled={!editing}
                      />
                    </label>
                  </div>
                </article>
              ) : null}

              {activeSection === 'activity' ? (
                <div className="section-stack">
                  <article className="feature-card">
                    <div className="feature-top">
                      <div>
                        <h3>Timeline</h3>
                        <p>A live history of visits, reviews, calls, milestones and notes.</p>
                      </div>
                      {editing ? (
                        <button
                          className="button button-secondary"
                          onClick={() => updateData('timeline', [...form.data.timeline, blankTimeline()])}
                        >
                          Add event
                        </button>
                      ) : null}
                    </div>

                    <div className="stack gap-12">
                      {form.data.timeline.length === 0 ? (
                        <div className="dashboard-empty">No timeline items recorded yet.</div>
                      ) : null}

                      {form.data.timeline.map((item) => (
                        <div className="repeat-card" key={item.id}>
                          <div className="form-grid two-columns">
                            <label className="field">
                              <span>Date</span>
                              <input
                                className="input"
                                type="date"
                                value={item.date}
                                onChange={(e) => updateTimeline(item.id, 'date', e.target.value)}
                                disabled={!editing}
                              />
                            </label>
                            <label className="field">
                              <span>Type</span>
                              <select
                                className="input"
                                value={item.type}
                                onChange={(e) => updateTimeline(item.id, 'type', e.target.value)}
                                disabled={!editing}
                              >
                                <option>Visit</option>
                                <option>Audit</option>
                                <option>Menu Review</option>
                                <option>Call</option>
                                <option>Email</option>
                                <option>Task</option>
                                <option>Note</option>
                              </select>
                            </label>
                          </div>
                          <label className="field">
                            <span>Title</span>
                            <input
                              className="input"
                              value={item.title}
                              onChange={(e) => updateTimeline(item.id, 'title', e.target.value)}
                              disabled={!editing}
                            />
                          </label>
                          <label className="field">
                            <span>Summary</span>
                            <textarea
                              className="input textarea"
                              value={item.summary}
                              onChange={(e) => updateTimeline(item.id, 'summary', e.target.value)}
                              disabled={!editing}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="feature-card">
                    <div className="feature-top">
                      <div>
                        <h3>Tasks and follow-up</h3>
                        <p>Keep recommendations and revisit actions visible.</p>
                      </div>
                      {editing ? (
                        <button
                          className="button button-secondary"
                          onClick={() => updateData('tasks', [...form.data.tasks, blankTask()])}
                        >
                          Add task
                        </button>
                      ) : null}
                    </div>

                    <div className="stack gap-12">
                      {form.data.tasks.length === 0 ? (
                        <div className="dashboard-empty">No tasks recorded yet.</div>
                      ) : null}

                      {form.data.tasks.map((task) => (
                        <div className="repeat-card" key={task.id}>
                          <div className="form-grid two-columns">
                            <label className="field">
                              <span>Task</span>
                              <input
                                className="input"
                                value={task.title}
                                onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                                disabled={!editing}
                              />
                            </label>
                            <label className="field">
                              <span>Owner</span>
                              <input
                                className="input"
                                value={task.owner}
                                onChange={(e) => updateTask(task.id, 'owner', e.target.value)}
                                disabled={!editing}
                              />
                            </label>
                            <label className="field">
                              <span>Due date</span>
                              <input
                                className="input"
                                type="date"
                                value={task.dueDate}
                                onChange={(e) => updateTask(task.id, 'dueDate', e.target.value)}
                                disabled={!editing}
                              />
                            </label>
                            <label className="field">
                              <span>Status</span>
                              <select
                                className="input"
                                value={task.status}
                                onChange={(e) => updateTask(task.id, 'status', e.target.value)}
                                disabled={!editing}
                              >
                                <option>Open</option>
                                <option>In Progress</option>
                                <option>Done</option>
                              </select>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>

                  <section className="workspace-grid client-workspace">
                    <div className="workspace-main section-stack">
                      <div className="panel">
                        <div className="panel-header">
                          <div>
                            <h3>Account snapshot</h3>
                            <p className="muted-copy">
                              A quick relationship view before you dive into linked work.
                            </p>
                          </div>
                        </div>
                        <div className="panel-body stack gap-12">
                          <div className="client-summary-list">
                            <div className="client-summary-row">
                              <span>Primary contact</span>
                              <strong>{form.contactName || primaryContact?.name || 'Not set'}</strong>
                            </div>
                            <div className="client-summary-row">
                              <span>Email</span>
                              <strong>{form.contactEmail || primaryContact?.email || 'Not set'}</strong>
                            </div>
                            <div className="client-summary-row">
                              <span>Website</span>
                              <strong>{form.website || 'Not set'}</strong>
                            </div>
                            <div className="client-summary-row">
                              <span>Next review</span>
                              <strong>{reviewLabel(form.nextReviewDate)}</strong>
                            </div>
                            <div className="client-summary-row">
                              <span>Review status</span>
                              <strong>
                                {nextReviewState === null
                                  ? 'Review date missing'
                                  : nextReviewState < 0
                                    ? 'Attention needed'
                                    : nextReviewState <= 14
                                      ? 'Coming up soon'
                                      : 'On track'}
                              </strong>
                            </div>
                            <div className="client-summary-row">
                              <span>Account owner</span>
                              <strong>{form.data.accountOwner || 'Not set'}</strong>
                            </div>
                            <div className="client-summary-row">
                              <span>Pipeline value</span>
                              <strong>{fmtCurrency(pipelineValue)}</strong>
                            </div>
                            <div className="client-summary-row">
                              <span>Outstanding invoices</span>
                              <strong>{fmtCurrency(outstandingInvoiceValue)}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <aside className="workspace-side section-stack">
                      <div className="panel">
                        <div className="panel-header">
                          <div>
                            <h3>Linked audits</h3>
                            <p className="muted-copy">Operational reviews already connected to this account.</p>
                          </div>
                        </div>
                        <div className="panel-body stack gap-12">
                          {audits.length === 0 ? <div className="muted-copy">No audits yet.</div> : null}
                          {audits.map((audit) => (
                            <div className="saved-item saved-item-rich" key={audit.id}>
                              <div>
                                <strong>{audit.title}</strong>
                                <div className="saved-meta">
                                  {formatShortDate(audit.review_date || audit.updated_at)}
                                </div>
                              </div>
                              <Link className="button button-ghost" to={`/audit?client=${client.id}&load=${audit.id}`}>
                                Open
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="panel">
                        <div className="panel-header">
                          <div>
                            <h3>Linked menu projects</h3>
                            <p className="muted-copy">Commercial menu work already attached to this business record.</p>
                          </div>
                        </div>
                        <div className="panel-body stack gap-12">
                          {menus.length === 0 ? <div className="muted-copy">No menu projects yet.</div> : null}
                          {menus.map((menu) => (
                            <div className="saved-item saved-item-rich" key={menu.id}>
                              <div>
                                <strong>{menu.title}</strong>
                                <div className="saved-meta">
                                  {formatShortDate(menu.review_date || menu.updated_at)}
                                </div>
                              </div>
                              <Link className="button button-ghost" to={`/menu?client=${client.id}&load=${menu.id}`}>
                                Open
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    </aside>
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

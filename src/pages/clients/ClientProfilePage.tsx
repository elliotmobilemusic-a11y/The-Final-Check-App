import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useActivityOverlay } from '../../context/ActivityOverlayContext';
import { useAuth } from '../../context/AuthContext';
import { buildInvoicePdfHtml, invoiceTotal, openPrintableHtmlDocument } from '../../features/clients/clientExports';
import { clientRecordToProfile } from '../../features/clients/clientData';
import {
  getBusinessProfile,
  searchBusinessProfiles,
  type BusinessLookupProfile,
  type BusinessLookupResult
} from '../../features/clients/businessLookup';
import { createInvoiceDraftFromQuote } from '../../features/quotes/invoices';
import { ClientProfileHeader } from '../../components/clients/profile/ClientProfileHeader';
import {
  ClientProfileTabNav,
  type ClientProfileTabKey
} from '../../components/clients/profile/ClientProfileTabNav';
import { ClientInformationTab } from '../../components/clients/profile/ClientInformationTab';
import { ClientWorkTab, type ClientWorkItem } from '../../components/clients/profile/ClientWorkTab';
import {
  ClientPortalTab,
  type ClientPortalCategoryControl,
  type ClientPortalSharedItem
} from '../../components/clients/profile/ClientPortalTab';
import { ClientPricingTab } from '../../components/clients/profile/ClientPricingTab';
import { getClientById, updateClient } from '../../services/clients';
import { listAudits, saveAudit } from '../../services/audits';
import { listMenuProjects, saveMenuProject } from '../../services/menus';
import {
  listLocalToolRecordsForClient,
  saveLocalToolRecord
} from '../../services/localToolStore';
import {
  createClientPortalShare,
  createFoodSafetyShare,
  createKitchenAuditShare,
  createMenuShare,
  createMysteryShopShare
} from '../../services/reportShares';
import { clearDraft, readDraft, writeDraft } from '../../services/draftStore';
import type {
  AuditFormState,
  ClientContact,
  ClientInvoice,
  ClientInvoiceLine,
  ClientPortalResource,
  ClientPortalSettings,
  ClientPortalSharePayload,
  ClientProfile,
  ClientProfileData,
  ClientQuote,
  ClientSite,
  FoodSafetyAuditState,
  LocalToolRecord,
  MenuProjectState,
  MysteryShopAuditState,
  QuoteLineItem,
  SupabaseRecord
} from '../../types';
import { fmtCurrency, todayIso, uid } from '../../lib/utils';

type LookupScopeFilter = 'group' | 'site' | 'all';

const FOOD_SAFETY_STORAGE_KEY = 'the-final-check-food-safety-audits-v1';
const MYSTERY_SHOP_STORAGE_KEY = 'the-final-check-mystery-shop-audits-v1';

function clientDraftKey(clientId: string) {
  return `client-profile-draft-${clientId}`;
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not set';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

function hasOutstandingInvoices(profile: ClientProfile) {
  return profile.data.invoices.some(
    (invoice) => invoice.status !== 'Paid' && invoice.status !== 'Cancelled'
  );
}

function buildInvoiceNumber(existingCount: number) {
  return `INV-${new Date().getFullYear()}-${String(existingCount + 1).padStart(3, '0')}`;
}

function blankContact(): ClientContact {
  return {
    id: uid('contact'),
    name: '',
    role: '',
    email: '',
    phone: '',
    category: 'General',
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
    managerName: '',
    status: 'Active',
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
    lines: [blankInvoiceLine()],
    taxEnabled: false,
    taxRate: 20,
    paymentTermsDays
  };
}

function deriveUserDisplayName(email?: string | null) {
  if (!email) return 'The Final Check';
  return email.split('@')[0].replace(/[._-]+/g, ' ');
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
        managerName: '',
        status: site.status || 'Active',
        notes: site.notes || 'Imported from business lookup.'
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
      leadSource: current.data.leadSource || lookup.sourceLabel || 'Companies House lookup'
    }
  };
}

function getActiveTab(section?: string): ClientProfileTabKey {
  if (
    section === 'information' ||
    section === 'profile' ||
    section === 'contacts' ||
    section === 'sites' ||
    section === 'strategy'
  ) {
    return 'information';
  }

  if (section === 'services' || section === 'activity') return 'services';
  if (section === 'portal') return 'portal';
  if (section === 'pricing' || section === 'commercial') return 'pricing';
  return 'information';
}

function workstreamSiteLabel(
  record: { client_site_id?: string | null; site_name?: string | null },
  siteNameById: Map<string, string>
) {
  if (record.client_site_id) {
    return siteNameById.get(record.client_site_id) || record.site_name || 'Linked site';
  }

  return record.site_name || 'Account level';
}

function cloneQuoteLineItem(line: QuoteLineItem): QuoteLineItem {
  return {
    ...line,
    id: uid('quote-line')
  };
}

function createQuoteHistoryEntry(
  quote: ClientQuote,
  actor: string,
  note: string
) {
  return {
    id: uid('quote-history'),
    action: 'created' as const,
    actor,
    at: new Date().toISOString(),
    previousTotal: null,
    nextTotal: quote.calculation.finalTotal,
    manualOverrideUsed: quote.calculation.overrideTotal !== null,
    addedLineLabels: quote.lineItems.map((line) => line.label),
    removedLineLabels: [],
    note
  };
}

export function ClientProfilePage() {
  const { clientId = '', section } = useParams();
  const navigate = useNavigate();
  const { runWithActivity } = useActivityOverlay();
  const { session } = useAuth();

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [form, setForm] = useState<ClientProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('Client loaded.');
  const [saving, setSaving] = useState(false);
  const [publishingPortal, setPublishingPortal] = useState(false);
  const [audits, setAudits] = useState<SupabaseRecord<AuditFormState>[]>([]);
  const [foodSafetyAudits, setFoodSafetyAudits] = useState<LocalToolRecord<FoodSafetyAuditState>[]>(
    []
  );
  const [mysteryShopAudits, setMysteryShopAudits] = useState<
    LocalToolRecord<MysteryShopAuditState>[]
  >([]);
  const [menus, setMenus] = useState<SupabaseRecord<MenuProjectState>[]>([]);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<BusinessLookupResult[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupScope, setLookupScope] = useState<LookupScopeFilter>('group');
  const [lookupMessage, setLookupMessage] = useState(
    'Refresh the business record from the best matched public company profile.'
  );
  const [lookupSelectionId, setLookupSelectionId] = useState('');
  const [requestNewQuoteToken, setRequestNewQuoteToken] = useState(0);
  const [externalQuoteToEditId, setExternalQuoteToEditId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [clientRow, auditRows, menuRows] = await Promise.all([
        getClientById(clientId),
        listAudits(clientId),
        listMenuProjects(clientId)
      ]);

      if (!clientRow) return;

      const profile = clientRecordToProfile(clientRow);
      const draft = readDraft<ClientProfile>(clientDraftKey(clientId));
      const nextForm = draft ?? profile;

      setClient(profile);
      setForm(nextForm);
      setAudits(auditRows);
      setMenus(menuRows);
      setFoodSafetyAudits(
        listLocalToolRecordsForClient<FoodSafetyAuditState>(FOOD_SAFETY_STORAGE_KEY, clientId)
      );
      setMysteryShopAudits(
        listLocalToolRecordsForClient<MysteryShopAuditState>(MYSTERY_SHOP_STORAGE_KEY, clientId)
      );
      setSelectedInvoiceId(nextForm.data.invoices[0]?.id ?? null);
      if (draft) {
        setEditing(true);
        setMessage('Restored the unsaved client draft.');
      }
    }

    if (!clientId) return;

    void load().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Could not load client.');
    });
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !form || !editing) return;
    writeDraft(clientDraftKey(clientId), form);
  }, [clientId, editing, form]);

  const activeTab = getActiveTab(section);

  const currentUserName =
    (typeof session?.user.user_metadata?.display_name === 'string'
      ? session.user.user_metadata.display_name
      : '') ||
    deriveUserDisplayName(session?.user.email) ||
    form?.data.accountOwner ||
    'The Final Check';

  const siteNameById = useMemo(
    () => new Map((form?.data.sites ?? []).map((site) => [site.id, site.name || 'Unnamed site'])),
    [form?.data.sites]
  );

  const visibleLookupResults = useMemo(() => {
    if (lookupScope === 'all') return lookupResults;
    const scoped = lookupResults.filter((result) =>
      lookupScope === 'group' ? result.resultType === 'group' : result.resultType === 'site'
    );
    return scoped.length ? scoped : lookupResults;
  }, [lookupResults, lookupScope]);

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

  const loadedClient = client;
  const activeForm = form;

  const portalLink = activeForm.data.portal.token
    ? `${window.location.origin}/#/portal/client/${activeForm.data.portal.token}`
    : '';
  const mainContact =
    activeForm.data.contacts.find((contact) => contact.isPrimary) ?? activeForm.data.contacts[0];
  const siteCount = activeForm.data.sites.length || activeForm.data.siteCountEstimate || 0;
  const outstandingBalance = activeForm.data.invoices
    .filter((invoice) => invoice.status !== 'Paid' && invoice.status !== 'Cancelled')
    .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);

  function updateField<K extends keyof ClientProfile>(key: K, value: ClientProfile[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateData<K extends keyof ClientProfileData>(key: K, value: ClientProfileData[K]) {
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

  function replacePortal(nextPortal: ClientPortalSettings) {
    updateData('portal', nextPortal);
  }

  function updatePortalField<K extends keyof ClientPortalSettings>(
    key: K,
    value: ClientPortalSettings[K]
  ) {
    replacePortal({
      ...activeForm.data.portal,
      [key]: value
    });
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

  function addContact() {
    setEditing(true);
    setForm((current) =>
      current
        ? {
            ...current,
            data: {
              ...current.data,
              contacts: [...current.data.contacts, blankContact()]
            }
          }
        : current
    );
  }

  function removeContact(id: string) {
    setForm((current) =>
      current
        ? {
            ...current,
            data: {
              ...current.data,
              contacts: current.data.contacts.filter((item) => item.id !== id)
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

  function addSite() {
    setEditing(true);
    setForm((current) =>
      current
        ? {
            ...current,
            data: {
              ...current.data,
              sites: [...current.data.sites, blankSite()]
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

  function updateInvoiceField(
    invoiceId: string,
    key: keyof Omit<ClientInvoice, 'lines'>,
    value: string | number | boolean | null
  ) {
    setForm((current) =>
      current
        ? {
            ...current,
            data: {
              ...current.data,
              invoices: current.data.invoices.map((invoice) =>
                invoice.id === invoiceId ? { ...invoice, [key]: value } : invoice
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

  async function persistClientProfile(
    nextProfile: ClientProfile,
    options: {
      successMessage: string;
      activity: {
        kicker: string;
        title: string;
        detail: string;
      };
    }
  ) {
    if (!loadedClient.id) throw new Error('Client not found.');

    const updated = await runWithActivity(options.activity, async () =>
      updateClient(loadedClient.id as string, nextProfile)
    );
    const next = clientRecordToProfile(updated);
    clearDraft(clientDraftKey(loadedClient.id as string));
    setClient(next);
    setForm(next);
    setEditing(false);
    setSelectedInvoiceId(next.data.invoices[0]?.id ?? null);
    setMessage(options.successMessage);
    return next;
  }

  async function handleSave() {
    if (!form) return;

    try {
      setSaving(true);
      await persistClientProfile(form, {
        successMessage: 'Client profile updated.',
        activity: {
          kicker: 'Client profile',
          title: 'Saving client record',
          detail: 'Updating the client, notes, portal settings, and billing details.'
        }
      });
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
          ? `Found ${results.length} possible matches.`
          : 'No matching business records found.'
      );
    } catch (error) {
      setLookupResults([]);
      setLookupMessage(error instanceof Error ? error.message : 'Business lookup failed.');
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleUseLookup(result: BusinessLookupResult) {
    try {
      setLookupLoading(true);
      setLookupSelectionId(result.id);
      const profile = await getBusinessProfile(result);
      setForm((current) => (current ? mergeLookupIntoClient(current, profile) : current));
      setEditing(true);
      setMessage(`Loaded business details for ${profile.name}.`);
    } catch (error) {
      setLookupMessage(error instanceof Error ? error.message : 'Could not load business details.');
    } finally {
      setLookupLoading(false);
    }
  }

  function toggleEditing() {
    if (editing) {
      clearDraft(clientDraftKey(clientId));
      setForm(loadedClient);
      setEditing(false);
      setMessage('Edit mode closed.');
      return;
    }

    setEditing(true);
    setMessage('Edit mode enabled.');
  }

  function openPricingTab() {
    navigate(`/clients/${clientId}/pricing`);
  }

  function handleRequestNewQuote() {
    openPricingTab();
    setExternalQuoteToEditId(null);
    setRequestNewQuoteToken(Date.now());
  }

  function handleRequestNewInvoice(line?: Partial<ClientInvoiceLine>, title?: string) {
    const nextInvoice = blankInvoice(activeForm.data.invoices.length, activeForm.data.paymentTermsDays);
    if (line) {
      nextInvoice.lines = [
        {
          ...blankInvoiceLine(),
          ...line
        }
      ];
    }
    if (title) {
      nextInvoice.title = title;
    }

    setEditing(true);
    setForm((current) =>
      current
        ? {
            ...current,
            data: {
              ...current.data,
              invoices: [nextInvoice, ...current.data.invoices]
            }
          }
        : current
    );
    setSelectedInvoiceId(nextInvoice.id);
    openPricingTab();
    setMessage('New invoice draft added. Save changes to keep it.');
  }

  function handleOpenPortal() {
    if (portalLink) {
      window.open(portalLink, '_blank', 'noopener,noreferrer');
      return;
    }

    navigate(`/clients/${clientId}/portal`);
  }

  function setPortalListVisibility(
    key:
      | 'hiddenAuditIds'
      | 'hiddenFoodSafetyIds'
      | 'hiddenMysteryShopIds'
      | 'hiddenMenuIds'
      | 'hiddenQuoteIds'
      | 'hiddenInvoiceIds',
    ids: string[],
    visible: boolean
  ) {
    const hidden = new Set(activeForm.data.portal[key]);

    ids.forEach((id) => {
      if (visible) hidden.delete(id);
      else hidden.add(id);
    });

    updatePortalField(key, [...hidden]);
  }

  function handleToggleSharedItem(resourceId: string, visible: boolean) {
    const [kind, entityId] = resourceId.split(':');
    if (!entityId) return;

    setEditing(true);
    if (kind === 'audit') setPortalListVisibility('hiddenAuditIds', [entityId], visible);
    if (kind === 'food-safety') setPortalListVisibility('hiddenFoodSafetyIds', [entityId], visible);
    if (kind === 'mystery-shop') setPortalListVisibility('hiddenMysteryShopIds', [entityId], visible);
    if (kind === 'menu') setPortalListVisibility('hiddenMenuIds', [entityId], visible);
    if (kind === 'quote') setPortalListVisibility('hiddenQuoteIds', [entityId], visible);
    if (kind === 'invoice') setPortalListVisibility('hiddenInvoiceIds', [entityId], visible);
  }

  function handleTogglePortalCategory(key: string, enabled: boolean) {
    setEditing(true);

    if (key === 'audits') setPortalListVisibility('hiddenAuditIds', audits.map((audit) => audit.id), enabled);
    if (key === 'foodSafety') {
      setPortalListVisibility(
        'hiddenFoodSafetyIds',
        foodSafetyAudits.map((audit) => audit.id),
        enabled
      );
    }
    if (key === 'mysteryShops') {
      setPortalListVisibility(
        'hiddenMysteryShopIds',
        mysteryShopAudits.map((audit) => audit.id),
        enabled
      );
    }
    if (key === 'menuProjects') setPortalListVisibility('hiddenMenuIds', menus.map((menu) => menu.id), enabled);
    if (key === 'quotes') {
      setPortalListVisibility(
        'hiddenQuoteIds',
        activeForm.data.quotes.map((quote) => quote.quoteId),
        enabled
      );
    }
    if (key === 'invoices') {
      setPortalListVisibility(
        'hiddenInvoiceIds',
        activeForm.data.invoices.map((invoice) => invoice.id),
        enabled
      );
    }
    if (key === 'reports') updatePortalField('showReports', enabled);
    if (key === 'actionPlans') updatePortalField('showActionPlans', enabled);
  }

  async function handlePublishPortal() {
    try {
      setPublishingPortal(true);

      await runWithActivity(
        {
          kicker: 'Client portal',
          title: 'Publishing client portal',
          detail: 'Rebuilding the released client portal with the latest visibility settings.'
        },
        async () => {
          const paymentLockActive =
            activeForm.data.portal.visibilityMode === 'paid_only' && hasOutstandingInvoices(activeForm);

          const visibleAudits = audits.filter(
            (audit) => !activeForm.data.portal.hiddenAuditIds.includes(audit.id)
          );
          const visibleFoodSafetyAudits = foodSafetyAudits.filter(
            (audit) => !activeForm.data.portal.hiddenFoodSafetyIds.includes(audit.id)
          );
          const visibleMysteryShopAudits = mysteryShopAudits.filter(
            (audit) => !activeForm.data.portal.hiddenMysteryShopIds.includes(audit.id)
          );
          const visibleMenus = menus.filter(
            (menu) => !activeForm.data.portal.hiddenMenuIds.includes(menu.id)
          );
          const visibleQuotes = activeForm.data.quotes.filter(
            (quote) => !activeForm.data.portal.hiddenQuoteIds.includes(quote.quoteId)
          );
          const visibleInvoices = activeForm.data.invoices.filter(
            (invoice) => !activeForm.data.portal.hiddenInvoiceIds.includes(invoice.id)
          );

          const auditResources = await Promise.all(
            visibleAudits.map(async (audit) => {
              const locked = paymentLockActive;
              const share = locked
                ? null
                : await createKitchenAuditShare({
                    ...audit.data,
                    id: audit.id
                  });

              return {
                id: `audit:${audit.id}`,
                title: audit.title,
                kind: 'audit' as const,
                subtitle: workstreamSiteLabel(audit, siteNameById),
                reviewDate: audit.review_date,
                url: share?.url ?? null,
                shareToken: share?.token ?? null,
                sharePath: '/share/kitchen-audit',
                locked,
                lockReason: locked ? 'This audit will unlock once the account is paid.' : ''
              };
            })
          );

          const foodSafetyResources = await Promise.all(
            visibleFoodSafetyAudits.map(async (audit) => {
              const locked = paymentLockActive;
              const share = locked
                ? null
                : await createFoodSafetyShare({
                    ...audit.data,
                    id: audit.id
                  });

              return {
                id: `food-safety:${audit.id}`,
                title: audit.title,
                kind: 'food_safety' as const,
                subtitle: audit.siteName || 'Linked site',
                reviewDate: audit.reviewDate,
                url: share?.url ?? null,
                shareToken: share?.token ?? null,
                sharePath: '/share/food-safety',
                locked,
                lockReason: locked ? 'This report will unlock once the account is paid.' : ''
              };
            })
          );

          const mysteryResources = await Promise.all(
            visibleMysteryShopAudits.map(async (audit) => {
              const locked = paymentLockActive;
              const share = locked
                ? null
                : await createMysteryShopShare({
                    ...audit.data,
                    id: audit.id
                  });

              return {
                id: `mystery-shop:${audit.id}`,
                title: audit.title,
                kind: 'mystery_shop' as const,
                subtitle: audit.siteName || 'Linked site',
                reviewDate: audit.reviewDate,
                url: share?.url ?? null,
                shareToken: share?.token ?? null,
                sharePath: '/share/mystery-shop',
                locked,
                lockReason: locked ? 'This report will unlock once the account is paid.' : ''
              };
            })
          );

          const menuResources = await Promise.all(
            visibleMenus.map(async (menu) => {
              const locked = paymentLockActive;
              const share = locked
                ? null
                : await createMenuShare({
                    ...menu.data,
                    id: menu.id
                  });

              return {
                id: `menu:${menu.id}`,
                title: menu.title,
                kind: 'menu' as const,
                subtitle: workstreamSiteLabel(menu, siteNameById),
                reviewDate: menu.review_date,
                url: share?.url ?? null,
                shareToken: share?.token ?? null,
                sharePath: '/share/menu',
                locked,
                lockReason: locked ? 'This resource will unlock once the account is paid.' : ''
              };
            })
          );

          const quoteResources: ClientPortalResource[] = visibleQuotes.map((quote) => ({
            id: `quote:${quote.quoteId}`,
            title: quote.quoteTitle,
            kind: 'quote',
            subtitle:
              quote.renderedSummary.externalPriceLabel ||
              (quote.calculation.finalPriceHidden
                ? 'Custom quote'
                : fmtCurrency(quote.calculation.totalWithTax || quote.calculation.finalTotal)),
            reviewDate: quote.updatedAt,
            url: null,
            locked: paymentLockActive,
            lockReason: paymentLockActive ? 'This quote is hidden until the account is paid.' : ''
          }));

          const invoiceResources: ClientPortalResource[] = visibleInvoices.map((invoice) => ({
            id: `invoice:${invoice.id}`,
            title: invoice.title || invoice.number,
            kind: 'invoice',
            subtitle: `${invoice.number} • ${fmtCurrency(invoiceTotal(invoice))}`,
            reviewDate: invoice.issueDate,
            url: null,
            locked: paymentLockActive,
            lockReason: paymentLockActive ? 'This invoice is hidden until the account is paid.' : ''
          }));

          const payload: ClientPortalSharePayload = {
            clientId: activeForm.id ?? clientId,
            clientName: activeForm.companyName,
            status: activeForm.status,
            industry: activeForm.industry,
            location: activeForm.location,
            logoUrl: activeForm.logoUrl,
            coverUrl: activeForm.coverUrl,
            nextReviewDate: activeForm.nextReviewDate,
            welcomeTitle:
              activeForm.data.portal.welcomeTitle.trim() ||
              `Welcome to ${activeForm.companyName || 'your'} portal`,
            welcomeMessage:
              activeForm.data.portal.welcomeMessage.trim() ||
              'Your latest work, commercial records, and shared notes will appear here.',
            portalNote: activeForm.data.portal.portalNote,
            visibilityMode: activeForm.data.portal.visibilityMode,
            hasOutstandingInvoices: hasOutstandingInvoices(activeForm),
            outstandingInvoiceValue: activeForm.data.invoices
              .filter((invoice) => invoice.status !== 'Paid' && invoice.status !== 'Cancelled')
              .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
            paidInvoiceValue: activeForm.data.invoices
              .filter((invoice) => invoice.status === 'Paid')
              .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
            openTaskCount: 0,
            tasks: [],
            resources: [
              ...auditResources,
              ...foodSafetyResources,
              ...mysteryResources,
              ...menuResources,
              ...quoteResources,
              ...invoiceResources
            ].sort((left, right) => (right.reviewDate || '').localeCompare(left.reviewDate || '')),
            publishedAt: new Date().toISOString()
          };

          const portalShare = await createClientPortalShare(clientId, payload);
          const nextProfile: ClientProfile = {
            ...activeForm,
            data: {
              ...activeForm.data,
              portal: {
                ...activeForm.data.portal,
                token: portalShare.token,
                lastPublishedAt: payload.publishedAt
              }
            }
          };

          const updated = await updateClient(clientId, nextProfile);
          const next = clientRecordToProfile(updated);
          clearDraft(clientDraftKey(clientId));
          setClient(next);
          setForm(next);
          setEditing(false);

          try {
            await navigator.clipboard.writeText(portalShare.url);
            setMessage('Client portal published and copied to the clipboard.');
          } catch {
            setMessage(`Client portal published: ${portalShare.url}`);
          }
        }
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not publish the client portal.');
    } finally {
      setPublishingPortal(false);
    }
  }

  function serviceQuoteWorkType(quote: ClientQuote): ClientWorkItem['itemType'] | null {
    if (quote.serviceType === 'trainingMentoring') return 'training';
    if (quote.serviceType === 'newOpenings') return 'newOpenings';
    if (
      quote.serviceType === 'kitchenLayout' ||
      quote.serviceType === 'procurementSupport' ||
      quote.serviceType === 'recruitmentSupport'
    ) {
      return 'other';
    }

    return null;
  }

  const workItems = useMemo<ClientWorkItem[]>(() => {
    const archivedIds = new Set(activeForm.data.archivedWorkItemIds);

    const operationalItems = audits.map((audit) => ({
      id: `audit:${audit.id}`,
      itemType: 'operationalAudit' as const,
      label: 'Operational audit',
      title: audit.title,
      site: workstreamSiteLabel(audit, siteNameById),
      status: 'Live',
      createdAt: audit.created_at,
      updatedAt: audit.updated_at,
      portalVisible: !activeForm.data.portal.hiddenAuditIds.includes(audit.id),
      valueLabel: 'Not priced here',
      archived: archivedIds.has(`audit:${audit.id}`),
      openPath: `/audit?client=${clientId}&load=${audit.id}`
    }));

    const foodSafetyItems = foodSafetyAudits.map((audit) => ({
      id: `food-safety:${audit.id}`,
      itemType: 'foodSafety' as const,
      label: 'Food safety',
      title: audit.title,
      site: audit.siteName || 'Linked site',
      status: 'Live',
      createdAt: audit.createdAt,
      updatedAt: audit.updatedAt,
      portalVisible: !activeForm.data.portal.hiddenFoodSafetyIds.includes(audit.id),
      valueLabel: 'Not priced here',
      archived: archivedIds.has(`food-safety:${audit.id}`),
      openPath: `/food-safety?client=${clientId}&load=${audit.id}`
    }));

    const mysteryItems = mysteryShopAudits.map((audit) => ({
      id: `mystery-shop:${audit.id}`,
      itemType: 'mysteryShop' as const,
      label: 'Mystery shop',
      title: audit.title,
      site: audit.siteName || 'Linked site',
      status: 'Live',
      createdAt: audit.createdAt,
      updatedAt: audit.updatedAt,
      portalVisible: !activeForm.data.portal.hiddenMysteryShopIds.includes(audit.id),
      valueLabel: 'Not priced here',
      archived: archivedIds.has(`mystery-shop:${audit.id}`),
      openPath: `/mystery-shop?client=${clientId}&load=${audit.id}`
    }));

    const menuItems = menus.map((menu) => ({
      id: `menu:${menu.id}`,
      itemType: 'menuProject' as const,
      label: 'Menu project',
      title: menu.title,
      site: workstreamSiteLabel(menu, siteNameById),
      status: 'Live',
      createdAt: menu.created_at,
      updatedAt: menu.updated_at,
      portalVisible: !activeForm.data.portal.hiddenMenuIds.includes(menu.id),
      valueLabel: 'Not priced here',
      archived: archivedIds.has(`menu:${menu.id}`),
      openPath: `/menu?client=${clientId}&load=${menu.id}`
    }));

    const serviceQuoteItems = activeForm.data.quotes.reduce<ClientWorkItem[]>((items, quote) => {
      const itemType = serviceQuoteWorkType(quote);
      if (!itemType) return items;

      items.push({
        id: `quote:${quote.quoteId}`,
        itemType,
        label: 'Service job',
        title: quote.quoteTitle,
        site: quote.location || 'Account level',
        status: quote.status,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
        portalVisible: !activeForm.data.portal.hiddenQuoteIds.includes(quote.quoteId),
        valueLabel: quote.calculation.finalPriceHidden
          ? 'Custom quote'
          : fmtCurrency(quote.calculation.totalWithTax || quote.calculation.finalTotal),
        value: quote.calculation.totalWithTax || quote.calculation.finalTotal,
        archived: Boolean(quote.archivedAt),
        openPath: `/clients/${clientId}/pricing`
      });

      return items;
    }, []);

    return [
      ...operationalItems,
      ...foodSafetyItems,
      ...mysteryItems,
      ...menuItems,
      ...serviceQuoteItems
    ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [
    activeForm.data.archivedWorkItemIds,
    activeForm.data.portal.hiddenAuditIds,
    activeForm.data.portal.hiddenFoodSafetyIds,
    activeForm.data.portal.hiddenMenuIds,
    activeForm.data.portal.hiddenMysteryShopIds,
    activeForm.data.portal.hiddenQuoteIds,
    activeForm.data.quotes,
    audits,
    clientId,
    foodSafetyAudits,
    menus,
    mysteryShopAudits,
    siteNameById
  ]);

  const sharedItems = useMemo<ClientPortalSharedItem[]>(() => {
    return [
      ...audits.map((audit) => ({
        id: `audit:${audit.id}`,
        title: audit.title,
        typeLabel: 'Operational audit',
        visible: !activeForm.data.portal.hiddenAuditIds.includes(audit.id),
        releaseDate: formatShortDate(audit.review_date || audit.updated_at)
      })),
      ...foodSafetyAudits.map((audit) => ({
        id: `food-safety:${audit.id}`,
        title: audit.title,
        typeLabel: 'Food safety',
        visible: !activeForm.data.portal.hiddenFoodSafetyIds.includes(audit.id),
        releaseDate: formatShortDate(audit.reviewDate || audit.updatedAt)
      })),
      ...mysteryShopAudits.map((audit) => ({
        id: `mystery-shop:${audit.id}`,
        title: audit.title,
        typeLabel: 'Mystery shop',
        visible: !activeForm.data.portal.hiddenMysteryShopIds.includes(audit.id),
        releaseDate: formatShortDate(audit.reviewDate || audit.updatedAt)
      })),
      ...menus.map((menu) => ({
        id: `menu:${menu.id}`,
        title: menu.title,
        typeLabel: 'Menu project',
        visible: !activeForm.data.portal.hiddenMenuIds.includes(menu.id),
        releaseDate: formatShortDate(menu.review_date || menu.updated_at)
      })),
      ...activeForm.data.quotes.map((quote) => ({
        id: `quote:${quote.quoteId}`,
        title: quote.quoteTitle,
        typeLabel: 'Quote',
        visible: !activeForm.data.portal.hiddenQuoteIds.includes(quote.quoteId),
        releaseDate: formatShortDate(quote.updatedAt)
      })),
      ...activeForm.data.invoices.map((invoice) => ({
        id: `invoice:${invoice.id}`,
        title: invoice.title || invoice.number,
        typeLabel: 'Invoice',
        visible: !activeForm.data.portal.hiddenInvoiceIds.includes(invoice.id),
        releaseDate: formatShortDate(invoice.issueDate)
      }))
    ].sort((left, right) => right.releaseDate.localeCompare(left.releaseDate));
  }, [
    activeForm.data.invoices,
    activeForm.data.portal.hiddenAuditIds,
    activeForm.data.portal.hiddenFoodSafetyIds,
    activeForm.data.portal.hiddenInvoiceIds,
    activeForm.data.portal.hiddenMenuIds,
    activeForm.data.portal.hiddenMysteryShopIds,
    activeForm.data.portal.hiddenQuoteIds,
    activeForm.data.quotes,
    audits,
    foodSafetyAudits,
    menus,
    mysteryShopAudits
  ]);

  const portalCategoryControls = useMemo<ClientPortalCategoryControl[]>(
    () => [
      {
        key: 'audits',
        label: 'Audits visible',
        description: 'Operational audits released to the portal.',
        enabled: activeForm.data.portal.hiddenAuditIds.length < audits.length,
        count: audits.length
      },
      {
        key: 'foodSafety',
        label: 'Food safety visible',
        description: 'Food safety audits released to the portal.',
        enabled: activeForm.data.portal.hiddenFoodSafetyIds.length < foodSafetyAudits.length,
        count: foodSafetyAudits.length
      },
      {
        key: 'mysteryShops',
        label: 'Mystery shops visible',
        description: 'Mystery visit reports available to the client.',
        enabled: activeForm.data.portal.hiddenMysteryShopIds.length < mysteryShopAudits.length,
        count: mysteryShopAudits.length
      },
      {
        key: 'menuProjects',
        label: 'Menu projects visible',
        description: 'Menu rebuild work and menu deliverables.',
        enabled: activeForm.data.portal.hiddenMenuIds.length < menus.length,
        count: menus.length
      },
      {
        key: 'quotes',
        label: 'Quotes visible',
        description: 'Saved quotes included in the client-facing view.',
        enabled: activeForm.data.portal.hiddenQuoteIds.length < activeForm.data.quotes.length,
        count: activeForm.data.quotes.length
      },
      {
        key: 'invoices',
        label: 'Invoices visible',
        description: 'Invoice records included in the portal.',
        enabled: activeForm.data.portal.hiddenInvoiceIds.length < activeForm.data.invoices.length,
        count: activeForm.data.invoices.length
      },
      {
        key: 'reports',
        label: 'Reports visible',
        description: 'Future report releases can be controlled from here.',
        enabled: activeForm.data.portal.showReports
      },
      {
        key: 'actionPlans',
        label: 'Action plans visible',
        description: 'Future action plan releases can be controlled from here.',
        enabled: activeForm.data.portal.showActionPlans
      }
    ],
    [
      activeForm.data.invoices.length,
      activeForm.data.portal.hiddenAuditIds.length,
      activeForm.data.portal.hiddenFoodSafetyIds.length,
      activeForm.data.portal.hiddenInvoiceIds.length,
      activeForm.data.portal.hiddenMenuIds.length,
      activeForm.data.portal.hiddenMysteryShopIds.length,
      activeForm.data.portal.hiddenQuoteIds.length,
      activeForm.data.portal.showActionPlans,
      activeForm.data.portal.showReports,
      activeForm.data.quotes.length,
      audits.length,
      foodSafetyAudits.length,
      menus.length,
      mysteryShopAudits.length
    ]
  );

  async function refreshServiceLists() {
    const [auditRows, menuRows] = await Promise.all([listAudits(clientId), listMenuProjects(clientId)]);
    setAudits(auditRows);
    setMenus(menuRows);
    setFoodSafetyAudits(
      listLocalToolRecordsForClient<FoodSafetyAuditState>(FOOD_SAFETY_STORAGE_KEY, clientId)
    );
    setMysteryShopAudits(
      listLocalToolRecordsForClient<MysteryShopAuditState>(MYSTERY_SHOP_STORAGE_KEY, clientId)
    );
  }

  async function handleDuplicateQuote(quote: ClientQuote) {
    const now = new Date().toISOString();
    const nextQuote: ClientQuote = {
      ...quote,
      quoteId: uid('quote'),
      quoteTitle: `${quote.quoteTitle} copy`,
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      linkedInvoiceId: null,
      archivedAt: null,
      lineItems: quote.lineItems.map(cloneQuoteLineItem),
      renderedSummary: {
        ...quote.renderedSummary,
        generatedAt: now
      },
      calculation: {
        ...quote.calculation,
        generatedLineItems: quote.calculation.generatedLineItems.map(cloneQuoteLineItem),
        manualLineItems: quote.calculation.manualLineItems.map(cloneQuoteLineItem),
        addOns: quote.calculation.addOns.map(cloneQuoteLineItem),
        finalLineItems: quote.calculation.finalLineItems.map(cloneQuoteLineItem)
      },
      history: [
        createQuoteHistoryEntry(quote, currentUserName, 'Quote duplicated from an existing quote.')
      ]
    };

    const nextProfile: ClientProfile = {
      ...activeForm,
      data: {
        ...activeForm.data,
        quotes: [nextQuote, ...activeForm.data.quotes]
      }
    };

    try {
      await persistClientProfile(nextProfile, {
        successMessage: 'Quote duplicated.',
        activity: {
          kicker: 'Quotes',
          title: 'Duplicating quote',
          detail: 'Creating a fresh draft copy of the selected quote.'
        }
      });
      navigate(`/clients/${clientId}/pricing`);
      setExternalQuoteToEditId(nextQuote.quoteId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not duplicate quote.');
    }
  }

  async function handleArchiveQuote(quote: ClientQuote) {
    const nextProfile: ClientProfile = {
      ...activeForm,
      data: {
        ...activeForm.data,
        quotes: activeForm.data.quotes.map((item) =>
          item.quoteId === quote.quoteId
            ? {
                ...item,
                archivedAt: item.archivedAt ? null : new Date().toISOString()
              }
            : item
        )
      }
    };

    try {
      await persistClientProfile(nextProfile, {
        successMessage: quote.archivedAt ? 'Quote restored.' : 'Quote archived.',
        activity: {
          kicker: 'Quotes',
          title: quote.archivedAt ? 'Restoring quote' : 'Archiving quote',
          detail: 'Updating the saved quote status inside the client pricing tab.'
        }
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update quote.');
    }
  }

  async function handleCreateInvoiceFromQuote(quote: ClientQuote) {
    if (quote.linkedInvoiceId) {
      setMessage('This quote is already linked to an invoice.');
      navigate(`/clients/${clientId}/pricing`);
      setSelectedInvoiceId(quote.linkedInvoiceId);
      return;
    }

    const invoiceDraft = createInvoiceDraftFromQuote(activeForm, quote, activeForm.data.invoices.length);
    const nextProfile: ClientProfile = {
      ...activeForm,
      data: {
        ...activeForm.data,
        quotes: activeForm.data.quotes.map((item) =>
          item.quoteId === quote.quoteId
            ? {
                ...item,
                status: 'invoiced',
                linkedInvoiceId: invoiceDraft.id,
                updatedAt: new Date().toISOString()
              }
            : item
        ),
        invoices: [invoiceDraft, ...activeForm.data.invoices]
      }
    };

    try {
      await persistClientProfile(nextProfile, {
        successMessage: `Invoice draft ${invoiceDraft.number} created from quote.`,
        activity: {
          kicker: 'Pricing',
          title: 'Creating invoice draft',
          detail: 'Pulling the quote line items into the client invoice section.'
        }
      });
      navigate(`/clients/${clientId}/pricing`);
      setSelectedInvoiceId(invoiceDraft.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create invoice draft.');
    }
  }

  async function handleDuplicateInvoice(invoice: ClientInvoice) {
    const nextInvoice: ClientInvoice = {
      ...invoice,
      id: uid('invoice'),
      number: buildInvoiceNumber(activeForm.data.invoices.length),
      issueDate: todayIso(),
      status: 'Draft',
      archivedAt: null,
      lines: invoice.lines.map((line) => ({
        ...line,
        id: uid('invoice-line')
      }))
    };

    const nextProfile: ClientProfile = {
      ...activeForm,
      data: {
        ...activeForm.data,
        invoices: [nextInvoice, ...activeForm.data.invoices]
      }
    };

    try {
      await persistClientProfile(nextProfile, {
        successMessage: 'Invoice duplicated.',
        activity: {
          kicker: 'Invoices',
          title: 'Duplicating invoice',
          detail: 'Creating a new draft copy of the selected invoice.'
        }
      });
      navigate(`/clients/${clientId}/pricing`);
      setSelectedInvoiceId(nextInvoice.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not duplicate invoice.');
    }
  }

  async function handleMarkInvoicePaid(invoice: ClientInvoice) {
    const nextProfile: ClientProfile = {
      ...activeForm,
      data: {
        ...activeForm.data,
        invoices: activeForm.data.invoices.map((item) =>
          item.id === invoice.id ? { ...item, status: 'Paid' } : item
        )
      }
    };

    try {
      await persistClientProfile(nextProfile, {
        successMessage: `${invoice.number} marked as paid.`,
        activity: {
          kicker: 'Invoices',
          title: 'Updating payment status',
          detail: 'Marking the selected invoice as paid in the client record.'
        }
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update invoice.');
    }
  }

  function handleToggleQuotePortalVisibility(quoteId: string, visible: boolean) {
    setEditing(true);
    setPortalListVisibility('hiddenQuoteIds', [quoteId], visible);
  }

  function handleToggleInvoicePortalVisibility(invoiceId: string, visible: boolean) {
    setEditing(true);
    setPortalListVisibility('hiddenInvoiceIds', [invoiceId], visible);
  }

  function exportInvoicePdf(invoice: ClientInvoice) {
    openPrintableHtmlDocument(`${invoice.number} invoice export`, buildInvoicePdfHtml(activeForm, invoice));
  }

  async function handleDuplicateWorkItem(item: ClientWorkItem) {
    try {
      if (item.id.startsWith('audit:')) {
        const source = audits.find((audit) => `audit:${audit.id}` === item.id);
        if (!source) return;

        await saveAudit({
          ...source.data,
          id: undefined,
          title: `${source.title} copy`
        });
      } else if (item.id.startsWith('menu:')) {
        const source = menus.find((menu) => `menu:${menu.id}` === item.id);
        if (!source) return;

        await saveMenuProject({
          ...source.data,
          id: undefined,
          menuName: `${source.title} copy`
        });
      } else if (item.id.startsWith('food-safety:')) {
        const source = foodSafetyAudits.find((audit) => `food-safety:${audit.id}` === item.id);
        if (!source) return;

        saveLocalToolRecord(FOOD_SAFETY_STORAGE_KEY, {
          id: uid('food-safety'),
          title: `${source.title} copy`,
          siteName: source.siteName,
          location: source.location,
          reviewDate: source.reviewDate,
          data: {
            ...source.data,
            id: undefined,
            title: `${source.title} copy`
          }
        });
      } else if (item.id.startsWith('mystery-shop:')) {
        const source = mysteryShopAudits.find((audit) => `mystery-shop:${audit.id}` === item.id);
        if (!source) return;

        saveLocalToolRecord(MYSTERY_SHOP_STORAGE_KEY, {
          id: uid('mystery-shop'),
          title: `${source.title} copy`,
          siteName: source.siteName,
          location: source.location,
          reviewDate: source.reviewDate,
          data: {
            ...source.data,
            id: undefined,
            title: `${source.title} copy`
          }
        });
      } else if (item.id.startsWith('quote:')) {
        const quote = activeForm.data.quotes.find((entry) => `quote:${entry.quoteId}` === item.id);
        if (quote) {
          await handleDuplicateQuote(quote);
          return;
        }
      }

      await refreshServiceLists();
      setMessage('Work item duplicated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not duplicate work item.');
    }
  }

  async function handleArchiveWorkItem(item: ClientWorkItem) {
    if (item.id.startsWith('quote:')) {
      const quote = activeForm.data.quotes.find((entry) => `quote:${entry.quoteId}` === item.id);
      if (quote) {
        await handleArchiveQuote(quote);
      }
      return;
    }

    const archived = new Set(activeForm.data.archivedWorkItemIds);
    if (archived.has(item.id)) archived.delete(item.id);
    else archived.add(item.id);

    const nextProfile: ClientProfile = {
      ...activeForm,
      data: {
        ...activeForm.data,
        archivedWorkItemIds: [...archived]
      }
    };

    try {
      await persistClientProfile(nextProfile, {
        successMessage: item.archived ? 'Work item restored.' : 'Work item archived.',
        activity: {
          kicker: 'Work & services',
          title: item.archived ? 'Restoring work item' : 'Archiving work item',
          detail: 'Updating the work list without removing the original record.'
        }
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update work item.');
    }
  }

  async function handleToggleWorkItemPortalVisibility(item: ClientWorkItem, visible: boolean) {
    setEditing(true);
    handleToggleSharedItem(item.id, visible);
    setMessage('Portal visibility updated. Save changes to keep it.');
  }

  function handleLinkWorkItemToInvoice(item: ClientWorkItem) {
    if (item.id.startsWith('quote:')) {
      const quote = activeForm.data.quotes.find((entry) => `quote:${entry.quoteId}` === item.id);
      if (quote) {
        void handleCreateInvoiceFromQuote(quote);
      }
      return;
    }

    handleRequestNewInvoice(
      {
        description: `${item.label} - ${item.title}`,
        quantity: 1,
        unitPrice: item.value ?? 0
      },
      item.title
    );
  }

  return (
    <main className="client-profile-page-simplified">
      <div className="client-profile-shell">
        <ClientProfileHeader
          client={activeForm}
          mainContact={mainContact?.name || activeForm.contactName || 'No main contact set'}
          siteCount={siteCount}
          outstandingBalance={fmtCurrency(outstandingBalance)}
          lastReviewDate={formatShortDate(activeForm.nextReviewDate)}
          editing={editing}
          saving={saving}
          onToggleEditing={toggleEditing}
          onSave={handleSave}
          onNewQuote={handleRequestNewQuote}
          onNewInvoice={() => handleRequestNewInvoice()}
          onNewAudit={() => navigate(`/audit?client=${clientId}`)}
          onOpenPortal={handleOpenPortal}
        />

        <ClientProfileTabNav clientId={clientId} activeTab={activeTab} />
        <div className="page-inline-note">{message}</div>

        {activeTab === 'information' ? (
          <ClientInformationTab
            client={activeForm}
            editing={editing}
            lookupQuery={lookupQuery}
            lookupScope={lookupScope}
            lookupLoading={lookupLoading}
            lookupMessage={lookupMessage}
            lookupSelectionId={lookupSelectionId}
            visibleLookupResults={visibleLookupResults}
            isLookupFallbackVisible={visibleLookupResults.length > 0 && lookupScope !== 'all'}
            onLookupQueryChange={setLookupQuery}
            onLookupScopeChange={setLookupScope}
            onRunBusinessLookup={handleBusinessLookup}
            onUseLookup={handleUseLookup}
            updateField={updateField}
            updateData={updateData}
            updateContact={updateContact}
            addContact={addContact}
            removeContact={removeContact}
            updateSite={updateSite}
            addSite={addSite}
            removeSite={removeSite}
          />
        ) : null}

        {activeTab === 'services' ? (
          <ClientWorkTab
            workItems={workItems}
            onDuplicate={handleDuplicateWorkItem}
            onArchiveToggle={handleArchiveWorkItem}
            onTogglePortalVisibility={handleToggleWorkItemPortalVisibility}
            onLinkToInvoice={handleLinkWorkItemToInvoice}
            onNewServiceJob={handleRequestNewQuote}
          />
        ) : null}

        {activeTab === 'portal' ? (
          <ClientPortalTab
            portal={activeForm.data.portal}
            editing={editing}
            portalLink={portalLink}
            publishing={publishingPortal}
            categoryControls={portalCategoryControls}
            sharedItems={sharedItems}
            onToggleEnabled={(enabled) => {
              setEditing(true);
              updatePortalField('enabled', enabled);
            }}
            onUpdateTextField={(key, value) => {
              setEditing(true);
              updatePortalField(key, value);
            }}
            onToggleCategory={handleTogglePortalCategory}
            onToggleSharedItem={handleToggleSharedItem}
            onPublish={handlePublishPortal}
            onCopyLink={async () => {
              if (!portalLink) {
                setMessage('Publish the portal first to generate a link.');
                return;
              }

              try {
                await navigator.clipboard.writeText(portalLink);
                setMessage('Client portal link copied to clipboard.');
              } catch {
                setMessage(portalLink);
              }
            }}
            onOpenPortal={handleOpenPortal}
          />
        ) : null}

        {activeTab === 'pricing' ? (
          <ClientPricingTab
            client={activeForm}
            editing={editing}
            currentUserName={currentUserName}
            selectedInvoiceId={selectedInvoiceId}
            requestNewQuoteToken={requestNewQuoteToken}
            externalQuoteToEditId={externalQuoteToEditId}
            onPersistClientProfile={persistClientProfile}
            onRequestNewQuote={handleRequestNewQuote}
            onRequestNewInvoice={() => handleRequestNewInvoice()}
            onEditQuote={(quoteId) => {
              setExternalQuoteToEditId(quoteId);
              setRequestNewQuoteToken(0);
            }}
            onDuplicateQuote={handleDuplicateQuote}
            onArchiveQuote={handleArchiveQuote}
            onCreateInvoiceFromQuote={handleCreateInvoiceFromQuote}
            onToggleQuotePortalVisibility={handleToggleQuotePortalVisibility}
            onSelectInvoice={setSelectedInvoiceId}
            onUpdateInvoiceField={updateInvoiceField}
            onUpdateInvoiceLine={updateInvoiceLine}
            onAddInvoiceLine={addInvoiceLine}
            onRemoveInvoiceLine={removeInvoiceLine}
            onDuplicateInvoice={handleDuplicateInvoice}
            onMarkInvoicePaid={handleMarkInvoicePaid}
            onToggleInvoicePortalVisibility={handleToggleInvoicePortalVisibility}
            onExportInvoicePdf={exportInvoicePdf}
          />
        ) : null}
      </div>
    </main>
  );
}

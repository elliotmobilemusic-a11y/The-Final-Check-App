import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useActivityOverlay } from '../../context/ActivityOverlayContext';
import { useAuth } from '../../context/AuthContext';
import { invoiceTotal } from '../../features/clients/clientExports';
import { clientRecordToProfile } from '../../features/clients/clientData';
import {
  buildDishSpecReportHtml,
  buildRecipeCostingReportHtml
} from '../../features/menu-engine/reports';
import {
  getBusinessProfile,
  searchBusinessProfiles,
  type BusinessLookupResult
} from '../../features/clients/businessLookup';
import { createInvoiceDraftFromQuote } from '../../features/quotes/invoices';
import {
  ClientProfileHeader,
  ClientProfileTabNav
} from '../../components/clients/profile';
import { ClientInformationTab } from '../../components/clients/profile/ClientInformationTab';
import { ClientWorkTab, type ClientWorkItem } from '../../components/clients/profile/ClientWorkTab';
import {
  ClientPortalTab,
  type ClientPortalCategoryControl,
  type ClientPortalSharedItem
} from '../../components/clients/profile/ClientPortalTab';
import { ClientPricingTab } from '../../components/clients/profile/ClientPricingTab';
import { deleteClient, getClientById, updateClient } from '../../services/clients';
import { listAudits, saveAudit } from '../../services/audits';
import { listMenuProjects, saveMenuProject } from '../../services/menus';
import {
  listFoodSafetyAuditsForClient,
  saveFoodSafetyAudit
} from '../../services/foodSafetyAudits';
import {
  listMysteryShopAuditsForClient,
  saveMysteryShopAudit
} from '../../services/mysteryShopAudits';
import {
  createClientPortalShare,
  createDishSpecShare,
  createFoodSafetyShare,
  createKitchenAuditShare,
  createMenuShare,
  createMysteryShopShare,
  createRecipeCostingShare
} from '../../services/reportShares';
import { clearDraft, readDraft, writeDraft } from '../../services/draftStore';
import {
  blankContact,
  blankInvoice,
  blankInvoiceLine,
  blankSite,
  buildInvoiceNumber,
  buildMenuLinkedDishRecords,
  clientDraftKey,
  cloneMenuDishRecord,
  cloneQuoteLineItem,
  createQuoteHistoryEntry,
  deriveUserDisplayName,
  formatShortDate,
  getActiveTab,
  hasOutstandingInvoices,
  mergeLookupIntoClient,
  workstreamSiteLabel
} from '../../features/clients/profilePageHelpers';
import {
  buildClientPortalCategoryControls,
  buildClientPortalSharedItems,
  buildClientWorkItems
} from '../../features/clients/profilePageViewModel';
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
  SupabaseRecord
} from '../../types';
import { fmtCurrency, newUUID, todayIso, uid } from '../../lib/utils';
import { PageContainer } from '../../components/layout';
import {
  buildInvoicePdfTemplate,
  buildQuotePdfTemplate,
  exportPdfDocument
} from '../../lib/pdf';
import { downloadPdfWithFallback } from '../../services/pdfExport';

type LookupScopeFilter = 'group' | 'site' | 'all';



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
  const [exportingPdfKey, setExportingPdfKey] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);

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
      listFoodSafetyAuditsForClient(clientId).then(records => {
        setFoodSafetyAudits(records.map(r => ({
          ...r,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          siteName: r.site_name,
          reviewDate: r.review_date ?? ''
        })));
      });

      listMysteryShopAuditsForClient(clientId).then(records => {
        setMysteryShopAudits(records.map(r => ({
          ...r,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          siteName: r.site_name,
          reviewDate: r.review_date ?? ''
        })));
      });
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

  const pendingForm = form;
  const pendingClient = client;

  const siteNameById = useMemo(
    () => new Map((pendingForm?.data.sites ?? []).map((site) => [site.id, site.name || 'Unnamed site'])),
    [pendingForm?.data.sites]
  );

  const visibleLookupResults = useMemo(() => {
    if (lookupScope === 'all') return lookupResults;
    const scoped = lookupResults.filter((result) =>
      lookupScope === 'group' ? result.resultType === 'group' : result.resultType === 'site'
    );
    return scoped.length ? scoped : lookupResults;
  }, [lookupResults, lookupScope]);

  const activeForm = pendingForm as ClientProfile;
  const loadedClient = pendingClient as ClientProfile;

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
      | 'hiddenDishSpecIds'
      | 'hiddenRecipeCostingIds'
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
    if (kind === 'dish-spec') setPortalListVisibility('hiddenDishSpecIds', [resourceId], visible);
    if (kind === 'recipe-costing') {
      setPortalListVisibility('hiddenRecipeCostingIds', [resourceId], visible);
    }
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
    if (key === 'dishSpecs') {
      setPortalListVisibility(
        'hiddenDishSpecIds',
        menuLinkedDishRecords.map((record) => record.specWorkId),
        enabled
      );
    }
    if (key === 'recipeCostings') {
      setPortalListVisibility(
        'hiddenRecipeCostingIds',
        menuLinkedDishRecords.map((record) => record.recipeWorkId),
        enabled
      );
    }
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
          const visibleDishSpecs = menuLinkedDishRecords.filter(
            (record) => !activeForm.data.portal.hiddenDishSpecIds.includes(record.specWorkId)
          );
          const visibleRecipeCostings = menuLinkedDishRecords.filter(
            (record) =>
              !activeForm.data.portal.hiddenRecipeCostingIds.includes(record.recipeWorkId)
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

          const dishSpecResources: ClientPortalResource[] = visibleDishSpecs.map((record) => ({
            id: record.specWorkId,
            title: `${record.dish.name} spec sheet`,
            kind: 'dish_spec',
            subtitle: `${record.menu.title} • ${record.sectionName}`,
            reviewDate: record.menu.updated_at,
            url: null,
            locked: paymentLockActive,
            lockReason: paymentLockActive ? 'This resource will unlock once the account is paid.' : ''
          }));

          const unlockedDishSpecResources = await Promise.all(
            dishSpecResources.map(async (resource) => {
              if (resource.locked) return resource;
              const record = visibleDishSpecs.find((entry) => entry.specWorkId === resource.id);
              if (!record) return resource;

              const share = await createDishSpecShare(
                resource.id,
                resource.title,
                buildDishSpecReportHtml({
                  client: activeForm,
                  menuRecord: record.menu,
                  dish: record.dish,
                  sectionName: record.sectionName,
                  preparedBy: currentUserName
                })
              );

              return {
                ...resource,
                url: share.url,
                shareToken: share.token,
                sharePath: '/share/dish-spec'
              };
            })
          );

          const recipeCostingResources = await Promise.all(
            visibleRecipeCostings.map(async (record) => {
              const locked = paymentLockActive;
              if (locked) {
                return {
                  id: record.recipeWorkId,
                  title: `${record.dish.name} recipe costing`,
                  kind: 'recipe_costing' as const,
                  subtitle: `${record.menu.title} • ${fmtCurrency(record.dish.sellPrice)}`,
                  reviewDate: record.menu.updated_at,
                  url: null,
                  locked,
                  lockReason: 'This resource will unlock once the account is paid.'
                };
              }

              const title = `${record.dish.name} recipe costing`;
              const share = await createRecipeCostingShare(
                record.recipeWorkId,
                title,
                buildRecipeCostingReportHtml({
                  client: activeForm,
                  menuRecord: record.menu,
                  dish: record.dish,
                  sectionName: record.sectionName,
                  preparedBy: currentUserName
                })
              );

              return {
                id: record.recipeWorkId,
                title,
                kind: 'recipe_costing' as const,
                subtitle: `${record.menu.title} • ${fmtCurrency(record.dish.sellPrice)}`,
                reviewDate: record.menu.updated_at,
                url: share.url,
                shareToken: share.token,
                sharePath: '/share/recipe-costing',
                locked: false,
                lockReason: ''
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
              ...unlockedDishSpecResources,
              ...recipeCostingResources,
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

  const menuLinkedDishRecords = useMemo(() => buildMenuLinkedDishRecords(menus), [menus]);

  const workItems = useMemo<ClientWorkItem[]>(() => {
    if (!activeForm) return [];
    return buildClientWorkItems({
      activeForm,
      audits,
      clientId,
      foodSafetyAudits,
      menuLinkedDishRecords,
      menus,
      mysteryShopAudits,
      siteNameById
    });
  }, [
    activeForm,
    audits,
    clientId,
    foodSafetyAudits,
    menuLinkedDishRecords,
    menus,
    mysteryShopAudits,
    siteNameById
  ]);

  const sharedItems = useMemo<ClientPortalSharedItem[]>(() => {
    if (!activeForm) return [];
    return buildClientPortalSharedItems({
      activeForm,
      audits,
      foodSafetyAudits,
      menuLinkedDishRecords,
      menus,
      mysteryShopAudits
    });
  }, [
    activeForm,
    audits,
    foodSafetyAudits,
    menuLinkedDishRecords,
    menus,
    mysteryShopAudits
  ]);

  const portalCategoryControls = useMemo<ClientPortalCategoryControl[]>(
    () => {
      if (!activeForm) return [];
      return buildClientPortalCategoryControls({
        activeForm,
        auditCount: audits.length,
        foodSafetyCount: foodSafetyAudits.length,
        mysteryShopCount: mysteryShopAudits.length,
        menuCount: menus.length,
        linkedDishCount: menuLinkedDishRecords.length
      });
    },
    [
      activeForm,
      audits.length,
      foodSafetyAudits.length,
      menuLinkedDishRecords.length,
      menus.length,
      mysteryShopAudits.length
    ]
  );

  if (!loadedClient || !activeForm) {
    return (
      <div className="screen-center">
        <div className="loading-card">
          <h2>Loading client profile...</h2>
          <p>{message}</p>
        </div>
      </div>
    );
  }

  const portalLink = activeForm.data.portal.token
    ? `${window.location.origin}/#/portal/client/${activeForm.data.portal.token}`
    : '';
  const mainContact =
    activeForm.data.contacts.find((contact) => contact.isPrimary) ?? activeForm.data.contacts[0];
  const siteCount = activeForm.data.sites.length || activeForm.data.siteCountEstimate || 0;
  const outstandingBalance = activeForm.data.invoices
    .filter((invoice) => invoice.status !== 'Paid' && invoice.status !== 'Cancelled')
    .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);

  async function refreshServiceLists() {
    const [auditRows, menuRows] = await Promise.all([listAudits(clientId), listMenuProjects(clientId)]);
    setAudits(auditRows);
    setMenus(menuRows);
    setFoodSafetyAudits((await listFoodSafetyAuditsForClient(clientId)).map(r => ({
      ...r,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      siteName: r.site_name,
      reviewDate: r.review_date ?? ''
    })));

    setMysteryShopAudits((await listMysteryShopAuditsForClient(clientId)).map(r => ({
      ...r,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      siteName: r.site_name,
      reviewDate: r.review_date ?? ''
    })));
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

  async function exportInvoicePdf(invoice: ClientInvoice) {
    const exportKey = `invoice:${invoice.id}`;
    setExportingPdfKey(exportKey);

    try {
      const result = await runWithActivity(
        {
          kicker: 'Preparing export',
          title: 'Building invoice PDF',
          detail: 'Creating a client-ready invoice PDF from the saved invoice record.'
        },
        async () =>
          exportPdfDocument(
            buildInvoicePdfTemplate({
              client: activeForm,
              invoice,
              preparedBy: 'Jason Wardill / The Final Check'
            })
          ),
        700
      );

      setMessage(
        result.openedFallback
          ? `${result.filename} opened for review.`
          : `${result.filename} downloaded.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not export invoice PDF.');
    } finally {
      setExportingPdfKey((current) => (current === exportKey ? null : current));
    }
  }

  async function exportQuotePdf(quote: ClientQuote) {
    const exportKey = `quote:${quote.quoteId}`;
    setExportingPdfKey(exportKey);

    try {
      const result = await runWithActivity(
        {
          kicker: 'Preparing export',
          title: 'Building quote PDF',
          detail: 'Creating a client-ready quote PDF from the saved quote snapshot.'
        },
        async () =>
          exportPdfDocument(
            buildQuotePdfTemplate({
              client: activeForm,
              quote,
              preparedBy: 'Jason Wardill / The Final Check'
            })
          ),
        700
      );

      setMessage(
        result.openedFallback
          ? `${result.filename} opened for review.`
          : `${result.filename} downloaded.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not export quote PDF.');
    } finally {
      setExportingPdfKey((current) => (current === exportKey ? null : current));
    }
  }

  function handleExportWorkItem(item: ClientWorkItem) {
    if (item.id.startsWith('dish-spec:')) {
      const record = menuLinkedDishRecords.find((entry) => entry.specWorkId === item.id);
      if (!record) {
        setMessage('Dish spec record not found.');
        return;
      }

      void runWithActivity(
        {
          kicker: 'Preparing export',
          title: 'Building dish spec PDF',
          detail: 'Rendering your document through the high-quality export engine.'
        },
        async () => {
          const title = `${record.dish.name} spec sheet`;
          await downloadPdfWithFallback(
            title,
            buildDishSpecReportHtml({
              client: activeForm,
              menuRecord: record.menu,
              dish: record.dish,
              sectionName: record.sectionName,
              preparedBy: currentUserName
            }),
            title
          );
        }
      );
      return;
    }

    if (item.id.startsWith('recipe-costing:')) {
      const record = menuLinkedDishRecords.find((entry) => entry.recipeWorkId === item.id);
      if (!record) {
        setMessage('Recipe costing record not found.');
        return;
      }

      void runWithActivity(
        {
          kicker: 'Preparing export',
          title: 'Building recipe costing PDF',
          detail: 'Rendering your document through the high-quality export engine.'
        },
        async () => {
          const title = `${record.dish.name} recipe costing`;
          await downloadPdfWithFallback(
            title,
            buildRecipeCostingReportHtml({
              client: activeForm,
              menuRecord: record.menu,
              dish: record.dish,
              sectionName: record.sectionName,
              preparedBy: currentUserName
            }),
            title
          );
        }
      );
      return;
    }

    if (item.id.startsWith('menu:')) {
      const menu = menus.find((entry) => `menu:${entry.id}` === item.id);
      if (!menu) {
        setMessage('Menu project not found.');
        return;
      }

      navigate(`/menu?client=${clientId}&load=${menu.id}`);
      setMessage('Open the menu project and use its PDF export for the full menu report.');
      return;
    }

    setMessage('PDF export is currently available for dish specs, recipe costings, and invoices.');
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
      } else if (item.id.startsWith('dish-spec:') || item.id.startsWith('recipe-costing:')) {
        const source = menuLinkedDishRecords.find(
          (record) => record.specWorkId === item.id || record.recipeWorkId === item.id
        );
        if (!source) return;

        await saveMenuProject({
          ...source.menu.data,
          id: source.menu.id,
          sections: source.menu.data.sections.map((section) =>
            section.id === source.sectionId
              ? {
                  ...section,
                  dishes: [...section.dishes, cloneMenuDishRecord(source.dish)]
                }
              : section
          )
        });
      } else if (item.id.startsWith('food-safety:')) {
        const source = foodSafetyAudits.find((audit) => `food-safety:${audit.id}` === item.id);
        if (!source) return;

        saveFoodSafetyAudit({
          id: newUUID(),
          client_id: source.data.clientId ?? null,
          client_site_id: source.data.clientSiteId ?? null,
          title: `${source.title} copy`,
          site_name: source.siteName,
          location: source.location,
          review_date: source.data.auditDate,
          data: {
            ...source.data,
            id: undefined,
            title: `${source.title} copy`
          }
        });
      } else if (item.id.startsWith('mystery-shop:')) {
        const source = mysteryShopAudits.find((audit) => `mystery-shop:${audit.id}` === item.id);
        if (!source) return;

        saveMysteryShopAudit({
          id: newUUID(),
          client_id: source.data.clientId ?? null,
          client_site_id: source.data.clientSiteId ?? null,
          title: `${source.title} copy`,
          site_name: source.siteName,
          location: source.location,
          review_date: source.data.visitDate,
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

  async function handleDeleteClient() {
    if (!clientId) return;

    try {
      setDeletingClient(true);
      await deleteClient(clientId);
      clearDraft(clientDraftKey(clientId));
      navigate('/clients');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete client.');
    } finally {
      setDeletingClient(false);
      setConfirmDeleteOpen(false);
    }
  }

  return (
    <PageContainer size="wide">
      <main className="client-profile-page-simplified">
        <div className="client-profile-shell">
          <ClientProfileHeader
            companyName={activeForm.companyName}
            contactName={mainContact?.name || activeForm.contactName || 'No main contact set'}
            status={activeForm.status}
            industry={activeForm.industry}
            outstandingBalance={fmtCurrency(outstandingBalance)}
            lastReviewDate={formatShortDate(activeForm.nextReviewDate)}
            siteCount={siteCount}
            editing={editing}
            saving={saving}
            onToggleEditing={toggleEditing}
            onSave={handleSave}
            onNewQuote={handleRequestNewQuote}
            onNewInvoice={() => handleRequestNewInvoice()}
            onNewAudit={() => navigate(`/audit?client=${clientId}`)}
            onOpenPortal={handleOpenPortal}
            onDeleteClient={() => setConfirmDeleteOpen(true)}
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
            onExport={handleExportWorkItem}
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
            exportingInvoiceId={
              exportingPdfKey?.startsWith('invoice:') ? exportingPdfKey.replace('invoice:', '') : null
            }
            exportingQuoteId={
              exportingPdfKey?.startsWith('quote:') ? exportingPdfKey.replace('quote:', '') : null
            }
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
            onExportQuotePdf={exportQuotePdf}
          />
        ) : null}
        </div>
      </main>

      {confirmDeleteOpen ? (
        <div className="confirm-modal-overlay" role="presentation">
          <div
            aria-labelledby="delete-client-profile-title"
            aria-modal="true"
            className="confirm-modal-card"
            role="dialog"
          >
            <p className="confirm-modal-kicker">Delete client</p>
            <h3 id="delete-client-profile-title">Delete {activeForm.companyName || 'this client'}?</h3>
            <p className="confirm-modal-body">
              This removes the client profile from your CRM. Saved linked records may remain in their own stores, but the client record itself cannot be restored.
            </p>
            <div className="confirm-modal-actions">
              <button
                className="button button-secondary"
                disabled={deletingClient}
                onClick={() => setConfirmDeleteOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button button-ghost danger-text"
                disabled={deletingClient}
                onClick={() => void handleDeleteClient()}
                type="button"
              >
                {deletingClient ? 'Deleting...' : 'Delete client'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}

import type {
  ClientContact,
  ClientInvoice,
  ClientInvoiceLine,
  ClientProfile,
  ClientQuote,
  ClientSite,
  MenuDish,
  MenuProjectState,
  QuoteLineItem,
  SupabaseRecord
} from '../../types';
import type { BusinessLookupProfile } from './businessLookup';
import { normalizeDish } from '../menu-engine/dishRecords';
import { todayIso, uid } from '../../lib/utils';

export type ClientProfileSectionKey = 'information' | 'services' | 'portal' | 'pricing';

export type MenuLinkedDishRecord = {
  menu: SupabaseRecord<MenuProjectState>;
  dish: MenuDish;
  sectionId: string;
  sectionName: string;
  workId: string;
  specWorkId: string;
  recipeWorkId: string;
};

export function clientDraftKey(clientId: string) {
  return `client-profile-draft-${clientId}`;
}

export function formatShortDate(value?: string | null) {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not set';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

export function hasOutstandingInvoices(profile: ClientProfile) {
  return profile.data.invoices.some(
    (invoice) => invoice.status !== 'Paid' && invoice.status !== 'Cancelled'
  );
}

export function buildInvoiceNumber(existingCount: number) {
  return `INV-${new Date().getFullYear()}-${String(existingCount + 1).padStart(3, '0')}`;
}

export function blankContact(): ClientContact {
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

export function blankSite(): ClientSite {
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

export function blankInvoiceLine(): ClientInvoiceLine {
  return {
    id: uid('invoice-line'),
    description: '',
    quantity: 1,
    unitPrice: 0
  };
}

export function blankInvoice(existingCount: number, paymentTermsDays: number): ClientInvoice {
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

export function deriveUserDisplayName(email?: string | null) {
  if (!email) return 'The Final Check';
  return email.split('@')[0].replace(/[._-]+/g, ' ');
}

export function mergeLookupIntoClient(
  current: ClientProfile,
  lookup: BusinessLookupProfile
): ClientProfile {
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

export function getActiveTab(section?: string): ClientProfileSectionKey {
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

export function workstreamSiteLabel(
  record: { client_site_id?: string | null; site_name?: string | null },
  siteNameById: Map<string, string>
) {
  if (record.client_site_id) {
    return siteNameById.get(record.client_site_id) || record.site_name || 'Linked site';
  }

  return record.site_name || 'Account level';
}

export function buildMenuLinkedDishRecords(
  menus: SupabaseRecord<MenuProjectState>[]
): MenuLinkedDishRecord[] {
  return menus.flatMap((menu) =>
    (menu.data.sections ?? []).flatMap((section) =>
      (section.dishes ?? []).map((dish) => {
        const normalizedDish = normalizeDish(dish);
        return {
          menu,
          dish: normalizedDish,
          sectionId: section.id,
          sectionName: section.name,
          workId: `menu-dish:${menu.id}:${normalizedDish.id}`,
          specWorkId: `dish-spec:${menu.id}:${normalizedDish.id}`,
          recipeWorkId: `recipe-costing:${menu.id}:${normalizedDish.id}`
        };
      })
    )
  );
}

export function cloneQuoteLineItem(line: QuoteLineItem): QuoteLineItem {
  return {
    ...line,
    id: uid('quote-line')
  };
}

export function cloneMenuDishRecord(sourceDish: MenuDish, copyName?: string) {
  const nextDish = normalizeDish(JSON.parse(JSON.stringify(sourceDish)) as MenuDish);
  const nextDishId = uid('dish');

  return {
    ...nextDish,
    id: nextDishId,
    name: copyName || `${nextDish.name} copy`,
    ingredients: nextDish.ingredients.map((ingredient) => ({
      ...ingredient,
      id: uid('ing')
    })),
    dishImages: nextDish.dishImages.map((image, index) => ({
      ...image,
      id: uid('dish-image'),
      isPrimary: index === 0
    })),
    recipeCosting: {
      ...nextDish.recipeCosting,
      id: uid('dish-costing'),
      linkedDishId: nextDishId
    },
    specSheet: {
      ...nextDish.specSheet,
      id: uid('dish-spec'),
      linkedDishId: nextDishId
    }
  };
}

export function buildDishWorkOpenPath(
  clientId: string,
  menuId: string,
  dishId: string,
  tab: 'spec' | 'recipe'
) {
  return `/menu?client=${clientId}&load=${menuId}&dish=${dishId}&dishTab=${tab}`;
}

export function createQuoteHistoryEntry(
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

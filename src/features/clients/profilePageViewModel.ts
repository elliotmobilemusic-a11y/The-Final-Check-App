import type {
  ClientPortalCategoryControl,
  ClientPortalSharedItem
} from '../../components/clients/profile/ClientPortalTab';
import type { ClientWorkItem } from '../../components/clients/profile/ClientWorkTab';
import { fmtCurrency } from '../../lib/utils';
import type {
  ClientProfile,
  ClientQuote,
  FoodSafetyAuditState,
  LocalToolRecord,
  MenuProjectState,
  MysteryShopAuditState,
  SupabaseRecord
} from '../../types';
import { formatShortDate, type MenuLinkedDishRecord, workstreamSiteLabel } from './profilePageHelpers';

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

export function buildClientWorkItems(options: {
  activeForm: ClientProfile;
  audits: SupabaseRecord<unknown>[];
  clientId: string;
  foodSafetyAudits: LocalToolRecord<FoodSafetyAuditState>[];
  menuLinkedDishRecords: MenuLinkedDishRecord[];
  menus: SupabaseRecord<MenuProjectState>[];
  mysteryShopAudits: LocalToolRecord<MysteryShopAuditState>[];
  siteNameById: Map<string, string>;
}): ClientWorkItem[] {
  const {
    activeForm,
    audits,
    clientId,
    foodSafetyAudits,
    menuLinkedDishRecords,
    menus,
    mysteryShopAudits,
    siteNameById
  } = options;

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

  const dishSpecItems = menuLinkedDishRecords.map((record) => ({
    id: record.specWorkId,
    itemType: 'dishSpec' as const,
    label: 'Dish spec',
    title: `${record.dish.name} spec sheet`,
    site: workstreamSiteLabel(record.menu, siteNameById),
    status: 'Linked to menu',
    createdAt: record.menu.created_at,
    updatedAt: record.menu.updated_at,
    portalVisible: !activeForm.data.portal.hiddenDishSpecIds.includes(record.specWorkId),
    valueLabel: record.dish.sellPrice > 0 ? fmtCurrency(record.dish.sellPrice) : 'No sell price',
    value: record.dish.sellPrice,
    archived: archivedIds.has(record.specWorkId),
    openPath: `/menu?client=${clientId}&load=${record.menu.id}&dish=${record.dish.id}&dishTab=spec`
  }));

  const recipeCostingItems = menuLinkedDishRecords.map((record) => ({
    id: record.recipeWorkId,
    itemType: 'recipeCosting' as const,
    label: 'Recipe costing',
    title: `${record.dish.name} recipe costing`,
    site: workstreamSiteLabel(record.menu, siteNameById),
    status: 'Linked to dish',
    createdAt: record.menu.created_at,
    updatedAt: record.menu.updated_at,
    portalVisible: !activeForm.data.portal.hiddenRecipeCostingIds.includes(record.recipeWorkId),
    valueLabel:
      record.dish.recipeCosting.suggestedSellingPrice > 0
        ? `Target ${fmtCurrency(record.dish.recipeCosting.suggestedSellingPrice)}`
        : fmtCurrency(record.dish.sellPrice),
    value: record.dish.sellPrice,
    archived: archivedIds.has(record.recipeWorkId),
    openPath: `/menu?client=${clientId}&load=${record.menu.id}&dish=${record.dish.id}&dishTab=recipe`
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
    ...dishSpecItems,
    ...recipeCostingItems,
    ...serviceQuoteItems
  ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function buildClientPortalSharedItems(options: {
  activeForm: ClientProfile;
  audits: SupabaseRecord<unknown>[];
  foodSafetyAudits: LocalToolRecord<FoodSafetyAuditState>[];
  menuLinkedDishRecords: MenuLinkedDishRecord[];
  menus: SupabaseRecord<MenuProjectState>[];
  mysteryShopAudits: LocalToolRecord<MysteryShopAuditState>[];
}): ClientPortalSharedItem[] {
  const { activeForm, audits, foodSafetyAudits, menuLinkedDishRecords, menus, mysteryShopAudits } =
    options;

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
    ...menuLinkedDishRecords.map((record) => ({
      id: record.specWorkId,
      title: `${record.dish.name} spec sheet`,
      typeLabel: 'Dish spec',
      visible: !activeForm.data.portal.hiddenDishSpecIds.includes(record.specWorkId),
      releaseDate: formatShortDate(record.menu.updated_at)
    })),
    ...menuLinkedDishRecords.map((record) => ({
      id: record.recipeWorkId,
      title: `${record.dish.name} recipe costing`,
      typeLabel: 'Recipe costing',
      visible: !activeForm.data.portal.hiddenRecipeCostingIds.includes(record.recipeWorkId),
      releaseDate: formatShortDate(record.menu.updated_at)
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
}

export function buildClientPortalCategoryControls(options: {
  activeForm: ClientProfile;
  auditCount: number;
  foodSafetyCount: number;
  mysteryShopCount: number;
  menuCount: number;
  linkedDishCount: number;
}): ClientPortalCategoryControl[] {
  const { activeForm, auditCount, foodSafetyCount, mysteryShopCount, menuCount, linkedDishCount } =
    options;

  return [
    {
      key: 'audits',
      label: 'Audits visible',
      description: 'Operational audits released to the portal.',
      enabled: activeForm.data.portal.hiddenAuditIds.length < auditCount,
      count: auditCount
    },
    {
      key: 'foodSafety',
      label: 'Food safety visible',
      description: 'Food safety audits released to the portal.',
      enabled: activeForm.data.portal.hiddenFoodSafetyIds.length < foodSafetyCount,
      count: foodSafetyCount
    },
    {
      key: 'mysteryShops',
      label: 'Mystery shops visible',
      description: 'Mystery visit reports available to the client.',
      enabled: activeForm.data.portal.hiddenMysteryShopIds.length < mysteryShopCount,
      count: mysteryShopCount
    },
    {
      key: 'menuProjects',
      label: 'Menu projects visible',
      description: 'Menu rebuild work and menu deliverables.',
      enabled: activeForm.data.portal.hiddenMenuIds.length < menuCount,
      count: menuCount
    },
    {
      key: 'dishSpecs',
      label: 'Dish specs visible',
      description: 'Dish specification sheets shared from the menu engine.',
      enabled: activeForm.data.portal.hiddenDishSpecIds.length < linkedDishCount,
      count: linkedDishCount
    },
    {
      key: 'recipeCostings',
      label: 'Recipe costings visible',
      description: 'Recipe costing sheets shared from linked dish records.',
      enabled: activeForm.data.portal.hiddenRecipeCostingIds.length < linkedDishCount,
      count: linkedDishCount
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
  ];
}

import type { ClientProfile, MenuDish, MenuProjectState, SupabaseRecord } from '../../types';
import { fmtCurrency, fmtPercent, num, safe } from '../../lib/utils';
import {
  buildChapterHtml,
  buildDetailGridHtml,
  buildReportBodyHtml,
  buildReportCoverHtml,
  buildSummaryGridHtml,
  buildStoryCardsHtml,
  escapeHtml,
  hasReportContent
} from '../../reports/pdf';
import { dishActualGp, dishIngredientCost, dishRecommendedPrice } from '../profit/menuProfit';

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No';
}

function formatShortDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function currencyIfPositive(value: number) {
  return num(value) > 0 ? fmtCurrency(value) : '';
}

function percentIfUseful(value: number) {
  return num(value) > 0 ? fmtPercent(value) : '';
}

function reportSiteLabel(client: ClientProfile, menuRecord: SupabaseRecord<MenuProjectState>) {
  return safe(menuRecord.site_name || menuRecord.data.siteName || client.location);
}

function ingredientRows(dish: MenuDish) {
  const rows = dish.ingredients.filter((ingredient) => safe(ingredient.name));
  if (!rows.length) return '';

  const showSupplier = rows.some((ingredient) => safe(ingredient.supplier));

  return `
    <table class="report-table report-table-compact">
      <thead>
        <tr>
          <th>Ingredient</th>
          ${showSupplier ? '<th>Supplier</th>' : ''}
          <th>Qty Used</th>
          <th>Pack Size</th>
          <th>Pack Cost</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((ingredient) => {
            const qtyUsed =
              num(ingredient.qtyUsed) > 0
                ? `${num(ingredient.qtyUsed)} ${safe(ingredient.qtyUnit)}`
                : '';
            const packSize =
              num(ingredient.packQty) > 0
                ? `${num(ingredient.packQty)} ${safe(ingredient.packUnit)}`
                : '';

            return `
              <tr>
                <td>${escapeHtml(ingredient.name)}</td>
                ${showSupplier ? `<td>${escapeHtml(ingredient.supplier)}</td>` : ''}
                <td>${escapeHtml(qtyUsed)}</td>
                <td>${escapeHtml(packSize)}</td>
                <td>${escapeHtml(currencyIfPositive(num(ingredient.packCost)))}</td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>
  `;
}

export function buildDishSpecReportHtml(options: {
  client: ClientProfile;
  menuRecord: SupabaseRecord<MenuProjectState>;
  dish: MenuDish;
  sectionName: string;
  preparedBy?: string;
}) {
  const { client, menuRecord, dish, sectionName, preparedBy = 'The Final Check' } = options;
  const siteLabel = reportSiteLabel(client, menuRecord);
  const portionSize = safe(dish.specSheet.portionSize || dish.portionSize);
  const foodCost = dishIngredientCost(dish);
  const actualGp = dishActualGp(dish);
  const ingredientTable = ingredientRows(dish);

  const coverHtml = buildReportCoverHtml({
    reportType: 'Dish Spec Sheet',
    clientName: safe(dish.name) || safe(menuRecord.title) || 'Dish Handover',
    preparedDate: formatShortDate(menuRecord.updated_at),
    consultant: preparedBy,
    summary:
      'Kitchen-ready dish specification for consistent preparation, service delivery, allergen awareness, and client handover.',
    metrics: [
      { label: 'Selling price', value: currencyIfPositive(dish.sellPrice), primary: true },
      { label: 'Food cost', value: currencyIfPositive(foodCost) },
      { label: 'Actual GP', value: percentIfUseful(actualGp) }
    ],
    details: [
      { label: 'Client', value: safe(client.companyName) },
      { label: 'Site', value: siteLabel },
      { label: 'Menu', value: safe(menuRecord.title || menuRecord.data.menuName) },
      { label: 'Section', value: safe(sectionName) },
      { label: 'Portion', value: portionSize }
    ]
  });

  const overviewChapter = buildChapterHtml({
    kicker: 'Operational Handover',
    title: 'Dish Overview and Service Standard',
    lead: 'Client-facing dish detail for kitchen delivery, service consistency, and handover.',
    body: `
      ${buildDetailGridHtml([
        { label: 'Client', value: client.companyName },
        { label: 'Site', value: siteLabel },
        { label: 'Menu', value: menuRecord.title || menuRecord.data.menuName },
        { label: 'Section', value: sectionName },
        { label: 'Portion size', value: portionSize },
        { label: 'Portal visible', value: dish.specSheet.portalVisible ? yesNo(dish.specSheet.portalVisible) : '' }
      ])}
      ${buildStoryCardsHtml([
        { title: 'Dish description', body: dish.description || dish.notes },
        { title: 'Dietary tags', body: dish.dietaryTags.join(', ') },
        { title: 'Allergen information', body: dish.allergenInformation },
        { title: 'Equipment required', body: dish.specSheet.equipmentRequired || dish.equipmentRequired }
      ])}
    `
  });

  const methodBody = buildStoryCardsHtml([
    { title: 'Recipe method', body: dish.specSheet.recipeMethod || dish.recipeMethod },
    { title: 'Plating instructions', body: dish.specSheet.platingInstructions || dish.platingInstructions },
    { title: 'Prep notes', body: dish.specSheet.prepNotes || dish.prepNotes },
    { title: 'Service notes', body: dish.specSheet.serviceNotes || dish.serviceNotes },
    { title: 'Holding / storage notes', body: dish.specSheet.holdingStorageNotes || dish.holdingStorageNotes },
    { title: 'Client-facing notes', body: dish.specSheet.clientFacingNotes || dish.clientFacingNotes }
  ]);

  const methodChapter = methodBody
    ? buildChapterHtml({
      kicker: 'Kitchen Delivery',
      title: 'Method, Plating and Service Notes',
      lead: 'Operational guidance for the kitchen and service team.',
      body: methodBody
    })
    : '';

  const ingredientChapter =
    hasReportContent(ingredientTable)
      ? buildChapterHtml({
        kicker: 'Appendix',
        title: 'Ingredient Summary',
        lead: 'Ingredient-level detail for production and handover.',
        body: ingredientTable
      })
      : '';

  return `${coverHtml}${buildReportBodyHtml([overviewChapter, methodChapter, ingredientChapter])}`;
}

export function buildRecipeCostingReportHtml(options: {
  client: ClientProfile;
  menuRecord: SupabaseRecord<MenuProjectState>;
  dish: MenuDish;
  sectionName: string;
  preparedBy?: string;
}) {
  const { client, menuRecord, dish, sectionName, preparedBy = 'The Final Check' } = options;
  const totalRecipeCost = dishIngredientCost(dish);
  const portions = Math.max(num(dish.recipeCosting.numberOfPortions), 0);
  const costPerPortion = portions > 0 ? totalRecipeCost / portions : 0;
  const actualGp = dishActualGp(dish);
  const suggestedSell = dishRecommendedPrice(dish);
  const siteLabel = reportSiteLabel(client, menuRecord);
  const portionSize = safe(dish.recipeCosting.portionSize || dish.portionSize);
  const ingredientTable = ingredientRows(dish);

  const coverHtml = buildReportCoverHtml({
    reportType: 'Recipe Costing Sheet',
    clientName: safe(dish.name) || safe(menuRecord.title) || 'Recipe Costing',
    preparedDate: formatShortDate(menuRecord.updated_at),
    consultant: preparedBy,
    summary:
      'Commercial recipe costing for GP discipline, pricing review, and operational cost control.',
    metrics: [
      { label: 'Total recipe cost', value: currencyIfPositive(totalRecipeCost), primary: true },
      { label: 'Cost / portion', value: currencyIfPositive(costPerPortion) },
      { label: 'Suggested sell', value: currencyIfPositive(suggestedSell) }
    ],
    details: [
      { label: 'Client', value: safe(client.companyName) },
      { label: 'Site', value: siteLabel },
      { label: 'Menu', value: safe(menuRecord.title || menuRecord.data.menuName) },
      { label: 'Section', value: safe(sectionName) },
      { label: 'Portion', value: portionSize }
    ]
  });

  const costingChapter = buildChapterHtml({
    kicker: 'Commercial Summary',
    title: 'Recipe Cost and GP Position',
    lead: 'Client-facing costing summary for pricing decisions and margin protection.',
    body: `
      ${buildSummaryGridHtml([
        { label: 'Selling price', value: currencyIfPositive(dish.sellPrice) },
        { label: 'Recipe portions', value: portions > 0 ? String(portions) : '' },
        { label: 'Total recipe cost', value: currencyIfPositive(totalRecipeCost) },
        { label: 'Cost per portion', value: currencyIfPositive(costPerPortion) },
        { label: 'Actual GP', value: percentIfUseful(actualGp) },
        { label: 'Target GP', value: percentIfUseful(dish.recipeCosting.targetGpPercentage || dish.targetGp) },
        { label: 'Suggested sell price', value: currencyIfPositive(suggestedSell) },
        { label: 'Prepared', value: formatShortDate(menuRecord.updated_at) }
      ])}
      ${buildDetailGridHtml([
        { label: 'Client', value: client.companyName },
        { label: 'Site', value: siteLabel },
        { label: 'Menu', value: menuRecord.title || menuRecord.data.menuName },
        { label: 'Section', value: sectionName },
        { label: 'VAT included', value: dish.recipeCosting.vatEnabled ? yesNo(dish.recipeCosting.vatEnabled) : '' }
      ])}
    `
  });

  const ingredientChapter = ingredientTable
    ? buildChapterHtml({
      kicker: 'Costing Detail',
      title: 'Ingredient Costing',
      lead: 'Ingredient-level costing detail for kitchen management and price review.',
      body: ingredientTable
    })
    : '';

  const notesBody = buildStoryCardsHtml([
    { title: 'Recipe costing notes', body: dish.recipeCosting.notes },
    { title: 'Method / production notes', body: dish.recipeMethod || dish.specSheet.recipeMethod }
  ]);

  const notesChapter = notesBody
    ? buildChapterHtml({
      kicker: 'Notes',
      title: 'Costing and Production Notes',
      body: notesBody
    })
    : '';

  return `${coverHtml}${buildReportBodyHtml([costingChapter, ingredientChapter, notesChapter])}`;
}

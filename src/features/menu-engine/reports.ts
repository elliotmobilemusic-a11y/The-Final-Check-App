import type { ClientProfile, MenuDish, MenuProjectState, SupabaseRecord } from '../../types';
import { fmtCurrency, fmtPercent, num, safe } from '../../lib/utils';
import {
  buildCalloutHtml,
  buildChapterHtml,
  buildOperationalCoverHtml,
  buildCommercialCoverHtml,
  buildReportBodyHtml,
  buildSectionHtml,
  buildStoryCardsHtml,
  escapeHtml,
  hasReportContent
} from '../../reports/pdf';
import { dishActualGp, dishIngredientCost, dishRecommendedPrice } from '../profit/menuProfit';

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

/* ================================================================
   DISH SPEC SHEET  —  Operational Handover family
   ================================================================ */

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

  // Chips: dietary tags + key flags
  const chips: string[] = [
    ...(dish.dietaryTags ?? []),
    dish.specSheet.portalVisible ? 'Portal visible' : ''
  ].filter(Boolean);

  // ──────────────────────────────────────────────
  // OPERATIONAL COVER
  // ──────────────────────────────────────────────
  const coverHtml = buildOperationalCoverHtml({
    reportType: 'Dish Spec Sheet',
    dishName: safe(dish.name) || safe(menuRecord.title) || 'Dish Handover',
    preparedDate: formatShortDate(menuRecord.updated_at),
    consultant: preparedBy,
    chips,
    metrics: [
      { label: 'Selling Price', value: currencyIfPositive(dish.sellPrice), primary: true },
      { label: 'Food Cost', value: currencyIfPositive(foodCost) },
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

  // ──────────────────────────────────────────────
  // PAGE 2 — SPECIFICATION & METHOD
  // Allergens prominent; description first; then method sections
  // ──────────────────────────────────────────────
  const allergenInfo = safe(dish.allergenInformation);
  const description = safe(dish.description || dish.notes);
  const equipment = safe(dish.specSheet.equipmentRequired || dish.equipmentRequired);
  const method = safe(dish.specSheet.recipeMethod || dish.recipeMethod);
  const plating = safe(dish.specSheet.platingInstructions || dish.platingInstructions);
  const prepNotes = safe(dish.specSheet.prepNotes || dish.prepNotes);
  const serviceNotes = safe(dish.specSheet.serviceNotes || dish.serviceNotes);
  const holdingNotes = safe(dish.specSheet.holdingStorageNotes || dish.holdingStorageNotes);
  const clientNotes = safe(dish.specSheet.clientFacingNotes || dish.clientFacingNotes);

  const specSections: string[] = [];

  if (allergenInfo) {
    specSections.push(
      buildCalloutHtml(allergenInfo, { title: 'Allergen Information', variant: 'warn' })
    );
  }

  if (description) {
    specSections.push(buildSectionHtml('Dish Description', `<p>${escapeHtml(description)}</p>`));
  }

  if (equipment) {
    specSections.push(buildSectionHtml('Equipment Required', `<p>${escapeHtml(equipment)}</p>`));
  }

  if (portionSize) {
    specSections.push(
      buildSectionHtml('Portion', `<p>${escapeHtml(portionSize)}</p>`)
    );
  }

  // Method, plating, prep/service/holding as story cards
  const methodCards = buildStoryCardsHtml([
    { title: 'Recipe Method', body: method },
    { title: 'Plating Instructions', body: plating },
    { title: 'Prep Notes', body: prepNotes },
    { title: 'Service Notes', body: serviceNotes },
    { title: 'Holding & Storage', body: holdingNotes },
    { title: 'Client-Facing Notes', body: clientNotes }
  ]);

  if (methodCards) {
    specSections.push(buildSectionHtml('Method, Plating & Service', methodCards));
  }

  const specChapter = buildChapterHtml({
    kicker: 'Kitchen Specification',
    title: `${safe(dish.name) || 'Dish'} — Service Standard`,
    lead:
      'Specification for consistent kitchen delivery, service, allergen awareness, and handover.',
    body: specSections.join('')
  });

  // ──────────────────────────────────────────────
  // PAGE 3 — INGREDIENT APPENDIX (if applicable)
  // ──────────────────────────────────────────────
  const ingredientChapter =
    hasReportContent(ingredientTable)
      ? buildChapterHtml({
          kicker: 'Appendix',
          title: 'Ingredient Summary',
          lead: 'Ingredient-level detail for production, purchasing, and handover.',
          body: ingredientTable
        })
      : '';

  return `${coverHtml}${buildReportBodyHtml([specChapter, ingredientChapter])}`;
}

/* ================================================================
   RECIPE COSTING SHEET  —  Commercial Costing family
   ================================================================ */

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
  const targetGp = num(dish.recipeCosting.targetGpPercentage || dish.targetGp);
  const siteLabel = reportSiteLabel(client, menuRecord);
  const portionSize = safe(dish.recipeCosting.portionSize || dish.portionSize);
  const ingredientTable = ingredientRows(dish);

  const gpGap = targetGp > 0 && actualGp > 0 ? targetGp - actualGp : 0;
  const gpStatus =
    gpGap > 3
      ? {
          label: `${gpGap.toFixed(1)} pts below target — current GP ${fmtPercent(actualGp)} vs target ${fmtPercent(targetGp)}. Suggest reviewing sell price or ingredient sourcing.`,
          variant: 'below' as const
        }
      : gpGap > 0
        ? {
            label: `${gpGap.toFixed(1)} pts below target — GP at ${fmtPercent(actualGp)} vs target ${fmtPercent(targetGp)}.`,
            variant: 'below' as const
          }
        : actualGp > 0 && targetGp > 0
          ? {
              label: `GP on target — ${fmtPercent(actualGp)} achieved vs ${fmtPercent(targetGp)} target.`,
              variant: 'above' as const
            }
          : undefined;

  // ──────────────────────────────────────────────
  // COMMERCIAL COVER
  // ──────────────────────────────────────────────
  const coverHtml = buildCommercialCoverHtml({
    reportType: 'Recipe Costing Sheet',
    dishName: safe(dish.name) || safe(menuRecord.title) || 'Recipe Costing',
    preparedDate: formatShortDate(menuRecord.updated_at),
    consultant: preparedBy,
    numbers: [
      { label: 'Sell Price', value: currencyIfPositive(dish.sellPrice), primary: true },
      { label: 'Cost / Portion', value: currencyIfPositive(costPerPortion) },
      { label: 'Actual GP', value: percentIfUseful(actualGp) }
    ],
    gpStatus,
    details: [
      { label: 'Client', value: safe(client.companyName) },
      { label: 'Site', value: siteLabel },
      { label: 'Menu', value: safe(menuRecord.title || menuRecord.data.menuName) },
      { label: 'Section', value: safe(sectionName) },
      { label: 'Portions', value: portions > 0 ? String(portions) : '' }
    ]
  });

  // ──────────────────────────────────────────────
  // PAGE 2 — COSTING SUMMARY
  // GP-first, clean costing table
  // ──────────────────────────────────────────────
  const vatNote = dish.recipeCosting.vatEnabled ? 'VAT included in sell price.' : '';

  const costingBody = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${dish.sellPrice > 0 ? `<tr><td>Selling Price</td><td><strong>${fmtCurrency(dish.sellPrice)}</strong></td></tr>` : ''}
        ${totalRecipeCost > 0 ? `<tr><td>Total Recipe Cost</td><td>${fmtCurrency(totalRecipeCost)}</td></tr>` : ''}
        ${portions > 0 ? `<tr><td>Recipe Portions</td><td>${portions}</td></tr>` : ''}
        ${costPerPortion > 0 ? `<tr><td>Cost per Portion</td><td><strong>${fmtCurrency(costPerPortion)}</strong></td></tr>` : ''}
        ${actualGp > 0 ? `<tr><td>Actual GP</td><td><strong style="${actualGp < targetGp - 3 ? 'color:#b71c1c' : actualGp < targetGp ? 'color:#bf360c' : 'color:#2e7d32'}">${fmtPercent(actualGp)}</strong></td></tr>` : ''}
        ${targetGp > 0 ? `<tr><td>Target GP</td><td>${fmtPercent(targetGp)}</td></tr>` : ''}
        ${suggestedSell > 0 && Math.abs(suggestedSell - dish.sellPrice) > 0.01 ? `<tr><td>Suggested Sell Price</td><td><strong>${fmtCurrency(suggestedSell)}</strong></td></tr>` : ''}
        ${vatNote ? `<tr><td>VAT</td><td>${vatNote}</td></tr>` : ''}
      </tbody>
    </table>

    ${gpGap > 0 && totalRecipeCost > 0
      ? buildCalloutHtml(
          gpGap > 3
            ? `Sell price of ${fmtCurrency(dish.sellPrice)} produces a GP of ${fmtPercent(actualGp)} — ${fmtPercent(gpGap)} below the ${fmtPercent(targetGp)} target. Suggested sell price to hit target: ${fmtCurrency(suggestedSell)}.`
            : `GP is ${fmtPercent(gpGap)} below target. Minor price adjustment or ingredient review may close the gap.`,
          { title: 'GP Gap', variant: gpGap > 3 ? 'risk' : 'warn' }
        )
      : ''}

    <div class="summary-grid" style="margin-top: 14px;">
      ${safe(client.companyName) ? `<div class="meta-card"><span>Client</span><strong>${escapeHtml(safe(client.companyName) || '')}</strong></div>` : ''}
      ${siteLabel ? `<div class="meta-card"><span>Site</span><strong>${escapeHtml(siteLabel)}</strong></div>` : ''}
      ${portionSize ? `<div class="meta-card"><span>Portion</span><strong>${escapeHtml(portionSize)}</strong></div>` : ''}
    </div>
  `;

  const costingChapter = buildChapterHtml({
    kicker: 'Commercial Summary',
    title: 'GP Position & Recipe Costing',
    lead:
      'Commercial summary for pricing review, margin protection, and client cost control.',
    body: costingBody
  });

  // ──────────────────────────────────────────────
  // PAGE 3 — INGREDIENT DETAIL
  // ──────────────────────────────────────────────
  const ingredientChapter = ingredientTable
    ? buildChapterHtml({
        kicker: 'Costing Detail',
        title: 'Ingredient Costing',
        lead: 'Ingredient-level costing breakdown for kitchen management and pricing review.',
        body: ingredientTable
      })
    : '';

  // ──────────────────────────────────────────────
  // PAGE 4 — NOTES (conditional)
  // ──────────────────────────────────────────────
  const notesBody = buildStoryCardsHtml([
    { title: 'Costing Notes', body: dish.recipeCosting.notes },
    { title: 'Method / Production Notes', body: dish.recipeMethod || dish.specSheet.recipeMethod }
  ]);

  const notesChapter = notesBody
    ? buildChapterHtml({
        kicker: 'Notes',
        title: 'Costing & Production Notes',
        body: notesBody
      })
    : '';

  return `${coverHtml}${buildReportBodyHtml([costingChapter, ingredientChapter, notesChapter])}`;
}

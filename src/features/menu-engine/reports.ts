import type { ClientProfile, MenuDish, MenuProjectState, SupabaseRecord } from '../../types';
import { fmtCurrency, fmtPercent, num, safe } from '../../lib/utils';
import {
  buildCalloutHtml,
  buildChapterHtml,
  buildOperationalCoverHtml,
  buildCommercialCoverHtml,
  buildDefinitionListHtml,
  buildDocumentPanelHtml,
  buildReportBodyHtml,
  buildStoryCardsHtml,
  escapeHtml,
  hasReportContent,
  normalizeProseText
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
    <table class="report-table report-table-compact pdf-ingredient-ledger">
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

  const standardRows = [
    { label: 'Recipe Method', value: method },
    { label: 'Plating', value: plating },
    { label: 'Prep', value: prepNotes },
    { label: 'Service', value: serviceNotes },
    { label: 'Holding', value: holdingNotes },
    { label: 'Client Notes', value: clientNotes }
  ].filter((item) => hasReportContent(item.value));

  const specSheet = `
    <section class="pdf-sheet-page pdf-sheet-page--operational">
      <header class="pdf-sheet-header">
        <div>
          <span>Kitchen Handover</span>
          <h2>Service Standard</h2>
        </div>
        <div class="pdf-sheet-header-meta">
          ${escapeHtml(safe(dish.name) || 'Dish Spec')}<br />
          ${siteLabel ? escapeHtml(siteLabel) : 'Kitchen issue copy'}
        </div>
      </header>

      <div class="pdf-operational-sheet-grid">
        <aside class="pdf-operational-side">
          ${buildDocumentPanelHtml(
            'Service Facts',
            buildDefinitionListHtml([
              { label: 'Portion', value: portionSize },
              { label: 'Section', value: sectionName },
              { label: 'Selling Price', value: currencyIfPositive(dish.sellPrice) },
              { label: 'Food Cost', value: currencyIfPositive(foodCost) },
              { label: 'Actual GP', value: percentIfUseful(actualGp) },
              { label: 'Menu', value: safe(menuRecord.title || menuRecord.data.menuName) }
            ]),
            { eyebrow: 'At Pass' }
          )}
          ${allergenInfo ? buildCalloutHtml(allergenInfo, { title: 'Allergen Information', variant: 'warn' }) : ''}
          ${equipment ? buildDocumentPanelHtml('Equipment Required', `<p>${escapeHtml(normalizeProseText(equipment))}</p>`) : ''}
        </aside>

        <main class="pdf-operational-main">
          ${description ? buildDocumentPanelHtml('Dish Description', `<p>${escapeHtml(normalizeProseText(description))}</p>`, { eyebrow: 'Guest Promise' }) : ''}
          ${standardRows
            .map(
              (item) => `
                <div class="pdf-kitchen-standard">
                  <strong>${escapeHtml(item.label)}</strong>
                  <p>${escapeHtml(normalizeProseText(item.value))}</p>
                </div>
              `
            )
            .join('')}
        </main>
      </div>
    </section>
  `;

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

  return `${coverHtml}${buildReportBodyHtml([specSheet, ingredientChapter], 'operational')}`;
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

  const costingSheet = `
    <section class="pdf-sheet-page pdf-sheet-page--commercial">
      <header class="pdf-sheet-header">
        <div>
          <span>Commercial Costing</span>
          <h2>GP Position & Recipe Costing</h2>
        </div>
        <div class="pdf-sheet-header-meta">
          ${escapeHtml(safe(dish.name) || 'Recipe Costing')}<br />
          ${siteLabel ? escapeHtml(siteLabel) : 'Commercial review copy'}
        </div>
      </header>

      <div class="pdf-commercial-ledger">
        ${buildDocumentPanelHtml(
          'Commercial Lines',
          `<div class="pdf-cost-stack">
            ${dish.sellPrice > 0 ? `<div class="pdf-cost-line pdf-cost-line--primary"><span>Selling Price</span><strong>${fmtCurrency(dish.sellPrice)}</strong></div>` : ''}
            ${costPerPortion > 0 ? `<div class="pdf-cost-line"><span>Cost / Portion</span><strong>${fmtCurrency(costPerPortion)}</strong></div>` : ''}
            ${actualGp > 0 ? `<div class="pdf-cost-line"><span>Actual GP</span><strong style="${actualGp < targetGp - 3 ? 'color:#b71c1c' : actualGp < targetGp ? 'color:#bf360c' : 'color:#2e7d32'}">${fmtPercent(actualGp)}</strong></div>` : ''}
            ${targetGp > 0 ? `<div class="pdf-cost-line"><span>Target GP</span><strong>${fmtPercent(targetGp)}</strong></div>` : ''}
            ${suggestedSell > 0 && Math.abs(suggestedSell - dish.sellPrice) > 0.01 ? `<div class="pdf-cost-line"><span>Suggested Sell</span><strong>${fmtCurrency(suggestedSell)}</strong></div>` : ''}
          </div>`,
          { eyebrow: 'Pricing Decision' }
        )}

        ${buildDocumentPanelHtml(
          'Recipe Basis',
          buildDefinitionListHtml([
            { label: 'Total Recipe Cost', value: totalRecipeCost > 0 ? fmtCurrency(totalRecipeCost) : '' },
            { label: 'Recipe Portions', value: portions > 0 ? String(portions) : '' },
            { label: 'Portion Size', value: portionSize },
            { label: 'Section', value: sectionName },
            { label: 'Client', value: safe(client.companyName) },
            { label: 'VAT', value: vatNote }
          ]),
          { eyebrow: 'Cost Assumptions' }
        )}
      </div>

      ${gpGap > 0 && totalRecipeCost > 0
        ? buildCalloutHtml(
            gpGap > 3
              ? `Sell price of ${fmtCurrency(dish.sellPrice)} produces a GP of ${fmtPercent(actualGp)} — ${fmtPercent(gpGap)} below the ${fmtPercent(targetGp)} target. Suggested sell price to hit target: ${fmtCurrency(suggestedSell)}.`
              : `GP is ${fmtPercent(gpGap)} below target. Minor price adjustment or ingredient review may close the gap.`,
            { title: 'GP Gap', variant: gpGap > 3 ? 'risk' : 'warn' }
          )
        : ''}
    </section>
  `;

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

  return `${coverHtml}${buildReportBodyHtml([costingSheet, ingredientChapter, notesChapter], 'commercial')}`;
}

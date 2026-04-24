import type { ClientProfile, MenuDish, MenuProjectState, SupabaseRecord } from '../../types';
import { fmtCurrency, fmtPercent, num } from '../../lib/utils';
import { buildReportHeroHtml } from '../clients/clientExports';
import { dishActualGp, dishIngredientCost, dishRecommendedPrice } from '../profit/menuProfit';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not set';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No';
}

function ingredientRows(dish: MenuDish) {
  const rows = dish.ingredients.filter((ingredient) => ingredient.name.trim());
  if (!rows.length) {
    return '<p class="muted">No ingredient lines recorded.</p>';
  }

  return `
    <table class="report-table report-table-compact">
      <thead>
        <tr>
          <th>Ingredient</th>
          <th>Supplier</th>
          <th>Qty used</th>
          <th>Pack size</th>
          <th>Pack cost</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (ingredient) => `
              <tr>
                <td>${escapeHtml(ingredient.name)}</td>
                <td>${escapeHtml(ingredient.supplier || 'Not recorded')}</td>
                <td>${escapeHtml(`${num(ingredient.qtyUsed)} ${ingredient.qtyUnit}`)}</td>
                <td>${escapeHtml(`${num(ingredient.packQty)} ${ingredient.packUnit}`)}</td>
                <td>${escapeHtml(fmtCurrency(num(ingredient.packCost)))}</td>
              </tr>
            `
          )
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
  const { client, menuRecord, dish, sectionName, preparedBy = 'Jason Wardill / The Final Check' } = options;
  const siteLabel = menuRecord.site_name || menuRecord.data.siteName || client.location || 'Account level';

  return `
    ${buildReportHeroHtml({
      eyebrow: 'Dish spec sheet',
      title: dish.name || 'Dish spec',
      leadHtml: `<strong>${escapeHtml(client.companyName || 'Client')}</strong> • ${escapeHtml(
        menuRecord.title || menuRecord.data.menuName || 'Menu'
      )} • ${escapeHtml(sectionName || 'Menu section')}`,
      description: 'Dish specification prepared from the linked menu-engine record for kitchen delivery, consistency, and client handover.',
      chips: [siteLabel, dish.portionSize || 'Portion not set', preparedBy],
      cards: [
        { label: 'Selling price', value: fmtCurrency(dish.sellPrice) },
        { label: 'Food cost', value: fmtCurrency(dishIngredientCost(dish)) },
        { label: 'GP', value: fmtPercent(dishActualGp(dish)) },
        { label: 'Prepared', value: formatDate(menuRecord.updated_at) }
      ]
    })}

    <div class="summary-grid">
      <div class="meta-card"><span>Client</span><strong>${escapeHtml(client.companyName || 'Not set')}</strong></div>
      <div class="meta-card"><span>Site</span><strong>${escapeHtml(siteLabel)}</strong></div>
      <div class="meta-card"><span>Menu</span><strong>${escapeHtml(menuRecord.title || menuRecord.data.menuName || 'Not set')}</strong></div>
      <div class="meta-card"><span>Section</span><strong>${escapeHtml(sectionName || 'Not set')}</strong></div>
      <div class="meta-card"><span>Portion size</span><strong>${escapeHtml(dish.specSheet.portionSize || dish.portionSize || 'Not set')}</strong></div>
      <div class="meta-card"><span>Portal visible</span><strong>${yesNo(dish.specSheet.portalVisible)}</strong></div>
    </div>

    <section>
      <h2>Dish overview</h2>
      <div class="report-grid columns-2">
        <div><h3>Dish description</h3><p>${escapeHtml(dish.description || dish.notes || 'Not recorded')}</p></div>
        <div><h3>Dietary tags</h3><p>${escapeHtml(dish.dietaryTags.join(', ') || 'Not recorded')}</p></div>
      </div>
      <div class="report-grid columns-2">
        <div><h3>Allergen information</h3><p>${escapeHtml(dish.allergenInformation || 'Not recorded')}</p></div>
        <div><h3>Equipment required</h3><p>${escapeHtml(dish.specSheet.equipmentRequired || dish.equipmentRequired || 'Not recorded')}</p></div>
      </div>
    </section>

    <section>
      <h2>Method and plating</h2>
      <div class="report-grid columns-2">
        <div><h3>Recipe method</h3><p>${escapeHtml(dish.specSheet.recipeMethod || dish.recipeMethod || 'Not recorded')}</p></div>
        <div><h3>Plating instructions</h3><p>${escapeHtml(dish.specSheet.platingInstructions || dish.platingInstructions || 'Not recorded')}</p></div>
      </div>
    </section>

    <section>
      <h2>Kitchen notes</h2>
      <div class="report-grid columns-2">
        <div><h3>Prep notes</h3><p>${escapeHtml(dish.specSheet.prepNotes || dish.prepNotes || 'Not recorded')}</p></div>
        <div><h3>Service notes</h3><p>${escapeHtml(dish.specSheet.serviceNotes || dish.serviceNotes || 'Not recorded')}</p></div>
        <div><h3>Holding / storage notes</h3><p>${escapeHtml(dish.specSheet.holdingStorageNotes || dish.holdingStorageNotes || 'Not recorded')}</p></div>
        <div><h3>Client-facing notes</h3><p>${escapeHtml(dish.specSheet.clientFacingNotes || dish.clientFacingNotes || 'Not recorded')}</p></div>
      </div>
    </section>

    <section>
      <h2>Ingredient summary</h2>
      ${ingredientRows(dish)}
    </section>
  `;
}

export function buildRecipeCostingReportHtml(options: {
  client: ClientProfile;
  menuRecord: SupabaseRecord<MenuProjectState>;
  dish: MenuDish;
  sectionName: string;
  preparedBy?: string;
}) {
  const { client, menuRecord, dish, sectionName, preparedBy = 'Jason Wardill / The Final Check' } = options;
  const totalRecipeCost = dishIngredientCost(dish);
  const portions = Math.max(num(dish.recipeCosting.numberOfPortions), 1);
  const costPerPortion = totalRecipeCost / portions;
  const actualGp = dishActualGp(dish);
  const suggestedSell = dishRecommendedPrice(dish);
  const siteLabel = menuRecord.site_name || menuRecord.data.siteName || client.location || 'Account level';

  return `
    ${buildReportHeroHtml({
      eyebrow: 'Recipe costing sheet',
      title: dish.name || 'Recipe costing',
      leadHtml: `<strong>${escapeHtml(client.companyName || 'Client')}</strong> • ${escapeHtml(
        menuRecord.title || menuRecord.data.menuName || 'Menu'
      )} • ${escapeHtml(sectionName || 'Menu section')}`,
      description: 'Recipe costing prepared from the linked menu-engine dish record for pricing, GP discipline, and operational control.',
      chips: [siteLabel, dish.recipeCosting.portionSize || dish.portionSize || 'Portion not set', preparedBy],
      cards: [
        { label: 'Total recipe cost', value: fmtCurrency(totalRecipeCost) },
        { label: 'Cost / portion', value: fmtCurrency(costPerPortion) },
        { label: 'Actual GP', value: fmtPercent(actualGp) },
        { label: 'Suggested sell', value: fmtCurrency(suggestedSell) }
      ]
    })}

    <div class="summary-grid">
      <div class="meta-card"><span>Client</span><strong>${escapeHtml(client.companyName || 'Not set')}</strong></div>
      <div class="meta-card"><span>Site</span><strong>${escapeHtml(siteLabel)}</strong></div>
      <div class="meta-card"><span>Menu</span><strong>${escapeHtml(menuRecord.title || menuRecord.data.menuName || 'Not set')}</strong></div>
      <div class="meta-card"><span>Section</span><strong>${escapeHtml(sectionName || 'Not set')}</strong></div>
      <div class="meta-card"><span>Target GP</span><strong>${escapeHtml(fmtPercent(dish.recipeCosting.targetGpPercentage || dish.targetGp))}</strong></div>
      <div class="meta-card"><span>VAT included</span><strong>${yesNo(dish.recipeCosting.vatEnabled)}</strong></div>
    </div>

    <section>
      <h2>Commercial costing summary</h2>
      <div class="report-grid columns-4">
        <div><h3>Selling price</h3><p>${escapeHtml(fmtCurrency(dish.sellPrice))}</p></div>
        <div><h3>Recipe portions</h3><p>${escapeHtml(String(portions))}</p></div>
        <div><h3>Total recipe cost</h3><p>${escapeHtml(fmtCurrency(totalRecipeCost))}</p></div>
        <div><h3>Cost per portion</h3><p>${escapeHtml(fmtCurrency(costPerPortion))}</p></div>
      </div>
      <div class="report-grid columns-4">
        <div><h3>Actual GP</h3><p>${escapeHtml(fmtPercent(actualGp))}</p></div>
        <div><h3>Target GP</h3><p>${escapeHtml(fmtPercent(dish.recipeCosting.targetGpPercentage || dish.targetGp))}</p></div>
        <div><h3>Suggested sell price</h3><p>${escapeHtml(fmtCurrency(suggestedSell))}</p></div>
        <div><h3>Prepared</h3><p>${escapeHtml(formatDate(menuRecord.updated_at))}</p></div>
      </div>
    </section>

    <section>
      <h2>Ingredient costing</h2>
      ${ingredientRows(dish)}
    </section>

    <section>
      <h2>Costing notes</h2>
      <div class="report-grid columns-2">
        <div><h3>Recipe costing notes</h3><p>${escapeHtml(dish.recipeCosting.notes || 'Not recorded')}</p></div>
        <div><h3>Method / production notes</h3><p>${escapeHtml(dish.recipeMethod || dish.specSheet.recipeMethod || 'Not recorded')}</p></div>
      </div>
    </section>
  `;
}

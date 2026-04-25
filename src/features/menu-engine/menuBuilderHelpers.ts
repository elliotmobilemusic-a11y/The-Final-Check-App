import type { ClientProfile, ClientRecord, MenuDish, MenuProjectState, SupabaseRecord } from '../../types';
import { fmtCurrency, fmtPercent, num, safe, todayIso, uid } from '../../lib/utils';
import { createEmptyClientData } from '../clients/clientData';
import { buildReportCoverHtml } from '../../reports/pdf';
import {
  buildMenuProfitSummary,
  dishActualGp,
  dishIngredientCost,
  dishPriceGap,
  dishProfitPerSale,
  dishWeeklyOpportunity,
  dishWeeklyProfit
} from '../profit/menuProfit';
import { normalizeDish } from './dishRecords';

export const MENU_BUILDER_DRAFT_KEY = 'menu-builder-draft-v1';
export type DishEditorTab = 'overview' | 'recipe' | 'spec' | 'allergens' | 'images';
export type MenuInsightTone = 'success' | 'warning' | 'danger';
export type MenuInsight = {
  tone: MenuInsightTone;
  title: string;
  detail: string;
};

export function buildReportClientProfile(client: ClientRecord | null, project: MenuProjectState): ClientProfile {
  return {
    id: client?.id,
    companyName: client?.company_name || project.siteName || 'Client not linked',
    contactName: client?.contact_name || '',
    contactEmail: client?.contact_email || '',
    contactPhone: client?.contact_phone || '',
    location: client?.location || project.siteName || '',
    notes: client?.notes || '',
    logoUrl: client?.logo_url || '',
    coverUrl: client?.cover_url || '',
    status: client?.status || 'Active',
    tier: client?.tier || '',
    industry: client?.industry || 'Hospitality',
    website: client?.website || '',
    nextReviewDate: client?.next_review_date || project.reviewDate,
    tags: client?.tags || [],
    data: createEmptyClientData(),
    createdAt: client?.created_at,
    updatedAt: client?.updated_at
  };
}

export function buildReportMenuRecord(project: MenuProjectState): SupabaseRecord<MenuProjectState> {
  const timestamp = project.updatedAt || new Date().toISOString();

  return {
    id: project.id || 'draft-menu',
    user_id: 'local-menu-builder',
    client_id: project.clientId ?? null,
    client_site_id: project.clientSiteId ?? null,
    title: project.menuName || 'Menu project',
    site_name: project.siteName || null,
    location: project.siteName || null,
    review_date: project.reviewDate || null,
    data: project,
    created_at: project.createdAt || timestamp,
    updated_at: timestamp
  };
}

export function normalizeMenuProject(project: MenuProjectState): MenuProjectState {
  return {
    ...project,
    clientSiteId: project.clientSiteId ?? null,
    sections: (project.sections ?? []).map((section) => ({
      ...section,
      dishes: (section.dishes ?? []).map((dish) => normalizeDish(dish))
    }))
  };
}

export function createDefaultMenu(clientId: string | null = null): MenuProjectState {
  const startersId = uid('section');

  return {
    id: undefined,
    clientId,
    clientSiteId: null,
    menuName: 'Spring Main Menu',
    siteName: '',
    reviewDate: todayIso(),
    defaultTargetGp: 65,
    selectedSectionId: startersId,
    sections: [{ id: startersId, name: 'Starters', dishes: [] }]
  };
}

export function dishUnitCost(dish: MenuDish) {
  return dishIngredientCost(dish);
}

export function dishMixCost(dish: MenuDish) {
  return dishUnitCost(dish) * Math.max(num(dish.weeklySalesVolume), 0);
}

export function dishTheoGp(dish: MenuDish) {
  return dishActualGp(dish);
}

export function dishProfit(dish: MenuDish) {
  return dishProfitPerSale(dish);
}

export function gpClass(dish: MenuDish) {
  const theo = dishTheoGp(dish);
  const target = num(dish.targetGp);
  if (theo >= target) return 'status-pill status-success';
  if (theo >= target - 3) return 'status-pill status-warning';
  return 'status-pill status-danger';
}

export function formatShortDate(value?: string | null) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function buildMenuReport(project: MenuProjectState) {
  const summary = buildMenuProfitSummary(project);
  const allDishes = summary.dishes;
  const topOpportunities = [...allDishes]
    .sort((left, right) => dishWeeklyOpportunity(right) - dishWeeklyOpportunity(left))
    .filter((dish) => dishWeeklyOpportunity(dish) > 0)
    .slice(0, 4);
  const strongestDishes = [...allDishes]
    .sort((left, right) => dishWeeklyProfit(right) - dishWeeklyProfit(left))
    .slice(0, 4);

  const coverHtml = buildReportCoverHtml({
    reportType: 'Menu Profit Engine',
    clientName: safe(project.siteName) || 'Client Site',
    preparedDate: formatShortDate(project.reviewDate),
    consultant: 'The Final Check',
    summary: 'Dish-level margin, weekly contribution, and pricing opportunity prepared for client review and PDF handover.',
    metrics: [
      { label: 'Weighted GP', value: fmtPercent(summary.weightedGp), primary: true },
      { label: 'Weekly profit', value: fmtCurrency(summary.weeklyProfit) },
      { label: 'Weekly opportunity', value: fmtCurrency(summary.totalOpportunity) }
    ],
    details: [
      { label: 'Menu', value: safe(project.menuName) || 'Not recorded' },
      { label: 'Sections', value: `${project.sections.length}` },
      { label: 'Dishes', value: `${allDishes.length}` },
      { label: 'Below target', value: `${summary.belowTargetCount}` }
    ]
  });

  return `
    ${coverHtml}

    <div class="summary-grid">
      <div class="meta-card"><span>Review date</span><strong>${formatShortDate(project.reviewDate)}</strong></div>
      <div class="meta-card"><span>Sections</span><strong>${project.sections.length}</strong></div>
      <div class="meta-card"><span>Total dishes</span><strong>${allDishes.length}</strong></div>
      <div class="meta-card"><span>Weighted GP</span><strong>${fmtPercent(summary.weightedGp)}</strong></div>
      <div class="meta-card"><span>Below target</span><strong>${summary.belowTargetCount}</strong></div>
      <div class="meta-card"><span>Weekly opportunity</span><strong>${fmtCurrency(summary.totalOpportunity)}</strong></div>
    </div>

    <section>
      <h2>Menu profit snapshot</h2>
      <p class="report-section-lead">Commercial headline numbers for the reviewed menu and its current profit position.</p>
      <div class="report-grid columns-4">
        <div><strong>Review date</strong><br />${formatShortDate(project.reviewDate)}</div>
        <div><strong>Sections</strong><br />${project.sections.length}</div>
        <div><strong>Total dishes</strong><br />${allDishes.length}</div>
        <div><strong>Dishes below target</strong><br />${summary.belowTargetCount}</div>
      </div>
    </section>

    <section>
      <h2>Menu highlights</h2>
      <p class="report-section-lead">Priority pricing opportunities and strongest commercial performers at a glance.</p>
      <div class="report-story-grid">
        <div class="report-story-card">
          <h3>Top opportunity dishes</h3>
          ${
            topOpportunities.length
              ? `<ul>${topOpportunities
                  .map(
                    (dish) =>
                      `<li><strong>${safe(dish.name)}</strong> — ${fmtCurrency(dishWeeklyOpportunity(dish))} weekly opportunity</li>`
                  )
                  .join('')}</ul>`
              : '<p>No material pricing opportunities recorded.</p>'
          }
        </div>
        <div class="report-story-card">
          <h3>Strongest contributors</h3>
          ${
            strongestDishes.length
              ? `<ul>${strongestDishes
                  .map(
                    (dish) =>
                      `<li><strong>${safe(dish.name)}</strong> — ${fmtCurrency(dishWeeklyProfit(dish))} weekly profit</li>`
                  )
                  .join('')}</ul>`
              : '<p>No dishes recorded yet.</p>'
          }
        </div>
      </div>
    </section>

    ${project.sections
      .map((section) => {
        const sectionRevenue = section.dishes.reduce(
          (sum, dish) => sum + num(dish.sellPrice) * Math.max(num(dish.weeklySalesVolume), 0),
          0
        );
        const sectionProfit = section.dishes.reduce((sum, dish) => sum + dishWeeklyProfit(dish), 0);
        const sectionGp =
          section.dishes.length > 0
            ? section.dishes.reduce((sum, dish) => sum + dishTheoGp(dish), 0) / section.dishes.length
            : 0;
        const sectionBelowTarget = section.dishes.filter((dish) => dishTheoGp(dish) < num(dish.targetGp)).length;
        const topSectionDish = [...section.dishes].sort(
          (left, right) => dishWeeklyProfit(right) - dishWeeklyProfit(left)
        )[0];
        const largestGap = section.dishes.length
          ? Math.max(...section.dishes.map((dish) => dishWeeklyOpportunity(dish)))
          : 0;

        return `
      <section>
        <h2>${section.name}</h2>
        <p class="report-section-lead">Section-level performance summary and dish detail for pricing review.</p>
        <div class="report-grid columns-4">
          <div><strong>Dishes</strong><br />${section.dishes.length}</div>
          <div><strong>Section revenue</strong><br />${fmtCurrency(sectionRevenue)}</div>
          <div><strong>Section profit</strong><br />${fmtCurrency(sectionProfit)}</div>
          <div><strong>Average actual GP</strong><br />${section.dishes.length ? fmtPercent(sectionGp) : 'No dishes'}</div>
        </div>
        <div class="report-grid columns-4">
          <div><strong>Below target</strong><br />${sectionBelowTarget}</div>
          <div><strong>Pricing changes needed</strong><br />${section.dishes.filter((dish) => Math.abs(dishPriceGap(dish)) >= 0.01).length}</div>
          <div><strong>Best performer</strong><br />${topSectionDish ? safe(topSectionDish.name) : 'No dishes'}</div>
          <div><strong>Largest gap</strong><br />${fmtCurrency(largestGap)}</div>
        </div>
        ${
          section.dishes.length
            ? `
        <table class="report-table report-table-compact">
          <thead>
            <tr>
              <th>Dish</th>
              <th>Ingredient cost</th>
              <th>Weekly cost</th>
              <th>Sell price</th>
              <th>Profit / sale</th>
              <th>Target GP</th>
              <th>Actual GP</th>
              <th>Sales mix %</th>
              <th>Weekly volume</th>
              <th>Weekly opportunity</th>
            </tr>
          </thead>
          <tbody>
            ${section.dishes
              .map(
                (dish) => `
              <tr>
                <td>${safe(dish.name)}</td>
                <td>${fmtCurrency(dishUnitCost(dish))}</td>
                <td>${fmtCurrency(dishMixCost(dish))}</td>
                <td>${fmtCurrency(dish.sellPrice)}</td>
                <td>${fmtCurrency(dishProfit(dish))}</td>
                <td>${fmtPercent(dish.targetGp)}</td>
                <td>${fmtPercent(dishTheoGp(dish))}</td>
                <td>${fmtPercent(dish.salesMixPercent)}</td>
                <td>${num(dish.weeklySalesVolume)}</td>
                <td>${fmtCurrency(dishWeeklyOpportunity(dish))}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>`
            : '<p class="muted-copy">No dishes in this section yet.</p>'
        }
      </section>
    `;
      })
      .join('')}
  `;
}

export function completionSummary(project: MenuProjectState) {
  const allDishes = project.sections.flatMap((section) => section.dishes);
  const checkpoints = [
    safe(project.menuName),
    safe(project.siteName),
    safe(project.reviewDate),
    project.clientId ? 'yes' : '',
    project.sections.length > 0 ? 'yes' : '',
    allDishes.length > 0 ? 'yes' : '',
    allDishes.some((dish) => num(dish.sellPrice) > 0) ? 'yes' : '',
    allDishes.some((dish) => dish.ingredients.some((ingredient) => safe(ingredient.name))) ? 'yes' : '',
    allDishes.some((dish) => num(dish.weeklySalesVolume) > 0) ? 'yes' : '',
    allDishes.some((dish) => num(dish.targetGp) > 0) ? 'yes' : ''
  ];
  const complete = checkpoints.filter(Boolean).length;
  const total = checkpoints.length;
  const percent = Math.round((complete / total) * 100);
  return { complete, total, percent };
}

export function toneClass(tone: MenuInsightTone) {
  if (tone === 'danger') return 'status-pill status-danger';
  if (tone === 'warning') return 'status-pill status-warning';
  return 'status-pill status-success';
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
}

export function buildMenuInsights(
  project: MenuProjectState,
  weightedGp: number,
  totalRevenue: number,
  totalProfit: number
): MenuInsight[] {
  const dishes = project.sections.flatMap((section) => section.dishes);
  const belowTarget = dishes.filter((dish) => dishTheoGp(dish) < num(dish.targetGp) - 3);
  const strongDishes = dishes.filter((dish) => dishTheoGp(dish) >= num(dish.targetGp));
  const noSellPrice = dishes.filter((dish) => num(dish.sellPrice) <= 0);
  const noIngredients = dishes.filter(
    (dish) => dish.ingredients.filter((ingredient) => safe(ingredient.name)).length === 0
  );
  const insights: MenuInsight[] = [];

  if (!project.clientId) {
    insights.push({
      tone: 'warning',
      title: 'No client linked yet',
      detail: 'Link this menu project to a client profile so it becomes part of that business record.'
    });
  }

  if (!dishes.length) {
    insights.push({
      tone: 'warning',
      title: 'Menu structure not built yet',
      detail: 'Add sections and dishes before the commercial analysis becomes useful.'
    });
  }

  if (dishes.length > 0 && weightedGp < num(project.defaultTargetGp) - 3) {
    insights.push({
      tone: 'danger',
      title: 'Theo GP is below target',
      detail: `The menu is currently tracking at ${fmtPercent(weightedGp)} against a default target of ${fmtPercent(project.defaultTargetGp)} and is leaking weekly profit.`
    });
  } else if (dishes.length > 0 && weightedGp < num(project.defaultTargetGp)) {
    insights.push({
      tone: 'warning',
      title: 'Theo GP is close to target',
      detail: 'Some dishes need tighter costing, better pricing, or cleaner portion control before the leakage compounds.'
    });
  } else if (dishes.length > 0) {
    insights.push({
      tone: 'success',
      title: 'Theo GP is healthy',
      detail: 'The menu is commercially stronger and can now be refined through mix and dish performance.'
    });
  }

  if (belowTarget.length > 0) {
    insights.push({
      tone: 'danger',
      title: `${belowTarget.length} dish${belowTarget.length === 1 ? '' : 'es'} sitting materially below target`,
      detail: 'These should be reviewed first for price, portion, ingredient mix, and plate build.'
    });
  }

  if (strongDishes.length > 0) {
    insights.push({
      tone: 'success',
      title: `${strongDishes.length} dish${strongDishes.length === 1 ? '' : 'es'} at or above target`,
      detail: 'Use these dishes as benchmarks for margin discipline and menu structure.'
    });
  }

  if (noSellPrice.length > 0) {
    insights.push({
      tone: 'warning',
      title: 'Some dishes have no sell price',
      detail: 'Without a selling price, GP and commercial contribution cannot be measured properly.'
    });
  }

  if (noIngredients.length > 0) {
    insights.push({
      tone: 'warning',
      title: 'Some dishes have no ingredients added',
      detail: 'Ingredient-level costing is what makes this page commercially useful.'
    });
  }

  if (dishes.length > 0 && totalRevenue <= 0) {
    insights.push({
      tone: 'warning',
      title: 'Revenue picture is weak',
      detail: 'Add realistic weekly sales volume so the menu view reflects actual commercial weight.'
    });
  }

  if (dishes.length > 0 && totalProfit > 0) {
    insights.push({
      tone: 'success',
      title: 'Menu profit view is active',
      detail: 'You can now compare dishes not just on GP, but on actual weekly profit contribution and lost opportunity.'
    });
  }

  if (!insights.length) {
    insights.push({
      tone: 'success',
      title: 'Menu file ready',
      detail: 'Start by creating sections, dishes, ingredients, and realistic sell prices.'
    });
  }

  return insights.slice(0, 6);
}

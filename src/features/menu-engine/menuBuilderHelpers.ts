import type { ClientProfile, ClientRecord, MenuDish, MenuProjectState, SupabaseRecord } from '../../types';
import { fmtCurrency, fmtPercent, num, safe, todayIso, uid } from '../../lib/utils';
import { createEmptyClientData } from '../clients/clientData';
import {
  buildChapterHtml,
  buildDetailGridHtml,
  buildReportBodyHtml,
  buildReportCoverHtml,
  buildRecommendationListHtml,
  buildSectionHtml,
  buildSummaryGridHtml
} from '../../reports/pdf';
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
  const pricingChangesNeeded = allDishes.filter((dish) => Math.abs(dishPriceGap(dish)) >= 0.01).length;

  const coverHtml = buildReportCoverHtml({
    reportType: 'Menu Profit Engine',
    clientName: safe(project.siteName) || 'Client Site',
    preparedDate: formatShortDate(project.reviewDate),
    consultant: 'The Final Check',
    summary: 'Dish-level margin, weekly contribution, and pricing opportunity prepared for client review and PDF handover.',
    metrics: [
      { label: 'Weighted GP', value: allDishes.length > 0 ? fmtPercent(summary.weightedGp) : '', primary: true },
      { label: 'Weekly profit', value: summary.weeklyProfit > 0 ? fmtCurrency(summary.weeklyProfit) : '' },
      { label: 'Weekly opportunity', value: summary.totalOpportunity > 0 ? fmtCurrency(summary.totalOpportunity) : '' }
    ],
    details: [
      { label: 'Menu', value: safe(project.menuName) },
      { label: 'Sections', value: project.sections.length > 0 ? `${project.sections.length}` : '' },
      { label: 'Dishes', value: allDishes.length > 0 ? `${allDishes.length}` : '' },
      { label: 'Below target', value: summary.belowTargetCount > 0 ? `${summary.belowTargetCount}` : '' }
    ]
  });

  const executiveChapter = buildChapterHtml({
    kicker: 'Executive Summary',
    title: 'Menu Performance and Commercial Priorities',
    lead: 'Client-facing view of menu GP, weekly profit, pricing opportunities, and recommended next steps.',
    body: `
      ${buildSummaryGridHtml([
        { label: 'Weighted GP', value: allDishes.length > 0 ? fmtPercent(summary.weightedGp) : '', detail: `Default target ${fmtPercent(project.defaultTargetGp)}.` },
        { label: 'Weekly revenue', value: summary.weeklyRevenue > 0 ? fmtCurrency(summary.weeklyRevenue) : '', detail: 'Estimated revenue from current dish mix.' },
        { label: 'Weekly profit', value: summary.weeklyProfit > 0 ? fmtCurrency(summary.weeklyProfit) : '', detail: 'Estimated contribution from recorded dishes.' },
        { label: 'Weekly opportunity', value: summary.totalOpportunity > 0 ? fmtCurrency(summary.totalOpportunity) : '', detail: 'Potential uplift from pricing gaps.' },
        { label: 'Below target', value: summary.belowTargetCount > 0 ? `${summary.belowTargetCount}` : '', detail: pricingChangesNeeded > 0 ? `${pricingChangesNeeded} dishes need pricing review.` : '' },
        { label: 'Total dishes', value: allDishes.length > 0 ? `${allDishes.length}` : '' }
      ])}
      ${buildSectionHtml('Top opportunity dishes', buildRecommendationListHtml(
        topOpportunities.map((dish) => `${safe(dish.name)}: ${fmtCurrency(dishWeeklyOpportunity(dish))} weekly opportunity.`),
      ))}
      ${buildSectionHtml('Strongest contributors', buildRecommendationListHtml(
        strongestDishes.map((dish) => `${safe(dish.name)}: ${fmtCurrency(dishWeeklyProfit(dish))} weekly profit.`),
      ))}
      ${buildSectionHtml('Recommended next steps', buildRecommendationListHtml([
        pricingChangesNeeded > 0 ? 'Review recommended selling prices for dishes with material price gaps before the next menu sign-off.' : '',
        summary.belowTargetCount > 0 ? 'Prioritise recipe costing and portion checks for dishes below target GP.' : '',
        allDishes.length > 0 ? 'Use sales mix weekly to confirm whether high-contribution dishes are being promoted and positioned correctly.' : ''
      ]))}
    `
  });

  const sectionDetailBody = allDishes.length
    ? project.sections
      .filter((section) => section.dishes.length > 0)
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
        ${buildDetailGridHtml([
          { label: 'Dishes', value: section.dishes.length },
          { label: 'Section revenue', value: fmtCurrency(sectionRevenue) },
          { label: 'Section profit', value: fmtCurrency(sectionProfit) },
          { label: 'Average actual GP', value: fmtPercent(sectionGp) },
          { label: 'Below target', value: sectionBelowTarget },
          { label: 'Pricing changes needed', value: section.dishes.filter((dish) => Math.abs(dishPriceGap(dish)) >= 0.01).length },
          { label: 'Best performer', value: topSectionDish ? safe(topSectionDish.name) : '' },
          { label: 'Largest gap', value: largestGap > 0 ? fmtCurrency(largestGap) : '' }
        ])}
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
        </table>
      </section>
    `;
      })
      .join('')
    : '';

  const sectionDetailChapter = sectionDetailBody
    ? buildChapterHtml({
      kicker: 'Menu Detail',
      title: 'Section Performance and Dish-Level Appendix',
      lead: 'Section-level commercial performance and dish detail for pricing review.',
      body: sectionDetailBody
    })
    : '';

  return `${coverHtml}${buildReportBodyHtml([executiveChapter, sectionDetailChapter])}`;
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

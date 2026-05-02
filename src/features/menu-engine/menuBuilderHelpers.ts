import type { ClientProfile, ClientRecord, MenuDish, MenuProjectState, SupabaseRecord } from '../../types';
import { fmtCurrency, fmtPercent, num, safe, todayIso, uid } from '../../lib/utils';
import { createEmptyClientData } from '../clients/clientData';
import {
  buildCalloutHtml,
  buildChapterHtml,
  buildKpiHeroHtml,
  buildReportBodyHtml,
  buildReportCoverHtml,
  buildRecommendationListHtml,
  buildSectionHtml,
  buildSummaryGridHtml,
  escapeHtml
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
    .slice(0, 5);
  const strongestDishes = [...allDishes]
    .sort((left, right) => dishWeeklyProfit(right) - dishWeeklyProfit(left))
    .filter((dish) => dishWeeklyProfit(dish) > 0)
    .slice(0, 5);
  const pricingChangesNeeded = allDishes.filter((dish) => Math.abs(dishPriceGap(dish)) >= 0.01).length;
  const gpGap = summary.weightedGp > 0 && project.defaultTargetGp > 0
    ? project.defaultTargetGp - summary.weightedGp
    : 0;

  // ──────────────────────────────────────────────
  // COVER
  // ──────────────────────────────────────────────
  const coverHtml = buildReportCoverHtml({
    reportType: 'Menu Profit Engine',
    clientName: safe(project.siteName) || safe(project.menuName) || 'Client Site',
    preparedDate: formatShortDate(project.reviewDate),
    consultant: 'The Final Check',
    summary:
      'Dish-level margin analysis, weekly contribution, and pricing opportunity prepared for commercial review.',
    metrics: [
      { label: 'Weighted GP', value: allDishes.length > 0 ? fmtPercent(summary.weightedGp) : '', primary: true },
      { label: 'Weekly Profit', value: summary.weeklyProfit > 0 ? fmtCurrency(summary.weeklyProfit) : '' },
      { label: 'Weekly Opportunity', value: summary.totalOpportunity > 0 ? fmtCurrency(summary.totalOpportunity) : '' }
    ],
    details: [
      { label: 'Menu', value: safe(project.menuName) },
      { label: 'Sections', value: project.sections.length > 0 ? `${project.sections.length}` : '' },
      { label: 'Dishes', value: allDishes.length > 0 ? `${allDishes.length}` : '' },
      { label: 'Below Target', value: summary.belowTargetCount > 0 ? `${summary.belowTargetCount}` : '' }
    ]
  });

  // ──────────────────────────────────────────────
  // PAGE 2 — COMMERCIAL OVERVIEW
  // KPI-anchored; opportunity-first narrative
  // ──────────────────────────────────────────────
  const commercialBody = `
    ${buildKpiHeroHtml(
      allDishes.length > 0 ? fmtPercent(summary.weightedGp) : '—',
      'Weighted Gross Profit',
      `Target ${fmtPercent(project.defaultTargetGp)}.${gpGap > 0 ? ` Gap of ${fmtPercent(gpGap)} to close.` : summary.weightedGp > 0 ? ' On or above target.' : ''}`
    )}

    ${buildSummaryGridHtml([
      {
        label: 'Weekly Revenue',
        value: summary.weeklyRevenue > 0 ? fmtCurrency(summary.weeklyRevenue) : '',
        detail: 'Estimated from current dish selling prices and weekly volumes.'
      },
      {
        label: 'Weekly Profit',
        value: summary.weeklyProfit > 0 ? fmtCurrency(summary.weeklyProfit) : '',
        detail: 'Estimated weekly contribution from all recorded dishes.'
      },
      {
        label: 'Weekly Opportunity',
        value: summary.totalOpportunity > 0 ? fmtCurrency(summary.totalOpportunity) : '',
        detail: 'Potential additional margin from closing pricing gaps.'
      },
      {
        label: 'Below Target',
        value: summary.belowTargetCount > 0 ? `${summary.belowTargetCount}` : '0',
        detail: `${pricingChangesNeeded} dish${pricingChangesNeeded !== 1 ? 'es' : ''} with a material pricing gap.`
      },
      {
        label: 'Total Dishes',
        value: allDishes.length > 0 ? `${allDishes.length}` : ''
      },
      {
        label: 'Sections',
        value: project.sections.filter((s) => s.dishes.length > 0).length > 0
          ? `${project.sections.filter((s) => s.dishes.length > 0).length}`
          : ''
      }
    ])}

    ${gpGap > 1
      ? buildCalloutHtml(
          `Weighted GP of ${fmtPercent(summary.weightedGp)} is ${fmtPercent(gpGap)} below the default target of ${fmtPercent(project.defaultTargetGp)}. Weekly opportunity of ${fmtCurrency(summary.totalOpportunity)} is recoverable through pricing corrections and recipe costing reviews.`,
          { title: 'GP Gap', variant: gpGap > 5 ? 'risk' : 'warn' }
        )
      : ''}

    ${topOpportunities.length
      ? buildSectionHtml(
          'Top Pricing Opportunities',
          buildRecommendationListHtml(
            topOpportunities.map(
              (dish) =>
                `${safe(dish.name)}: ${fmtCurrency(dishWeeklyOpportunity(dish))} weekly opportunity — sell price ${fmtCurrency(dish.sellPrice)}, actual GP ${fmtPercent(dishActualGp(dish))}.`
            )
          ),
          'Dishes with the largest recoverable weekly margin based on current pricing gaps.'
        )
      : ''}

    ${strongestDishes.length
      ? buildSectionHtml(
          'Strongest Contributors',
          buildRecommendationListHtml(
            strongestDishes.map(
              (dish) =>
                `${safe(dish.name)}: ${fmtCurrency(dishWeeklyProfit(dish))} estimated weekly profit.`
            )
          ),
          'Highest weekly profit contributors — protect positioning and volume on these dishes.'
        )
      : ''}

    ${buildSectionHtml(
      'Recommended Next Steps',
      buildRecommendationListHtml(
        [
          pricingChangesNeeded > 0
            ? `Review sell prices for ${pricingChangesNeeded} dish${pricingChangesNeeded !== 1 ? 'es' : ''} with material pricing gaps before the next menu sign-off.`
            : '',
          summary.belowTargetCount > 0
            ? `Prioritise recipe costing and portion discipline for ${summary.belowTargetCount} dish${summary.belowTargetCount !== 1 ? 'es' : ''} currently below GP target.`
            : '',
          allDishes.length > 0
            ? 'Monitor weekly sales mix to confirm high-contribution dishes are positioned and promoted correctly.'
            : ''
        ].filter(Boolean)
      )
    )}
  `;

  const commercialChapter = buildChapterHtml({
    kicker: 'Menu Performance',
    title: 'Commercial Position & Pricing Opportunities',
    lead:
      'Weighted margin, weekly profit and opportunity analysis — the commercial case for action on this menu.',
    body: commercialBody
  });

  // ──────────────────────────────────────────────
  // PAGE 3+ — SECTION PERFORMANCE
  // Reduced table columns; section summary inline header
  // ──────────────────────────────────────────────
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
          const sectionBelowTarget = section.dishes.filter(
            (dish) => dishTheoGp(dish) < num(dish.targetGp)
          ).length;
          const sectionOpportunity = Math.max(
            ...section.dishes.map((dish) => dishWeeklyOpportunity(dish)),
            0
          );

          return `
            <section>
              <h2>${escapeHtml(safe(section.name) || 'Section')}</h2>
              <div class="summary-grid" style="margin-bottom: 10px;">
                <div class="meta-card">
                  <span>Section Profit</span>
                  <strong>${fmtCurrency(sectionProfit)}</strong>
                </div>
                <div class="meta-card">
                  <span>Avg GP</span>
                  <strong>${fmtPercent(sectionGp)}</strong>
                </div>
                <div class="meta-card">
                  <span>Below Target</span>
                  <strong>${sectionBelowTarget} of ${section.dishes.length}</strong>
                </div>
              </div>
              ${sectionOpportunity > 0
                ? `<p style="font-size: 9pt; color: var(--pdf-muted-strong); margin: 0 0 10px;">Largest pricing gap: ${fmtCurrency(sectionOpportunity)} weekly opportunity on a single dish.  Revenue: ${fmtCurrency(sectionRevenue)}.</p>`
                : `<p style="font-size: 9pt; color: var(--pdf-muted); margin: 0 0 10px;">Revenue: ${fmtCurrency(sectionRevenue)}.</p>`}
              <table class="report-table report-table-compact">
                <thead>
                  <tr>
                    <th>Dish</th>
                    <th>Sell Price</th>
                    <th>Actual GP</th>
                    <th>Target GP</th>
                    <th>Weekly Vol.</th>
                    <th>Weekly Profit</th>
                    <th>Opportunity</th>
                  </tr>
                </thead>
                <tbody>
                  ${section.dishes
                    .map(
                      (dish) => {
                        const actualGp = dishTheoGp(dish);
                        const targetGp = num(dish.targetGp);
                        const gpStyle =
                          actualGp < targetGp - 3
                            ? ' style="color: #b71c1c; font-weight: 700;"'
                            : actualGp < targetGp
                              ? ' style="color: #bf360c; font-weight: 600;"'
                              : ' style="color: #2e7d32; font-weight: 600;"';
                        const opp = dishWeeklyOpportunity(dish);
                        return `
                          <tr>
                            <td>${escapeHtml(safe(dish.name) || '')}</td>
                            <td>${fmtCurrency(dish.sellPrice)}</td>
                            <td${gpStyle}>${fmtPercent(actualGp)}</td>
                            <td>${fmtPercent(dish.targetGp)}</td>
                            <td>${num(dish.weeklySalesVolume) > 0 ? num(dish.weeklySalesVolume) : '—'}</td>
                            <td>${dishWeeklyProfit(dish) > 0 ? fmtCurrency(dishWeeklyProfit(dish)) : '—'}</td>
                            <td>${opp > 0.01 ? fmtCurrency(opp) : '—'}</td>
                          </tr>`;
                      }
                    )
                    .join('')}
                </tbody>
              </table>
            </section>`;
        })
        .join('')
    : '';

  const sectionDetailChapter = sectionDetailBody
    ? buildChapterHtml({
        kicker: 'Menu Detail',
        title: 'Section Performance & Dish Analysis',
        lead: 'Section-level commercial summary with GP, weekly profit, and pricing opportunity for each dish.',
        body: sectionDetailBody
      })
    : '';

  return `${coverHtml}${buildReportBodyHtml([commercialChapter, sectionDetailChapter])}`;
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

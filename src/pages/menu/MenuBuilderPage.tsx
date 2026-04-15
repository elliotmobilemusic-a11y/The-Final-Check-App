import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { StatCard } from '../../components/ui/StatCard';
import { useActivityOverlay } from '../../context/ActivityOverlayContext';
import { selectableSitesForClient } from '../../features/clients/clientData';
import {
  buildReportHeroHtml,
  openPrintableHtmlDocument
} from '../../features/clients/clientExports';
import {
  getMenuProjectById,
  saveMenuProject
} from '../../services/menus';
import { listClients } from '../../services/clients';
import type {
  ClientRecord,
  DishIngredient,
  MeasurementUnit,
  MenuDish,
  MenuProjectState
} from '../../types';
import { fmtCurrency, fmtPercent, num, safe, todayIso, uid } from '../../lib/utils';
import { clearDraft, readDraft, writeDraft } from '../../services/draftStore';
import { createMenuShare } from '../../services/reportShares';
import {
  buildMenuProfitSummary,
  dishActualGp,
  dishIngredientCost,
  dishPriceGap,
  dishProfitPerSale,
  dishRecommendedPrice,
  dishWeeklyOpportunity,
  dishWeeklyProfit
} from '../../features/profit/menuProfit';

const MENU_BUILDER_DRAFT_KEY = 'menu-builder-draft-v1';

const ingredientUnitOptions: Array<{ value: MeasurementUnit; label: string }> = [
  { value: 'g', label: 'Grams' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'ml', label: 'Millilitres' },
  { value: 'l', label: 'Litres' },
  { value: 'each', label: 'Each' },
  { value: 'portion', label: 'Portions' },
  { value: 'pack', label: 'Packs' }
];

function blankIngredient(): DishIngredient {
  return {
    id: uid('ing'),
    name: '',
    qtyUsed: 0,
    qtyUnit: 'g',
    packQty: 1,
    packUnit: 'kg',
    packCost: 0
  };
}

function normalizeIngredient(ingredient?: Partial<DishIngredient>): DishIngredient {
  return {
    ...blankIngredient(),
    ...ingredient,
    id: ingredient?.id || uid('ing'),
    qtyUsed: num(ingredient?.qtyUsed),
    packQty: Math.max(1, num(ingredient?.packQty) || 1),
    packCost: num(ingredient?.packCost)
  };
}

function normalizeDish(dish?: Partial<MenuDish>): MenuDish {
  return {
    id: dish?.id || uid('dish'),
    name: String(dish?.name ?? ''),
    sellPrice: num(dish?.sellPrice),
    targetGp: num(dish?.targetGp),
    mix: num(dish?.mix),
    salesMixPercent: num(dish?.salesMixPercent ?? dish?.mix),
    weeklySalesVolume: num(dish?.weeklySalesVolume ?? dish?.mix),
    notes: String(dish?.notes ?? ''),
    ingredients:
      Array.isArray(dish?.ingredients) && dish.ingredients.length
        ? dish.ingredients.map((ingredient) => normalizeIngredient(ingredient))
        : [blankIngredient()]
  };
}

function normalizeMenuProject(project: MenuProjectState): MenuProjectState {
  return {
    ...project,
    clientSiteId: project.clientSiteId ?? null,
    sections: (project.sections ?? []).map((section) => ({
      ...section,
      dishes: (section.dishes ?? []).map((dish) => normalizeDish(dish))
    }))
  };
}

function createDefaultMenu(clientId: string | null = null): MenuProjectState {
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
    sections: [
      {
        id: startersId,
        name: 'Starters',
        dishes: []
      }
    ]
  };
}

function dishUnitCost(dish: MenuDish) {
  return dishIngredientCost(dish);
}

function dishMixCost(dish: MenuDish) {
  return dishUnitCost(dish) * Math.max(num(dish.weeklySalesVolume), 0);
}

function dishTheoGp(dish: MenuDish) {
  return dishActualGp(dish);
}

function dishProfit(dish: MenuDish) {
  return dishProfitPerSale(dish);
}

function gpClass(dish: MenuDish) {
  const theo = dishTheoGp(dish);
  const target = num(dish.targetGp);

  if (theo >= target) return 'status-pill status-success';
  if (theo >= target - 3) return 'status-pill status-warning';
  return 'status-pill status-danger';
}

export function buildMenuReport(project: MenuProjectState) {
  const summary = buildMenuProfitSummary(project);
  const allDishes = summary.dishes;
  const pricingMoveCount = allDishes.filter((dish) => Math.abs(dishPriceGap(dish)) >= 0.01).length;
  const topOpportunities = [...allDishes]
    .sort((left, right) => dishWeeklyOpportunity(right) - dishWeeklyOpportunity(left))
    .filter((dish) => dishWeeklyOpportunity(dish) > 0)
    .slice(0, 4);
  const strongestDishes = [...allDishes]
    .sort((left, right) => dishWeeklyProfit(right) - dishWeeklyProfit(left))
    .slice(0, 4);

  return `
    ${buildReportHeroHtml({
      eyebrow: 'Menu Profit Engine',
      title: safe(project.menuName) || 'Menu Profit Engine Report',
      leadHtml: `<strong>${safe(project.siteName) || 'Unnamed site'}</strong>${
        safe(project.reviewDate) ? ` • Review date ${formatShortDate(project.reviewDate)}` : ''
      }`,
      description:
        'Dish-level margin, weekly contribution, and pricing opportunity prepared for client review and PDF handover.',
      chips: [
        `${project.sections.length} section${project.sections.length === 1 ? '' : 's'}`,
        `${allDishes.length} dish${allDishes.length === 1 ? '' : 'es'}`,
        `${summary.belowTargetCount} below target GP`
      ],
      cards: [
        {
          label: 'Weighted GP',
          value: fmtPercent(summary.weightedGp)
        },
        {
          label: 'Weekly revenue',
          value: fmtCurrency(summary.weeklyRevenue)
        },
        {
          label: 'Weekly profit',
          value: fmtCurrency(summary.weeklyProfit)
        },
        {
          label: 'Weekly opportunity',
          value: fmtCurrency(summary.totalOpportunity),
          detail: `${pricingMoveCount} dishes need pricing or cost correction`
        }
      ]
    })}

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
              <th>Weekly profit</th>
              <th>Opportunity</th>
            </tr>
          </thead>
          <tbody>
            ${section.dishes
              .map(
                (dish) => `
              <tr>
                <td><strong>${dish.name}</strong><br /><span class="muted-copy">${
                  safe(dish.notes) || 'No notes'
                }</span></td>
                <td>${fmtCurrency(dishUnitCost(dish))}</td>
                <td>${fmtCurrency(dishMixCost(dish))}</td>
                <td>${fmtCurrency(num(dish.sellPrice))}</td>
                <td>${fmtCurrency(dishProfit(dish))}</td>
                <td>${fmtPercent(num(dish.targetGp))}</td>
                <td>${fmtPercent(dishTheoGp(dish))}</td>
                <td>${fmtPercent(num(dish.salesMixPercent))}</td>
                <td>${num(dish.weeklySalesVolume)}</td>
                <td>${fmtCurrency(dishWeeklyProfit(dish))}</td>
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
    `
      })
      .join('')}
  `;
}

function formatShortDate(value?: string | null) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function completionSummary(project: MenuProjectState) {
  const allDishes = project.sections.flatMap((section) => section.dishes);

  const checkpoints = [
    safe(project.menuName),
    safe(project.siteName),
    safe(project.reviewDate),
    project.clientId ? 'yes' : '',
    project.sections.length > 0 ? 'yes' : '',
    allDishes.length > 0 ? 'yes' : '',
    allDishes.some((dish) => num(dish.sellPrice) > 0) ? 'yes' : '',
    allDishes.some((dish) =>
      dish.ingredients.some((ingredient) => safe(ingredient.name))
    )
      ? 'yes'
      : '',
    allDishes.some((dish) => num(dish.weeklySalesVolume) > 0) ? 'yes' : '',
    allDishes.some((dish) => num(dish.targetGp) > 0) ? 'yes' : ''
  ];

  const complete = checkpoints.filter(Boolean).length;
  const total = checkpoints.length;
  const percent = Math.round((complete / total) * 100);

  return { complete, total, percent };
}

type MenuInsightTone = 'success' | 'warning' | 'danger';

type MenuInsight = {
  tone: MenuInsightTone;
  title: string;
  detail: string;
};

function toneClass(tone: MenuInsightTone) {
  if (tone === 'danger') return 'status-pill status-danger';
  if (tone === 'warning') return 'status-pill status-warning';
  return 'status-pill status-success';
}

function buildMenuInsights(
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

export function MenuBuilderPage() {
  const { runWithActivity } = useActivityOverlay();
  const [searchParams] = useSearchParams();
  const queryClientId = searchParams.get('client') || null;
  const queryLoadId = searchParams.get('load');

  const [project, setProject] = useState<MenuProjectState>(() =>
    queryLoadId
      ? normalizeMenuProject(createDefaultMenu(queryClientId))
      : normalizeMenuProject(
          readDraft<MenuProjectState>(MENU_BUILDER_DRAFT_KEY) ?? createDefaultMenu(queryClientId)
        )
  );
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [dishDraft, setDishDraft] = useState<MenuDish | null>(null);
  const [sectionNameDraft, setSectionNameDraft] = useState('Starters');
  const [message, setMessage] = useState('Menu draft ready.');
  const [saving, setSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [controlModalOpen, setControlModalOpen] = useState(false);

  const selectedSection = useMemo(
    () => project.sections.find((section) => section.id === project.selectedSectionId) ?? null,
    [project]
  );

  useEffect(() => {
    setSectionNameDraft(selectedSection?.name ?? '');
  }, [selectedSection?.id, selectedSection?.name]);

  const allDishes = useMemo(
    () => project.sections.flatMap((section) => section.dishes),
    [project.sections]
  );

  const menuSummary = useMemo(() => buildMenuProfitSummary(project), [project]);
  const totalRevenue = menuSummary.weeklyRevenue;
  const totalProfit = menuSummary.weeklyProfit;
  const weightedGp = menuSummary.weightedGp;

  const reportHtml = useMemo(() => buildMenuReport(project), [project]);
  const completion = useMemo(() => completionSummary(project), [project]);
  const insights = useMemo(
    () => buildMenuInsights(project, weightedGp, totalRevenue, totalProfit),
    [project, weightedGp, totalRevenue, totalProfit]
  );

  const activeClient = useMemo(
    () => clients.find((client) => client.id === project.clientId) ?? null,
    [clients, project.clientId]
  );
  const availableClientSites = useMemo(
    () => selectableSitesForClient(activeClient),
    [activeClient]
  );

  const strongDishCount = useMemo(
    () => allDishes.filter((dish) => dishTheoGp(dish) >= num(dish.targetGp)).length,
    [allDishes]
  );

  const watchDishCount = useMemo(
    () =>
      allDishes.filter((dish) => {
        const theo = dishTheoGp(dish);
        const target = num(dish.targetGp);
        return theo < target && theo >= target - 3;
      }).length,
    [allDishes]
  );

  const riskDishCount = useMemo(
    () => allDishes.filter((dish) => dishTheoGp(dish) < num(dish.targetGp) - 3).length,
    [allDishes]
  );
  const selectedSectionSummary = useMemo(() => {
    if (!selectedSection) {
      return {
        dishCount: 0,
        revenue: 0,
        profit: 0,
        avgGp: 0
      };
    }

    const dishes = selectedSection.dishes;
    const revenue = dishes.reduce(
      (sum, dish) => sum + num(dish.sellPrice) * num(dish.weeklySalesVolume),
      0
    );
    const profit = dishes.reduce((sum, dish) => sum + dishWeeklyProfit(dish), 0);
    const avgGp =
      dishes.length > 0
        ? dishes.reduce((sum, dish) => sum + dishTheoGp(dish), 0) / dishes.length
        : 0;

    return {
      dishCount: dishes.length,
      revenue,
      profit,
      avgGp
    };
  }, [selectedSection]);

  useEffect(() => {
    listClients().then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    writeDraft(MENU_BUILDER_DRAFT_KEY, project);
  }, [project]);

  useEffect(() => {
    if (queryClientId) {
      setProject((current) => ({ ...current, clientId: queryClientId }));
    }
  }, [queryClientId]);

  useEffect(() => {
    if (!project.clientId) return;

    if (!availableClientSites.length) {
      if (project.clientSiteId) {
        setProject((current) => ({ ...current, clientSiteId: null }));
      }
      return;
    }

    const matchingSite = availableClientSites.find((site) => site.id === project.clientSiteId);
    if (matchingSite) return;

    if (availableClientSites.length === 1) {
      const singleSite = availableClientSites[0];
      setProject((current) => ({
        ...current,
        clientSiteId: singleSite.id,
        siteName:
          !current.siteName.trim() ? singleSite.name || activeClient?.company_name || '' : current.siteName
      }));
      return;
    }

    if (project.clientSiteId) {
      setProject((current) => ({ ...current, clientSiteId: null }));
    }
  }, [activeClient, availableClientSites, project.clientId, project.clientSiteId]);

  useEffect(() => {
    if (!queryLoadId) return;

    getMenuProjectById(queryLoadId)
      .then((record) => {
        if (!record) return;

        setProject({
          ...normalizeMenuProject(record.data),
          id: record.id,
          clientId: record.client_id ?? record.data.clientId ?? null,
          createdAt: record.created_at,
          updatedAt: record.updated_at
        });

        setMessage(`Loaded "${record.title}".`);
      })
      .catch(() => {});
  }, [queryLoadId]);

  function updateProject<K extends keyof MenuProjectState>(
    key: K,
    value: MenuProjectState[K]
  ) {
    setProject((current) => ({ ...current, [key]: value }));
  }

  function handleClientSelection(nextClientId: string | null) {
    const nextClient = clients.find((client) => client.id === nextClientId) ?? null;
    const nextSites = selectableSitesForClient(nextClient);
    const singleSite = nextSites.length === 1 ? nextSites[0] : null;

    setProject((current) => ({
      ...current,
      clientId: nextClientId,
      clientSiteId: singleSite?.id ?? null,
      siteName: singleSite
        ? singleSite.name || nextClient?.company_name || current.siteName
        : nextClientId && current.clientId !== nextClientId
          ? ''
          : current.siteName
    }));
  }

  function handleClientSiteSelection(nextSiteId: string | null) {
    const nextSite = availableClientSites.find((site) => site.id === nextSiteId) ?? null;

    setProject((current) => ({
      ...current,
      clientSiteId: nextSiteId,
      siteName: nextSite?.name || current.siteName
    }));
  }

  function addSection() {
    const nextName = safe(sectionNameDraft) || `Section ${project.sections.length + 1}`;

    const id = uid('section');
    setProject((current) => ({
      ...current,
      selectedSectionId: id,
      sections: [...current.sections, { id, name: nextName, dishes: [] }]
    }));
    setSectionNameDraft('');
    setMessage(`Section "${nextName}" added.`);
  }

  function renameSection() {
    if (!selectedSection) return;
    const nextName = safe(sectionNameDraft);
    if (!nextName) return;

    setProject((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === selectedSection.id ? { ...section, name: nextName } : section
      )
    }));
    setMessage(`Section renamed to "${nextName}".`);
  }

  function deleteSection() {
    if (!selectedSection) return;
    if (!window.confirm(`Delete section "${selectedSection.name}" and its dishes?`)) return;

    const nextSections = project.sections.filter(
      (section) => section.id !== selectedSection.id
    );
    const fallbackId = nextSections[0]?.id ?? uid('section');

    setProject((current) => ({
      ...current,
      sections: nextSections.length
        ? nextSections
        : [{ id: fallbackId, name: 'New section', dishes: [] }],
      selectedSectionId: fallbackId
    }));
  }

  function openDishEditor(dishId?: string) {
    if (!selectedSection) return;

    const existing = dishId
      ? selectedSection.dishes.find((dish) => dish.id === dishId)
      : undefined;

    setEditingDishId(existing?.id ?? null);
    setDishDraft(
      existing
        ? normalizeDish(JSON.parse(JSON.stringify(existing)) as MenuDish)
        : normalizeDish({
            id: uid('dish'),
            name: '',
            sellPrice: 0,
            targetGp: project.defaultTargetGp,
            mix: 1,
            salesMixPercent: 0,
            weeklySalesVolume: 0,
            notes: '',
            ingredients: [blankIngredient()]
          })
    );
  }

  function closeDishEditor() {
    setEditingDishId(null);
    setDishDraft(null);
  }

  function updateDish<K extends keyof MenuDish>(key: K, value: MenuDish[K]) {
    if (!dishDraft) return;
    setDishDraft({ ...dishDraft, [key]: value });
  }

  function updateIngredient(
    id: string,
    field: keyof DishIngredient,
    value: string | number
  ) {
    if (!dishDraft) return;

    setDishDraft({
      ...dishDraft,
      ingredients: dishDraft.ingredients.map((ingredient) =>
        ingredient.id === id ? { ...ingredient, [field]: value } : ingredient
      )
    });
  }

  function addIngredient() {
    if (!dishDraft) return;

    setDishDraft({
      ...dishDraft,
      ingredients: [...dishDraft.ingredients, blankIngredient()]
    });
  }

  function removeIngredient(id: string) {
    if (!dishDraft) return;

    const next = dishDraft.ingredients.filter((ingredient) => ingredient.id !== id);
    setDishDraft({
      ...dishDraft,
      ingredients: next.length ? next : [blankIngredient()]
    });
  }

  function saveDish() {
    if (!dishDraft || !selectedSection) return;

    if (!safe(dishDraft.name)) {
      setMessage('Please enter a dish name.');
      return;
    }

    const cleanDish = {
      ...normalizeDish(dishDraft),
      ingredients: dishDraft.ingredients
        .filter((ingredient) => safe(ingredient.name))
        .map((ingredient) => normalizeIngredient(ingredient))
    };

    if (!cleanDish.ingredients.length) {
      setMessage('Add at least one ingredient.');
      return;
    }

    setProject((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== selectedSection.id) return section;

        const existingIndex = section.dishes.findIndex((dish) => dish.id === cleanDish.id);

        if (existingIndex >= 0) {
          return {
            ...section,
            dishes: section.dishes.map((dish) =>
              dish.id === cleanDish.id ? cleanDish : dish
            )
          };
        }

        return { ...section, dishes: [...section.dishes, cleanDish] };
      })
    }));

    closeDishEditor();
    setMessage('Dish updated.');
  }

  function deleteDish(dishId: string) {
    if (!selectedSection || !window.confirm('Delete this dish?')) return;

    setProject((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === selectedSection.id
          ? { ...section, dishes: section.dishes.filter((dish) => dish.id !== dishId) }
          : section
      )
    }));
  }

  function updateDishInline(
    sectionId: string,
    dishId: string,
    field: keyof MenuDish,
    value: number
  ) {
    setProject((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              dishes: section.dishes.map((dish) =>
                dish.id === dishId ? { ...dish, [field]: value } : dish
              )
            }
          : section
      )
    }));
  }

  async function handleSaveProject() {
    try {
      setSaving(true);
      await runWithActivity(
        {
          kicker: 'Refining menu',
          title: 'Saving profit engine',
          detail: 'Storing the latest menu margins and refreshing the saved project list.'
        },
        async () => {
          const saved = await saveMenuProject(project);
          setProject({
            ...normalizeMenuProject(saved.data),
            id: saved.id,
            clientId: saved.client_id ?? saved.data.clientId ?? null,
            createdAt: saved.created_at,
            updatedAt: saved.updated_at
          });
          setMessage('Menu saved.');
        }
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save project.');
    } finally {
      setSaving(false);
    }
  }

  function newProject() {
    const activeClientId = queryClientId || null;
    clearDraft(MENU_BUILDER_DRAFT_KEY);
    setProject(normalizeMenuProject(createDefaultMenu(activeClientId)));
    setMessage('New menu started.');
  }

  function exportPdf() {
    void runWithActivity(
      {
        kicker: 'Preparing export',
        title: 'Building menu PDF',
        detail: 'Formatting the menu profit engine into a clean client-ready report.'
      },
      async () => {
        openPrintableHtmlDocument(
          `${safe(project.menuName || 'Menu Builder Report')} report`,
          reportHtml
        );
      },
      700
    );
  }

  async function handleShareReport() {
    try {
      setIsSharing(true);
      setShareUrl('');
      const share = await runWithActivity(
        {
          kicker: 'Opening pass',
          title: 'Creating share link',
          detail: 'Publishing a public link for this menu profit engine report.'
        },
        () => createMenuShare(project),
        900
      );
      setShareUrl(share.url);

      try {
        await navigator.clipboard.writeText(share.url);
        setMessage('Menu share link created and copied to clipboard.');
      } catch {
        setMessage(`Menu share link created: ${share.url}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the share link.');
    } finally {
      setIsSharing(false);
    }
  }

  function loadFromJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    file
      .text()
      .then((content) => {
        const parsed = JSON.parse(content) as MenuProjectState;
        setProject({
          ...normalizeMenuProject(parsed),
          clientId: parsed.clientId ?? queryClientId ?? null
        });
        setMessage('Menu JSON loaded.');
      })
      .catch(() => setMessage('Could not read the selected JSON file.'));

    event.target.value = '';
  }

  return (
    <div className="page-stack menu-page">
      <PageIntro
        eyebrow="Menu Profit Engine"
        title="Turn dish costing into weekly profit recovery"
        description="Quantify dish-level profit, expose weak margins, and show where pricing, cost, or portion correction can recover cash each week."
        actions={
          <>
            <button className="button button-secondary" onClick={newProject}>
              New menu
            </button>
            <button
              className="button button-primary"
              disabled={saving}
              onClick={handleSaveProject}
            >
              {saving ? 'Saving...' : 'Save profit engine'}
            </button>
            <button className="button button-secondary" onClick={exportPdf}>
              Export PDF
            </button>
            <button className="button button-secondary" disabled={isSharing} onClick={handleShareReport}>
              {isSharing ? 'Creating link...' : 'Create share link'}
            </button>
            <label className="button button-secondary inline-file-button">
              Load JSON
              <input accept="application/json" hidden type="file" onChange={loadFromJson} />
            </label>
          </>
        }
      />

      <section className="panel share-link-panel">
        <div className="panel-body stack gap-12">
          <div className="record-header-message">
            <span className="soft-pill">{message}</span>
            {shareUrl ? <span className="soft-pill">Share link ready</span> : null}
          </div>
          {shareUrl ? (
            <div className="share-link-row">
              <input className="input" readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
              <button
                className="button button-secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setMessage('Menu share link copied to clipboard.');
                  } catch {
                    setMessage('Copy failed. You can still copy the link manually.');
                  }
                }}
                type="button"
              >
                Copy link
              </button>
              <a className="button button-primary" href={shareUrl} rel="noreferrer" target="_blank">
                Open link
              </a>
            </div>
          ) : null}
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Weighted actual GP"
          value={fmtPercent(weightedGp)}
          hint="Across all dishes by weekly sales volume"
        />
        <StatCard
          label="Weekly menu revenue"
          value={fmtCurrency(totalRevenue)}
          hint="Sell price × weekly volume"
        />
        <StatCard
          label="Weekly menu profit"
          value={fmtCurrency(totalProfit)}
          hint="Commercial contribution view"
        />
        <StatCard
          label="Menu is losing"
          value={fmtCurrency(menuSummary.totalOpportunity)}
          hint={`${menuSummary.belowTargetCount} dishes are below target GP`}
        />
      </section>

      <section>
        <div>
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Menu Profit Engine</h3>
                <p className="muted-copy">
                  Control costing, pricing, mix, and weekly contribution from one commercial view.
                </p>
              </div>
            </div>

            <div className="panel-body stack gap-20">
              <section className="sub-panel menu-nav-panel">
                <div className="sub-panel-header">
                  <h4>Menu section navigation</h4>
                  <span className="soft-pill">Quick access</span>
                </div>

                <div className="menu-section-nav">
                  {project.sections.map((section) => (
                    <button
                      className={`menu-section-link ${project.selectedSectionId === section.id ? 'active' : ''}`}
                      key={section.id}
                      type="button"
                      onClick={() => updateProject('selectedSectionId', section.id)}
                    >
                      {section.name}
                    </button>
                  ))}
                </div>
              </section>

              <section className="sub-panel">
                <h4>Menu information</h4>
                <div className="form-grid">
                  <label className="field">
                    <span>Menu name</span>
                    <input
                      className="input"
                      value={project.menuName}
                      onChange={(e) => updateProject('menuName', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Site / location</span>
                    <input
                      className="input"
                      value={project.siteName}
                      onChange={(e) => updateProject('siteName', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Review date</span>
                    <input
                      className="input"
                      type="date"
                      value={project.reviewDate}
                      onChange={(e) => updateProject('reviewDate', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Default target GP %</span>
                    <input
                      className="input"
                      type="number"
                      value={project.defaultTargetGp}
                      onChange={(e) =>
                        updateProject('defaultTargetGp', num(e.target.value))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Client profile</span>
                    <select
                      className="input"
                      value={project.clientId || ''}
                      onChange={(e) => handleClientSelection(e.target.value || null)}
                    >
                      <option value="">Select a client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.company_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {availableClientSites.length > 1 ? (
                    <label className="field">
                      <span>Client site</span>
                      <select
                        className="input"
                        value={project.clientSiteId || ''}
                        onChange={(e) => handleClientSiteSelection(e.target.value || null)}
                      >
                        <option value="">Select a site</option>
                        {availableClientSites.map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>

                {availableClientSites.length > 1 ? (
                  <p className="muted-copy">
                    This client has more than one site. Choose the location you are pricing so the
                    menu review stays tied to the right trading site.
                  </p>
                ) : null}

                {project.clientId ? (
                  <div className="header-actions">
                    <Link className="button button-ghost" to={`/clients/${project.clientId}`}>
                      Open client profile
                    </Link>
                  </div>
                ) : null}
              </section>

              <section className="sub-panel">
                <div className="sub-panel-header">
                  <h4>Commercial overview</h4>
                  <span className="soft-pill">Live performance</span>
                </div>

                <div className="menu-chip-row">
                  <div className="menu-chip">
                    <strong>Default target GP</strong>
                    <span>{fmtPercent(project.defaultTargetGp)}</span>
                  </div>
                  <div className="menu-chip">
                    <strong>Current actual GP</strong>
                    <span>{fmtPercent(weightedGp)}</span>
                  </div>
                  <div className="menu-chip">
                    <strong>Weekly opportunity</strong>
                    <span>{fmtCurrency(menuSummary.totalOpportunity)}</span>
                  </div>
                  <div className="menu-chip">
                    <strong>Strong dishes</strong>
                    <span>{strongDishCount}</span>
                  </div>
                  <div className="menu-chip">
                    <strong>Watch dishes</strong>
                    <span>{watchDishCount}</span>
                  </div>
                  <div className="menu-chip">
                    <strong>At-risk dishes</strong>
                    <span>{riskDishCount}</span>
                  </div>
                  <div className="menu-chip">
                    <strong>Total sections</strong>
                    <span>{project.sections.length}</span>
                  </div>
                </div>
              </section>

              <section className="sub-panel">
                <div className="sub-panel-header">
                  <h4>Section management</h4>
                  <div className="header-actions">
                    <button className="button button-secondary" onClick={addSection}>
                      Add section
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={renameSection}
                      disabled={!selectedSection}
                    >
                      Rename
                    </button>
                    <button
                      className="button button-ghost danger-text"
                      onClick={deleteSection}
                      disabled={!selectedSection}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="form-grid two-columns">
                  <label className="field">
                    <span>Section name</span>
                    <input
                      className="input"
                      placeholder="For example: Starters, Grill, Desserts"
                      value={sectionNameDraft}
                      onChange={(event) => setSectionNameDraft(event.target.value)}
                    />
                  </label>
                </div>

                <div className="section-list">
                  {project.sections.map((section) => {
                    const count = section.dishes.length;
                    const avgGp =
                      count > 0
                        ? section.dishes.reduce((sum, dish) => sum + dishTheoGp(dish), 0) /
                          count
                        : 0;

                    return (
                      <button
                        className={`section-button ${project.selectedSectionId === section.id ? 'active' : ''}`}
                        key={section.id}
                        onClick={() => updateProject('selectedSectionId', section.id)}
                        type="button"
                      >
                        <div>
                          <strong>{section.name}</strong>
                          <div className="saved-meta">
                            {count} dish{count === 1 ? '' : 'es'} • Avg GP{' '}
                            {fmtPercent(avgGp)}
                          </div>
                        </div>
                        <span className="soft-pill">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="sub-panel">
                <div className="sub-panel-header">
                  <h4>Selected section</h4>
                  <button
                    className="button button-primary"
                    disabled={!selectedSection}
                    onClick={() => openDishEditor()}
                  >
                    Add dish
                  </button>
                </div>

                <div className="menu-performance-grid">
                  <div className="menu-performance-card">
                    <span>Dishes</span>
                    <strong>{selectedSectionSummary.dishCount}</strong>
                  </div>
                  <div className="menu-performance-card">
                    <span>Revenue</span>
                    <strong>{fmtCurrency(selectedSectionSummary.revenue)}</strong>
                  </div>
                  <div className="menu-performance-card">
                    <span>Profit</span>
                    <strong>{fmtCurrency(selectedSectionSummary.profit)}</strong>
                  </div>
                  <div className="menu-performance-card">
                    <span>Average GP</span>
                    <strong>{fmtPercent(selectedSectionSummary.avgGp)}</strong>
                  </div>
                </div>

                {!selectedSection ? (
                  <div className="muted-copy">Create a section to start building dishes.</div>
                ) : (
                  <div className="table-shell">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Dish</th>
                          <th>Ingredient cost</th>
                          <th>Weekly cost</th>
                          <th>Sell</th>
                          <th>Profit / sale</th>
                          <th>Target GP</th>
                          <th>Actual GP</th>
                          <th>Target sell</th>
                          <th>Move</th>
                          <th>Sales mix %</th>
                          <th>Weekly volume</th>
                          <th>Weekly profit</th>
                          <th>Opportunity</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!selectedSection.dishes.length ? (
                          <tr>
                            <td colSpan={14} className="empty-cell">
                              No dishes in this section yet.
                            </td>
                          </tr>
                        ) : (
                          selectedSection.dishes.map((dish) => (
                            <tr key={dish.id}>
                              <td>
                                <div className="dish-name">{dish.name}</div>
                                <div className="saved-meta">
                                  {safe(dish.notes) || 'No notes added.'}
                                </div>
                              </td>
                              <td>{fmtCurrency(dishUnitCost(dish))}</td>
                              <td>{fmtCurrency(dishMixCost(dish))}</td>
                              <td>
                                <input
                                  className="input compact-input"
                                  type="number"
                                  value={dish.sellPrice}
                                  onChange={(e) =>
                                    updateDishInline(
                                      selectedSection.id,
                                      dish.id,
                                      'sellPrice',
                                      num(e.target.value)
                                    )
                                  }
                                />
                              </td>
                              <td>{fmtCurrency(dishProfit(dish))}</td>
                              <td>
                                <input
                                  className="input compact-input"
                                  type="number"
                                  value={dish.targetGp}
                                  onChange={(e) =>
                                    updateDishInline(
                                      selectedSection.id,
                                      dish.id,
                                      'targetGp',
                                      num(e.target.value)
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <span className={gpClass(dish)}>
                                  {fmtPercent(dishTheoGp(dish))}
                                </span>
                              </td>
                              <td>{fmtCurrency(dishRecommendedPrice(dish))}</td>
                              <td>
                                <span
                                  className={
                                    dishPriceGap(dish) > 0
                                      ? 'status-pill status-warning'
                                      : 'status-pill status-success'
                                  }
                                >
                                  {dishPriceGap(dish) > 0 ? '+' : ''}
                                  {fmtCurrency(dishPriceGap(dish))}
                                </span>
                              </td>
                              <td>
                                <input
                                  className="input compact-input"
                                  type="number"
                                  value={dish.salesMixPercent}
                                  onChange={(e) =>
                                    updateDishInline(
                                      selectedSection.id,
                                      dish.id,
                                      'salesMixPercent',
                                      num(e.target.value)
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  className="input compact-input"
                                  type="number"
                                  value={dish.weeklySalesVolume}
                                  onChange={(e) =>
                                    updateDishInline(
                                      selectedSection.id,
                                      dish.id,
                                      'weeklySalesVolume',
                                      num(e.target.value)
                                    )
                                  }
                                />
                              </td>
                              <td>{fmtCurrency(dishWeeklyProfit(dish))}</td>
                              <td>{fmtCurrency(dishWeeklyOpportunity(dish))}</td>
                              <td>
                                <div className="saved-actions">
                                  <button
                                    className="button button-ghost"
                                    onClick={() => openDishEditor(dish.id)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="button button-ghost danger-text"
                                    onClick={() => deleteDish(dish.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </section>

      {dishDraft ? (
        <div className="drawer-backdrop" onClick={closeDishEditor}>
          <div className="drawer-panel" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <h3>{editingDishId ? 'Edit dish' : 'Add dish'}</h3>
                <p className="muted-copy">
                  Build each dish from ingredients, selling price, target GP, and weekly sales volume so the profit opportunity is explicit.
                </p>
              </div>
              <button className="button button-ghost" onClick={closeDishEditor}>
                Close
              </button>
            </div>

            <div className="panel-body stack gap-20">
              <div className="dish-editor-layout">
                <div className="dish-editor-main">
                  <section className="sub-panel">
                    <div className="sub-panel-header">
                      <div>
                          <h4>Dish profit inputs</h4>
                        <p className="muted-copy">
                          Name the dish, set the selling price, and enter the commercial inputs used in the profit model.
                        </p>
                      </div>
                    </div>

                    <div className="form-grid two-columns">
                      <label className="field">
                        <span>Dish name</span>
                        <input
                          className="input"
                          value={dishDraft.name}
                          onChange={(e) => updateDish('name', e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Sell price (£)</span>
                        <input
                          className="input"
                          type="number"
                          value={dishDraft.sellPrice}
                          onChange={(e) => updateDish('sellPrice', num(e.target.value))}
                        />
                      </label>
                      <label className="field">
                        <span>Target GP %</span>
                        <input
                          className="input"
                          type="number"
                          value={dishDraft.targetGp}
                          onChange={(e) => updateDish('targetGp', num(e.target.value))}
                        />
                      </label>
                      <label className="field">
                        <span>Sales mix %</span>
                        <input
                          className="input"
                          type="number"
                          value={dishDraft.salesMixPercent}
                          onChange={(e) => updateDish('salesMixPercent', num(e.target.value))}
                        />
                      </label>
                      <label className="field">
                        <span>Weekly sales volume</span>
                        <input
                          className="input"
                          type="number"
                          value={dishDraft.weeklySalesVolume}
                          onChange={(e) => updateDish('weeklySalesVolume', num(e.target.value))}
                        />
                      </label>
                    </div>

                    <label className="field">
                      <span>Notes / description</span>
                      <textarea
                        className="input textarea"
                        value={dishDraft.notes}
                        onChange={(e) => updateDish('notes', e.target.value)}
                      />
                    </label>
                  </section>

                  <section className="sub-panel">
                    <div className="sub-panel-header">
                      <div>
                        <h4>Ingredients</h4>
                        <p className="muted-copy">
                          Add the exact quantity used per dish, then the purchased pack size and
                          cost so the unit cost stays accurate.
                        </p>
                      </div>
                      <button className="button button-secondary" onClick={addIngredient}>
                        Add ingredient
                      </button>
                    </div>

                    <div className="ingredient-list">
                      {dishDraft.ingredients.map((ingredient, index) => (
                        <div className="ingredient-card" key={ingredient.id}>
                          <div className="ingredient-card-header">
                            <div className="ingredient-card-title">
                              <strong>{ingredient.name || `Ingredient ${index + 1}`}</strong>
                              <span className="muted-copy">
                                Used to build the live dish cost and GP calculation.
                              </span>
                            </div>
                            <button
                              className="button button-ghost danger-text"
                              onClick={() => removeIngredient(ingredient.id)}
                            >
                              Remove
                            </button>
                          </div>

                          <div className="ingredient-card-grid">
                            <label className="field ingredient-field ingredient-field-name">
                              <span>Ingredient</span>
                              <input
                                className="input"
                                value={ingredient.name}
                                onChange={(e) =>
                                  updateIngredient(ingredient.id, 'name', e.target.value)
                                }
                              />
                            </label>
                            <label className="field ingredient-field ingredient-field-qty">
                              <span>Qty used</span>
                              <div className="unit-input-row">
                                <input
                                  className="input"
                                  type="number"
                                  value={ingredient.qtyUsed}
                                  onChange={(e) =>
                                    updateIngredient(ingredient.id, 'qtyUsed', num(e.target.value))
                                  }
                                />
                                <select
                                  className="input unit-select"
                                  value={ingredient.qtyUnit}
                                  onChange={(e) =>
                                    updateIngredient(
                                      ingredient.id,
                                      'qtyUnit',
                                      e.target.value as MeasurementUnit
                                    )
                                  }
                                >
                                  {ingredientUnitOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </label>
                            <label className="field ingredient-field ingredient-field-pack">
                              <span>Pack size</span>
                              <div className="unit-input-row">
                                <input
                                  className="input"
                                  type="number"
                                  value={ingredient.packQty}
                                  onChange={(e) =>
                                    updateIngredient(
                                      ingredient.id,
                                      'packQty',
                                      Math.max(1, num(e.target.value))
                                    )
                                  }
                                />
                                <select
                                  className="input unit-select"
                                  value={ingredient.packUnit}
                                  onChange={(e) =>
                                    updateIngredient(
                                      ingredient.id,
                                      'packUnit',
                                      e.target.value as MeasurementUnit
                                    )
                                  }
                                >
                                  {ingredientUnitOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </label>
                            <label className="field ingredient-field ingredient-field-cost">
                              <span>Pack cost (£)</span>
                              <input
                                className="input"
                                type="number"
                                value={ingredient.packCost}
                                onChange={(e) =>
                                  updateIngredient(ingredient.id, 'packCost', num(e.target.value))
                                }
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <aside className="dish-editor-side">
                  <section className="sub-panel">
                    <div className="sub-panel-header">
                      <div>
                        <h4>Profit snapshot</h4>
                        <p className="muted-copy">
                          Live costing updates as ingredients, pack sizes, pricing, and weekly volume are added.
                        </p>
                      </div>
                    </div>
                    <div className="dish-editor-stat-grid">
                      <StatCard label="Ingredient cost" value={fmtCurrency(dishUnitCost(dishDraft))} />
                      <StatCard label="Actual GP" value={fmtPercent(dishTheoGp(dishDraft))} />
                      <StatCard label="Profit / sale" value={fmtCurrency(dishProfit(dishDraft))} />
                      <StatCard label="Weekly profit" value={fmtCurrency(dishWeeklyProfit(dishDraft))} />
                      <StatCard
                        label="Target sell"
                        value={fmtCurrency(dishRecommendedPrice(dishDraft))}
                      />
                      <StatCard
                        label="Opportunity"
                        value={fmtCurrency(dishWeeklyOpportunity(dishDraft))}
                      />
                    </div>
                  </section>
                </aside>
              </div>

              <div className="header-actions">
                <button className="button button-primary" onClick={saveDish}>
                  Save dish
                </button>
                <button className="button button-secondary" onClick={closeDishEditor}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {controlModalOpen && (
        <div className="drawer-backdrop" style={{ zIndex: 1000 }} onClick={() => setControlModalOpen(false)}>
          <div className="drawer-panel" onClick={e => e.stopPropagation()}>
            <div style={{padding: '24px', height: '100%', overflow: 'auto'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                <h2 style={{fontSize: '24px', fontWeight: 700}}>Menu Profit Controls</h2>
                <button className="button button-secondary" onClick={() => setControlModalOpen(false)}>
                  Close ✕
                </button>
              </div>

              <div className="audit-side-block">
                <div className="audit-side-title-row">
                  <h4>Completion</h4>
                  <span className="soft-pill">{completion.percent}% complete</span>
                </div>
                <div className="audit-progress-track">
                  <div
                    className="audit-progress-fill"
                    style={{ width: `${completion.percent}%` }}
                  />
                </div>
                <div className="audit-side-meta">
                  {completion.complete} of {completion.total} key checkpoints completed
                </div>
              </div>

              <div className="audit-side-block" style={{marginTop: '24px'}}>
                <div className="audit-side-title-row">
                  <h4>Menu insights</h4>
                  <span className="soft-pill">{insights.length}</span>
                </div>
                <div className="audit-insight-list">
                  {insights.map((insight, index) => (
                    <div className="audit-insight-card" key={`${insight.title}-${index}`}>
                      <div className="audit-insight-top">
                        <strong>{insight.title}</strong>
                        <span className={toneClass(insight.tone)}>{insight.tone}</span>
                      </div>
                      <p>{insight.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="audit-side-block" style={{marginTop: '24px'}}>
                <div className="audit-side-title-row">
                  <h4>Profit snapshot</h4>
                </div>
                <div className="audit-chip-row audit-chip-row-vertical">
                  <div className="audit-chip">
                    <strong>Weighted GP</strong>
                    <span>{fmtPercent(weightedGp)}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Total dishes</strong>
                    <span>{allDishes.length}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Strong dishes</strong>
                    <span>{strongDishCount}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Watch dishes</strong>
                    <span>{watchDishCount}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>At risk dishes</strong>
                    <span>{riskDishCount}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Weekly revenue</strong>
                    <span>{fmtCurrency(totalRevenue)}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Weekly profit</strong>
                    <span>{fmtCurrency(totalProfit)}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Weekly opportunity</strong>
                    <span>{fmtCurrency(menuSummary.totalOpportunity)}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Total sections</strong>
                    <span>{project.sections.length}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <div style={{position: 'fixed', bottom: '24px', left: '24px', zIndex: 900}}>
        <button className="button button-primary" style={{
          minWidth: '180px',
          minHeight: '54px',
          padding: '0 24px',
          boxShadow: '0 20px 60px rgba(11, 18, 27, 0.24)'
        }} onClick={() => setControlModalOpen(true)}>
          Menu Controls
        </button>
      </div>

    </div>
  );
}

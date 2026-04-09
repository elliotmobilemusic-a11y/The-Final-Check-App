import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { StatCard } from '../../components/ui/StatCard';
import { selectableSitesForClient } from '../../features/clients/clientData';
import {
  buildReportHeroHtml,
  openPrintableHtmlDocument
} from '../../features/clients/clientExports';
import {
  deleteMenuProject,
  getMenuProjectById,
  listMenuProjects,
  saveMenuProject
} from '../../services/menus';
import { listClients } from '../../services/clients';
import type {
  ClientRecord,
  DishIngredient,
  MeasurementUnit,
  MenuDish,
  MenuProjectState,
  SupabaseRecord
} from '../../types';
import { fmtCurrency, fmtPercent, num, safe, todayIso, uid } from '../../lib/utils';
import { clearDraft, readDraft, writeDraft } from '../../services/draftStore';

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

const unitFamilies: Record<MeasurementUnit, 'weight' | 'volume' | 'count' | 'pack'> = {
  g: 'weight',
  kg: 'weight',
  ml: 'volume',
  l: 'volume',
  each: 'count',
  portion: 'count',
  pack: 'pack'
};

const unitMultipliers: Record<MeasurementUnit, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  each: 1,
  portion: 1,
  pack: 1
};

function convertUnitAmount(value: number, from: MeasurementUnit, to: MeasurementUnit) {
  if (from === to) return value;
  if (unitFamilies[from] !== unitFamilies[to]) return null;
  return (value * unitMultipliers[from]) / unitMultipliers[to];
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
  return dish.ingredients.reduce((sum, ingredient) => {
    const qtyUsed = num(ingredient.qtyUsed);
    const packQty = Math.max(num(ingredient.packQty), 1);
    const packCost = num(ingredient.packCost);
    const comparableQty =
      convertUnitAmount(qtyUsed, ingredient.qtyUnit, ingredient.packUnit) ?? qtyUsed;

    return sum + (comparableQty / packQty) * packCost;
  }, 0);
}

function dishMixCost(dish: MenuDish) {
  return dishUnitCost(dish) * Math.max(num(dish.mix), 0);
}

function dishTheoGp(dish: MenuDish) {
  const sell = num(dish.sellPrice);
  if (sell <= 0) return 0;
  return ((sell - dishUnitCost(dish)) / sell) * 100;
}

function dishProfit(dish: MenuDish) {
  return num(dish.sellPrice) - dishUnitCost(dish);
}

function dishRecommendedPrice(dish: MenuDish) {
  const unitCost = dishUnitCost(dish);
  const targetGp = Math.min(Math.max(num(dish.targetGp), 1), 95);

  if (unitCost <= 0) return 0;
  return unitCost / (1 - targetGp / 100);
}

function dishPriceGap(dish: MenuDish) {
  return dishRecommendedPrice(dish) - num(dish.sellPrice);
}

function gpClass(dish: MenuDish) {
  const theo = dishTheoGp(dish);
  const target = num(dish.targetGp);

  if (theo >= target) return 'status-pill status-success';
  if (theo >= target - 3) return 'status-pill status-warning';
  return 'status-pill status-danger';
}

function buildMenuReport(project: MenuProjectState) {
  const allDishes = project.sections.flatMap((section) => section.dishes);
  const totalSellByMix = allDishes.reduce(
    (sum, dish) => sum + num(dish.sellPrice) * num(dish.mix),
    0
  );
  const totalCostByMix = allDishes.reduce((sum, dish) => sum + dishMixCost(dish), 0);
  const weightedGp =
    totalSellByMix > 0 ? ((totalSellByMix - totalCostByMix) / totalSellByMix) * 100 : 0;
  const belowTargetCount = allDishes.filter((dish) => dishTheoGp(dish) < num(dish.targetGp)).length;
  const pricingMoveCount = allDishes.filter((dish) => Math.abs(dishPriceGap(dish)) >= 0.01).length;

  return `
    ${buildReportHeroHtml({
      eyebrow: 'Menu engineering export',
      title: safe(project.menuName) || 'Menu Builder Report',
      leadHtml: `<strong>${safe(project.siteName) || 'Unnamed site'}</strong>${
        safe(project.reviewDate) ? ` • Review date ${formatShortDate(project.reviewDate)}` : ''
      }`,
      description:
        'Menu pricing, section performance, and costing output prepared for client review and PDF handover.',
      chips: [
        `${project.sections.length} section${project.sections.length === 1 ? '' : 's'}`,
        `${allDishes.length} dish${allDishes.length === 1 ? '' : 'es'}`,
        `${belowTargetCount} below target GP`
      ],
      cards: [
        {
          label: 'Weighted theo GP',
          value: fmtPercent(weightedGp)
        },
        {
          label: 'Mix revenue',
          value: fmtCurrency(totalSellByMix)
        },
        {
          label: 'Mix cost',
          value: fmtCurrency(totalCostByMix)
        },
        {
          label: 'Price moves',
          value: String(pricingMoveCount),
          detail: 'Dishes where current price differs from target sell'
        }
      ]
    })}

    <section>
      <h2>Menu performance snapshot</h2>
      <div class="report-grid columns-4">
        <div><strong>Review date</strong><br />${formatShortDate(project.reviewDate)}</div>
        <div><strong>Sections</strong><br />${project.sections.length}</div>
        <div><strong>Total dishes</strong><br />${allDishes.length}</div>
        <div><strong>Dishes below target</strong><br />${belowTargetCount}</div>
      </div>
    </section>

    ${project.sections
      .map(
        (section) => `
      <section>
        <h2>${section.name}</h2>
        ${
          section.dishes.length
            ? `
        <table class="report-table">
          <thead>
            <tr>
              <th>Dish</th>
              <th>Unit Cost</th>
              <th>Mix Cost</th>
              <th>Sell</th>
              <th>Profit</th>
              <th>Target GP</th>
              <th>Theo GP</th>
              <th>Target sell</th>
              <th>Price move</th>
              <th>Mix</th>
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
                <td>${fmtCurrency(dishRecommendedPrice(dish))}</td>
                <td>${fmtCurrency(dishPriceGap(dish))}</td>
                <td>${num(dish.mix)}</td>
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
      )
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
    allDishes.some((dish) => num(dish.mix) > 0) ? 'yes' : '',
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
      detail: `The menu is currently tracking at ${fmtPercent(weightedGp)} against a default target of ${fmtPercent(project.defaultTargetGp)}.`
    });
  } else if (dishes.length > 0 && weightedGp < num(project.defaultTargetGp)) {
    insights.push({
      tone: 'warning',
      title: 'Theo GP is close to target',
      detail: 'Some dishes likely need tighter costing, better pricing, or cleaner portion control.'
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
      detail: 'Add realistic mix values so the menu view reflects actual commercial weight.'
    });
  }

  if (dishes.length > 0 && totalProfit > 0) {
    insights.push({
      tone: 'success',
      title: 'Menu profit view is active',
      detail: 'You can now use this page to compare dishes not just on GP, but on actual profit contribution.'
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
  const [savedProjects, setSavedProjects] = useState<SupabaseRecord<MenuProjectState>[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [dishDraft, setDishDraft] = useState<MenuDish | null>(null);
  const [sectionNameDraft, setSectionNameDraft] = useState('Starters');
  const [message, setMessage] = useState('Menu draft ready.');
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const totalRevenue = useMemo(
    () => allDishes.reduce((sum, dish) => sum + num(dish.sellPrice) * num(dish.mix), 0),
    [allDishes]
  );

  const totalProfit = useMemo(
    () => allDishes.reduce((sum, dish) => sum + dishProfit(dish) * num(dish.mix), 0),
    [allDishes]
  );

  const weightedGp = useMemo(() => {
    const totalSellByMix = allDishes.reduce(
      (sum, dish) => sum + num(dish.sellPrice) * num(dish.mix),
      0
    );
    const totalCostByMix = allDishes.reduce((sum, dish) => sum + dishMixCost(dish), 0);

    return totalSellByMix > 0 ? ((totalSellByMix - totalCostByMix) / totalSellByMix) * 100 : 0;
  }, [allDishes]);

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
  const pricingGapValue = useMemo(
    () =>
      allDishes.reduce((sum, dish) => {
        const gap = dishPriceGap(dish);
        return gap > 0 ? sum + gap * Math.max(num(dish.mix), 1) : sum;
      }, 0),
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
    const revenue = dishes.reduce((sum, dish) => sum + num(dish.sellPrice) * num(dish.mix), 0);
    const profit = dishes.reduce((sum, dish) => sum + dishProfit(dish) * num(dish.mix), 0);
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

  const refreshProjects = useCallback(async () => {
    try {
      setLoadingSaved(true);
      const activeClientId = queryClientId || project.clientId || undefined;
      const rows = await listMenuProjects(activeClientId || undefined);
      const sorted = [...rows].sort((a, b) => {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bTime - aTime;
      });
      setSavedProjects(sorted);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load menus.');
    } finally {
      setLoadingSaved(false);
    }
  }, [project.clientId, queryClientId]);

  useEffect(() => {
    listClients().then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

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
      const saved = await saveMenuProject(project);
      setProject({
        ...normalizeMenuProject(saved.data),
        id: saved.id,
        clientId: saved.client_id ?? saved.data.clientId ?? null,
        createdAt: saved.created_at,
        updatedAt: saved.updated_at
      });
      setMessage('Menu saved.');
      await refreshProjects();
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
    openPrintableHtmlDocument(
      `${safe(project.menuName || 'Menu Builder Report')} report`,
      reportHtml
    );
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

  async function handleLoad(record: SupabaseRecord<MenuProjectState>) {
    setProject({
      ...normalizeMenuProject(record.data),
      id: record.id,
      clientId: record.client_id ?? record.data.clientId ?? null,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    });
    setMessage(`Loaded "${record.title}".`);
  }

  async function handleDeleteSaved(id: string) {
    if (!window.confirm('Delete this saved menu project?')) return;

    try {
      await deleteMenuProject(id);

      if (project.id === id) {
        setProject(normalizeMenuProject(createDefaultMenu(queryClientId || null)));
      }

      await refreshProjects();
      setMessage('Saved menu project deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Delete failed.');
    }
  }

  return (
    <div className="page-stack menu-page">
      <PageIntro
        eyebrow="Menu builder"
        title="Menu engineering and pricing"
        description="Cost dishes from ingredients, track section performance, and tighten pricing with one working view that is built for menu reviews."
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
              {saving ? 'Saving...' : 'Save menu'}
            </button>
            <button className="button button-secondary" onClick={exportPdf}>
              Export PDF
            </button>
            <label className="button button-secondary inline-file-button">
              Load JSON
              <input accept="application/json" hidden type="file" onChange={loadFromJson} />
            </label>
          </>
        }
        side={
          <div className="page-intro-summary">
            <span
              className={
                weightedGp >= project.defaultTargetGp
                  ? 'status-pill status-success'
                  : weightedGp >= project.defaultTargetGp - 3
                    ? 'status-pill status-warning'
                    : 'status-pill status-danger'
              }
            >
              Theo GP {fmtPercent(weightedGp)}
            </span>
            <strong>Menu snapshot</strong>
            <p>{message}</p>
            <div className="page-intro-summary-list">
              <div>
                <span>Completion</span>
                <strong>{completion.percent}%</strong>
              </div>
              <div>
                <span>Dishes</span>
                <strong>{allDishes.length}</strong>
              </div>
              <div>
                <span>Price gap</span>
                <strong>{fmtCurrency(pricingGapValue)}</strong>
              </div>
            </div>
          </div>
        }
      />

      <section className="stats-grid">
        <StatCard
          label="Weighted theo GP"
          value={fmtPercent(weightedGp)}
          hint="Across all dishes by mix"
        />
        <StatCard
          label="Menu revenue"
          value={fmtCurrency(totalRevenue)}
          hint="Sell price × mix values"
        />
        <StatCard
          label="Menu profit"
          value={fmtCurrency(totalProfit)}
          hint="Commercial contribution view"
        />
        <StatCard
          label="Live dishes"
          value={String(allDishes.length)}
          hint={`${project.sections.length} active section${project.sections.length === 1 ? '' : 's'}`}
        />
      </section>

      <section className="workspace-grid">
        <div className="workspace-main">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Menu build</h3>
                <p className="muted-copy">
                  Control structure, costing, pricing, and mix from one central view.
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
                    <strong>Current theo GP</strong>
                    <span>{fmtPercent(weightedGp)}</span>
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
                          <th>Unit cost</th>
                          <th>Mix cost</th>
                          <th>Sell</th>
                          <th>Profit</th>
                          <th>Target GP</th>
                          <th>Theo GP</th>
                          <th>Target sell</th>
                          <th>Move</th>
                          <th>Mix</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!selectedSection.dishes.length ? (
                          <tr>
                            <td colSpan={11} className="empty-cell">
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
                                  value={dish.mix}
                                  onChange={(e) =>
                                    updateDishInline(
                                      selectedSection.id,
                                      dish.id,
                                      'mix',
                                      num(e.target.value)
                                    )
                                  }
                                />
                              </td>
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

        <aside className="workspace-side stack gap-20">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Menu control</h3>
                <p className="muted-copy">
                  The live control view for commercial strength, completeness, and next focus.
                </p>
              </div>
            </div>

            <div className="panel-body stack gap-20">
              <section className="menu-side-block">
                <div className="menu-side-title-row">
                  <h4>Readiness</h4>
                  <span className="soft-pill">{completion.percent}% complete</span>
                </div>

                <div className="menu-progress-track">
                  <div className="menu-progress-fill" style={{ width: `${completion.percent}%` }} />
                </div>

                <div className="menu-side-meta">
                  {completion.complete} of {completion.total} core checkpoints completed
                </div>
              </section>

              <section className="menu-side-block">
                <div className="menu-side-title-row">
                  <h4>System checks</h4>
                  <span className="soft-pill">{insights.length}</span>
                </div>

                <div className="menu-insight-list">
                  {insights.map((insight, index) => (
                    <div className="menu-insight-card" key={`${insight.title}-${index}`}>
                      <div className="menu-insight-top">
                        <strong>{insight.title}</strong>
                        <span className={toneClass(insight.tone)}>{insight.tone}</span>
                      </div>
                      <p>{insight.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="menu-side-block">
                <div className="menu-side-title-row">
                  <h4>Consultancy snapshot</h4>
                </div>

                <div className="menu-chip-row menu-chip-row-vertical">
                  <div className="menu-chip">
                    <strong>Current menu</strong>
                    <span>{safe(project.menuName) || 'Untitled menu'}</span>
                  </div>
                  <div className="menu-chip">
                    <strong>Linked client</strong>
                    <span>{activeClient?.company_name || 'No client linked'}</span>
                  </div>
                  <div className="menu-chip">
                    <strong>Site / location</strong>
                    <span>{safe(project.siteName) || 'Unnamed site'}</span>
                  </div>
                  <div className="menu-chip">
                    <strong>Main output</strong>
                    <span>Live report preview and section-level costing control</span>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Live menu report</h3>
                <p className="muted-copy">
                  Preview the current menu structure and commercial view.
                </p>
              </div>
              <button className="button button-secondary" onClick={exportPdf}>
                PDF / Print
              </button>
            </div>
            <div className="panel-body">
              <div className="report-preview" dangerouslySetInnerHTML={{ __html: reportHtml }} />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Saved menu projects</h3>
                <p className="muted-copy">
                  {project.clientId
                    ? 'Saved menu projects for the selected client.'
                    : 'Each signed-in user only sees their own saved projects.'}
                </p>
              </div>
            </div>
            <div className="panel-body stack gap-12">
              {loadingSaved ? <div className="muted-copy">Loading saved menu projects...</div> : null}
              {!loadingSaved && savedProjects.length === 0 ? (
                <div className="muted-copy">No menu projects saved yet.</div>
              ) : null}

              {savedProjects.map((record) => (
                <div className="saved-item" key={record.id}>
                  <div>
                    <strong>{record.title}</strong>
                    <div className="saved-meta">
                      {record.site_name || 'Unnamed site'} •{' '}
                      {formatShortDate(record.review_date || record.updated_at)}
                    </div>
                  </div>
                  <div className="saved-actions">
                    <button className="button button-ghost" onClick={() => handleLoad(record)}>
                      Load
                    </button>
                    <button
                      className="button button-ghost danger-text"
                      onClick={() => handleDeleteSaved(record.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {dishDraft ? (
        <div className="drawer-backdrop" onClick={closeDishEditor}>
          <div className="drawer-panel" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <h3>{editingDishId ? 'Edit dish' : 'Add dish'}</h3>
                <p className="muted-copy">
                  Build each dish from ingredients, sell price, target GP, and mix. Use the
                  target sell column to spot where pricing still needs work.
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
                        <h4>Dish basics</h4>
                        <p className="muted-copy">
                          Name the dish, set the sell price, and enter the commercial targets used
                          in the section analysis.
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
                        <span>Sales mix</span>
                        <input
                          className="input"
                          type="number"
                          value={dishDraft.mix}
                          onChange={(e) => updateDish('mix', num(e.target.value))}
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
                        <h4>Pricing snapshot</h4>
                        <p className="muted-copy">
                          Live costing updates as ingredients, pack sizes, and pricing are added.
                        </p>
                      </div>
                    </div>
                    <div className="dish-editor-stat-grid">
                      <StatCard label="Unit cost" value={fmtCurrency(dishUnitCost(dishDraft))} />
                      <StatCard label="Theo GP" value={fmtPercent(dishTheoGp(dishDraft))} />
                      <StatCard label="Profit / sale" value={fmtCurrency(dishProfit(dishDraft))} />
                      <StatCard
                        label="Target sell"
                        value={fmtCurrency(dishRecommendedPrice(dishDraft))}
                      />
                      <StatCard
                        label="Price move"
                        value={`${dishPriceGap(dishDraft) > 0 ? '+' : ''}${fmtCurrency(dishPriceGap(dishDraft))}`}
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
    </div>
  );
}

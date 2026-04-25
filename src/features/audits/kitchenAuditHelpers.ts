import type {
  AuditActionItem,
  AuditCategoryScores,
  AuditControlCheck,
  AuditFormState,
  AuditOrderingItem,
  AuditPortionItem,
  AuditWasteItem
} from '../../types';
import { fmtCurrency, fmtPercent, safe, todayIso, uid } from '../../lib/utils';
import {
  buildKitchenProfitNarrative,
  calculateKitchenProfitMetrics
} from '../profit/kitchenProfit';

export const KITCHEN_AUDIT_DRAFT_KEY = 'kitchen-audit-draft-v1';

export type InsightTone = 'success' | 'warning' | 'danger';

export type InsightItem = {
  tone: InsightTone;
  title: string;
  detail: string;
};

export type ArrayKeys = 'wasteItems' | 'portionItems' | 'orderingItems';

export type TextareaFieldKey =
  | 'summary'
  | 'cultureLeadership'
  | 'foodQuality'
  | 'systems'
  | 'layoutStrengths'
  | 'layoutIssues'
  | 'equipmentNeeds'
  | 'layoutImpact'
  | 'quickWins'
  | 'longTermStrategy'
  | 'priorityActions'
  | 'nextVisit';

export const sectionLinks = [
  { href: '#audit-site-details', label: 'Site details' },
  { href: '#audit-trading-profile', label: 'Trading profile' },
  { href: '#audit-commercial', label: 'Commercial' },
  { href: '#audit-scorecard', label: 'Scorecard' },
  { href: '#audit-controls', label: 'Controls' },
  { href: '#audit-observations', label: 'Observations' },
  { href: '#audit-waste', label: 'Waste' },
  { href: '#audit-portion', label: 'Portioning' },
  { href: '#audit-ordering', label: 'Ordering' },
  { href: '#audit-layout', label: 'Layout' },
  { href: '#audit-actions', label: 'Action plan' }
] as const;

export const textareaFields: Array<{ key: TextareaFieldKey; label: string }> = [
  { key: 'summary', label: 'Executive summary' },
  { key: 'cultureLeadership', label: 'Leadership and kitchen culture' },
  { key: 'foodQuality', label: 'Food quality and offer' },
  { key: 'systems', label: 'Systems and controls' },
  { key: 'layoutStrengths', label: 'Layout strengths' },
  { key: 'layoutIssues', label: 'Layout issues' },
  { key: 'equipmentNeeds', label: 'Equipment and space requirements' },
  { key: 'layoutImpact', label: 'Commercial impact of layout' },
  { key: 'quickWins', label: 'Immediate quick wins (one per line)' },
  { key: 'longTermStrategy', label: 'Long-term strategy (one per line)' },
  { key: 'priorityActions', label: 'Priority actions (one per line)' },
  { key: 'nextVisit', label: 'Recommended follow-up' }
];

export const kitchenPhotoSections = {
  commercial: 'Commercial snapshot',
  controls: 'Controls and evidence',
  findings: 'Operational findings',
  layout: 'Layout and equipment',
  actions: 'Action planning'
} as const;

export function blankWasteItem(): AuditWasteItem {
  return { id: uid('waste'), item: '', cost: 0, cause: '', fix: '' };
}

export function blankPortionItem(): AuditPortionItem {
  return { id: uid('portion'), dish: '', loss: 0, issue: '', fix: '' };
}

export function blankOrderingItem(): AuditOrderingItem {
  return { id: uid('ordering'), category: '', problem: '', impact: '', fix: '' };
}

export function blankActionItem(partial?: Partial<AuditActionItem>): AuditActionItem {
  return {
    id: uid('action'),
    title: '',
    area: '',
    priority: 'Medium',
    owner: '',
    dueDate: '',
    status: 'Open',
    impact: '',
    ...partial
  };
}

export function blankControlCheck(partial?: Partial<AuditControlCheck>): AuditControlCheck {
  return {
    id: uid('control'),
    category: 'Operations',
    label: '',
    status: 'Partial',
    note: '',
    ...partial
  };
}

export function defaultControlChecks(): AuditControlCheck[] {
  return [
    blankControlCheck({ category: 'Systems', label: 'Recipe specs are current and in use' }),
    blankControlCheck({ category: 'Compliance', label: 'Allergen matrix is accurate and accessible' }),
    blankControlCheck({ category: 'Hygiene', label: 'Opening and closing cleaning checks are completed' }),
    blankControlCheck({ category: 'Food safety', label: 'Temperature logs are completed and reviewed' }),
    blankControlCheck({ category: 'Cost control', label: 'Waste is recorded daily with categories' }),
    blankControlCheck({ category: 'Stock', label: 'Stocktakes and variance checks happen on a routine cadence' }),
    blankControlCheck({ category: 'Purchasing', label: 'Ordering pars and ownership are clearly set' }),
    blankControlCheck({ category: 'Operations', label: 'Prep sheets or production plans are used each service' }),
    blankControlCheck({ category: 'People', label: 'Team training records and onboarding are current' }),
    blankControlCheck({ category: 'Maintenance', label: 'Equipment issues are logged and followed up' }),
    blankControlCheck({ category: 'Food safety', label: 'Probe calibration and fridge / freezer checks are up to date' }),
    blankControlCheck({ category: 'Compliance', label: 'COSHH, HACCP, and due-diligence documents are current' }),
    blankControlCheck({ category: 'Stock', label: 'High-value lines are counted and secured correctly' }),
    blankControlCheck({ category: 'Operations', label: 'Service pass and handover communication are structured' }),
    blankControlCheck({ category: 'Systems', label: 'Menu updates, supplier changes, and recipe amendments are signed off' }),
    blankControlCheck({ category: 'Cost control', label: 'Portion control tools and plating standards are in place' }),
    blankControlCheck({ category: 'People', label: 'Rota, labour deployment, and section ownership are clear' }),
    blankControlCheck({ category: 'Purchasing', label: 'Supplier pricing, substitutions, and approvals are reviewed regularly' }),
    blankControlCheck({ category: 'Maintenance', label: 'Critical equipment has preventive maintenance or service cover in place' })
  ];
}

export function defaultCategoryScores(): AuditCategoryScores {
  return {
    leadership: 7,
    foodQuality: 7,
    systems: 7,
    cleanliness: 7,
    flow: 7,
    training: 7,
    stock: 7,
    safety: 7
  };
}

export function createDefaultAudit(clientId: string | null = null): AuditFormState {
  return {
    id: undefined,
    clientId,
    clientSiteId: null,
    title: 'Kitchen Profit Audit',
    businessName: '',
    location: '',
    visitDate: todayIso(),
    consultantName: 'Jason Wardill',
    contactName: '',
    auditType: 'Operational Audit',
    serviceStyle: 'Full service',
    tradingDays: '7 days',
    coversPerWeek: 0,
    averageSpend: 0,
    kitchenTeamSize: 0,
    mainSupplier: '',
    weeklySales: 0,
    weeklyFoodCost: 0,
    targetGp: 70,
    actualWasteValue: 0,
    labourPercent: 0,
    targetLabourPercent: 24,
    orderingScore: 'Moderate',
    allergenConfidence: 'Moderate',
    hygieneRisk: 'Moderate',
    equipmentCondition: 'Mixed',
    summary: '',
    cultureLeadership: '',
    foodQuality: '',
    systems: '',
    layoutStrengths: '',
    layoutIssues: '',
    equipmentNeeds: '',
    layoutImpact: '',
    quickWins: '',
    longTermStrategy: '',
    priorityActions: '',
    nextVisit: '',
    categoryScores: defaultCategoryScores(),
    wasteItems: [blankWasteItem()],
    portionItems: [blankPortionItem()],
    orderingItems: [blankOrderingItem()],
    actionItems: [blankActionItem()],
    controlChecks: defaultControlChecks(),
    photos: []
  };
}

export function normalizeAuditState(
  data: Partial<AuditFormState>,
  fallbackClientId: string | null = null
): AuditFormState {
  const defaults = createDefaultAudit(data.clientId ?? fallbackClientId ?? null);
  const wasteItems = data.wasteItems ?? [];
  const portionItems = data.portionItems ?? [];
  const orderingItems = data.orderingItems ?? [];
  const actionItems = data.actionItems ?? [];
  const controlChecks = data.controlChecks ?? [];
  const photos = data.photos ?? [];

  return {
    ...defaults,
    ...data,
    clientId: data.clientId ?? fallbackClientId ?? defaults.clientId,
    categoryScores: {
      ...defaults.categoryScores,
      ...(data.categoryScores ?? {})
    },
    wasteItems:
      wasteItems.length > 0
        ? wasteItems.map((item) => ({ ...blankWasteItem(), ...item, id: item.id || uid('waste') }))
        : defaults.wasteItems,
    portionItems:
      portionItems.length > 0
        ? portionItems.map((item) => ({
            ...blankPortionItem(),
            ...item,
            id: item.id || uid('portion')
          }))
        : defaults.portionItems,
    orderingItems:
      orderingItems.length > 0
        ? orderingItems.map((item) => ({
            ...blankOrderingItem(),
            ...item,
            id: item.id || uid('ordering')
          }))
        : defaults.orderingItems,
    actionItems:
      actionItems.length > 0
        ? actionItems.map((item) => ({
            ...blankActionItem(),
            ...item,
            id: item.id || uid('action')
          }))
        : defaults.actionItems,
    controlChecks:
      controlChecks.length > 0
        ? controlChecks.map((item) => ({
            ...blankControlCheck(),
            ...item,
            id: item.id || uid('control')
          }))
        : defaults.controlChecks,
    photos: photos.length > 0 ? photos.map((photo) => ({ ...photo, id: photo.id || uid('photo') })) : defaults.photos
  };
}

export function calculateAudit(state: AuditFormState) {
  return calculateKitchenProfitMetrics(state);
}

export function buildSuggestedActionItems(
  state: AuditFormState,
  calc: ReturnType<typeof calculateAudit>
): AuditActionItem[] {
  const suggestions: AuditActionItem[] = [];

  if (state.weeklySales > 0 && calc.gpGap > 0) {
    suggestions.push(
      blankActionItem({
        title: 'Close the GP gap',
        area: 'Margin control',
        priority: calc.gpGap > 4 ? 'Critical' : 'High',
        impact: `Recover approximately ${fmtCurrency(calc.gpOpportunityValue)} of weekly gross profit opportunity.`
      })
    );
  }

  if (state.actualWasteValue > 0) {
    suggestions.push(
      blankActionItem({
        title: 'Implement daily waste tracking',
        area: 'Waste',
        priority: calc.wastePercent >= 2 ? 'Critical' : 'High',
        impact: `Target reduction against ${fmtCurrency(state.actualWasteValue)} of weekly waste.`
      })
    );
  }

  if (state.portionItems.some((item) => safe(item.dish))) {
    suggestions.push(
      blankActionItem({
        title: 'Standardise portions on identified dishes',
        area: 'Portion control',
        priority: calc.portionRisk === 'High' ? 'High' : 'Medium',
        impact: `Protect ${fmtCurrency(calc.totalPortionLoss)} of weekly leakage.`
      })
    );
  }

  if (state.orderingItems.some((item) => safe(item.category))) {
    suggestions.push(
      blankActionItem({
        title: 'Reset ordering and stock controls',
        area: 'Ordering',
        priority: 'High',
        impact: 'Reduce over-ordering, stock holding, and preventable spoilage.'
      })
    );
  }

  if (safe(state.layoutIssues)) {
    suggestions.push(
      blankActionItem({
        title: 'Resolve key kitchen flow bottlenecks',
        area: 'Layout',
        priority: 'Medium',
        impact: 'Improve labour efficiency, consistency, and service pace.'
      })
    );
  }

  if (state.hygieneRisk === 'High' || state.allergenConfidence === 'Low') {
    suggestions.push(
      blankActionItem({
        title: 'Address food safety and allergen risk immediately',
        area: 'Food safety',
        priority: 'Critical',
        impact: 'Reduce operational and compliance exposure before the next service window.'
      })
    );
  }

  if (calc.missingControls > 0) {
    suggestions.push(
      blankActionItem({
        title: 'Close the missing control gaps',
        area: 'Controls and compliance',
        priority: calc.criticalMissingControls > 0 ? 'Critical' : 'High',
        impact: `${calc.missingControls} operational controls are not fully in place, including ${calc.criticalMissingControls} critical controls.`
      })
    );
  }

  return suggestions;
}

export function buildSuggestedNarrative(
  state: AuditFormState,
  calc: ReturnType<typeof calculateAudit>
) {
  const narrative = buildKitchenProfitNarrative(state, calc);
  return {
    summary: narrative.executiveSummary,
    quickWins: narrative.quickWins.join('\n'),
    priorityActions: narrative.actionPlan30To90Days.join('\n'),
    longTermStrategy: narrative.keyIssues.join('\n'),
    nextVisit: narrative.followUpRecommendation
  };
}

export function completionSummary(form: AuditFormState) {
  const checkpoints = [
    safe(form.businessName),
    safe(form.location),
    safe(form.visitDate),
    safe(form.serviceStyle),
    safe(form.tradingDays),
    form.weeklySales > 0 ? 'yes' : '',
    form.weeklyFoodCost > 0 ? 'yes' : '',
    form.coversPerWeek > 0 ? 'yes' : '',
    form.averageSpend > 0 ? 'yes' : '',
    safe(form.summary),
    safe(form.foodQuality),
    safe(form.cultureLeadership),
    safe(form.systems),
    form.controlChecks.some((item) => item.status !== 'Partial' || safe(item.note)) ? 'yes' : '',
    safe(form.layoutIssues) || safe(form.layoutStrengths),
    safe(form.quickWins) || safe(form.priorityActions),
    form.actionItems.some((item) => safe(item.title)) ? 'yes' : '',
    form.wasteItems.some((item) => safe(item.item)) ? 'yes' : '',
    form.portionItems.some((item) => safe(item.dish)) ? 'yes' : '',
    form.orderingItems.some((item) => safe(item.category)) ? 'yes' : ''
  ];

  const complete = checkpoints.filter(Boolean).length;
  const total = checkpoints.length;
  const percent = Math.round((complete / total) * 100);

  return { complete, total, percent };
}

export function buildAuditInsights(
  form: AuditFormState,
  calc: ReturnType<typeof calculateAudit>
): InsightItem[] {
  const insights: InsightItem[] = [];

  if (form.weeklySales <= 0 || form.weeklyFoodCost <= 0) {
    insights.push({
      tone: 'warning',
      title: 'Commercial baseline missing',
      detail: 'Add weekly sales and food cost to unlock the strongest GP analysis.'
    });
  }

  if (form.weeklySales <= 0 && calc.estimatedWeeklySales > 0) {
    insights.push({
      tone: 'warning',
      title: `Estimated weekly sales at ${fmtCurrency(calc.estimatedWeeklySales)}`,
      detail: 'Use the covers and spend estimate as a working baseline if the live sales figure is not available onsite.'
    });
  }

  if (form.weeklySales > 0 && calc.gpGap > 2) {
    insights.push({
      tone: 'danger',
      title: `GP below target by ${calc.gpGap.toFixed(1)} points`,
      detail: 'This is likely the biggest commercial pressure point and should drive the action plan.'
    });
  }

  if (form.weeklySales > 0 && calc.gpGap <= 0) {
    insights.push({
      tone: 'success',
      title: 'GP is on or above target',
      detail: 'Use the audit to protect consistency, control waste, and lock the standard in.'
    });
  }

  if (calc.wastePercent >= 2) {
    insights.push({
      tone: 'danger',
      title: `Waste is running at ${fmtPercent(calc.wastePercent)}`,
      detail: 'This suggests an immediate need for tighter prep, holding, and waste tracking.'
    });
  } else if (form.actualWasteValue > 0) {
    insights.push({
      tone: 'warning',
      title: 'Waste is recorded',
      detail: 'There is enough waste value here to justify a daily tracking routine and category review.'
    });
  }

  if (calc.portionRisk === 'High') {
    insights.push({
      tone: 'danger',
      title: 'High portion-control risk',
      detail: 'Portion inconsistency is likely hitting margin and should be standardised quickly.'
    });
  } else if (calc.portionRisk === 'Moderate') {
    insights.push({
      tone: 'warning',
      title: 'Moderate portion-control risk',
      detail: 'This should still be tightened with recipe cards, tools, and station checks.'
    });
  }

  if (calc.labourOpportunityValue > 0 && form.labourPercent >= form.targetLabourPercent + 6) {
    insights.push({
      tone: 'danger',
      title: `Labour is above target by ${fmtPercent(form.labourPercent - form.targetLabourPercent)}`,
      detail: 'Labour deployment appears inefficient and is now a direct commercial opportunity.'
    });
  } else if (calc.labourOpportunityValue > 0) {
    insights.push({
      tone: 'warning',
      title: 'Labour is above target',
      detail: 'Use the audit to isolate where flow, prep, or staffing discipline is inflating wage spend.'
    });
  }

  if (form.orderingItems.some((item) => safe(item.category))) {
    insights.push({
      tone: 'warning',
      title: 'Ordering control issues recorded',
      detail: 'These should translate into a simple control routine with ownership, pars, and review points.'
    });
  }

  if (calc.criticalMissingControls > 0) {
    insights.push({
      tone: 'danger',
      title: `${calc.criticalMissingControls} critical controls missing`,
      detail: 'Food safety, hygiene, or compliance controls are not fully in place and should be closed immediately.'
    });
  } else if (calc.controlScore > 0 && calc.controlScore < 75) {
    insights.push({
      tone: 'warning',
      title: `Control compliance at ${Math.round(calc.controlScore)}%`,
      detail: 'The site has usable systems, but too many controls still rely on partial compliance.'
    });
  } else if (calc.controlScore >= 85) {
    insights.push({
      tone: 'success',
      title: 'Control compliance is strong',
      detail: 'Most core controls are in place, so the audit can focus more on refinement and commercial gains.'
    });
  }

  if (calc.operationsAverage < 6.5) {
    insights.push({
      tone: 'danger',
      title: `Operational scorecard averaging ${calc.operationsAverage.toFixed(1)}/10`,
      detail: 'Core kitchen standards are reading weak and need a tighter short-term operating reset.'
    });
  } else if (calc.operationsAverage < 8) {
    insights.push({
      tone: 'warning',
      title: 'Operational scorecard is mixed',
      detail: 'The kitchen has usable foundations but still needs stronger consistency in execution.'
    });
  }

  if (form.hygieneRisk === 'High' || form.allergenConfidence === 'Low') {
    insights.push({
      tone: 'danger',
      title: 'Food safety risk needs immediate attention',
      detail: 'Hygiene or allergen controls are not where they need to be for a confident operating environment.'
    });
  }

  if (calc.totalNamedActions === 0 && completionSummary(form).percent >= 50) {
    insights.push({
      tone: 'warning',
      title: 'No structured actions have been recorded',
      detail: 'Convert findings into named action items so the follow-up plan is easier to run.'
    });
  }

  if (safe(form.layoutIssues)) {
    insights.push({
      tone: 'warning',
      title: 'Layout issues could be affecting output',
      detail: 'The report should show how flow, motion, storage, or service bottlenecks hurt performance.'
    });
  }

  if (!insights.length) {
    insights.push({
      tone: 'success',
      title: 'Audit record ready',
      detail: 'Start entering commercial and operational findings to build the final report.'
    });
  }

  return insights.slice(0, 6);
}

export function toneClass(tone: InsightTone) {
  if (tone === 'danger') return 'status-pill status-danger';
  if (tone === 'warning') return 'status-pill status-warning';
  return 'status-pill status-success';
}

export type KitchenAuditPhotoSection = keyof typeof kitchenPhotoSections;

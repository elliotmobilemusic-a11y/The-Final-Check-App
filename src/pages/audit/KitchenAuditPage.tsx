import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { StatCard } from '../../components/ui/StatCard';
import { selectableSitesForClient } from '../../features/clients/clientData';
import { openPrintableHtmlDocument } from '../../features/clients/clientExports';
import { deleteAudit, getAuditById, listAudits, saveAudit } from '../../services/audits';
import { listClients } from '../../services/clients';
import type {
  AuditActionItem,
  AuditCategoryScores,
  AuditControlCheck,
  AuditFormState,
  AuditOrderingItem,
  AuditPortionItem,
  AuditWasteItem,
  ClientRecord,
  SupabaseRecord
} from '../../types';
import {
  downloadText,
  fmtCurrency,
  fmtPercent,
  lines,
  num,
  safe,
  todayIso,
  uid
} from '../../lib/utils';

function blankWasteItem(): AuditWasteItem {
  return { id: uid('waste'), item: '', cost: 0, cause: '', fix: '' };
}

function blankPortionItem(): AuditPortionItem {
  return { id: uid('portion'), dish: '', loss: 0, issue: '', fix: '' };
}

function blankOrderingItem(): AuditOrderingItem {
  return { id: uid('ordering'), category: '', problem: '', impact: '', fix: '' };
}

function blankActionItem(partial?: Partial<AuditActionItem>): AuditActionItem {
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

function blankControlCheck(partial?: Partial<AuditControlCheck>): AuditControlCheck {
  return {
    id: uid('control'),
    category: 'Operations',
    label: '',
    status: 'Partial',
    note: '',
    ...partial
  };
}

function defaultControlChecks(): AuditControlCheck[] {
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

function defaultCategoryScores(): AuditCategoryScores {
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

function createDefaultAudit(clientId: string | null = null): AuditFormState {
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
    controlChecks: defaultControlChecks()
  };
}

function normalizeAuditState(
  data: Partial<AuditFormState>,
  fallbackClientId: string | null = null
): AuditFormState {
  const defaults = createDefaultAudit(data.clientId ?? fallbackClientId ?? null);
  const wasteItems = data.wasteItems ?? [];
  const portionItems = data.portionItems ?? [];
  const orderingItems = data.orderingItems ?? [];
  const actionItems = data.actionItems ?? [];
  const controlChecks = data.controlChecks ?? [];

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
        : defaults.controlChecks
  };
}

function scoreClass(score: number) {
  if (score >= 75) return 'status-pill status-danger';
  if (score >= 40) return 'status-pill status-warning';
  return 'status-pill status-success';
}

function scoreLabel(score: number) {
  if (score >= 75) return 'High priority';
  if (score >= 40) return 'Medium priority';
  return 'Stable';
}

function calculateAudit(state: AuditFormState) {
  const actualGp =
    state.weeklySales > 0
      ? ((state.weeklySales - state.weeklyFoodCost) / state.weeklySales) * 100
      : 0;

  const wastePercent =
    state.weeklySales > 0 ? (state.actualWasteValue / state.weeklySales) * 100 : 0;

  const totalPortionLoss = state.portionItems.reduce((sum, item) => sum + num(item.loss), 0);

  const portionRisk =
    state.portionItems.filter((item) => safe(item.dish)).length >= 4 || totalPortionLoss >= 250
      ? 'High'
      : state.portionItems.filter((item) => safe(item.dish)).length >= 2 || totalPortionLoss >= 100
        ? 'Moderate'
        : 'Low';

  const scoreValues = Object.values(state.categoryScores);
  const operationsAverage =
    scoreValues.length > 0
      ? scoreValues.reduce((sum, value) => sum + num(value), 0) / scoreValues.length
      : 0;
  const estimatedWeeklySales = num(state.coversPerWeek) * num(state.averageSpend);
  const activeControlChecks = state.controlChecks.filter((item) => item.status !== 'N/A');
  const controlScore =
    activeControlChecks.length > 0
      ? (activeControlChecks.reduce((sum, item) => {
          if (item.status === 'In Place') return sum + 1;
          if (item.status === 'Partial') return sum + 0.5;
          return sum;
        }, 0) /
          activeControlChecks.length) *
        100
      : 0;
  const missingControls = activeControlChecks.filter((item) => item.status === 'Missing').length;
  const criticalMissingControls = activeControlChecks.filter(
    (item) =>
      item.status === 'Missing' &&
      ['Compliance', 'Food safety', 'Hygiene'].includes(item.category)
  ).length;
  const gpOpportunityValue =
    state.weeklySales > 0 && state.targetGp > actualGp
      ? state.weeklySales * ((state.targetGp - actualGp) / 100)
      : 0;
  const totalNamedActions = state.actionItems.filter((item) => safe(item.title)).length;

  let score = 0;
  score += Math.max(0, Math.min(30, (state.targetGp - actualGp) * 2));
  score += Math.max(0, Math.min(20, wastePercent * 4));
  score += Math.max(0, Math.min(15, state.labourPercent > 0 ? state.labourPercent - 20 : 0));
  score += Math.min(15, state.portionItems.filter((item) => safe(item.dish)).length * 4);
  score += Math.min(10, state.orderingItems.filter((item) => safe(item.category)).length * 2.5);
  score += Math.min(10, state.wasteItems.filter((item) => safe(item.item)).length * 2.5);
  score += Math.max(0, Math.min(18, (8 - operationsAverage) * 5));
  score += state.hygieneRisk === 'High' ? 10 : state.hygieneRisk === 'Moderate' ? 5 : 0;
  score +=
    state.allergenConfidence === 'Low'
      ? 10
      : state.allergenConfidence === 'Moderate'
        ? 5
        : 0;
  score +=
    state.equipmentCondition === 'Poor'
      ? 8
      : state.equipmentCondition === 'Mixed'
        ? 4
        : 0;
  score += Math.min(14, missingControls * 2.5);
  score += criticalMissingControls * 4;

  return {
    actualGp,
    wastePercent,
    totalPortionLoss,
    portionRisk,
    score: Math.min(100, Math.round(score)),
    gpGap: state.targetGp - actualGp,
    operationsAverage,
    estimatedWeeklySales,
    controlScore,
    missingControls,
    criticalMissingControls,
    gpOpportunityValue,
    totalNamedActions
  };
}

function listHtml(items: string[], emptyText: string) {
  if (!items.length) return `<p class="muted-copy">${emptyText}</p>`;
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function buildSuggestedActionItems(
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

function buildSuggestedNarrative(
  state: AuditFormState,
  calc: ReturnType<typeof calculateAudit>
) {
  const summaryLines = [
    safe(state.businessName)
      ? `${safe(state.businessName)} was reviewed on ${safe(state.visitDate) || 'the recorded visit date'} as a ${safe(state.auditType) || 'kitchen performance audit'}.`
      : '',
    state.weeklySales > 0
      ? `Weekly food sales are running at ${fmtCurrency(state.weeklySales)} with actual GP at ${fmtPercent(calc.actualGp)} versus a target of ${fmtPercent(state.targetGp)}.`
      : calc.estimatedWeeklySales > 0
        ? `Estimated weekly food sales from covers and average spend sit around ${fmtCurrency(calc.estimatedWeeklySales)}.`
        : '',
    calc.gpOpportunityValue > 0
      ? `The current GP gap represents roughly ${fmtCurrency(calc.gpOpportunityValue)} of weekly gross profit opportunity.`
      : '',
    calc.wastePercent > 0
      ? `Waste is currently reading at ${fmtPercent(calc.wastePercent)} of weekly sales.`
      : '',
    calc.operationsAverage > 0
      ? `The operational scorecard averages ${calc.operationsAverage.toFixed(1)}/10, with control compliance at ${Math.round(calc.controlScore)}%.`
      : '',
    calc.criticalMissingControls > 0
      ? `${calc.criticalMissingControls} critical controls need immediate attention before the next service cycle.`
      : ''
  ].filter(Boolean);

  const quickWins = [
    calc.estimatedWeeklySales > 0 && state.weeklySales <= 0
      ? `Use ${fmtCurrency(calc.estimatedWeeklySales)} as the working weekly sales baseline until a live sales figure is confirmed.`
      : '',
    state.actualWasteValue > 0 ? 'Restart or tighten daily waste logging with named ownership.' : '',
    state.portionItems.some((item) => safe(item.dish))
      ? 'Introduce measured portion tools and station checks on the dishes with the highest leakage.'
      : '',
    calc.missingControls > 0
      ? 'Close the missing controls first, especially the food safety, hygiene, and compliance items.'
      : '',
    state.orderingItems.some((item) => safe(item.category))
      ? 'Reset ordering pars and review order quantities before the next delivery window.'
      : ''
  ].filter(Boolean);

  const priorityActions = [
    calc.gpOpportunityValue > 0
      ? `Recover the ${fmtCurrency(calc.gpOpportunityValue)} weekly GP opportunity through menu controls, portions, and purchasing discipline.`
      : '',
    calc.operationsAverage < 7
      ? 'Run a short operational reset focused on standards, leadership, and line discipline.'
      : '',
    calc.missingControls > 0
      ? `Create a simple control tracker to close ${calc.missingControls} missing or incomplete controls.`
      : '',
    safe(state.layoutIssues)
      ? 'Remove the biggest kitchen flow bottlenecks that are slowing service or inflating labour.'
      : '',
    'Review progress weekly against the action register and re-score the site on the next visit.'
  ].filter(Boolean);

  const longTermStrategy = [
    'Build the site onto a repeatable operating rhythm with clearer ownership and weekly accountability.',
    'Link recipe discipline, stock accuracy, and training into one kitchen control system.',
    safe(state.layoutIssues)
      ? 'Phase layout or equipment improvements based on the biggest operational bottlenecks.'
      : '',
    calc.controlScore < 85
      ? 'Move the control register from partial compliance to a fully embedded management routine.'
      : ''
  ].filter(Boolean);

  const nextVisit = [
    'Recommended next visit:',
    calc.criticalMissingControls > 0
      ? 'return within 7 to 14 days to verify critical controls and food safety follow-through.'
      : 'return within 2 to 4 weeks to review progress against actions and confirm standards are holding.',
    calc.totalNamedActions > 0
      ? `The next review should check ownership on the ${calc.totalNamedActions} live action items.`
      : 'Use the next review to convert the main findings into named actions with owners and dates.'
  ].join(' ');

  return {
    summary: summaryLines.join(' '),
    quickWins: quickWins.join('\n'),
    priorityActions: priorityActions.join('\n'),
    longTermStrategy: longTermStrategy.join('\n'),
    nextVisit
  };
}

function applyAuditPreset(kind: 'margin' | 'operations' | 'opening', state: AuditFormState) {
  const base =
    kind === 'margin'
      ? {
          auditType: 'Menu & GP Review',
          title: 'Kitchen Margin Recovery Audit',
          targetGp: 72,
          orderingScore: 'High' as const,
          quickWins:
            'Review top margin leaks.\nTighten portions on high-volume dishes.\nReset daily waste tracking.',
          priorityActions:
            'Recover lost GP through recipe specs and pricing.\nSet weekly controls for waste and ordering.\nCreate a short ownership plan with the chef team.'
        }
      : kind === 'opening'
        ? {
            auditType: 'New Opening Support',
            title: 'Kitchen Launch Readiness Audit',
            targetGp: 68,
            orderingScore: 'Moderate' as const,
            quickWins:
              'Confirm opening pars and ordering rhythm.\nFinalise recipe spec packs.\nBrief the team on service flow and controls.',
            priorityActions:
              'Build launch-week operating rhythm.\nProtect consistency during opening weeks.\nSet first follow-up review cadence.'
          }
        : {
            auditType: 'Operational Audit',
            title: 'Kitchen Systems and Performance Audit',
            targetGp: 70,
            orderingScore: 'Moderate' as const,
            quickWins:
              'Identify the top three operational leaks.\nCorrect any immediate control gaps.\nBrief the management team on critical next steps.',
            priorityActions:
              'Stabilise daily kitchen systems.\nReduce waste and labour drag.\nCreate a 30-day operational improvement plan.'
          };

  return {
    ...state,
    ...base
  };
}

function makeAuditReport(state: AuditFormState) {
  const calc = calculateAudit(state);
  const actionRows = state.actionItems.filter((item) => safe(item.title));
  const controlRows = state.controlChecks.filter(
    (item) => item.status !== 'N/A' || safe(item.note) || safe(item.label)
  );
  const scoreEntries = [
    ['Leadership', state.categoryScores.leadership],
    ['Food quality', state.categoryScores.foodQuality],
    ['Systems', state.categoryScores.systems],
    ['Cleanliness', state.categoryScores.cleanliness],
    ['Flow', state.categoryScores.flow],
    ['Training', state.categoryScores.training],
    ['Stock', state.categoryScores.stock],
    ['Safety', state.categoryScores.safety]
  ];

  const detailedFindings: string[] = [];
  if (state.weeklySales > 0) {
    const gap = state.targetGp - calc.actualGp;
    detailedFindings.push(
      `Current food GP is <strong>${fmtPercent(calc.actualGp)}</strong> against a target of <strong>${fmtPercent(state.targetGp)}</strong>. ${
        gap > 0
          ? `This leaves a gap of <strong>${gap.toFixed(1)} GP points</strong>.`
          : 'The site is meeting or exceeding its stated GP target.'
      }`
    );
  }
  if (state.actualWasteValue > 0) {
    detailedFindings.push(
      `Recorded waste sits at <strong>${fmtCurrency(state.actualWasteValue)}</strong> per week, equivalent to <strong>${fmtPercent(calc.wastePercent)}</strong> of weekly food sales.`
    );
  }
  if (calc.totalPortionLoss > 0) {
    detailedFindings.push(
      `Observed over-portioning creates an estimated weekly loss of <strong>${fmtCurrency(calc.totalPortionLoss)}</strong>.`
    );
  }
  if (safe(state.summary)) detailedFindings.push(safe(state.summary));
  if (safe(state.foodQuality)) {
    detailedFindings.push(`<strong>Food quality and offer:</strong> ${safe(state.foodQuality)}`);
  }
  if (safe(state.cultureLeadership)) {
    detailedFindings.push(
      `<strong>Leadership and team culture:</strong> ${safe(state.cultureLeadership)}`
    );
  }
  if (safe(state.systems)) {
    detailedFindings.push(`<strong>Systems and controls:</strong> ${safe(state.systems)}`);
  }

  const priorityActions = lines(state.priorityActions).length
    ? lines(state.priorityActions)
    : [
        state.targetGp > calc.actualGp
          ? 'Close the GP gap by standardising recipe specs, checking menu pricing, and tightening portion control.'
          : '',
        state.actualWasteValue > 0
          ? 'Implement a daily waste-recording routine and review the top categories every week.'
          : '',
        state.portionItems.some((item) => safe(item.dish))
          ? 'Introduce measured portion tools, recipe cards, and line training on dishes where over-portioning was observed.'
          : '',
        state.orderingItems.some((item) => safe(item.category))
          ? 'Reset ordering control with par levels, delivery-day discipline, and clear ownership.'
          : '',
        safe(state.layoutIssues)
          ? 'Address kitchen layout bottlenecks that slow service, increase motion, or reduce consistency.'
          : '',
        'Build a 30-day action plan with owners and weekly review points.'
      ].filter(Boolean);

  const quickWins = lines(state.quickWins).length
    ? lines(state.quickWins)
    : [
        state.actualWasteValue > 0 ? 'Start a daily waste sheet immediately.' : '',
        state.portionItems.some((item) => safe(item.dish))
          ? 'Add scales, scoops, or ladles to stations with inconsistent portions.'
          : '',
        state.orderingItems.some((item) => safe(item.category))
          ? 'Reduce order quantities to realistic par levels for the next delivery cycle.'
          : '',
        'Brief the kitchen team on the top three profit leaks found during the visit.'
      ].filter(Boolean);

  const longTerm = lines(state.longTermStrategy).length
    ? lines(state.longTermStrategy)
    : [
        'Complete a menu-engineering review to align offer, pricing, and margin performance.',
        'Develop recipe packs and costed build sheets for the full menu.',
        'Create a chef development plan focused on leadership, control, and consistency.',
        safe(state.layoutIssues)
          ? 'Plan a phased kitchen layout improvement project to improve flow and efficiency.'
          : ''
      ].filter(Boolean);

  const repeatSection = <T extends object>(
    title: string,
    items: T[],
    formatter: (item: T) => string,
    emptyText: string
  ) => {
    const filtered = items.filter((item) =>
      Object.values(item as Record<string, unknown>).some((value) => safe(value).length)
    );

    if (!filtered.length) {
      return `<h3>${title}</h3><p class="muted-copy">${emptyText}</p>`;
    }

    return `<h3>${title}</h3><ul>${filtered.map(formatter).join('')}</ul>`;
  };

  return `
    <div class="report-meta">
      <div><strong>Visit date</strong><br />${safe(state.visitDate) || 'Not recorded'}</div>
      <div><strong>Consultant</strong><br />${safe(state.consultantName) || 'Not recorded'}</div>
      <div><strong>Site contact</strong><br />${safe(state.contactName) || 'Not recorded'}</div>
      <div><strong>Audit type</strong><br />${safe(state.auditType) || 'Not recorded'}</div>
    </div>

    <section>
      <h2>Site summary</h2>
      <p class="report-section-lead">
        <strong>${safe(state.businessName) || 'Unnamed site'}</strong>${safe(state.location) ? ` • ${safe(state.location)}` : ''}
      </p>
    </section>

    <h2>Site and trading profile</h2>
    <div class="report-grid columns-4">
      <div><strong>Service style</strong><br />${safe(state.serviceStyle) || 'Not recorded'}</div>
      <div><strong>Trading days</strong><br />${safe(state.tradingDays) || 'Not recorded'}</div>
      <div><strong>Covers per week</strong><br />${state.coversPerWeek > 0 ? state.coversPerWeek : 'Not recorded'}</div>
      <div><strong>Average spend</strong><br />${state.averageSpend > 0 ? fmtCurrency(state.averageSpend) : 'Not recorded'}</div>
      <div><strong>Kitchen team size</strong><br />${state.kitchenTeamSize > 0 ? state.kitchenTeamSize : 'Not recorded'}</div>
      <div><strong>Main supplier</strong><br />${safe(state.mainSupplier) || 'Not recorded'}</div>
      <div><strong>Allergen confidence</strong><br />${state.allergenConfidence}</div>
      <div><strong>Equipment condition</strong><br />${state.equipmentCondition}</div>
    </div>

    <h2>Commercial snapshot</h2>
    <div class="report-meta">
      <div><strong>Weekly food sales</strong><br />${fmtCurrency(state.weeklySales)}</div>
      <div><strong>Estimated sales from covers</strong><br />${calc.estimatedWeeklySales > 0 ? fmtCurrency(calc.estimatedWeeklySales) : 'Not available'}</div>
      <div><strong>Weekly food cost</strong><br />${fmtCurrency(state.weeklyFoodCost)}</div>
      <div><strong>Actual GP</strong><br />${fmtPercent(calc.actualGp)}</div>
      <div><strong>Target GP</strong><br />${fmtPercent(state.targetGp)}</div>
      <div><strong>Waste value</strong><br />${fmtCurrency(state.actualWasteValue)}</div>
      <div><strong>Waste % of sales</strong><br />${fmtPercent(calc.wastePercent)}</div>
      <div><strong>Kitchen labour %</strong><br />${fmtPercent(state.labourPercent)}</div>
      <div><strong>Overall priority</strong><br />${scoreLabel(calc.score)} (${calc.score}/100)</div>
    </div>

    <h2>Operational scorecard</h2>
    <div class="report-grid columns-4">
      ${scoreEntries
        .map(
          ([label, value]) =>
            `<div><strong>${label}</strong><br />${num(value).toFixed(1)}/10</div>`
        )
        .join('')}
      <div><strong>Average operating score</strong><br />${calc.operationsAverage.toFixed(1)}/10</div>
      <div><strong>Control compliance</strong><br />${Math.round(calc.controlScore)}%</div>
      <div><strong>Hygiene risk</strong><br />${state.hygieneRisk}</div>
      <div><strong>Ordering control</strong><br />${state.orderingScore}</div>
      <div><strong>Structured actions</strong><br />${calc.totalNamedActions}</div>
    </div>

    <h2>Controls and evidence register</h2>
    ${
      controlRows.length
        ? `
      <table class="report-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Control</th>
            <th>Status</th>
            <th>Audit note</th>
          </tr>
        </thead>
        <tbody>
          ${controlRows
            .map(
              (item) => `
            <tr>
              <td>${safe(item.category) || 'General'}</td>
              <td><strong>${safe(item.label) || 'Unnamed control'}</strong></td>
              <td>${item.status}</td>
              <td>${safe(item.note) || 'No note recorded'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>`
        : '<p class="muted-copy">No control checks recorded.</p>'
    }

    <h2>Detailed findings</h2>
    ${listHtml(detailedFindings, 'No detailed findings recorded.')}

    ${repeatSection(
      'Waste findings',
      state.wasteItems,
      (item) =>
        `<li><strong>${safe(item.item) || 'Unspecified item'}</strong>${
          num(item.cost) > 0 ? ` • Estimated impact: ${fmtCurrency(num(item.cost))}` : ''
        }<br />Cause: ${safe(item.cause) || 'Not recorded'}<br />Recommended fix: ${safe(item.fix) || 'Not recorded'}</li>`,
      'No waste findings recorded.'
    )}

    ${repeatSection(
      'Over-portioning findings',
      state.portionItems,
      (item) =>
        `<li><strong>${safe(item.dish) || 'Unspecified dish'}</strong>${
          num(item.loss) > 0 ? ` • Estimated weekly loss: ${fmtCurrency(num(item.loss))}` : ''
        }<br />Issue: ${safe(item.issue) || 'Not recorded'}<br />Recommended fix: ${safe(item.fix) || 'Not recorded'}</li>`,
      'No over-portioning findings recorded.'
    )}

    ${repeatSection(
      'Ordering and stock-control findings',
      state.orderingItems,
      (item) =>
        `<li><strong>${safe(item.category) || 'Unspecified category'}</strong><br />Problem: ${safe(item.problem) || 'Not recorded'}<br />Commercial impact: ${safe(item.impact) || 'Not recorded'}<br />Recommended fix: ${safe(item.fix) || 'Not recorded'}</li>`,
      'No ordering issues recorded.'
    )}

    <h2>Kitchen layout review</h2>
    <div class="report-columns">
      <div>
        <h3>Strengths</h3>
        <p>${safe(state.layoutStrengths) || '<span class="muted-copy">No strengths recorded.</span>'}</p>
      </div>
      <div>
        <h3>Issues</h3>
        <p>${safe(state.layoutIssues) || '<span class="muted-copy">No issues recorded.</span>'}</p>
      </div>
    </div>

    <div class="report-columns">
      <div>
        <h3>Equipment and space requirements</h3>
        <p>${safe(state.equipmentNeeds) || '<span class="muted-copy">No equipment recommendations recorded.</span>'}</p>
      </div>
      <div>
        <h3>Commercial impact</h3>
        <p>${safe(state.layoutImpact) || '<span class="muted-copy">No commercial impact recorded.</span>'}</p>
      </div>
    </div>

    <h2>Prioritised action plan</h2>
    ${listHtml(priorityActions, 'No action plan recorded.')}

    <h2>Structured action register</h2>
    ${
      actionRows.length
        ? `
      <table class="report-table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Area</th>
            <th>Priority</th>
            <th>Owner</th>
            <th>Due</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${actionRows
            .map(
              (item) => `
            <tr>
              <td><strong>${safe(item.title) || 'Untitled action'}</strong><br /><span class="muted-copy">${safe(item.impact) || 'No impact note'}</span></td>
              <td>${safe(item.area) || 'General'}</td>
              <td>${item.priority}</td>
              <td>${safe(item.owner) || 'Not assigned'}</td>
              <td>${safe(item.dueDate) || 'Not set'}</td>
              <td>${item.status}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>`
        : '<p class="muted-copy">No structured actions recorded.</p>'
    }

    <h2>Immediate quick wins</h2>
    ${listHtml(quickWins, 'No quick wins recorded.')}

    <h2>Long-term improvement strategy</h2>
    ${listHtml(longTerm, 'No long-term strategy recorded.')}

    <h2>Recommended follow-up</h2>
    <p>${
      safe(state.nextVisit) ||
      'Suggested next step: schedule a follow-up visit within 2 to 4 weeks to review progress and reset priorities.'
    }</p>
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

function completionSummary(form: AuditFormState) {
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

type InsightTone = 'success' | 'warning' | 'danger';

type InsightItem = {
  tone: InsightTone;
  title: string;
  detail: string;
};

function buildAuditInsights(
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

  if (form.labourPercent >= 30) {
    insights.push({
      tone: 'danger',
      title: `Labour pressure at ${fmtPercent(form.labourPercent)}`,
      detail: 'Review layout, prep flow, staffing patterns, and kitchen discipline.'
    });
  } else if (form.labourPercent > 0 && form.labourPercent >= 24) {
    insights.push({
      tone: 'warning',
      title: 'Labour is worth watching',
      detail: 'Use the audit to test whether layout and systems are making labour heavier than it should be.'
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

function toneClass(tone: InsightTone) {
  if (tone === 'danger') return 'status-pill status-danger';
  if (tone === 'warning') return 'status-pill status-warning';
  return 'status-pill status-success';
}

type ArrayKeys = 'wasteItems' | 'portionItems' | 'orderingItems';

type TextareaFieldKey =
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

const sectionLinks = [
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
];

const textareaFields: Array<{ key: TextareaFieldKey; label: string }> = [
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

export function KitchenAuditPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<AuditFormState>(() =>
    normalizeAuditState({}, searchParams.get('client') || null)
  );
  const [savedAudits, setSavedAudits] = useState<SupabaseRecord<AuditFormState>[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('Audit draft ready.');
  const [loadingSaved, setLoadingSaved] = useState(true);

  const calc = useMemo(() => calculateAudit(form), [form]);
  const activeClient = useMemo(
    () => clients.find((client) => client.id === form.clientId) ?? null,
    [clients, form.clientId]
  );
  const availableClientSites = useMemo(
    () => selectableSitesForClient(activeClient),
    [activeClient]
  );
  const reportHtml = useMemo(() => makeAuditReport(form), [form]);
  const completion = useMemo(() => completionSummary(form), [form]);
  const insights = useMemo(() => buildAuditInsights(form, calc), [form, calc]);
  const readinessItems = useMemo(
    () => [
      {
        label: 'Site setup',
        value:
          form.businessName.trim() && form.visitDate && form.auditType
            ? 'Ready'
            : 'Add site basics',
        detail: 'Title, business, visit date, and audit type'
      },
      {
        label: 'Commercial data',
        value:
          form.weeklySales > 0 && form.weeklyFoodCost > 0
            ? 'Captured'
            : 'Awaiting figures',
        detail: 'Weekly sales, food cost, and target GP'
      },
      {
        label: 'Action plan',
        value:
          calc.totalNamedActions > 0
            ? `${calc.totalNamedActions} actions`
            : 'Needs actions',
        detail: 'Priority actions ready to present back to site'
      },
      {
        label: 'Report readiness',
        value:
          completion.percent >= 70 && form.summary.trim()
            ? 'Nearly ready'
            : 'More evidence needed',
        detail: 'Completion and narrative coverage before export'
      }
    ],
    [
      calc.totalNamedActions,
      completion.percent,
      form.auditType,
      form.businessName,
      form.summary,
      form.visitDate,
      form.weeklyFoodCost,
      form.weeklySales
    ]
  );

  const refreshAudits = useCallback(async () => {
    try {
      setLoadingSaved(true);
      const activeClientId = searchParams.get('client') || form.clientId || undefined;
      const rows = await listAudits(activeClientId || undefined);
      const sorted = [...rows].sort((a, b) => {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bTime - aTime;
      });
      setSavedAudits(sorted);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load audits.');
    } finally {
      setLoadingSaved(false);
    }
  }, [form.clientId, searchParams]);

  useEffect(() => {
    listClients().then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    refreshAudits();
  }, [refreshAudits]);

  useEffect(() => {
    const clientId = searchParams.get('client');
    const loadId = searchParams.get('load');

    if (clientId) {
      setForm((current) => ({ ...current, clientId }));
    }

    if (loadId) {
      getAuditById(loadId)
        .then((record) => {
          if (!record) return;

          setForm({
            ...normalizeAuditState(record.data, record.client_id ?? record.data.clientId ?? null),
            id: record.id,
            clientId: record.client_id ?? record.data.clientId ?? null,
            createdAt: record.created_at,
            updatedAt: record.updated_at
          });

          setMessage(`Loaded "${record.title}".`);
        })
        .catch(() => {});
    }
  }, [searchParams]);

  useEffect(() => {
    if (!form.clientId) return;

    if (!availableClientSites.length) {
      if (form.clientSiteId) {
        setForm((current) => ({ ...current, clientSiteId: null }));
      }
      return;
    }

    const matchingSite = availableClientSites.find((site) => site.id === form.clientSiteId);
    if (matchingSite) return;

    if (availableClientSites.length === 1) {
      const singleSite = availableClientSites[0];
      setForm((current) => ({
        ...current,
        clientSiteId: singleSite.id,
        businessName:
          !current.businessName.trim() || current.businessName === activeClient?.company_name
            ? singleSite.name || activeClient?.company_name || current.businessName
            : current.businessName,
        location:
          !current.location.trim()
            ? singleSite.address || activeClient?.location || current.location
            : current.location
      }));
      return;
    }

    if (form.clientSiteId) {
      setForm((current) => ({ ...current, clientSiteId: null }));
    }
  }, [activeClient, availableClientSites, form.clientId, form.clientSiteId]);

  function updateField<K extends keyof AuditFormState>(key: K, value: AuditFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleClientSelection(nextClientId: string | null) {
    const nextClient = clients.find((client) => client.id === nextClientId) ?? null;
    const nextSites = selectableSitesForClient(nextClient);
    const singleSite = nextSites.length === 1 ? nextSites[0] : null;

    setForm((current) => ({
      ...current,
      clientId: nextClientId,
      clientSiteId: singleSite?.id ?? null,
      businessName: singleSite
        ? singleSite.name || nextClient?.company_name || current.businessName
        : nextClientId && current.clientId !== nextClientId
          ? nextClient?.company_name || current.businessName
          : current.businessName,
      location: singleSite
        ? singleSite.address || nextClient?.location || current.location
        : nextClientId && current.clientId !== nextClientId
          ? nextClient?.location || current.location
          : current.location
    }));
  }

  function handleClientSiteSelection(nextSiteId: string | null) {
    const nextSite = availableClientSites.find((site) => site.id === nextSiteId) ?? null;

    setForm((current) => ({
      ...current,
      clientSiteId: nextSiteId,
      businessName: nextSite?.name || current.businessName,
      location: nextSite?.address || activeClient?.location || current.location
    }));
  }

  function updateCategoryScore(key: keyof AuditCategoryScores, value: number) {
    setForm((current) => ({
      ...current,
      categoryScores: {
        ...current.categoryScores,
        [key]: value
      }
    }));
  }

  function updateRepeatItem<T extends AuditWasteItem | AuditPortionItem | AuditOrderingItem>(
    key: ArrayKeys,
    id: string,
    field: keyof T,
    value: string | number
  ) {
    setForm((current) => ({
      ...current,
      [key]: (current[key] as T[]).map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  }

  function updateControlCheck(id: string, key: keyof AuditControlCheck, value: string) {
    setForm((current) => ({
      ...current,
      controlChecks: current.controlChecks.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
  }

  function addRepeatItem(key: ArrayKeys) {
    setForm((current) => ({
      ...current,
      [key]:
        key === 'wasteItems'
          ? [...current.wasteItems, blankWasteItem()]
          : key === 'portionItems'
            ? [...current.portionItems, blankPortionItem()]
            : [...current.orderingItems, blankOrderingItem()]
    }));
  }

  function removeRepeatItem(key: ArrayKeys, id: string) {
    setForm((current) => {
      const next =
        key === 'wasteItems'
          ? current.wasteItems.filter((item) => item.id !== id)
          : key === 'portionItems'
            ? current.portionItems.filter((item) => item.id !== id)
            : current.orderingItems.filter((item) => item.id !== id);

      return {
        ...current,
        [key]:
          next.length > 0
            ? next
            : key === 'wasteItems'
              ? [blankWasteItem()]
              : key === 'portionItems'
                ? [blankPortionItem()]
                : [blankOrderingItem()]
      };
    });
  }

  function updateActionItem(
    id: string,
    key: keyof AuditActionItem,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      actionItems: current.actionItems.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
  }

  function addActionItem() {
    setForm((current) => ({
      ...current,
      actionItems: [...current.actionItems, blankActionItem()]
    }));
  }

  function removeActionItem(id: string) {
    setForm((current) => ({
      ...current,
      actionItems:
        current.actionItems.filter((item) => item.id !== id).length > 0
          ? current.actionItems.filter((item) => item.id !== id)
          : [blankActionItem()]
    }));
  }

  async function handleSave() {
    try {
      setIsSaving(true);
      const saved = await saveAudit(form);
      setForm({
        ...normalizeAuditState(saved.data, saved.client_id ?? saved.data.clientId ?? null),
        id: saved.id,
        clientId: saved.client_id ?? saved.data.clientId ?? null,
        createdAt: saved.created_at,
        updatedAt: saved.updated_at
      });
      setMessage('Audit saved.');
      await refreshAudits();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLoad(record: SupabaseRecord<AuditFormState>) {
    setForm({
      ...normalizeAuditState(record.data, record.client_id ?? record.data.clientId ?? null),
      id: record.id,
      clientId: record.client_id ?? record.data.clientId ?? null,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    });
    setMessage(`Loaded "${record.title}".`);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this saved audit?')) return;

    try {
      await deleteAudit(id);
      if (form.id === id) {
        setForm(createDefaultAudit(searchParams.get('client') || null));
      }
      await refreshAudits();
      setMessage('Audit deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Delete failed.');
    }
  }

  function newAudit() {
    const activeClientId = searchParams.get('client') || null;
    setForm(createDefaultAudit(activeClientId));
    setMessage('Started a new audit.');
  }

  function applyPreset(kind: 'margin' | 'operations' | 'opening') {
    setForm((current) => applyAuditPreset(kind, current));
    setMessage('Audit preset applied.');
  }

  function generateActions() {
    const generated = buildSuggestedActionItems(form, calc);
    setForm((current) => ({
      ...current,
      actionItems: generated.length > 0 ? generated : current.actionItems
    }));
    setMessage(
      generated.length > 0
        ? 'Structured actions generated from the current findings.'
        : 'Add a few more findings before generating suggested actions.'
    );
  }

  function estimateSalesFromTradingProfile() {
    if (calc.estimatedWeeklySales <= 0) {
      setMessage('Add covers per week and average spend first.');
      return;
    }

    setForm((current) => ({
      ...current,
      weeklySales: Math.round(calc.estimatedWeeklySales)
    }));
    setMessage('Weekly sales estimated from covers and average spend.');
  }

  function draftNarrative() {
    const draft = buildSuggestedNarrative(form, calc);
    setForm((current) => ({
      ...current,
      summary: draft.summary || current.summary,
      quickWins: draft.quickWins || current.quickWins,
      priorityActions: draft.priorityActions || current.priorityActions,
      longTermStrategy: draft.longTermStrategy || current.longTermStrategy,
      nextVisit: draft.nextVisit || current.nextVisit
    }));
    setMessage('Narrative sections drafted from the current audit data.');
  }

  function exportJson() {
    downloadText(
      `${safe(form.businessName || 'audit').replace(/\s+/g, '-').toLowerCase()}.json`,
      JSON.stringify(form, null, 2),
      'application/json'
    );
  }

  function exportPdf() {
    openPrintableHtmlDocument(
      `${safe(form.businessName || 'Kitchen Profit Audit')} report`,
      reportHtml
    );
  }

  function loadFromJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    file
      .text()
      .then((content) => {
        const parsed = JSON.parse(content) as AuditFormState;
        setForm(normalizeAuditState(parsed, searchParams.get('client') || null));
        setMessage('Audit JSON loaded.');
      })
      .catch(() => setMessage('Could not read the selected JSON file.'));

    event.target.value = '';
  }

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Audit tool"
        title="Kitchen performance audit"
        description="Capture findings quickly, keep the visit structured, and build the report as you work instead of rewriting everything afterwards."
        actions={
          <>
            <button className="button button-secondary" onClick={newAudit}>
              New audit
            </button>
            <button className="button button-primary" disabled={isSaving} onClick={handleSave}>
              {isSaving ? 'Saving...' : 'Save audit'}
            </button>
            <button className="button button-secondary" onClick={exportPdf}>
              Export PDF
            </button>
            <button className="button button-secondary" onClick={exportJson}>
              Export JSON
            </button>
            <label className="button button-secondary inline-file-button">
              Load JSON
              <input accept="application/json" hidden type="file" onChange={loadFromJson} />
            </label>
          </>
        }
        side={
          <div className="page-intro-summary">
            <span className={scoreClass(calc.score)}>
              {scoreLabel(calc.score)} • {calc.score}/100
            </span>
            <strong>Audit snapshot</strong>
            <p>{message}</p>
            <div className="page-intro-summary-list">
              <div>
                <span>Completion</span>
                <strong>{completion.percent}%</strong>
              </div>
              <div>
                <span>GP gap</span>
                <strong>
                  {form.weeklySales > 0 ? `${calc.gpGap.toFixed(1)} pts` : 'Awaiting data'}
                </strong>
              </div>
              <div>
                <span>Controls</span>
                <strong>{Math.round(calc.controlScore)}%</strong>
              </div>
            </div>
          </div>
        }
      >
        <div className="audit-preset-row">
          <button className="button button-ghost" onClick={() => applyPreset('operations')}>
            Systems preset
          </button>
          <button className="button button-ghost" onClick={() => applyPreset('margin')}>
            Margin preset
          </button>
          <button className="button button-ghost" onClick={() => applyPreset('opening')}>
            Opening preset
          </button>
          <button className="button button-ghost" onClick={generateActions}>
            Generate action plan
          </button>
          <button className="button button-ghost" onClick={draftNarrative}>
            Draft narrative
          </button>
          <button className="button button-ghost" onClick={estimateSalesFromTradingProfile}>
            Estimate sales
          </button>
        </div>
      </PageIntro>

      <section className="audit-readiness-grid">
        {readinessItems.map((item) => (
          <div className="audit-readiness-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </div>
        ))}
      </section>

      <section className="stats-grid">
        <StatCard
          label="Actual GP"
          value={fmtPercent(calc.actualGp)}
          hint="Calculated from sales and food cost"
        />
        <StatCard
          label="Waste %"
          value={fmtPercent(calc.wastePercent)}
          hint="Waste value as % of weekly sales"
        />
        <StatCard
          label="Ops score"
          value={`${calc.operationsAverage.toFixed(1)}/10`}
          hint="Average across the structured scorecard"
        />
        <StatCard
          label="Controls"
          value={`${Math.round(calc.controlScore)}%`}
          hint={
            calc.criticalMissingControls > 0
              ? `${calc.criticalMissingControls} critical controls missing`
              : 'Compliance across the control register'
          }
        />
        <StatCard
          label="Action plan"
          value={String(calc.totalNamedActions)}
          hint={
            calc.gpOpportunityValue > 0
              ? `${fmtCurrency(calc.gpOpportunityValue)} weekly GP opportunity`
              : 'Structured actions captured from the visit'
          }
        />
      </section>

      <section className="workspace-grid">
        <div className="workspace-main">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Audit input</h3>
                <p className="muted-copy">
                  Work section by section and keep the most important parts of the visit structured.
                </p>
              </div>
            </div>

            <div className="panel-body stack gap-20">
              <section className="sub-panel audit-nav-panel">
                <div className="sub-panel-header">
                  <h4>Jump to section</h4>
                  <span className="soft-pill">Fast navigation</span>
                </div>
                <div className="audit-section-nav">
                  {sectionLinks.map((section) => (
                    <a className="audit-section-link" href={section.href} key={section.href}>
                      {section.label}
                    </a>
                  ))}
                </div>
              </section>

              <section className="sub-panel" id="audit-site-details">
                <h4>Site details</h4>
                <div className="form-grid">
                  <label className="field">
                    <span>Report title</span>
                    <input
                      className="input"
                      value={form.title}
                      onChange={(e) => updateField('title', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Business name</span>
                    <input
                      className="input"
                      value={form.businessName}
                      onChange={(e) => updateField('businessName', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Location</span>
                    <input
                      className="input"
                      value={form.location}
                      onChange={(e) => updateField('location', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Visit date</span>
                    <input
                      className="input"
                      type="date"
                      value={form.visitDate}
                      onChange={(e) => updateField('visitDate', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Consultant</span>
                    <input
                      className="input"
                      value={form.consultantName}
                      onChange={(e) => updateField('consultantName', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Site contact</span>
                    <input
                      className="input"
                      value={form.contactName}
                      onChange={(e) => updateField('contactName', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Client profile</span>
                    <select
                      className="input"
                      value={form.clientId || ''}
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
                        value={form.clientSiteId || ''}
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

                  <label className="field">
                    <span>Audit type</span>
                    <select
                      className="input"
                      value={form.auditType}
                      onChange={(e) => updateField('auditType', e.target.value)}
                    >
                      <option>Operational Audit</option>
                      <option>Menu & GP Review</option>
                      <option>Kitchen Layout Review</option>
                      <option>New Opening Support</option>
                      <option>Chef Mentoring Visit</option>
                    </select>
                  </label>
                </div>

                {availableClientSites.length > 1 ? (
                  <p className="muted-copy">
                    This client has multiple recorded sites. Pick the location you are visiting so
                    the audit and export stay tied to the right site.
                  </p>
                ) : null}

                {form.clientId ? (
                  <div className="header-actions">
                    <Link className="button button-ghost" to={`/clients/${form.clientId}`}>
                      Open client profile
                    </Link>
                  </div>
                ) : null}
              </section>

              <section className="sub-panel" id="audit-trading-profile">
                <div className="sub-panel-header">
                  <h4>Trading and context profile</h4>
                  <span className="soft-pill">Visit context</span>
                </div>

                <div className="form-grid three-balance">
                  <label className="field">
                    <span>Service style</span>
                    <input
                      className="input"
                      value={form.serviceStyle}
                      onChange={(e) => updateField('serviceStyle', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Trading days</span>
                    <input
                      className="input"
                      value={form.tradingDays}
                      onChange={(e) => updateField('tradingDays', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Main supplier</span>
                    <input
                      className="input"
                      value={form.mainSupplier}
                      onChange={(e) => updateField('mainSupplier', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Covers per week</span>
                    <input
                      className="input"
                      type="number"
                      value={form.coversPerWeek}
                      onChange={(e) => updateField('coversPerWeek', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Average spend (£)</span>
                    <input
                      className="input"
                      type="number"
                      value={form.averageSpend}
                      onChange={(e) => updateField('averageSpend', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Kitchen team size</span>
                    <input
                      className="input"
                      type="number"
                      value={form.kitchenTeamSize}
                      onChange={(e) => updateField('kitchenTeamSize', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Allergen confidence</span>
                    <select
                      className="input"
                      value={form.allergenConfidence}
                      onChange={(e) =>
                        updateField(
                          'allergenConfidence',
                          e.target.value as AuditFormState['allergenConfidence']
                        )
                      }
                    >
                      <option value="High">High</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Low">Low</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Hygiene risk</span>
                    <select
                      className="input"
                      value={form.hygieneRisk}
                      onChange={(e) =>
                        updateField('hygieneRisk', e.target.value as AuditFormState['hygieneRisk'])
                      }
                    >
                      <option value="Low">Low</option>
                      <option value="Moderate">Moderate</option>
                      <option value="High">High</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Equipment condition</span>
                    <select
                      className="input"
                      value={form.equipmentCondition}
                      onChange={(e) =>
                        updateField(
                          'equipmentCondition',
                          e.target.value as AuditFormState['equipmentCondition']
                        )
                      }
                    >
                      <option value="Strong">Strong</option>
                      <option value="Mixed">Mixed</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="sub-panel" id="audit-commercial">
                <div className="sub-panel-header">
                  <h4>Commercial snapshot</h4>
                  <span className="soft-pill">Profit and control</span>
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span>Weekly food sales (£)</span>
                    <input
                      className="input"
                      type="number"
                      value={form.weeklySales}
                      onChange={(e) => updateField('weeklySales', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Weekly food cost (£)</span>
                    <input
                      className="input"
                      type="number"
                      value={form.weeklyFoodCost}
                      onChange={(e) => updateField('weeklyFoodCost', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Target GP %</span>
                    <input
                      className="input"
                      type="number"
                      value={form.targetGp}
                      onChange={(e) => updateField('targetGp', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Weekly waste (£)</span>
                    <input
                      className="input"
                      type="number"
                      value={form.actualWasteValue}
                      onChange={(e) => updateField('actualWasteValue', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Kitchen labour %</span>
                    <input
                      className="input"
                      type="number"
                      value={form.labourPercent}
                      onChange={(e) => updateField('labourPercent', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Ordering control</span>
                    <select
                      className="input"
                      value={form.orderingScore}
                      onChange={(e) =>
                        updateField(
                          'orderingScore',
                          e.target.value as AuditFormState['orderingScore']
                        )
                      }
                    >
                      <option value="Low">Low</option>
                      <option value="Moderate">Moderate</option>
                      <option value="High">High</option>
                    </select>
                  </label>
                </div>

                <div className="audit-chip-row">
                  <div className="audit-chip">
                    <strong>GP position</strong>
                    <span>
                      {form.weeklySales > 0
                        ? calc.gpGap > 0
                          ? `${calc.gpGap.toFixed(1)} points below target`
                          : 'On or above target'
                        : 'Awaiting numbers'}
                    </span>
                  </div>
                  <div className="audit-chip">
                    <strong>Waste reading</strong>
                    <span>
                      {form.actualWasteValue > 0
                        ? `${fmtCurrency(form.actualWasteValue)} per week`
                        : 'No waste value logged'}
                    </span>
                  </div>
                  <div className="audit-chip">
                    <strong>Labour reading</strong>
                    <span>
                      {form.labourPercent > 0
                        ? `${fmtPercent(form.labourPercent)} kitchen labour`
                        : 'No labour data logged'}
                    </span>
                  </div>
                  <div className="audit-chip">
                    <strong>Sales estimate</strong>
                    <span>
                      {calc.estimatedWeeklySales > 0
                        ? fmtCurrency(calc.estimatedWeeklySales)
                        : 'Add covers and spend'}
                    </span>
                  </div>
                </div>

                <div className="header-actions">
                  <button className="button button-secondary" onClick={estimateSalesFromTradingProfile}>
                    Use covers x spend as weekly sales
                  </button>
                </div>
              </section>

              <section className="sub-panel" id="audit-scorecard">
                <div className="sub-panel-header">
                  <h4>Operational scorecard</h4>
                  <span className="soft-pill">0 to 10 scoring</span>
                </div>

                <div className="audit-score-grid">
                  {(
                    [
                      ['leadership', 'Leadership'],
                      ['foodQuality', 'Food quality'],
                      ['systems', 'Systems'],
                      ['cleanliness', 'Cleanliness'],
                      ['flow', 'Flow'],
                      ['training', 'Training'],
                      ['stock', 'Stock'],
                      ['safety', 'Safety']
                    ] as Array<[keyof AuditCategoryScores, string]>
                  ).map(([key, label]) => (
                    <label className="audit-score-card" key={key}>
                      <span>{label}</span>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={form.categoryScores[key]}
                        onChange={(e) => updateCategoryScore(key, num(e.target.value))}
                      />
                      <small>{form.categoryScores[key].toFixed(1)}/10</small>
                    </label>
                  ))}
                </div>
              </section>

              <section className="sub-panel" id="audit-controls">
                <div className="sub-panel-header">
                  <h4>Controls and evidence register</h4>
                  <div className="saved-actions">
                    <span className="soft-pill">{calc.missingControls} gaps</span>
                    <button className="button button-secondary" onClick={draftNarrative}>
                      Draft follow-up
                    </button>
                  </div>
                </div>

                <div className="audit-control-grid">
                  {form.controlChecks.map((item) => (
                    <div className="audit-control-card" key={item.id}>
                      <div className="audit-control-top">
                        <div>
                          <strong>{item.label}</strong>
                          <small>{item.category}</small>
                        </div>
                        <span
                          className={
                            item.status === 'Missing'
                              ? 'status-pill status-danger'
                              : item.status === 'Partial'
                                ? 'status-pill status-warning'
                                : 'status-pill status-success'
                          }
                        >
                          {item.status}
                        </span>
                      </div>

                      <label className="field">
                        <span>Status</span>
                        <select
                          className="input"
                          value={item.status}
                          onChange={(e) =>
                            updateControlCheck(
                              item.id,
                              'status',
                              e.target.value as AuditControlCheck['status']
                            )
                          }
                        >
                          <option>In Place</option>
                          <option>Partial</option>
                          <option>Missing</option>
                          <option>N/A</option>
                        </select>
                      </label>

                      <label className="field">
                        <span>Audit note</span>
                        <textarea
                          className="input textarea"
                          value={item.note}
                          onChange={(e) => updateControlCheck(item.id, 'note', e.target.value)}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </section>

              <section className="sub-panel" id="audit-observations">
                <div className="sub-panel-header">
                  <h4>Operational observations</h4>
                  <span className="soft-pill">Quality and systems</span>
                </div>
                <div className="form-grid two-columns">
                  {textareaFields.slice(0, 4).map((field) => (
                    <label className="field" key={field.key}>
                      <span>{field.label}</span>
                      <textarea
                        className="input textarea"
                        value={form[field.key]}
                        onChange={(e) => updateField(field.key, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="sub-panel" id="audit-waste">
                <div className="sub-panel-header">
                  <h4>Waste findings</h4>
                  <button
                    className="button button-secondary"
                    onClick={() => addRepeatItem('wasteItems')}
                  >
                    Add record
                  </button>
                </div>
                <div className="stack gap-12">
                  {form.wasteItems.map((item) => (
                    <div className="repeat-card" key={item.id}>
                      <div className="repeat-header">
                        <strong>{safe(item.item) || 'Waste record'}</strong>
                        <button
                          className="button button-ghost"
                          onClick={() => removeRepeatItem('wasteItems', item.id)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="form-grid">
                        <label className="field">
                          <span>Item or area</span>
                          <input
                            className="input"
                            value={item.item}
                            onChange={(e) =>
                              updateRepeatItem<AuditWasteItem>(
                                'wasteItems',
                                item.id,
                                'item',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Estimated impact (£)</span>
                          <input
                            className="input"
                            type="number"
                            value={item.cost}
                            onChange={(e) =>
                              updateRepeatItem<AuditWasteItem>(
                                'wasteItems',
                                item.id,
                                'cost',
                                num(e.target.value)
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Cause</span>
                          <input
                            className="input"
                            value={item.cause}
                            onChange={(e) =>
                              updateRepeatItem<AuditWasteItem>(
                                'wasteItems',
                                item.id,
                                'cause',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Recommended fix</span>
                          <input
                            className="input"
                            value={item.fix}
                            onChange={(e) =>
                              updateRepeatItem<AuditWasteItem>(
                                'wasteItems',
                                item.id,
                                'fix',
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="sub-panel" id="audit-portion">
                <div className="sub-panel-header">
                  <h4>Over-portioning findings</h4>
                  <button
                    className="button button-secondary"
                    onClick={() => addRepeatItem('portionItems')}
                  >
                    Add record
                  </button>
                </div>
                <div className="stack gap-12">
                  {form.portionItems.map((item) => (
                    <div className="repeat-card" key={item.id}>
                      <div className="repeat-header">
                        <strong>{safe(item.dish) || 'Portioning record'}</strong>
                        <button
                          className="button button-ghost"
                          onClick={() => removeRepeatItem('portionItems', item.id)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="form-grid">
                        <label className="field">
                          <span>Dish or product</span>
                          <input
                            className="input"
                            value={item.dish}
                            onChange={(e) =>
                              updateRepeatItem<AuditPortionItem>(
                                'portionItems',
                                item.id,
                                'dish',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Estimated weekly loss (£)</span>
                          <input
                            className="input"
                            type="number"
                            value={item.loss}
                            onChange={(e) =>
                              updateRepeatItem<AuditPortionItem>(
                                'portionItems',
                                item.id,
                                'loss',
                                num(e.target.value)
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Issue</span>
                          <input
                            className="input"
                            value={item.issue}
                            onChange={(e) =>
                              updateRepeatItem<AuditPortionItem>(
                                'portionItems',
                                item.id,
                                'issue',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Recommended fix</span>
                          <input
                            className="input"
                            value={item.fix}
                            onChange={(e) =>
                              updateRepeatItem<AuditPortionItem>(
                                'portionItems',
                                item.id,
                                'fix',
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="sub-panel" id="audit-ordering">
                <div className="sub-panel-header">
                  <h4>Ordering and stock-control findings</h4>
                  <button
                    className="button button-secondary"
                    onClick={() => addRepeatItem('orderingItems')}
                  >
                    Add record
                  </button>
                </div>
                <div className="stack gap-12">
                  {form.orderingItems.map((item) => (
                    <div className="repeat-card" key={item.id}>
                      <div className="repeat-header">
                        <strong>{safe(item.category) || 'Ordering record'}</strong>
                        <button
                          className="button button-ghost"
                          onClick={() => removeRepeatItem('orderingItems', item.id)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="form-grid">
                        <label className="field">
                          <span>Category or supplier</span>
                          <input
                            className="input"
                            value={item.category}
                            onChange={(e) =>
                              updateRepeatItem<AuditOrderingItem>(
                                'orderingItems',
                                item.id,
                                'category',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Problem</span>
                          <input
                            className="input"
                            value={item.problem}
                            onChange={(e) =>
                              updateRepeatItem<AuditOrderingItem>(
                                'orderingItems',
                                item.id,
                                'problem',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Commercial impact</span>
                          <input
                            className="input"
                            value={item.impact}
                            onChange={(e) =>
                              updateRepeatItem<AuditOrderingItem>(
                                'orderingItems',
                                item.id,
                                'impact',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Recommended fix</span>
                          <input
                            className="input"
                            value={item.fix}
                            onChange={(e) =>
                              updateRepeatItem<AuditOrderingItem>(
                                'orderingItems',
                                item.id,
                                'fix',
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="sub-panel" id="audit-layout">
                <div className="sub-panel-header">
                  <h4>Kitchen layout review</h4>
                  <span className="soft-pill">Flow and efficiency</span>
                </div>
                <div className="form-grid two-columns">
                  {textareaFields.slice(4, 8).map((field) => (
                    <label className="field" key={field.key}>
                      <span>{field.label}</span>
                      <textarea
                        className="input textarea"
                        value={form[field.key]}
                        onChange={(e) => updateField(field.key, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="sub-panel" id="audit-actions">
                <div className="sub-panel-header">
                  <h4>Action planning and follow-up</h4>
                  <div className="saved-actions">
                    <span className="soft-pill">Client outcomes</span>
                    <button className="button button-secondary" onClick={generateActions}>
                      Generate actions
                    </button>
                    <button className="button button-secondary" onClick={addActionItem}>
                      Add action
                    </button>
                  </div>
                </div>
                <div className="form-grid two-columns">
                  {textareaFields.slice(8).map((field) => (
                    <label className="field" key={field.key}>
                      <span>{field.label}</span>
                      <textarea
                        className="input textarea"
                        value={form[field.key]}
                        onChange={(e) => updateField(field.key, e.target.value)}
                      />
                    </label>
                  ))}
                </div>

                <div className="stack gap-12">
                  {form.actionItems.map((item) => (
                    <div className="repeat-card audit-action-card" key={item.id}>
                      <div className="repeat-header">
                        <strong>{safe(item.title) || 'Action item'}</strong>
                        <button
                          className="button button-ghost"
                          onClick={() => removeActionItem(item.id)}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="form-grid three-balance">
                        <label className="field">
                          <span>Action</span>
                          <input
                            className="input"
                            value={item.title}
                            onChange={(e) => updateActionItem(item.id, 'title', e.target.value)}
                          />
                        </label>
                        <label className="field">
                          <span>Area</span>
                          <input
                            className="input"
                            value={item.area}
                            onChange={(e) => updateActionItem(item.id, 'area', e.target.value)}
                          />
                        </label>
                        <label className="field">
                          <span>Priority</span>
                          <select
                            className="input"
                            value={item.priority}
                            onChange={(e) => updateActionItem(item.id, 'priority', e.target.value)}
                          >
                            <option>Critical</option>
                            <option>High</option>
                            <option>Medium</option>
                            <option>Low</option>
                          </select>
                        </label>
                        <label className="field">
                          <span>Owner</span>
                          <input
                            className="input"
                            value={item.owner}
                            onChange={(e) => updateActionItem(item.id, 'owner', e.target.value)}
                          />
                        </label>
                        <label className="field">
                          <span>Due date</span>
                          <input
                            className="input"
                            type="date"
                            value={item.dueDate}
                            onChange={(e) => updateActionItem(item.id, 'dueDate', e.target.value)}
                          />
                        </label>
                        <label className="field">
                          <span>Status</span>
                          <select
                            className="input"
                            value={item.status}
                            onChange={(e) => updateActionItem(item.id, 'status', e.target.value)}
                          >
                            <option>Open</option>
                            <option>In Progress</option>
                            <option>Done</option>
                          </select>
                        </label>
                      </div>

                      <label className="field">
                        <span>Commercial or operational impact</span>
                        <textarea
                          className="input textarea"
                          value={item.impact}
                          onChange={(e) => updateActionItem(item.id, 'impact', e.target.value)}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

        <aside className="workspace-side stack gap-20">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Audit control</h3>
                <p className="muted-copy">
                  The dashboard for this single audit: readiness, risks, and next focus.
                </p>
              </div>
            </div>

            <div className="panel-body stack gap-20">
              <section className="audit-side-block">
                <div className="audit-side-title-row">
                  <h4>Readiness</h4>
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
              </section>

              <section className="audit-side-block">
                <div className="audit-side-title-row">
                  <h4>System checks</h4>
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
              </section>

              <section className="audit-side-block">
                <div className="audit-side-title-row">
                  <h4>Consultancy snapshot</h4>
                </div>

                <div className="audit-chip-row audit-chip-row-vertical">
                  <div className="audit-chip">
                    <strong>Current site</strong>
                    <span>{safe(form.businessName) || 'Unnamed site'}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Visit date</strong>
                    <span>{safe(form.visitDate) || 'Not set'}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Main output</strong>
                    <span>{calc.totalNamedActions} structured actions with live PDF-ready report</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Control position</strong>
                    <span>
                      {Math.round(calc.controlScore)}% compliant
                      {calc.criticalMissingControls > 0
                        ? ` • ${calc.criticalMissingControls} critical gaps`
                        : ''}
                    </span>
                  </div>
                  <div className="audit-chip">
                    <strong>Potential GP gain</strong>
                    <span>
                      {calc.gpOpportunityValue > 0
                        ? `${fmtCurrency(calc.gpOpportunityValue)} weekly opportunity`
                        : 'No GP gap currently showing'}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Generated report</h3>
                <p className="muted-copy">Live preview from the current audit state.</p>
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
                <h3>Saved audits</h3>
                <p className="muted-copy">
                  {form.clientId
                    ? 'Saved audits for the selected client.'
                    : 'Stored under your signed-in account.'}
                </p>
              </div>
            </div>
            <div className="panel-body stack gap-12">
              {loadingSaved ? <div className="muted-copy">Loading saved audits...</div> : null}
              {!loadingSaved && savedAudits.length === 0 ? (
                <div className="muted-copy">No audits saved yet.</div>
              ) : null}

              {savedAudits.map((record) => (
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
                      onClick={() => handleDelete(record.id)}
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
    </div>
  );
}

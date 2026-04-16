import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { StatCard } from '../../components/ui/StatCard';
import { PhotoEvidenceField } from '../../components/common/PhotoEvidenceField';
import { useActivityOverlay } from '../../context/ActivityOverlayContext';
import { selectableSitesForClient } from '../../features/clients/clientData';
import {
  buildPdfDocumentHtml,
  buildReportCoverHtml,
  buildChapterHtml,
  buildSectionHtml,
  openPdfDocument,
  humanizeSentence,
  humanizeTitle,
  normalizeProseText,
  formatCurrencyShort
} from '../../reports/pdf';
import { getAuditById, saveAudit } from '../../services/audits';
import { listClients } from '../../services/clients';
import type {
  AuditActionItem,
  AuditCategoryScores,
  AuditControlCheck,
  AuditPhoto,
  AuditFormState,
  AuditOrderingItem,
  AuditPortionItem,
  AuditWasteItem,
  ClientRecord
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
import { clearDraft, readDraft, writeDraft } from '../../services/draftStore';
import { createKitchenAuditShare } from '../../services/reportShares';
import { useBodyScrollLock } from '../../lib/useBodyScrollLock';
import { ControlPanelModal } from '../../components/layout/ControlPanelModal';
import { useVisitMode } from '../../lib/useVisitMode';
import { renderAuditPhotoGallery } from '../../lib/photoEvidence';
import {
  buildKitchenProfitNarrative,
  calculateKitchenProfitMetrics
} from '../../features/profit/kitchenProfit';

const KITCHEN_AUDIT_DRAFT_KEY = 'kitchen-audit-draft-v1';

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

const kitchenPhotoSections = {
  commercial: 'Commercial snapshot',
  controls: 'Controls and evidence',
  findings: 'Operational findings',
  layout: 'Layout and equipment',
  actions: 'Action planning'
} as const;

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

function calculateAudit(state: AuditFormState) {
  return calculateKitchenProfitMetrics(state);
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
  const narrative = buildKitchenProfitNarrative(state, calc);
  return {
    summary: narrative.executiveSummary,
    quickWins: narrative.quickWins.join('\n'),
    priorityActions: narrative.actionPlan30To90Days.join('\n'),
    longTermStrategy: narrative.keyIssues.join('\n'),
    nextVisit: narrative.followUpRecommendation
  };
}

export function buildKitchenAuditReportHtml(state: AuditFormState) {
  const calc = calculateAudit(state);
  const controlRows = state.controlChecks.filter(
    (item) => item.status !== 'N/A' || safe(item.note) || safe(item.label)
  );

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

  const narrative = buildKitchenProfitNarrative(state, calc);

  const hasMeaningfulText = (value: unknown) => {
    const text = safe(value);
    if (!text) return false;
    const lower = text.toLowerCase();
    return ![
      'not recorded',
      'not set',
      'no note recorded',
      'no impact note',
      'untitled action',
      'unnamed control',
      'general',
      'unspecified item',
      'unspecified category'
    ].includes(lower);
  };

  const nonEmptyLines = (items: string[]) => items.filter((item) => hasMeaningfulText(item));
  const cleanCopy = (value: unknown) => normalizeProseText(safe(value));
  const renderList = (items: string[]) =>
    nonEmptyLines(items).length
      ? `<ul>${nonEmptyLines(items).map((item) => `<li>${cleanCopy(item)}</li>`).join('')}</ul>`
      : '';

  const renderMetric = (label: string, value: string, emphasis: 'default' | 'primary' = 'default') => `
    <div class="report-metric-card report-metric-card-${emphasis}">
      <span>${humanizeTitle(label)}</span>
      <strong>${value}</strong>
    </div>
  `;

  const renderSection = (title: string, body: string, lead?: string) =>
    body
      ? `
        <article class="report-section-block">
          <div class="report-section-header">
            <h3>${humanizeTitle(title)}</h3>
            ${lead ? `<p>${humanizeSentence(lead)}</p>` : ''}
          </div>
          ${body}
        </article>
      `
      : '';

  const renderStory = (title: string, body: string) =>
    body
      ? `
        <div class="report-story-card">
          <h3>${humanizeTitle(title)}</h3>
          ${body}
        </div>
      `
      : '';

  const tableRows = <T extends object>(items: T[], formatter: (item: T) => string) =>
    items
      .filter((item) => Object.values(item).some((value) => hasMeaningfulText(value)))
      .map(formatter)
      .join('');

  const pageTwoMetrics = [
    state.weeklySales > 0 ? renderMetric('Weekly food sales', fmtCurrency(state.weeklySales)) : '',
    state.weeklyFoodCost > 0 ? renderMetric('Weekly food cost', fmtCurrency(state.weeklyFoodCost)) : '',
    state.targetGp > 0 ? renderMetric('Target GP', fmtPercent(state.targetGp)) : '',
    state.weeklySales > 0 ? renderMetric('Actual GP', fmtPercent(calc.actualGp)) : '',
    calc.gpGap > 0 ? renderMetric('GP gap', `${calc.gpGap.toFixed(1)} pts`) : '',
    calc.weeklyWasteLoss > 0 ? renderMetric('Weekly waste loss', fmtCurrency(calc.weeklyWasteLoss)) : '',
    calc.labourOpportunityValue > 0 ? renderMetric('Labour opportunity', fmtCurrency(calc.labourOpportunityValue)) : '',
    calc.totalPortionLoss > 0 ? renderMetric('Portion opportunity', fmtCurrency(calc.totalPortionLoss)) : ''
  ]
    .filter(Boolean)
    .join('');

  const quickWinsHtml = renderList(lines(state.quickWins).length ? lines(state.quickWins) : narrative.quickWins);
  const actionPlanHtml = renderList(
    lines(state.priorityActions).length ? lines(state.priorityActions) : narrative.actionPlan30To90Days
  );
  const followUpHtml =
    hasMeaningfulText(state.nextVisit) || hasMeaningfulText(narrative.followUpRecommendation)
      ? `<p>${cleanCopy(state.nextVisit) || cleanCopy(narrative.followUpRecommendation)}</p>`
      : '';

  const controlsTableRows = controlRows
    .filter((item) => hasMeaningfulText(item.label) || hasMeaningfulText(item.note))
    .map(
      (item) => `
        <tr>
          <td>${hasMeaningfulText(item.category) ? cleanCopy(item.category) : ''}</td>
          <td>${hasMeaningfulText(item.label) ? cleanCopy(item.label) : ''}</td>
          <td>${item.status === 'N/A' ? '' : item.status}</td>
          <td>${hasMeaningfulText(item.note) ? cleanCopy(item.note) : ''}</td>
        </tr>
      `
    )
    .join('');

  const wasteRows = tableRows(
    state.wasteItems,
    (item) => `
      <tr>
        <td>${cleanCopy(item.item)}</td>
        <td>${num(item.cost) > 0 ? fmtCurrency(num(item.cost)) : ''}</td>
        <td>${hasMeaningfulText(item.cause) ? cleanCopy(item.cause) : ''}</td>
        <td>${hasMeaningfulText(item.fix) ? cleanCopy(item.fix) : ''}</td>
      </tr>
    `
  );

  const portionRows = tableRows(
    state.portionItems,
    (item) => `
      <tr>
        <td>${cleanCopy(item.dish)}</td>
        <td>${num(item.loss) > 0 ? fmtCurrency(num(item.loss)) : ''}</td>
        <td>${hasMeaningfulText(item.issue) ? cleanCopy(item.issue) : ''}</td>
        <td>${hasMeaningfulText(item.fix) ? cleanCopy(item.fix) : ''}</td>
      </tr>
    `
  );

  const orderingRows = tableRows(
    state.orderingItems,
    (item) => `
      <tr>
        <td>${cleanCopy(item.category)}</td>
        <td>${hasMeaningfulText(item.problem) ? cleanCopy(item.problem) : ''}</td>
        <td>${hasMeaningfulText(item.impact) ? cleanCopy(item.impact) : ''}</td>
        <td>${hasMeaningfulText(item.fix) ? cleanCopy(item.fix) : ''}</td>
      </tr>
    `
  );

  const findingsCards = [
    renderStory(
      'Systems',
      [
        hasMeaningfulText(state.systems) ? `<p>${cleanCopy(state.systems)}</p>` : '',
        controlsTableRows ? `<p class="muted-copy">Control compliance currently sits at ${Math.round(calc.controlScore)}%, with the register below capturing the named evidence points for follow-up.</p>` : ''
      ].filter(Boolean).join('')
    ),
    renderStory(
      'People and culture',
      [
        hasMeaningfulText(state.cultureLeadership) ? `<p>${cleanCopy(state.cultureLeadership)}</p>` : '',
        hasMeaningfulText(state.foodQuality) ? `<p class="muted-copy"><strong>Food quality and offer:</strong> ${cleanCopy(state.foodQuality)}</p>` : ''
      ].filter(Boolean).join('')
    ),
    renderStory(
      'Operations',
      [
        hasMeaningfulText(state.layoutIssues) ? `<p>${cleanCopy(state.layoutIssues)}</p>` : '',
        hasMeaningfulText(state.layoutImpact) ? `<p class="muted-copy"><strong>Commercial impact:</strong> ${cleanCopy(state.layoutImpact)}</p>` : '',
        !hasMeaningfulText(state.layoutImpact) && hasMeaningfulText(state.layoutStrengths) ? `<p class="muted-copy"><strong>Current strength:</strong> ${cleanCopy(state.layoutStrengths)}</p>` : ''
      ].filter(Boolean).join('')
    ),
    renderStory(
      'Compliance and equipment',
      [
        hasMeaningfulText(state.equipmentNeeds) ? `<p>${cleanCopy(state.equipmentNeeds)}</p>` : '',
        hasMeaningfulText(state.nextVisit) ? `<p class="muted-copy"><strong>Follow-up context:</strong> ${cleanCopy(state.nextVisit)}</p>` : ''
      ].filter(Boolean).join('')
    )
  ]
    .filter(Boolean)
    .join('');

  const controlsChapterBody = controlsTableRows
    ? `
          <table class="report-table report-table-compact report-table-tight">
            <colgroup>
              <col style="width: 16%" />
              <col style="width: 30%" />
              <col style="width: 12%" />
              <col style="width: 42%" />
            </colgroup>
            <thead>
              <tr>
                <th>Category</th>
                <th>Control</th>
                <th>Status</th>
                <th>What Is Happening and Why?</th>
              </tr>
            </thead>
            <tbody>${controlsTableRows}</tbody>
          </table>
          ${renderAuditPhotoGallery(state.photos, 'controls', '')}
        `
    : '';

  const findingsChapterBody = [
    wasteRows
      ? renderSection(
          'Cost Control',
          `
            <table class="report-table report-table-tight">
              <colgroup>
                <col style="width: 24%" />
                <col style="width: 14%" />
                <col style="width: 31%" />
                <col style="width: 31%" />
              </colgroup>
              <thead>
                <tr>
                  <th>Loss Area</th>
                  <th>Weekly Loss</th>
                  <th>What Is Happening and Why?</th>
                  <th>What Needs to Change Immediately?</th>
                </tr>
              </thead>
              <tbody>${wasteRows}</tbody>
            </table>
          `,
          'Waste lines that are currently leaking margin and the immediate correction required.'
        )
      : '',
    portionRows
      ? renderSection(
          'Portion Control',
          `
            <table class="report-table report-table-tight">
              <colgroup>
                <col style="width: 24%" />
                <col style="width: 14%" />
                <col style="width: 31%" />
                <col style="width: 31%" />
              </colgroup>
              <thead>
                <tr>
                  <th>Dish</th>
                  <th>Weekly Loss</th>
                  <th>What Is Happening and Why?</th>
                  <th>What Needs to Change Immediately?</th>
                </tr>
              </thead>
              <tbody>${portionRows}</tbody>
            </table>
          `,
          'Portion inconsistencies affecting gross profit and how to correct them.'
        )
      : '',
    orderingRows
      ? renderSection(
          'Operations',
          `
            <table class="report-table report-table-tight">
              <colgroup>
                <col style="width: 18%" />
                <col style="width: 30%" />
                <col style="width: 26%" />
                <col style="width: 26%" />
              </colgroup>
              <thead>
                <tr>
                  <th>Area</th>
                  <th>What Is Happening and Why?</th>
                  <th>Commercial Impact</th>
                  <th>Immediate Change</th>
                </tr>
              </thead>
              <tbody>${orderingRows}</tbody>
            </table>
          `,
          'Ordering and operating issues that are driving avoidable cost or service risk.'
        )
      : '',
    findingsCards
      ? renderSection(
          'Leadership and operating narrative',
          `<div class="report-story-grid report-story-grid-editorial">${findingsCards}</div>`,
          'Balanced narrative notes across systems, people, operations, and compliance to close the report intentionally.'
        )
      : ''
  ]
    .filter(Boolean)
    .join('');

  const renderChapter = (kicker: string, title: string, lead: string, body: string) =>
    body
      ? `
        <section class="report-chapter report-chapter-break">
          <div class="report-chapter-header">
            <p class="report-chapter-kicker">${humanizeTitle(kicker)}</p>
            <h2>${humanizeTitle(title)}</h2>
            <p>${humanizeSentence(lead)}</p>
          </div>
          ${body}
        </section>
      `
      : '';

  const coverHtml = buildReportCoverHtml({
    reportType: 'Kitchen Profit Audit',
    clientName: safe(state.businessName) || 'Client Site',
    preparedDate: safe(state.visitDate) || new Date().toISOString().split('T')[0],
    consultant: safe(state.consultantName) || 'Not recorded',
    summary: safe(narrative.executiveSummary) || 'A commercial review of margin leakage, operating controls, and weekly recovery opportunity.',
    metrics: [
      {
        label: 'Weekly profit opportunity',
        value: formatCurrencyShort(calc.totalWeeklyOpportunity),
        primary: true
      },
      {
        label: 'Annual opportunity',
        value: formatCurrencyShort(calc.totalAnnualOpportunity)
      },
      {
        label: 'Control compliance',
        value: `${Math.round(calc.controlScore)}%`
      }
    ],
    details: [
      { label: 'Site', value: safe(state.businessName) || 'Not recorded' },
      { label: 'Location', value: safe(state.location) || 'Not recorded' },
      { label: 'Service style', value: safe(state.serviceStyle) || 'Not recorded' },
      { label: 'Trading days', value: safe(state.tradingDays) || 'Not recorded' }
    ]
  });

  const commercialChapter = renderChapter(
    'Commercial view',
    'Commercial Snapshot',
    'The current trading baseline, the performance gap, and the biggest issues reducing profit.',
    [
      renderSection(
        'Commercial snapshot',
        [
          pageTwoMetrics ? `<div class="report-metric-grid report-metric-grid-4">${pageTwoMetrics}</div>` : '',
          renderAuditPhotoGallery(state.photos, 'commercial', '')
        ]
          .filter(Boolean)
          .join(''),
        'Weekly sales, food cost, labour, and gross profit markers captured during the visit.'
      ),
      renderSection(
        'Key issues',
        renderList(narrative.keyIssues),
        'The most material issues currently suppressing margin, control, or operating consistency.'
      )
    ]
      .filter(Boolean)
      .join('')
  );

  const actionChapter = renderChapter(
    'Action plan',
    'Immediate Priorities and Follow-Up',
    'A practical action sequence covering quick wins, the next 30 to 90 days, and the recommended follow-up cadence.',
    [
      renderSection(
        'Immediate quick wins',
        quickWinsHtml,
        'Fast operational corrections that can usually be put in place immediately.'
      ),
      renderSection(
        '30–90 day action plan',
        actionPlanHtml,
        'Structured medium-term actions to stabilise margin, systems, and team execution.'
      ),
      renderSection(
        'Follow-up recommendation',
        [followUpHtml, renderAuditPhotoGallery(state.photos, 'actions', '')].filter(Boolean).join(''),
        'Recommended next review point, ownership, and evidence gathered against the action plan.'
      )
    ]
      .filter(Boolean)
      .join('')
  );

  const controlsChapter = renderChapter(
    'Controls and evidence',
    'Controls and Evidence Register',
    'Named control checks reviewed onsite, with clear status and supporting notes for management follow-up.',
    controlsChapterBody
  );

  const findingsChapter = renderChapter(
    'Findings and narrative',
    'Operational Findings',
    'Detailed findings across waste, portion control, ordering, layout, and other operational observations.',
    [
      findingsChapterBody,
      renderAuditPhotoGallery(state.photos, 'findings', ''),
      renderAuditPhotoGallery(state.photos, 'layout', '')
    ]
      .filter(Boolean)
      .join('')
  );

  return [coverHtml, commercialChapter, actionChapter, controlsChapter, findingsChapter]
    .filter(Boolean)
    .join('');
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
  const { runWithActivity } = useActivityOverlay();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<AuditFormState>(() =>
    searchParams.get('load')
      ? normalizeAuditState({}, searchParams.get('client') || null)
      : normalizeAuditState(
          readDraft<AuditFormState>(KITCHEN_AUDIT_DRAFT_KEY) ?? {},
          searchParams.get('client') || null
        )
  );
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('Audit draft ready.');
  const [shareUrl, setShareUrl] = useState('');
  const [controlModalOpen, setControlModalOpen] = useState(false);
  const { visitMode, toggleVisitMode } = useVisitMode();

  const calc = useMemo(() => calculateAudit(form), [form]);
  const activeClient = useMemo(
    () => clients.find((client) => client.id === form.clientId) ?? null,
    [clients, form.clientId]
  );
  const availableClientSites = useMemo(
    () => selectableSitesForClient(activeClient),
    [activeClient]
  );
  const [isSharing, setIsSharing] = useState(false);
  const reportHtml = useMemo(() => buildKitchenAuditReportHtml(form), [form]);
  const controlDrawerBodyRef = useRef<HTMLDivElement>(null);
  const standaloneReportHtml = useMemo(
    () =>
      buildPdfDocumentHtml(`${safe(form.businessName || 'Kitchen Profit Audit')} report`, reportHtml, {
        autoPrint: false,
        showCloseButton: false,
        formatLabel: 'Standalone HTML report'
      }),
    [form.businessName, reportHtml]
  );
  const completion = useMemo(() => completionSummary(form), [form]);
  const insights = useMemo(() => buildAuditInsights(form, calc), [form, calc]);

  useBodyScrollLock(controlModalOpen);

  useEffect(() => {
    if (!controlModalOpen) return;
    controlDrawerBodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [controlModalOpen]);

  useEffect(() => {
    listClients().then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    writeDraft(KITCHEN_AUDIT_DRAFT_KEY, form);
  }, [form]);

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

  function addPhotos(section: keyof typeof kitchenPhotoSections, photos: AuditPhoto[]) {
    setForm((current) => ({
      ...current,
      photos: [...current.photos, ...photos]
    }));
  }

  function updatePhotoCaption(photoId: string, caption: string) {
    setForm((current) => ({
      ...current,
      photos: current.photos.map((photo) => (photo.id === photoId ? { ...photo, caption } : photo))
    }));
  }

  function removePhoto(photoId: string) {
    setForm((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo.id !== photoId)
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
      await runWithActivity(
        {
          kicker: 'Plating results',
          title: 'Saving audit',
          detail: 'Locking in the latest kitchen findings and refreshing the saved audit list.'
        },
        async () => {
          const saved = await saveAudit(form);
          setForm({
            ...normalizeAuditState(saved.data, saved.client_id ?? saved.data.clientId ?? null),
            id: saved.id,
            clientId: saved.client_id ?? saved.data.clientId ?? null,
            createdAt: saved.created_at,
            updatedAt: saved.updated_at
          });
          setMessage('Audit saved.');
        }
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  }

  function newAudit() {
    const activeClientId = searchParams.get('client') || null;
    clearDraft(KITCHEN_AUDIT_DRAFT_KEY);
    setForm(createDefaultAudit(activeClientId));
    setMessage('Started a new audit.');
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

  function exportPdf() {
    void runWithActivity(
      {
        kicker: 'Preparing export',
        title: 'Building PDF report',
        detail: 'Formatting the kitchen audit into a clean client-ready report.'
      },
      async () => {
        openPdfDocument(
          `${safe(form.businessName || 'Kitchen Profit Audit')} report`,
          reportHtml
        );
      },
      700
    );
  }

  function downloadHtmlReport() {
    void runWithActivity(
      {
        kicker: 'Packing report',
        title: 'Downloading HTML report',
        detail: 'Creating a standalone HTML version you can keep or send on.'
      },
      async () => {
        downloadText(
          `${safe(form.businessName || 'kitchen-audit-report')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || 'kitchen-audit-report'}.html`,
          standaloneReportHtml,
          'text/html'
        );
        setMessage('Standalone HTML report downloaded.');
      },
      700
    );
  }

  async function shareHtmlReport() {
    try {
      setIsSharing(true);
      setShareUrl('');
      const share = await runWithActivity(
        {
          kicker: 'Opening pass',
          title: 'Creating share link',
          detail: 'Publishing a secure public link for this kitchen audit report.'
        },
        () => createKitchenAuditShare(form),
        900
      );
      const shareUrl = share.url;
      setShareUrl(shareUrl);

      try {
        await navigator.clipboard.writeText(shareUrl);
        setMessage('HTML report link created and copied to clipboard.');
      } catch {
        setMessage(`HTML report link created: ${shareUrl}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the share link.');
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div className={`page-stack ${visitMode ? 'visit-mode' : ''}`}>
      <PageIntro
        eyebrow="Kitchen Profit Audit"
        title="We identify £2k–£10k per week in hidden profit"
        description="Capture the commercial leaks, quantify the weekly opportunity, and generate a premium consultancy report while you are still onsite."
        actions={
          <>
            <button className={`button ${visitMode ? 'button-primary' : 'button-secondary'}`} onClick={toggleVisitMode}>
              {visitMode ? 'Exit visit mode' : 'Visit mode'}
            </button>
            <button className="button button-secondary" onClick={newAudit}>
              New audit
            </button>
            <button className="button button-primary" disabled={isSaving} onClick={handleSave}>
              {isSaving ? 'Saving...' : 'Save audit'}
            </button>
            <button className="button button-secondary" onClick={exportPdf}>
              Export PDF
            </button>
            <button className="button button-secondary" disabled={isSharing} onClick={downloadHtmlReport}>
              Download HTML
            </button>
            <button className="button button-secondary" disabled={isSharing} onClick={shareHtmlReport}>
              {isSharing ? 'Creating link...' : 'Create share link'}
            </button>
          </>
        }
      />
      {visitMode ? (
        <section className="panel visit-mode-toolbar">
          <div className="panel-body visit-mode-toolbar-body">
            <div className="visit-mode-toolbar-copy">
              <strong>Day of Visit mode</strong>
              <span>Large fields, quick jumps, save-first controls, and less onscreen admin while you work onsite.</span>
            </div>
            <div className="visit-mode-toolbar-actions">
              <button className="button button-primary" disabled={isSaving} onClick={handleSave}>
                {isSaving ? 'Saving...' : 'Save now'}
              </button>
              <button className="button button-secondary" onClick={() => setControlModalOpen(true)}>
                Open controls
              </button>
            </div>
            <div className="visit-mode-toolbar-links">
              {sectionLinks.map((section) => (
                <a className="audit-section-link" href={section.href} key={section.href}>
                  {section.label}
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      <section className="panel share-link-panel">
        <div className="panel-body stack gap-12">
          <div className="record-header-message">
            <span className="soft-pill">{message}</span>
            {shareUrl ? <span className="soft-pill">Share link ready</span> : null}
          </div>
          {shareUrl ? (
            <div className="share-link-row">
              <input
                className="input"
                readOnly
                value={shareUrl}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button
                className="button button-secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setMessage('HTML report link copied to clipboard.');
                  } catch {
                    setMessage('Copy failed. You can still copy the link manually.');
                  }
                }}
              >
                Copy link
              </button>
              <a className="button button-primary" href={shareUrl} target="_blank" rel="noreferrer">
                Open link
              </a>
            </div>
          ) : null}
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Total weekly opportunity"
          value={fmtCurrency(calc.totalWeeklyOpportunity)}
          hint="Combined GP, waste, labour, and portion opportunity"
        />
        <StatCard
          label="Annual opportunity"
          value={fmtCurrency(calc.totalAnnualOpportunity)}
          hint="Projected annualised recovery value"
        />
        <StatCard
          label="GP opportunity"
          value={fmtCurrency(calc.gpOpportunityValue)}
          hint="Weekly opportunity from the GP gap"
        />
        <StatCard
          label="Labour opportunity"
          value={fmtCurrency(calc.labourOpportunityValue)}
          hint={
            form.labourPercent > form.targetLabourPercent
              ? `${fmtPercent(form.labourPercent)} vs ${fmtPercent(form.targetLabourPercent)} target`
              : 'No labour variance currently showing'
          }
        />
        <StatCard
          label="Control compliance"
          value={`${Math.round(calc.controlScore)}%`}
          hint={
            calc.criticalMissingControls > 0
              ? `${calc.criticalMissingControls} critical controls missing`
              : `${calc.totalNamedActions} structured actions recorded`
          }
        />
      </section>

      <section className="workspace-grid full-width">
        <div className="workspace-main full-width">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Profit audit input</h3>
                <p className="muted-copy">
                  Work section by section and turn kitchen observations into a quantified commercial case.
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
                    <span>Review type</span>
                    <select
                      className="input"
                      value={form.auditType}
                      onChange={(e) => updateField('auditType', e.target.value)}
                    >
                      <option>Kitchen Profit Audit</option>
                      <option>Menu & GP Recovery Review</option>
                      <option>Kitchen Efficiency Review</option>
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
                  <h4>Commercial opportunity snapshot</h4>
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
                    <span>Weekly waste loss (£)</span>
                    <input
                      className="input"
                      type="number"
                      value={form.actualWasteValue}
                      onChange={(e) => updateField('actualWasteValue', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Current labour %</span>
                    <input
                      className="input"
                      type="number"
                      value={form.labourPercent}
                      onChange={(e) => updateField('labourPercent', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Target labour %</span>
                    <input
                      className="input"
                      type="number"
                      value={form.targetLabourPercent}
                      onChange={(e) => updateField('targetLabourPercent', num(e.target.value))}
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
                          ? `${fmtCurrency(calc.gpOpportunityValue)} per week below target`
                          : 'On or above target'
                        : 'Awaiting numbers'}
                    </span>
                  </div>
                  <div className="audit-chip">
                    <strong>Waste reading</strong>
                    <span>
                      {form.actualWasteValue > 0
                        ? `${fmtCurrency(form.actualWasteValue)} per week • ${fmtCurrency(calc.annualWasteLoss)} per year`
                        : 'No waste value logged'}
                    </span>
                  </div>
                  <div className="audit-chip">
                    <strong>Labour reading</strong>
                    <span>
                      {form.labourPercent > 0
                        ? `${fmtPercent(form.labourPercent)} vs ${fmtPercent(form.targetLabourPercent)} target`
                        : 'No labour data logged'}
                    </span>
                  </div>
                  <div className="audit-chip">
                    <strong>Total identified</strong>
                    <span>
                      {calc.totalWeeklyOpportunity > 0
                        ? `${fmtCurrency(calc.totalWeeklyOpportunity)} per week`
                        : 'Add commercial inputs'}
                    </span>
                  </div>
                </div>

                <div className="header-actions">
                  <button className="button button-secondary" onClick={estimateSalesFromTradingProfile}>
                    Use covers x spend as weekly sales
                  </button>
                </div>

                <PhotoEvidenceField
                  onAddPhotos={(photos) => addPhotos('commercial', photos)}
                  onCaptionChange={updatePhotoCaption}
                  onMessage={setMessage}
                  onRemovePhoto={removePhoto}
                  photos={form.photos}
                  section="commercial"
                  sectionLabel={kitchenPhotoSections.commercial}
                />
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
                        <span>What is happening and why?</span>
                        <textarea
                          className="input textarea"
                          value={item.note}
                          onChange={(e) => updateControlCheck(item.id, 'note', e.target.value)}
                        />
                      </label>
                    </div>
                  ))}
                </div>

                <PhotoEvidenceField
                  onAddPhotos={(photos) => addPhotos('controls', photos)}
                  onCaptionChange={updatePhotoCaption}
                  onMessage={setMessage}
                  onRemovePhoto={removePhoto}
                  photos={form.photos}
                  section="controls"
                  sectionLabel={kitchenPhotoSections.controls}
                />
              </section>

              <section className="sub-panel" id="audit-observations">
                <div className="sub-panel-header">
                  <h4>Consultancy narrative</h4>
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
                  <h4>Where is money being lost?</h4>
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
                        <strong>{safe(item.item) || 'Waste loss area'}</strong>
                        <button
                          className="button button-ghost"
                          onClick={() => removeRepeatItem('wasteItems', item.id)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="form-grid">
                        <label className="field">
                          <span>Where is money being lost?</span>
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
                          <span>Weekly loss (£)</span>
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
                          <span>What is happening and why?</span>
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
                          <span>What needs to change immediately?</span>
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

                <PhotoEvidenceField
                  onAddPhotos={(photos) => addPhotos('findings', photos)}
                  onCaptionChange={updatePhotoCaption}
                  onMessage={setMessage}
                  onRemovePhoto={removePhoto}
                  photos={form.photos}
                  section="findings"
                  sectionLabel={kitchenPhotoSections.findings}
                />
              </section>

              <section className="sub-panel" id="audit-portion">
                <div className="sub-panel-header">
                  <h4>Which dishes are over-portioning and costing profit?</h4>
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
                        <strong>{safe(item.dish) || 'Dish margin leak'}</strong>
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
                          <span>What is happening and why?</span>
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
                          <span>What needs to change immediately?</span>
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
                  <h4>Where is ordering creating waste or inefficiency?</h4>
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
                        <strong>{safe(item.category) || 'Ordering issue'}</strong>
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
                          <span>What is happening and why?</span>
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
                          <span>What needs to change immediately?</span>
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

                <PhotoEvidenceField
                  onAddPhotos={(photos) => addPhotos('layout', photos)}
                  onCaptionChange={updatePhotoCaption}
                  onMessage={setMessage}
                  onRemovePhoto={removePhoto}
                  photos={form.photos}
                  section="layout"
                  sectionLabel={kitchenPhotoSections.layout}
                />
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

                <PhotoEvidenceField
                  onAddPhotos={(photos) => addPhotos('actions', photos)}
                  onCaptionChange={updatePhotoCaption}
                  onMessage={setMessage}
                  onRemovePhoto={removePhoto}
                  photos={form.photos}
                  section="actions"
                  sectionLabel={kitchenPhotoSections.actions}
                />
              </section>
            </div>
          </div>
        </div>

      </section>

      <ControlPanelModal
        bodyRef={controlDrawerBodyRef}
        onClose={() => setControlModalOpen(false)}
        open={controlModalOpen}
        title="Profit Audit Controls"
      >

              <div className="audit-side-block">
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
              </div>

              <div className="audit-side-block" style={{marginTop: '24px'}}>
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
              </div>

              <div className="audit-side-block" style={{marginTop: '24px'}}>
                <div className="audit-side-title-row">
                  <h4>Profit snapshot</h4>
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
                    <strong>Total opportunity identified</strong>
                    <span>
                      {calc.totalWeeklyOpportunity > 0
                        ? `${fmtCurrency(calc.totalWeeklyOpportunity)} per week`
                        : 'No commercial opportunity currently showing'}
                    </span>
                  </div>
                </div>
              </div>

      </ControlPanelModal>

      <div className="page-floating-controls">
        <button className="button button-primary control-dock-button" onClick={() => setControlModalOpen(true)}>
          Profit Controls
        </button>
      </div>

    </div>
  );
}

import {
  buildPdfDocumentHtml,
  buildReportCoverHtml,
  formatCurrencyShort,
  humanizeSentence,
  humanizeTitle,
  normalizeProseText,
  normalizeTitleLabel
} from '../../reports/pdf';
import type { AuditFormState } from '../../types';
import { fmtCurrency, fmtPercent, lines, num, safe } from '../../lib/utils';
import { renderAuditPhotoGallery } from '../../lib/photoEvidence';
import { buildKitchenProfitNarrative } from '../profit/kitchenProfit';
import { calculateAudit } from './kitchenAuditHelpers';

export function buildKitchenAuditReportHtml(state: AuditFormState) {
  const calc = calculateAudit(state);
  const controlRows = state.controlChecks.filter(
    (item) => item.status !== 'N/A' || safe(item.note) || safe(item.label)
  );

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
    calc.gpGap > 0 ? renderMetric('GP gap', `${calc.gpGap.toFixed(1)}%`) : '',
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
            <p class="report-chapter-kicker">${normalizeTitleLabel(kicker)}</p>
            <h2>${normalizeTitleLabel(title)}</h2>
            <p>${humanizeSentence(lead)}</p>
          </div>
          ${body}
        </section>
      `
      : '';

  const coverHtml = buildReportCoverHtml({
    reportType: 'Kitchen Profit Audit',
    clientName: normalizeTitleLabel(safe(state.businessName) || 'Client Site'),
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

export function buildStandaloneKitchenAuditReportHtml(title: string, reportHtml: string) {
  return buildPdfDocumentHtml(title, reportHtml, {
    autoPrint: false,
    showCloseButton: false,
    formatLabel: 'Standalone HTML report'
  });
}

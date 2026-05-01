import type { AuditFormState } from '../../types';
import { calculateKitchenProfitMetrics, buildKitchenProfitNarrative } from '../../features/profit/kitchenProfit';
import { safe } from '../../lib/utils';
import {
  buildReportCoverHtml,
  buildChapterHtml,
  buildSectionHtml,
  formatCurrencyShort,
  escapeHtml,
  normalizeProseText,
  buildReportBodyHtml,
  buildSummaryGridHtml,
  buildRecommendationListHtml,
  buildActionRegisterHtml,
  buildReportPhotoGalleryHtml
} from './index';

export function buildKitchenAuditPdf(audit: AuditFormState): string {
  const metrics = calculateKitchenProfitMetrics(audit);
  const narrative = buildKitchenProfitNarrative(audit, metrics);
  const namedActions = audit.actionItems.filter((item) => safe(item.title));
  const highPriorityActions = namedActions
    .filter((item) => item.priority === 'Critical' || item.priority === 'High')
    .slice(0, 4);
  const preparedDate = audit.visitDate || new Date().toISOString();

  // --------------------------
  // PAGE 1 - COVER PAGE
  // --------------------------
  const coverHtml = buildReportCoverHtml({
    clientName: safe(audit.businessName) || 'Client Site',
    reportType: 'Kitchen Profit Audit',
    preparedDate,
    consultant: safe(audit.consultantName) || 'The Final Check',
    metrics: [
      { label: 'Recoverable Opportunity', value: formatCurrencyShort(metrics.totalWeeklyOpportunity), primary: true },
      { label: 'Actual GP', value: `${Math.round(metrics.actualGp)}%` },
      { label: 'Control Score', value: `${Math.round(metrics.controlScore)}%` }
    ],
    details: [
      { label: 'Location', value: safe(audit.location) },
      { label: 'Covers / Week', value: audit.coversPerWeek > 0 ? String(audit.coversPerWeek) : '' },
      { label: 'Average Spend', value: audit.averageSpend > 0 ? formatCurrencyShort(audit.averageSpend) : '' },
      { label: 'Kitchen Team', value: audit.kitchenTeamSize > 0 ? String(audit.kitchenTeamSize) : '' }
    ],
    summary: narrative.executiveSummary || audit.summary
  });

  const executiveChapter = buildChapterHtml({
    kicker: 'Executive Summary',
    title: 'Headline Findings and Commercial Opportunity',
    lead: 'Client-facing summary of the profit position, immediate risks, and recommended management response.',
    body: `
      ${buildSummaryGridHtml([
        { label: 'Weekly opportunity', value: formatCurrencyShort(metrics.totalWeeklyOpportunity), detail: 'Estimated recoverable margin from GP, waste, portion, and labour controls.' },
        { label: 'Annualised opportunity', value: formatCurrencyShort(metrics.totalAnnualOpportunity), detail: 'Indicative run-rate if the weekly opportunity remains unresolved.' },
        { label: 'GP gap', value: `${Math.max(metrics.gpGap, 0).toFixed(1)} pts`, detail: `Actual GP ${metrics.actualGp.toFixed(1)}% against target ${audit.targetGp}%.` },
        { label: 'Weekly waste', value: formatCurrencyShort(metrics.weeklyWasteLoss), detail: `${metrics.wastePercent.toFixed(1)}% of weekly sales.` },
        { label: 'Portion risk', value: metrics.portionRisk, detail: `${formatCurrencyShort(metrics.totalPortionLoss)} weekly portion loss recorded.` },
        { label: 'Open actions', value: `${namedActions.length}`, detail: 'Named client actions captured in the audit.' }
      ])}

      ${buildSectionHtml('Key findings', buildRecommendationListHtml(narrative.keyIssues))}
      ${buildSectionHtml('Recommended first moves', buildRecommendationListHtml(narrative.quickWins))}
      ${buildSectionHtml('Follow-up recommendation', `<p>${escapeHtml(normalizeProseText(narrative.followUpRecommendation))}</p>`)}
    `
  });

  // --------------------------
  // PAGE 2 - COMMERCIAL SNAPSHOT
  // --------------------------
  const commercialMetricsHtml = `
    <div class="pdf-metric-grid">
      <div class="pdf-metric-card">
        <span>Weekly Sales</span>
        <strong>${formatCurrencyShort(audit.weeklySales)}</strong>
      </div>
      <div class="pdf-metric-card">
        <span>Food Cost %</span>
        <strong>${audit.weeklySales > 0 ? Math.round((audit.weeklyFoodCost / audit.weeklySales) * 100) : 0}%</strong>
      </div>
      <div class="pdf-metric-card">
        <span>Labour %</span>
        <strong>${audit.labourPercent}%</strong>
      </div>
      <div class="pdf-metric-card">
        <span>Gross Profit</span>
        <strong>${audit.targetGp}%</strong>
      </div>
      <div class="pdf-metric-card">
        <span>Weekly Waste</span>
        <strong>${formatCurrencyShort(audit.actualWasteValue)}</strong>
      </div>
      <div class="pdf-metric-card">
        <span>Covers / Week</span>
        <strong>${audit.coversPerWeek}</strong>
      </div>
    </div>

    ${audit.wasteItems.length > 0 ? `
    <table class="report-table">
      <thead>
        <tr>
          <th>Waste Item</th>
          <th>Weekly Cost</th>
          <th>Root Cause</th>
          <th>Recommended Fix</th>
        </tr>
      </thead>
      <tbody>
        ${audit.wasteItems.map(item => `
        <tr>
          <td>${escapeHtml(item.item)}</td>
          <td>${formatCurrencyShort(item.cost)}</td>
          <td>${escapeHtml(item.cause)}</td>
          <td>${escapeHtml(item.fix)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}
  `;

  const commercialChapter = buildChapterHtml({
    kicker: 'Commercial Snapshot',
    title: 'Profit & Cost Performance',
    lead: 'Financial performance assessment and opportunity analysis',
    body: commercialMetricsHtml
  });

  // --------------------------
  // PAGE 3 - IMMEDIATE PRIORITIES
  // --------------------------
  const prioritiesHtml = `
    ${highPriorityActions.length ? `<div class="report-grid">
      ${audit.actionItems
      .filter(item => item.priority === 'Critical' || item.priority === 'High')
        .slice(0, 3)
        .map(item => `
        <div class="report-story-card">
          <h3>${escapeHtml(item.title)}</h3>
          <p><strong>Owner:</strong> ${escapeHtml(item.owner || 'Unassigned')}</p>
          <p><strong>Due:</strong> ${escapeHtml(item.dueDate || 'Not set')}</p>
          <p>${escapeHtml(item.impact)}</p>
        </div>
        `).join('')}
    </div>` : ''}

    <div style="margin-top: 24px;">
      <h3>Milestones</h3>
      <div class="report-grid">
        <div class="pdf-metric-card">
          <span>30 Days</span>
          <strong>Immediate corrective actions complete</strong>
        </div>
        <div class="pdf-metric-card">
          <span>60 Days</span>
          <strong>Systems and controls implemented</strong>
        </div>
        <div class="pdf-metric-card">
          <span>90 Days</span>
          <strong>Target GP achieved and sustained</strong>
        </div>
      </div>
    </div>

    ${buildSectionHtml('30 to 90 day plan', buildRecommendationListHtml(narrative.actionPlan30To90Days))}
    ${buildSectionHtml('Action register', buildActionRegisterHtml(highPriorityActions.length ? highPriorityActions : namedActions))}
    ${buildSectionHtml('Next scheduled review', `<p>${escapeHtml(normalizeProseText(audit.nextVisit || 'To be confirmed'))}</p>`)}
  `;

  const prioritiesChapter = buildChapterHtml({
    kicker: 'Immediate Priorities',
    title: 'Action Plan & Follow-Up',
    lead: 'High priority items requiring immediate attention',
    body: prioritiesHtml
  });

  // --------------------------
  // PAGE 4 - CONTROLS REGISTER
  // --------------------------
  const controlsHtml = `
    <table class="report-table report-table-tight">
      <thead>
        <tr>
          <th style="width: 60%">Control Check</th>
          <th style="width: 20%">Category</th>
          <th style="width: 20%">Status</th>
        </tr>
      </thead>
      <tbody>
        ${audit.controlChecks.map(control => `
        <tr>
          <td>${escapeHtml(control.label)}</td>
          <td>${escapeHtml(control.category)}</td>
          <td style="font-weight: 700; ${
            control.status === 'In Place' ? 'color: #2e7d32' :
            control.status === 'Partial' ? 'color: #ed6c02' :
            'color: #d32f2f'
          }">${control.status}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const controlsChapter = buildChapterHtml({
    kicker: 'Controls Register',
    title: 'Systems & Compliance Checklist',
    lead: '18 point operational control assessment',
    body: controlsHtml
  });

  // --------------------------
  // PAGE 5 - LAYOUT & EQUIPMENT
  // --------------------------
  const layoutHtml = `
    ${buildSectionHtml('Layout Assessment', [audit.layoutStrengths, audit.layoutIssues, audit.layoutImpact]
      .filter(Boolean)
      .map((item) => `<p>${escapeHtml(normalizeProseText(item))}</p>`)
      .join(''))}

    ${buildSectionHtml('Equipment Condition', audit.equipmentNeeds ? `
      <p>${escapeHtml(normalizeProseText(audit.equipmentNeeds))}</p>
    ` : '')}
  `;

  const layoutChapter = buildChapterHtml({
    kicker: 'Kitchen Layout',
    title: 'Flow & Infrastructure',
    lead: 'Physical kitchen assessment and equipment review',
    body: layoutHtml
  });

  // --------------------------
  // PAGE 6 - OPERATIONAL FINDINGS
  // --------------------------
  const findingsHtml = `
    ${buildSectionHtml('Strengths', audit.quickWins ? `<p>${escapeHtml(normalizeProseText(audit.quickWins))}</p>` : '')}
    ${buildSectionHtml('Areas For Improvement', audit.systems ? `<p>${escapeHtml(normalizeProseText(audit.systems))}</p>` : '')}
    ${buildSectionHtml('Food Quality', audit.foodQuality ? `<p>${escapeHtml(normalizeProseText(audit.foodQuality))}</p>` : '')}
    ${buildReportPhotoGalleryHtml(audit.photos, 'summary')}
  `;

  const findingsChapter = buildChapterHtml({
    kicker: 'Operational Findings',
    title: 'Observations & Analysis',
    lead: 'Key findings from the on-site audit',
    body: findingsHtml
  });

  // --------------------------
  // PAGE 8 - OPERATIONS
  // --------------------------
  const operationsHtml = `
    ${buildSectionHtml('Portion Control', audit.portionItems.length > 0 ? `
    <table class="report-table">
      <thead>
        <tr>
          <th>Dish</th>
          <th>Loss %</th>
          <th>Issue</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${audit.portionItems.map(item => `
        <tr>
          <td>${escapeHtml(item.dish)}</td>
          <td>${item.loss}%</td>
          <td>${escapeHtml(item.issue)}</td>
          <td>${escapeHtml(item.fix)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '')}

    ${buildSectionHtml('Ordering & Stock', audit.orderingItems.length > 0 ? `
    <table class="report-table">
      <thead>
        <tr>
          <th>Category</th>
          <th>Problem</th>
          <th>Impact</th>
          <th>Fix</th>
        </tr>
      </thead>
      <tbody>
        ${audit.orderingItems.map(item => `
        <tr>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.problem)}</td>
          <td>${escapeHtml(item.impact)}</td>
          <td>${escapeHtml(item.fix)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '')}
  `;

  const operationsChapter = buildChapterHtml({
    kicker: 'Operations',
    title: 'Processes & Controls',
    lead: 'Ordering, stock, portion and systems assessment',
    body: operationsHtml
  });

  // --------------------------
  // PAGE 9 - LEADERSHIP NARRATIVE
  // --------------------------
  const leadershipHtml = `
    ${buildSectionHtml('Culture & Leadership', audit.cultureLeadership ? `<p>${escapeHtml(normalizeProseText(audit.cultureLeadership))}</p>` : '')}

    ${audit.longTermStrategy ? `<div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--pdf-line-medium);">
      <h3>Closing Summary</h3>
      <p>${escapeHtml(normalizeProseText(audit.longTermStrategy))}</p>
    </div>` : ''}
  `;

  const leadershipChapter = buildChapterHtml({
    kicker: 'Leadership',
    title: 'Operating Narrative',
    lead: 'Culture, team and long term strategy',
    body: leadershipHtml
  });

  // --------------------------
  // COMBINE FULL DOCUMENT
  // --------------------------
  return [
    coverHtml,
    buildReportBodyHtml([
    executiveChapter,
    commercialChapter,
    prioritiesChapter,
    controlsChapter,
    layoutChapter,
    findingsChapter,
    operationsChapter,
    leadershipChapter
    ])
  ].join('');
}

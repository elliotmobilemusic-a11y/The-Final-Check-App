import type { AuditFormState } from '../../types';
import {
  buildPdfDocumentHtml,
  buildReportCoverHtml,
  buildChapterHtml,
  buildSectionHtml,
  formatCurrencyShort,
  escapeHtml,
  normalizeProseText
} from './index';

export function buildKitchenAuditPdf(audit: AuditFormState): string {
  // --------------------------
  // PAGE 1 - COVER PAGE
  // --------------------------
  const coverHtml = buildReportCoverHtml({
    clientName: audit.businessName,
    reportType: 'Kitchen Profit Audit',
    date: audit.visitDate,
    auditor: audit.consultantName,
    location: audit.location,
    metrics: [
      { label: 'Overall Score', value: `${Math.round(Object.values(audit.categoryScores).reduce((a,b) => a+b, 0) / 8)}/10` },
      { label: 'Current GP', value: `${audit.targetGp}%` },
      { label: 'Missed Opportunity', value: formatCurrencyShort(audit.actualWasteValue * 4) }
    ],
    summary: audit.summary
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
    <div class="report-grid">
      ${audit.actionItems
        .filter(item => item.priority === 'High')
        .slice(0, 3)
        .map(item => `
        <div class="report-story-card">
          <h3>${escapeHtml(item.title)}</h3>
          <p><strong>Owner:</strong> ${escapeHtml(item.owner || 'Unassigned')}</p>
          <p><strong>Due:</strong> ${escapeHtml(item.dueDate || 'Not set')}</p>
          <p>${escapeHtml(item.impact)}</p>
        </div>
        `).join('')}
    </div>

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

    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--pdf-line-medium);">
      <p class="pdf-muted">Next scheduled audit: ${audit.nextVisit || 'To be confirmed'}</p>
    </div>
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
    ${buildSectionHtml('Layout Assessment', `
      <p>${normalizeProseText(audit.layoutStrengths)}</p>
      <p>${normalizeProseText(audit.layoutIssues)}</p>
      <p>${normalizeProseText(audit.layoutImpact)}</p>
    `)}

    ${buildSectionHtml('Equipment Condition', `
      <p>${normalizeProseText(audit.equipmentNeeds)}</p>
    `)}
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
    ${buildSectionHtml('Strengths', `<p>${normalizeProseText(audit.quickWins)}</p>`)}
    ${buildSectionHtml('Areas For Improvement', `<p>${normalizeProseText(audit.systems)}</p>`)}
    ${buildSectionHtml('Food Quality', `<p>${normalizeProseText(audit.foodQuality)}</p>`)}
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
    ` : '<p class="pdf-empty-state">No portion variance issues recorded</p>')}

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
    ` : '<p class="pdf-empty-state">No ordering issues recorded</p>')}
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
    ${buildSectionHtml('Culture & Leadership', `<p>${normalizeProseText(audit.cultureLeadership)}</p>`)}
    ${buildSectionHtml('Team & Training', `<p>${normalizeProseText(audit.cultureLeadership || 'Training assessment complete')}</p>`)}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--pdf-line-medium);">
      <h3>Closing Summary</h3>
      <p>${normalizeProseText(audit.longTermStrategy)}</p>
    </div>
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
  const bodyHtml = [
    coverHtml,
    commercialChapter,
    prioritiesChapter,
    controlsChapter,
    layoutChapter,
    findingsChapter,
    operationsChapter,
    leadershipChapter
  ].join('');

  return buildPdfDocumentHtml(`Kitchen Audit - ${audit.businessName}`, bodyHtml);
}
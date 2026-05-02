import type { AuditActionItem, AuditFormState } from '../../types';
import { calculateKitchenProfitMetrics, buildKitchenProfitNarrative } from '../../features/profit/kitchenProfit';
import { safe } from '../../lib/utils';
import { escapeHtml, formatCurrencyShort, normalizeProseText } from './buildPdfDocumentHtml';

const STYLES = `<style>
  .ks-pdf {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    color: #23211f;
    line-height: 1.5;
    padding: 14mm 18mm;
    max-width: none;
    box-sizing: border-box;
  }

  /* Masthead */
  .ks-masthead {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    border-bottom: 2px solid #23211f;
    padding-bottom: 0;
    margin-bottom: 18px;
  }
  .ks-masthead td {
    padding: 0 0 8px;
    vertical-align: bottom;
  }
  .ks-masthead td:last-child {
    text-align: right;
  }
  .ks-brand {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #23211f;
  }
  .ks-brand-tag {
    font-size: 11px;
    color: #7a7067;
    letter-spacing: 0.03em;
    margin-top: 1px;
  }
  .ks-doc-type {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #7a7067;
  }

  /* Hero */
  .ks-site-name {
    font-size: 27px;
    font-weight: 700;
    color: #1e1b18;
    margin: 0 0 3px;
    letter-spacing: -0.015em;
  }
  .ks-byline {
    font-size: 13px;
    color: #7a7067;
    margin: 0 0 8px;
  }
  .ks-positioning {
    font-size: 13px;
    color: #504840;
    margin: 0 0 14px;
  }

  /* Meta table (2-col, 50/50) */
  .ks-meta-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-bottom: 0;
  }
  .ks-meta-table td {
    width: 50%;
    padding: 8px 12px 0 0;
    vertical-align: top;
    border-top: 1px solid rgba(84, 72, 56, 0.18);
  }
  .ks-meta-table td:last-child {
    padding-right: 0;
  }
  .ks-meta-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #7a7067;
    margin-bottom: 2px;
  }
  .ks-meta-value {
    font-size: 13px;
    font-weight: 600;
    color: #2f2a25;
  }

  /* Metrics strip */
  .ks-metrics-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-top: 18px;
    margin-bottom: 0;
    border-top: 1px solid rgba(84, 72, 56, 0.18);
    border-bottom: 1px solid rgba(84, 72, 56, 0.18);
  }
  .ks-metrics-table td {
    padding: 10px 12px 10px 0;
    vertical-align: top;
  }
  .ks-metrics-table td + td {
    border-left: 1px solid rgba(84, 72, 56, 0.14);
    padding-left: 12px;
  }
  .ks-metric-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #7a7067;
    margin-bottom: 3px;
  }
  .ks-metric-value {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.015em;
    color: #1e1b18;
  }

  /* Sections */
  .ks-section {
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid rgba(84, 72, 56, 0.14);
  }
  .ks-section-heading {
    font-size: 15px;
    font-weight: 700;
    color: #1e1b18;
    margin: 0 0 8px;
    letter-spacing: -0.005em;
  }
  .ks-section p {
    margin: 0 0 8px;
    font-size: 13px;
    color: #3f3a34;
  }

  /* KPI detail table */
  .ks-kpi-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-top: 10px;
  }
  .ks-kpi-table tr {
    border-bottom: 1px solid rgba(84, 72, 56, 0.1);
  }
  .ks-kpi-table tr:last-child {
    border-bottom: none;
  }
  .ks-kpi-label-cell {
    width: 55%;
    padding: 7px 12px 7px 0;
    vertical-align: top;
    color: #7a7067;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.03em;
  }
  .ks-kpi-value-cell {
    padding: 7px 0;
    vertical-align: top;
    font-weight: 700;
    color: #1e1b18;
    font-size: 14px;
  }
  .ks-kpi-detail {
    display: block;
    font-size: 11px;
    font-weight: 400;
    color: #7a7067;
    margin-top: 1px;
  }

  /* Lists */
  .ks-list {
    margin: 0;
    padding-left: 18px;
  }
  .ks-list li {
    margin-bottom: 6px;
    font-size: 13px;
    color: #342f2a;
    line-height: 1.45;
  }
  .ks-list li:last-child { margin-bottom: 0; }

  .ks-ol {
    margin: 0;
    padding-left: 20px;
  }
  .ks-ol li {
    margin-bottom: 7px;
    font-size: 13px;
    color: #342f2a;
    line-height: 1.45;
  }
  .ks-ol li:last-child { margin-bottom: 0; }

  /* Fallback box */
  .ks-fallback {
    padding: 10px 13px;
    background: #f8f3ec;
    border: 1px solid rgba(115, 95, 64, 0.2);
    border-radius: 5px;
    color: #433c34;
    font-size: 12px;
    margin-top: 4px;
    margin-bottom: 8px;
  }

  /* Footer note */
  .ks-note {
    margin-top: 22px;
    padding-top: 10px;
    border-top: 1px dashed rgba(84, 72, 56, 0.24);
    color: #7a7067;
    font-size: 11px;
  }

  @media print {
    .ks-pdf {
      padding: 14mm 18mm;
    }
  }
</style>`;

function isMeaningful(value: unknown): boolean {
  const text = safe(value).toLowerCase().trim();
  if (!text) return false;
  return !['not recorded', 'not set', 'n/a', 'none', 'na', 'unknown', 'tbc', 'to be confirmed'].includes(text);
}

function clean(value: unknown): string {
  return normalizeProseText(safe(value));
}

function sortByPriority(items: AuditActionItem[]) {
  const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  return [...items].sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
}

function renderList(items: string[]): string {
  if (!items.length) return '';
  return `<ul class="ks-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderOrderedList(items: string[]): string {
  if (!items.length) return '';
  return `<ol class="ks-ol">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
}

export function buildKitchenAuditPdf(audit: AuditFormState): string {
  const metrics = calculateKitchenProfitMetrics(audit);
  const narrative = buildKitchenProfitNarrative(audit, metrics);
  const preparedDate = safe(audit.visitDate) || new Date().toISOString().split('T')[0];
  const consultant = clean(audit.consultantName) || 'The Final Check';
  const siteName = clean(audit.businessName) || 'Client Site';
  const locationVal = clean(audit.location);

  const namedActions = sortByPriority(
    audit.actionItems.filter(item => isMeaningful(item.title))
  );
  const topActions = namedActions.slice(0, 5);

  const executiveSummary =
    clean(narrative.executiveSummary || audit.summary) ||
    'This review identifies margin recovery opportunities and the control actions needed to protect profitability.';

  // Cover metrics — only include rows with real values
  const coverMetrics: Array<{ label: string; value: string }> = [];
  if (metrics.totalWeeklyOpportunity > 0) {
    coverMetrics.push({ label: 'Weekly recovery (est.)', value: formatCurrencyShort(metrics.totalWeeklyOpportunity) });
  }
  if (metrics.actualGp > 0) {
    coverMetrics.push({ label: 'Actual GP', value: `${metrics.actualGp.toFixed(1)}%` });
  }
  if (metrics.controlScore > 0) {
    coverMetrics.push({ label: 'Control compliance', value: `${Math.round(metrics.controlScore)}%` });
  }
  if (coverMetrics.length === 0 && metrics.gpGap > 0) {
    coverMetrics.push({ label: 'GP gap vs target', value: `${metrics.gpGap.toFixed(1)} pts` });
  }

  // KPI detail rows
  const kpis: Array<{ label: string; value: string; detail?: string }> = [];
  if (metrics.totalWeeklyOpportunity > 0) {
    kpis.push({
      label: 'Recoverable opportunity',
      value: formatCurrencyShort(metrics.totalWeeklyOpportunity),
      detail: metrics.totalAnnualOpportunity > 0
        ? `Annualised run-rate about ${formatCurrencyShort(metrics.totalAnnualOpportunity)}.`
        : undefined
    });
  }
  if (metrics.gpGap > 0) {
    kpis.push({
      label: 'GP gap vs target',
      value: `${metrics.gpGap.toFixed(1)} pts`,
      detail: `Actual ${metrics.actualGp.toFixed(1)}% vs target ${audit.targetGp}%.`
    });
  }
  if (metrics.weeklyWasteLoss > 0) {
    kpis.push({
      label: 'Waste pressure',
      value: formatCurrencyShort(metrics.weeklyWasteLoss),
      detail: `${metrics.wastePercent.toFixed(1)}% of weekly sales (estimated).`
    });
  }
  if (audit.labourPercent > 0) {
    kpis.push({
      label: 'Labour load',
      value: `${audit.labourPercent}%`,
      detail: audit.targetLabourPercent > 0 ? `Target ${audit.targetLabourPercent}%.` : undefined
    });
  }
  if (metrics.criticalMissingControls > 0) {
    kpis.push({
      label: 'Critical control gaps',
      value: `${metrics.criticalMissingControls}`,
      detail: 'Close before the next full service cycle where possible.'
    });
  }
  if (kpis.length === 0 && namedActions.length > 0) {
    kpis.push({
      label: 'Named actions in register',
      value: `${namedActions.length}`,
      detail: 'Highest-priority items are listed in the Priority Actions section below.'
    });
  }

  // Key findings
  const findingCandidates = [
    ...narrative.keyIssues,
    metrics.gpGap > 0
      ? `Gross profit is currently ${metrics.gpGap.toFixed(1)} points below target, indicating immediate margin leakage.`
      : '',
    metrics.weeklyWasteLoss > 0
      ? `Waste controls are costing approximately ${formatCurrencyShort(metrics.weeklyWasteLoss)} per week.`
      : '',
    metrics.criticalMissingControls > 0
      ? `${metrics.criticalMissingControls} critical control ${metrics.criticalMissingControls === 1 ? 'check remains' : 'checks remain'} open and should be closed urgently.`
      : ''
  ]
    .map(item => clean(item))
    .filter(item => isMeaningful(item));
  const keyFindings = Array.from(new Set(findingCandidates)).slice(0, 6);

  // Priority actions
  const actionLines = topActions
    .map(item => {
      const parts = [clean(item.title)];
      if (isMeaningful(item.owner)) parts.push(`Owner: ${clean(item.owner)}`);
      if (isMeaningful(item.dueDate)) parts.push(`Due: ${clean(item.dueDate)}`);
      if (isMeaningful(item.impact)) parts.push(clean(item.impact));
      return parts.join(' — ');
    })
    .filter(line => isMeaningful(line));

  const fallbackActionLines = [...narrative.quickWins, ...narrative.actionPlan30To90Days]
    .map(line => clean(line))
    .filter(line => isMeaningful(line))
    .slice(0, 4);

  // Next steps
  const nextSteps = [
    clean(narrative.followUpRecommendation),
    isMeaningful(audit.nextVisit) ? `Next visit: ${clean(audit.nextVisit)}` : '',
    actionLines.length
      ? 'Priority actions should be reviewed weekly with ownership and completion status confirmed each cycle.'
      : 'Agree ownership and due dates for priority actions, then review progress at the next scheduled checkpoint.'
  ].filter(line => isMeaningful(line));

  // Sparse data note
  const sparseSignals = [
    keyFindings.length <= 1,
    actionLines.length === 0,
    metrics.totalWeeklyOpportunity <= 0 && metrics.weeklyWasteLoss <= 0
  ].filter(Boolean).length;
  const sparseNote =
    sparseSignals >= 2
      ? 'This summary reflects a light data capture in the current draft. The portal report keeps the full register available so additional observations can be added before final client issue.'
      : '';

  // Meta rows: h1 already shows site name, so meta only carries location/date/consultant
  const metaRowsHtml = isMeaningful(locationVal)
    ? `<tr>
        <td><span class="ks-meta-label">Location</span><span class="ks-meta-value">${escapeHtml(locationVal)}</span></td>
        <td><span class="ks-meta-label">Prepared</span><span class="ks-meta-value">${escapeHtml(preparedDate)}</span></td>
      </tr>
      <tr>
        <td><span class="ks-meta-label">Consultant</span><span class="ks-meta-value">${escapeHtml(consultant)}</span></td>
        <td></td>
      </tr>`
    : `<tr>
        <td><span class="ks-meta-label">Prepared</span><span class="ks-meta-value">${escapeHtml(preparedDate)}</span></td>
        <td><span class="ks-meta-label">Consultant</span><span class="ks-meta-value">${escapeHtml(consultant)}</span></td>
      </tr>`;

  const metricsStripHtml = coverMetrics.length
    ? `<table class="ks-metrics-table" role="presentation">
        <tr>
          ${coverMetrics.map(m => `<td><span class="ks-metric-label">${escapeHtml(m.label)}</span><span class="ks-metric-value">${escapeHtml(m.value)}</span></td>`).join('')}
        </tr>
      </table>`
    : '';

  const kpiTableHtml = kpis.length
    ? `<table class="ks-kpi-table" role="presentation">
        ${kpis.map(k => `<tr>
          <td class="ks-kpi-label-cell">${escapeHtml(k.label)}</td>
          <td class="ks-kpi-value-cell">${escapeHtml(k.value)}${k.detail ? `<span class="ks-kpi-detail">${escapeHtml(k.detail)}</span>` : ''}</td>
        </tr>`).join('')}
      </table>`
    : '';

  return `${STYLES}
<div class="ks-pdf">

  <table class="ks-masthead" role="presentation">
    <tr>
      <td>
        <div class="ks-brand">The Final Check</div>
        <div class="ks-brand-tag">Hospitality Consultancy</div>
      </td>
      <td style="text-align:right;vertical-align:bottom;">
        <div class="ks-doc-type">Kitchen Profit Audit</div>
      </td>
    </tr>
  </table>

  <h1 class="ks-site-name">${escapeHtml(siteName)}</h1>
  <p class="ks-byline">${escapeHtml(preparedDate)} &middot; ${escapeHtml(consultant)}</p>
  <p class="ks-positioning">A concise executive summary of margin performance, operational findings, and immediate management priorities.</p>

  <table class="ks-meta-table" role="presentation">
    ${metaRowsHtml}
  </table>

  ${metricsStripHtml}

  <div class="ks-section">
    <h2 class="ks-section-heading">Executive Summary</h2>
    <p>${escapeHtml(executiveSummary)}</p>
    ${kpiTableHtml}
  </div>

  <div class="ks-section">
    <h2 class="ks-section-heading">Key Findings</h2>
    ${keyFindings.length
      ? renderList(keyFindings)
      : '<div class="ks-fallback">The current review indicates no critical variances at this stage. Continue weekly control checks and capture additional evidence in the portal report for final issue.</div>'
    }
  </div>

  <div class="ks-section">
    <h2 class="ks-section-heading">Priority Actions</h2>
    ${actionLines.length
      ? renderOrderedList(actionLines)
      : fallbackActionLines.length
        ? `<div class="ks-fallback">No formal action register has been finalised yet. Recommended immediate focus:</div>${renderList(fallbackActionLines)}`
        : '<div class="ks-fallback">No formal action register has been finalised yet. Confirm owner-led actions during the next management review and capture them in the portal report.</div>'
    }
  </div>

  <div class="ks-section">
    <h2 class="ks-section-heading">Next Steps</h2>
    ${renderList(nextSteps.slice(0, 4))}
  </div>

  ${sparseNote ? `<p class="ks-note">${escapeHtml(sparseNote)}</p>` : ''}

</div>`;
}

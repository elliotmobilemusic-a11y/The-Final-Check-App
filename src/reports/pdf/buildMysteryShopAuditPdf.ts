import type { AuditActionItem, MysteryShopAuditState } from '../../types';
import { safe } from '../../lib/utils';
import { escapeHtml, normalizeProseText } from './buildPdfDocumentHtml';

const STYLES = `<style>
  .ks-pdf {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    color: #23211f;
    line-height: 1.5;
    padding: 14mm 18mm;
    max-width: none;
    box-sizing: border-box;
  }
  .ks-masthead { width: 100%; border-collapse: collapse; table-layout: fixed; border-bottom: 2px solid #23211f; margin-bottom: 18px; }
  .ks-masthead td { padding: 0 0 8px; vertical-align: bottom; }
  .ks-masthead td:last-child { text-align: right; }
  .ks-brand { font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #23211f; }
  .ks-brand-tag { font-size: 11px; color: #7a7067; letter-spacing: 0.03em; margin-top: 1px; }
  .ks-doc-type { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7a7067; }
  .ks-site-name { font-size: 27px; font-weight: 700; color: #1e1b18; margin: 0 0 3px; letter-spacing: -0.015em; }
  .ks-byline { font-size: 13px; color: #7a7067; margin: 0 0 8px; }
  .ks-positioning { font-size: 13px; color: #504840; margin: 0 0 14px; }
  .ks-meta-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 0; }
  .ks-meta-table td { width: 50%; padding: 8px 12px 0 0; vertical-align: top; border-top: 1px solid rgba(84, 72, 56, 0.18); }
  .ks-meta-table td:last-child { padding-right: 0; }
  .ks-meta-label { display: block; font-size: 10px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: #7a7067; margin-bottom: 2px; }
  .ks-meta-value { font-size: 13px; font-weight: 600; color: #2f2a25; }
  .ks-metrics-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 18px; border-top: 1px solid rgba(84, 72, 56, 0.18); border-bottom: 1px solid rgba(84, 72, 56, 0.18); }
  .ks-metrics-table td { padding: 10px 12px 10px 0; vertical-align: top; }
  .ks-metrics-table td + td { border-left: 1px solid rgba(84, 72, 56, 0.14); padding-left: 12px; }
  .ks-metric-label { display: block; font-size: 10px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: #7a7067; margin-bottom: 3px; }
  .ks-metric-value { font-size: 22px; font-weight: 700; letter-spacing: -0.015em; color: #1e1b18; }
  .ks-section { margin-top: 20px; padding-top: 14px; border-top: 1px solid rgba(84, 72, 56, 0.14); }
  .ks-section-heading { font-size: 15px; font-weight: 700; color: #1e1b18; margin: 0 0 8px; letter-spacing: -0.005em; }
  .ks-section p { margin: 0 0 8px; font-size: 13px; color: #3f3a34; }
  .ks-kpi-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 10px; }
  .ks-kpi-table tr { border-bottom: 1px solid rgba(84, 72, 56, 0.1); }
  .ks-kpi-table tr:last-child { border-bottom: none; }
  .ks-kpi-label-cell { width: 55%; padding: 7px 12px 7px 0; vertical-align: top; color: #7a7067; font-size: 12px; font-weight: 600; letter-spacing: 0.03em; }
  .ks-kpi-value-cell { padding: 7px 0; vertical-align: top; font-weight: 700; color: #1e1b18; font-size: 14px; }
  .ks-kpi-detail { display: block; font-size: 11px; font-weight: 400; color: #7a7067; margin-top: 1px; }
  .ks-list { margin: 0; padding-left: 18px; }
  .ks-list li { margin-bottom: 6px; font-size: 13px; color: #342f2a; line-height: 1.45; }
  .ks-list li:last-child { margin-bottom: 0; }
  .ks-ol { margin: 0; padding-left: 20px; }
  .ks-ol li { margin-bottom: 7px; font-size: 13px; color: #342f2a; line-height: 1.45; }
  .ks-ol li:last-child { margin-bottom: 0; }
  .ks-fallback { padding: 10px 13px; background: #f8f3ec; border: 1px solid rgba(115, 95, 64, 0.2); border-radius: 5px; color: #433c34; font-size: 12px; margin-top: 4px; margin-bottom: 8px; }
  .ks-note { margin-top: 22px; padding-top: 10px; border-top: 1px dashed rgba(84, 72, 56, 0.24); color: #7a7067; font-size: 11px; }
  @media print { .ks-pdf { padding: 14mm 18mm; } }
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

function computeScore(state: MysteryShopAuditState) {
  const values = Object.values(state.scorecard).filter(v => typeof v === 'number');
  const overallScore = values.length
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
    : 0;
  const grade =
    overallScore >= 8.5 ? 'Excellent' :
    overallScore >= 7   ? 'Strong'    :
    overallScore >= 5.5 ? 'Mixed'     : 'Weak';
  const standoutMoments = state.observations.filter(o => o.score >= 8).length;
  const lowMoments = state.observations.filter(o => o.score <= 5).length;
  return { overallScore, grade, standoutMoments, lowMoments };
}

export function buildMysteryShopAuditPdf(state: MysteryShopAuditState): string {
  const score = computeScore(state);
  const visitDate = safe(state.visitDate) || new Date().toISOString().split('T')[0];
  const shopper = clean(state.shopperName) || 'The Final Check';
  const siteName = clean(state.siteName) || 'Client Site';
  const locationVal = clean(state.location);

  const namedActions = sortByPriority(
    state.actionItems.filter(a => isMeaningful(a.title))
  );
  const topActions = namedActions.slice(0, 5);

  const executiveSummary =
    clean(state.overallSummary) ||
    'This mystery shop visit assesses the guest experience across arrival, service, product quality, cleanliness, atmosphere, and value.';

  // Scorecard KPI rows — 6 categories
  const scorecardLabels: [keyof typeof state.scorecard, string][] = [
    ['arrival', 'Arrival'],
    ['service', 'Service'],
    ['product', 'Product'],
    ['cleanliness', 'Cleanliness'],
    ['atmosphere', 'Atmosphere'],
    ['value', 'Value'],
  ];
  const kpis = scorecardLabels
    .filter(([key]) => typeof state.scorecard[key] === 'number')
    .map(([key, label]) => ({
      label,
      value: `${state.scorecard[key]}/10`,
    }));

  // Key findings: weak moments + recommendations + journey narrative
  const findingCandidates: string[] = [];
  state.observations
    .filter(o => o.score <= 5 && isMeaningful(o.note))
    .slice(0, 4)
    .forEach(o => {
      const area = isMeaningful(o.area) ? `${clean(o.area)}: ` : '';
      findingCandidates.push(`${area}${clean(o.touchpoint || o.note)} — scored ${o.score}/10`);
    });
  if (isMeaningful(state.firstImpression)) findingCandidates.push(clean(state.firstImpression));
  if (isMeaningful(state.serviceStory)) findingCandidates.push(clean(state.serviceStory));
  if (isMeaningful(state.foodAndDrink)) findingCandidates.push(clean(state.foodAndDrink));
  if (isMeaningful(state.cleanlinessNotes)) findingCandidates.push(clean(state.cleanlinessNotes));
  const keyFindings = Array.from(new Set(findingCandidates.filter(isMeaningful))).slice(0, 6);

  // Priority actions
  const actionLines = topActions.map(item => {
    const parts = [clean(item.title)];
    if (isMeaningful(item.owner)) parts.push(`Owner: ${clean(item.owner)}`);
    if (isMeaningful(item.dueDate)) parts.push(`Due: ${clean(item.dueDate)}`);
    if (isMeaningful(item.impact)) parts.push(clean(item.impact));
    return parts.join(' — ');
  }).filter(isMeaningful);

  const fallbackActionLines = state.focusAreas
    .map(a => isMeaningful(a.actionPlan) ? clean(a.actionPlan) : '')
    .filter(isMeaningful)
    .slice(0, 4);

  // Next steps
  const nextSteps: string[] = [];
  if (isMeaningful(state.recommendations)) nextSteps.push(clean(state.recommendations));
  if (isMeaningful(state.followUpDate)) nextSteps.push(`Follow-up visit: ${clean(state.followUpDate)}`);
  nextSteps.push(
    actionLines.length
      ? 'Priority actions should be reviewed with the management team within 14 days of this visit.'
      : 'Agree management actions against the areas highlighted and schedule a follow-up visit.'
  );

  // Meta table
  const metaRowsHtml = isMeaningful(locationVal)
    ? `<tr>
        <td><span class="ks-meta-label">Location</span><span class="ks-meta-value">${escapeHtml(locationVal)}</span></td>
        <td><span class="ks-meta-label">Visit Date</span><span class="ks-meta-value">${escapeHtml(visitDate)}</span></td>
      </tr>
      <tr>
        <td><span class="ks-meta-label">Shopper</span><span class="ks-meta-value">${escapeHtml(shopper)}</span></td>
        <td>${isMeaningful(state.visitWindow) ? `<span class="ks-meta-label">Visit Period</span><span class="ks-meta-value">${escapeHtml(clean(state.visitWindow))}</span>` : ''}</td>
      </tr>`
    : `<tr>
        <td><span class="ks-meta-label">Visit Date</span><span class="ks-meta-value">${escapeHtml(visitDate)}</span></td>
        <td><span class="ks-meta-label">Shopper</span><span class="ks-meta-value">${escapeHtml(shopper)}</span></td>
      </tr>`;

  const kpiTableHtml = kpis.length
    ? `<table class="ks-kpi-table" role="presentation">
        ${kpis.map(k => `<tr>
          <td class="ks-kpi-label-cell">${escapeHtml(k.label)}</td>
          <td class="ks-kpi-value-cell">${escapeHtml(k.value)}</td>
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
        <div class="ks-doc-type">Mystery Shop Report</div>
      </td>
    </tr>
  </table>

  <h1 class="ks-site-name">${escapeHtml(siteName)}</h1>
  <p class="ks-byline">${escapeHtml(visitDate)} &middot; ${escapeHtml(shopper)}</p>
  <p class="ks-positioning">A concise executive summary of guest experience performance, scored findings, and recommended management actions.</p>

  <table class="ks-meta-table" role="presentation">
    ${metaRowsHtml}
  </table>

  <table class="ks-metrics-table" role="presentation">
    <tr>
      <td><span class="ks-metric-label">Overall score</span><span class="ks-metric-value">${escapeHtml(`${score.overallScore}/10`)}</span></td>
      <td><span class="ks-metric-label">Grade</span><span class="ks-metric-value">${escapeHtml(score.grade)}</span></td>
      <td><span class="ks-metric-label">Weak moments</span><span class="ks-metric-value">${escapeHtml(`${score.lowMoments}`)}</span></td>
    </tr>
  </table>

  <div class="ks-section">
    <h2 class="ks-section-heading">Executive Summary</h2>
    <p>${escapeHtml(executiveSummary)}</p>
    ${kpiTableHtml}
  </div>

  <div class="ks-section">
    <h2 class="ks-section-heading">Key Findings</h2>
    ${keyFindings.length
      ? renderList(keyFindings)
      : '<div class="ks-fallback">The visit indicated a broadly positive experience with no standout concerns at this stage. Review scorecard categories for detail.</div>'
    }
  </div>

  <div class="ks-section">
    <h2 class="ks-section-heading">Priority Actions</h2>
    ${actionLines.length
      ? renderOrderedList(actionLines)
      : fallbackActionLines.length
        ? `<div class="ks-fallback">No formal action register has been finalised yet. Recommended management focus:</div>${renderList(fallbackActionLines)}`
        : '<div class="ks-fallback">No formal action register has been finalised yet. Agree management actions from the findings above and capture them in the portal report.</div>'
    }
  </div>

  <div class="ks-section">
    <h2 class="ks-section-heading">Next Steps</h2>
    ${renderList(nextSteps.slice(0, 4))}
  </div>

</div>`;
}

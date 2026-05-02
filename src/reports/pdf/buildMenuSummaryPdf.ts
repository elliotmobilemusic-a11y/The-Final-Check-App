import type { MenuProjectState } from '../../types';
import { safe } from '../../lib/utils';
import {
  buildMenuProfitSummary,
  dishActualGp,
  dishWeeklyOpportunity,
} from '../../features/profit/menuProfit';
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

function fmtPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function renderList(items: string[]): string {
  if (!items.length) return '';
  return `<ul class="ks-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderOrderedList(items: string[]): string {
  if (!items.length) return '';
  return `<ol class="ks-ol">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
}

export function buildMenuSummaryPdf(project: MenuProjectState, consultant?: string): string {
  const summary = buildMenuProfitSummary(project);
  const reviewDate = safe(project.reviewDate) || new Date().toISOString().split('T')[0];
  const consultantName = clean(consultant ?? '') || 'The Final Check';
  const menuName = clean(project.menuName) || 'Menu Review';
  const siteName = clean(project.siteName) || 'Client Site';
  const target = project.defaultTargetGp ?? 0;
  const gpGap = target > 0 && summary.weightedGp > 0 ? target - summary.weightedGp : 0;
  const totalDishes = summary.dishes.length;

  // Top opportunity dishes — sorted by weekly opportunity desc, only those with a gap
  const opportunityDishes = [...summary.dishes]
    .map(d => ({ dish: d, opp: dishWeeklyOpportunity(d), gp: dishActualGp(d) }))
    .filter(d => d.opp > 0 && isMeaningful(d.dish.name))
    .sort((a, b) => b.opp - a.opp)
    .slice(0, 5);

  const executiveSummary = totalDishes === 0
    ? 'No dishes have been costed in this menu yet. Add ingredient costs and sell prices in the workspace to generate a full commercial analysis.'
    : gpGap > 1
      ? `This menu is tracking at ${fmtPct(summary.weightedGp)} weighted GP against a target of ${fmtPct(target)} — a gap of ${fmtPct(gpGap)}. ${summary.totalOpportunity > 0 ? `An estimated ${formatCurrencyShort(summary.totalOpportunity)} per week in additional profit is recoverable through pricing corrections and recipe discipline.` : ''}`
      : summary.weightedGp > 0
        ? `This menu is performing at ${fmtPct(summary.weightedGp)} weighted GP${target > 0 ? `, on or above the ${fmtPct(target)} target` : ''}. Continue monitoring portion costs and pricing discipline to protect the margin.`
        : 'Complete ingredient costing and sell prices across the menu to enable full commercial analysis.';

  // KPI rows
  const kpis: Array<{ label: string; value: string; detail?: string }> = [];
  if (summary.weeklyRevenue > 0) {
    kpis.push({ label: 'Weekly revenue', value: formatCurrencyShort(summary.weeklyRevenue), detail: 'Based on current sell prices and volume estimates.' });
  }
  if (summary.weeklyProfit > 0) {
    kpis.push({ label: 'Weekly gross profit', value: formatCurrencyShort(summary.weeklyProfit) });
  }
  if (summary.totalOpportunity > 0) {
    kpis.push({ label: 'Weekly opportunity', value: formatCurrencyShort(summary.totalOpportunity), detail: 'Recoverable through pricing and costing corrections.' });
  }
  if (totalDishes > 0) {
    kpis.push({ label: 'Dishes costed', value: `${totalDishes}`, detail: summary.belowTargetCount > 0 ? `${summary.belowTargetCount} below GP target.` : 'All dishes on or above target.' });
  }

  // Key findings
  const findings: string[] = [];
  if (gpGap > 1) {
    findings.push(`Weighted GP of ${fmtPct(summary.weightedGp)} is ${fmtPct(gpGap)} below the ${fmtPct(target)} target, indicating active margin leakage.`);
  }
  if (summary.belowTargetCount > 0) {
    findings.push(`${summary.belowTargetCount} dish${summary.belowTargetCount !== 1 ? 'es' : ''} are priced or costed below target GP and require review.`);
  }
  if (opportunityDishes.length > 0) {
    const top = opportunityDishes[0];
    findings.push(`Highest opportunity: ${clean(top.dish.name)} — ${formatCurrencyShort(top.opp)} per week (currently ${fmtPct(top.gp)} GP).`);
  }
  if (summary.totalOpportunity > 0) {
    const annual = summary.totalOpportunity * 52;
    findings.push(`Total recoverable opportunity is ${formatCurrencyShort(summary.totalOpportunity)} per week — approximately ${formatCurrencyShort(annual)} annualised.`);
  }
  const keyFindings = findings.filter(isMeaningful).slice(0, 6);

  // Priority actions — computed from opportunity dishes
  const actionLines = opportunityDishes.map(({ dish, opp, gp }) => {
    const name = clean(dish.name);
    const section = project.sections.find(s => s.dishes.some(d => d.id === dish.id));
    const sectionLabel = section ? ` (${clean(section.name)})` : '';
    return `Review ${name}${sectionLabel} — currently ${fmtPct(gp)} GP, ${formatCurrencyShort(opp)}/week opportunity`;
  }).filter(isMeaningful);

  // Next steps
  const nextSteps: string[] = [];
  if (gpGap > 1) {
    nextSteps.push(`Prioritise costing reviews for the ${summary.belowTargetCount} dish${summary.belowTargetCount !== 1 ? 'es' : ''} below the ${fmtPct(target)} GP target.`);
  }
  nextSteps.push('Review sell prices for highest-opportunity dishes and confirm ingredient costs are up to date.');
  if (totalDishes > 0 && summary.weeklyRevenue > 0) {
    nextSteps.push('Re-run the menu analysis after pricing changes to confirm GP movement before the next menu reprint.');
  }

  // Meta
  const metaRowsHtml = isMeaningful(siteName)
    ? `<tr>
        <td><span class="ks-meta-label">Site</span><span class="ks-meta-value">${escapeHtml(siteName)}</span></td>
        <td><span class="ks-meta-label">Review Date</span><span class="ks-meta-value">${escapeHtml(reviewDate)}</span></td>
      </tr>
      <tr>
        <td><span class="ks-meta-label">Consultant</span><span class="ks-meta-value">${escapeHtml(consultantName)}</span></td>
        <td></td>
      </tr>`
    : `<tr>
        <td><span class="ks-meta-label">Review Date</span><span class="ks-meta-value">${escapeHtml(reviewDate)}</span></td>
        <td><span class="ks-meta-label">Consultant</span><span class="ks-meta-value">${escapeHtml(consultantName)}</span></td>
      </tr>`;

  const kpiTableHtml = kpis.length
    ? `<table class="ks-kpi-table" role="presentation">
        ${kpis.map(k => `<tr>
          <td class="ks-kpi-label-cell">${escapeHtml(k.label)}</td>
          <td class="ks-kpi-value-cell">${escapeHtml(k.value)}${k.detail ? `<span class="ks-kpi-detail">${escapeHtml(k.detail)}</span>` : ''}</td>
        </tr>`).join('')}
      </table>`
    : '';

  const coverGpValue = summary.weightedGp > 0 ? fmtPct(summary.weightedGp) : '—';
  const coverProfitValue = summary.weeklyProfit > 0 ? formatCurrencyShort(summary.weeklyProfit) : '—';
  const coverBelowValue = totalDishes > 0 ? `${summary.belowTargetCount}` : '—';

  return `${STYLES}
<div class="ks-pdf">

  <table class="ks-masthead" role="presentation">
    <tr>
      <td>
        <div class="ks-brand">The Final Check</div>
        <div class="ks-brand-tag">Hospitality Consultancy</div>
      </td>
      <td style="text-align:right;vertical-align:bottom;">
        <div class="ks-doc-type">Menu Profit Review</div>
      </td>
    </tr>
  </table>

  <h1 class="ks-site-name">${escapeHtml(menuName)}</h1>
  <p class="ks-byline">${escapeHtml(reviewDate)} &middot; ${escapeHtml(consultantName)}</p>
  <p class="ks-positioning">A concise commercial summary of menu GP performance, costing gaps, and immediate pricing priorities.</p>

  <table class="ks-meta-table" role="presentation">
    ${metaRowsHtml}
  </table>

  <table class="ks-metrics-table" role="presentation">
    <tr>
      <td><span class="ks-metric-label">Weighted GP</span><span class="ks-metric-value">${escapeHtml(coverGpValue)}</span></td>
      <td><span class="ks-metric-label">Weekly profit</span><span class="ks-metric-value">${escapeHtml(coverProfitValue)}</span></td>
      <td><span class="ks-metric-label">Below target</span><span class="ks-metric-value">${escapeHtml(coverBelowValue)}</span></td>
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
      : '<div class="ks-fallback">Complete ingredient costing and sell prices across the menu to generate findings. The portal report shows per-dish GP once costs are entered.</div>'
    }
  </div>

  <div class="ks-section">
    <h2 class="ks-section-heading">Priority Actions</h2>
    ${actionLines.length
      ? renderOrderedList(actionLines)
      : '<div class="ks-fallback">No below-target dishes identified yet. Ensure all dishes have ingredient costs and sell prices entered to enable opportunity analysis.</div>'
    }
  </div>

  <div class="ks-section">
    <h2 class="ks-section-heading">Next Steps</h2>
    ${renderList(nextSteps.slice(0, 4))}
  </div>

</div>`;
}

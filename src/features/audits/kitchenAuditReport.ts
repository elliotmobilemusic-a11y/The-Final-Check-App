import {
  buildPdfDocumentHtml,
  buildReportCoverHtml,
  escapeHtml,
  formatCurrencyShort,
  humanizeSentence,
  humanizeTitle,
  normalizeProseText,
  normalizeTitleLabel
} from '../../reports/pdf';
import type { AuditActionItem, AuditFormState, AuditPhoto } from '../../types';
import { fmtCurrency, fmtPercent, lines, num, safe } from '../../lib/utils';
import { renderAuditPhotoGallery } from '../../lib/photoEvidence';
import { buildKitchenProfitNarrative } from '../profit/kitchenProfit';
import { calculateAudit } from './kitchenAuditHelpers';

const KITCHEN_AUDIT_DELIVERABLE_STYLES = `
<style>
  /* =================================================================
     KITCHEN PROFIT AUDIT — PREMIUM REPORT STYLES
     Scoped to .kitchen-audit-deliverable
     ================================================================= */

  .kitchen-audit-deliverable {
    --profit-gap-xs: 6px;
    --profit-gap-sm: 10px;
    --profit-gap-md: 14px;
    color: inherit;
  }

  /* ================================================================
     COVER PAGE
     Layout: brand bar → hero (flex:1, content centred) → metrics → details
     ================================================================ */

  /* Keep full A4 height; flow from top (no space-between gaps) */
  .kitchen-audit-deliverable .pdf-cover-page {
    min-height: 270mm;
    justify-content: flex-start;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .kitchen-audit-deliverable .pdf-cover-top-bar {
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(127, 82, 33, 0.22);
  }

  /* Hero: takes all remaining space, content vertically centred */
  .kitchen-audit-deliverable .pdf-cover-hero {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    flex: 1;
    min-height: 0;
    gap: 0;
    margin-top: 0;
    padding: 0;
  }

  /* Flat editorial block — no card treatment */
  .kitchen-audit-deliverable .pdf-cover-hero-main {
    display: grid;
    gap: 10px;
    max-width: 142mm;
    padding: 0;
    border: none;
    border-radius: 0;
    background: none;
    box-shadow: none;
    justify-items: start;
    text-align: left;
    margin: 0;
  }

  /* Vertical rule: hidden in this layout */
  .kitchen-audit-deliverable .pdf-cover-hero-rule {
    display: none;
  }

  /* Aside: "Prepared for operational leadership / Confidential" — shown
     below summary with a thin warm separator */
  .kitchen-audit-deliverable .pdf-cover-hero-aside {
    display: grid;
    gap: 3px;
    max-width: 142mm;
    margin-top: 8mm;
    padding-top: 6mm;
    border-top: 1px solid rgba(127, 82, 33, 0.14);
  }

  .kitchen-audit-deliverable .pdf-cover-hero-aside span {
    font-size: 6.8pt;
    font-weight: 800;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: rgba(127, 82, 33, 0.6);
  }

  .kitchen-audit-deliverable .pdf-cover-hero-aside strong {
    font-size: 9pt;
    font-weight: 500;
    color: var(--pdf-muted-strong);
  }

  /* Report type kicker: flat underline, no pill */
  .kitchen-audit-deliverable .pdf-cover-report-type {
    padding: 0 0 7px;
    border: none;
    border-bottom: 1px solid rgba(127, 82, 33, 0.28);
    border-radius: 0;
    background: none;
    color: var(--pdf-accent-strong);
    font-size: 7.5pt;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  /* Large serif client name */
  .kitchen-audit-deliverable .pdf-cover-client-title {
    max-width: 14ch;
    margin: 6px 0 0;
    font-size: 46pt;
    line-height: 0.95;
    letter-spacing: -0.045em;
    text-align: left;
    font-weight: 600;
  }

  /* One-sentence summary */
  .kitchen-audit-deliverable .pdf-cover-summary {
    max-width: 122mm;
    margin: 2px 0 0;
    text-align: left;
    font-size: 10.5pt;
    line-height: 1.65;
    color: var(--pdf-ink-soft);
  }

  /* Metrics band: sits flush below hero with warm separator */
  .kitchen-audit-deliverable .pdf-cover-metrics {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1.35fr repeat(2, minmax(0, 1fr));
    max-width: none;
    width: 100%;
    gap: 10px;
    margin: 0;
    padding-top: 5mm;
    border-top: 1px solid rgba(127, 82, 33, 0.18);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .kitchen-audit-deliverable .pdf-cover-metric {
    min-height: 18mm;
    padding: 8px 11px 10px;
    border-radius: 8px;
    box-shadow: none;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .kitchen-audit-deliverable .pdf-cover-metric.primary {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .kitchen-audit-deliverable .pdf-cover-metric-value {
    font-size: 18pt;
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }

  /* Engagement details: compact grid at bottom */
  .kitchen-audit-deliverable .pdf-cover-details-band {
    flex: 0 0 auto;
    margin-top: 5mm;
    padding: 4mm 0 0;
    border-top: 1px solid rgba(127, 82, 33, 0.13);
  }

  .kitchen-audit-deliverable .pdf-cover-detail {
    padding: 7px 10px 8px;
    border-radius: 6px;
    box-shadow: none;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ================================================================
     BODY CHAPTERS
     ================================================================ */

  .kitchen-audit-deliverable .report-chapter {
    gap: 16px;
    padding: 14mm 15mm 16mm;
    min-height: auto;
  }

  .kitchen-audit-deliverable .report-chapter-break {
    break-before: page;
    page-break-before: always;
  }

  .kitchen-audit-primary-reading .report-chapter:first-child {
    break-before: page;
    page-break-before: always;
  }

  .kitchen-audit-deliverable .report-chapter-header {
    gap: 5px;
    padding-bottom: 10px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .kitchen-audit-primary-reading .report-chapter-header h2 {
    font-size: 24px;
    letter-spacing: -0.04em;
  }

  .kitchen-audit-deliverable .report-chapter-header p,
  .kitchen-audit-deliverable .report-section-header p {
    font-size: 10.5px;
    line-height: 1.6;
    color: var(--pdf-muted-strong);
  }

  /* ================================================================
     EXECUTIVE SUMMARY
     ================================================================ */

  .kitchen-audit-exec-lead {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .kitchen-audit-exec-body {
    font-size: 11pt;
    line-height: 1.72;
    color: var(--pdf-ink-soft);
    max-width: 90ch;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .kitchen-audit-exec-body p {
    margin: 0;
  }

  /* ================================================================
     SECTION BLOCKS
     ================================================================ */

  .kitchen-audit-deliverable .report-section-block {
    gap: 10px;
  }

  .kitchen-audit-deliverable .report-section-block + .report-section-block {
    margin-top: 12px;
  }

  .kitchen-audit-deliverable .report-section-header h3 {
    font-size: 14px;
    letter-spacing: -0.015em;
  }

  /* ================================================================
     COMMERCIAL SNAPSHOT — METRIC GRID
     These classes are kitchen-audit-only; full base styles are defined here.
     ================================================================ */

  .kitchen-audit-deliverable .report-metric-grid {
    display: grid;
    gap: 8px;
    margin-top: 6px;
  }

  .kitchen-audit-deliverable .report-metric-grid-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .kitchen-audit-deliverable .report-metric-card {
    display: grid;
    gap: 2px;
    padding: 10px 12px 11px;
    border: 1px solid rgba(127, 82, 33, 0.13);
    border-radius: 8px;
    background: #fdf9f5;
    box-shadow: none;
    page-break-inside: avoid;
    break-inside: avoid-page;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Label below value */
  .kitchen-audit-deliverable .report-metric-card span {
    display: block;
    order: 2;
    margin-top: 3px;
    color: var(--pdf-muted);
    font-size: 6.8pt;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    line-height: 1.28;
  }

  /* Value above label */
  .kitchen-audit-deliverable .report-metric-card strong {
    display: block;
    order: 1;
    font-size: 15px;
    font-weight: 700;
    color: var(--pdf-ink);
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  /* Primary emphasis card — weekly / annual opportunity */
  .kitchen-audit-deliverable .report-metric-card-primary {
    background: linear-gradient(180deg, #fff9ef 0%, #f7eddf 100%);
    border-color: rgba(127, 82, 33, 0.28);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .kitchen-audit-deliverable .report-metric-card-primary strong {
    font-size: 17px;
    color: var(--pdf-accent-strong);
  }

  /* ================================================================
     STORY CARDS (findings / observations)
     ================================================================ */

  .kitchen-audit-deliverable .report-story-card {
    padding: 11px 12px 12px;
    border: 1px solid rgba(127, 82, 33, 0.12);
    border-radius: 8px;
    background: #fdfbf7;
    box-shadow: none;
    page-break-inside: avoid;
    break-inside: avoid-page;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .kitchen-audit-deliverable .report-story-card h3 {
    font-size: 12.5px;
    margin-bottom: 6px;
  }

  .kitchen-audit-deliverable .muted-copy,
  .kitchen-audit-deliverable .report-story-card p,
  .kitchen-audit-deliverable .report-story-card li {
    font-size: 9.4pt;
    line-height: 1.52;
  }

  /* ================================================================
     TABLES
     ================================================================ */

  .kitchen-audit-deliverable .report-table {
    margin-top: 6px;
    border-radius: 6px;
    font-size: 8.8pt;
    box-shadow: none;
  }

  .kitchen-audit-deliverable .report-table th,
  .kitchen-audit-deliverable .report-table td {
    padding: 7px 9px;
  }

  .kitchen-audit-deliverable .report-table th {
    font-size: 7pt;
    letter-spacing: 0.1em;
  }

  /* Priority column in action plan: slightly bolder */
  .kitchen-audit-final-actions-table td:first-child {
    font-weight: 600;
    font-size: 8.2pt;
  }

  /* ================================================================
     PRIORITY ACTIONS LIST
     ================================================================ */

  .kitchen-audit-priority-actions-list {
    display: grid;
    gap: 7px;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .kitchen-audit-priority-actions-list li {
    padding: 9px 12px 10px;
    border: 1px solid rgba(115, 95, 64, 0.15);
    border-radius: 7px;
    background: #fdfaf6;
    break-inside: avoid;
    page-break-inside: avoid;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .kitchen-audit-priority-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--pdf-muted);
    margin-top: 3px;
  }

  .kitchen-audit-priority-meta span + span::before {
    content: "·";
    margin-right: 6px;
    opacity: 0.6;
  }

  /* ================================================================
     PHOTO EVIDENCE
     ================================================================ */

  .kitchen-audit-evidence-grid {
    display: grid;
    gap: 10px;
  }

  .kitchen-audit-food-offer {
    display: grid;
    gap: 8px;
  }

  .kitchen-audit-deliverable .report-photo-section {
    gap: 7px;
    padding-top: 0;
    border-top: 0;
  }

  .kitchen-audit-deliverable .report-photo-grid {
    gap: 8px;
  }

  .kitchen-audit-deliverable .report-photo-card {
    border-radius: 8px;
    box-shadow: none;
  }

  .kitchen-audit-deliverable .report-photo-card img {
    height: 38mm;
  }

  .kitchen-audit-deliverable .report-photo-grid-featured .report-photo-card:first-child img {
    height: 48mm;
  }

  .kitchen-audit-deliverable .report-photo-card figcaption {
    padding: 7px 8px 8px;
  }

  .kitchen-audit-deliverable .report-photo-card figcaption strong {
    font-size: 10px;
  }

  .kitchen-audit-deliverable .report-photo-card figcaption span {
    font-size: 9px;
  }

  /* ================================================================
     APPENDIX / CONTROLS REGISTER
     ================================================================ */

  .kitchen-audit-appendix {
    margin-top: 0;
    padding: 0;
    border-top: 2px solid rgba(115, 95, 64, 0.22);
    background: #fff;
  }

  .kitchen-audit-appendix-banner {
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #7b6b54;
    font-weight: 700;
    margin: 14mm 15mm -7mm;
  }

  .kitchen-audit-appendix .report-chapter-header h2 {
    font-size: 1.28rem;
    color: #5a554d;
  }

  .kitchen-audit-appendix .report-chapter-header p {
    color: #6c655c;
  }

  .kitchen-audit-appendix .report-section-header h3 {
    font-size: 1.02rem;
    color: #5c5752;
  }

  .kitchen-audit-appendix .report-table {
    font-size: 0.88rem;
  }

  .kitchen-audit-appendix .report-story-card h3 {
    font-size: 1rem;
  }

  /* ================================================================
     PRINT
     ================================================================ */

  @media print {
    .kitchen-audit-deliverable .pdf-cover-page {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .kitchen-audit-appendix {
      background: #faf8f4 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .kitchen-audit-deliverable .kitchen-audit-appendix {
      break-before: page;
      page-break-before: always;
    }

    .kitchen-audit-deliverable .report-metric-card,
    .kitchen-audit-deliverable .report-metric-card-primary,
    .kitchen-audit-deliverable .report-story-card,
    .kitchen-audit-deliverable .pdf-cover-metric,
    .kitchen-audit-deliverable .pdf-cover-detail,
    .kitchen-audit-priority-actions-list li {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style>`;

function sortAuditActionsByPriority(items: AuditActionItem[]) {
  const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  return [...items].sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
}

export function buildKitchenAuditReportHtml(state: AuditFormState) {
  const calc = calculateAudit(state);
  const narrative = buildKitchenProfitNarrative(state, calc);

  const hasMeaningfulText = (value: unknown) => {
    const text = normalizeProseText(safe(value));
    if (!text) return false;
    const lower = text.toLowerCase().replace(/[.!]+$/g, '').trim();
    const blocked = [
      'not recorded',
      'not set',
      'n/a',
      'na',
      'none',
      'unknown',
      'tbc',
      'to be confirmed',
      'no note recorded',
      'no impact note',
      'untitled action',
      'unnamed control',
      'general',
      'unspecified item',
      'unspecified category',
      'evidence photo',
      'owner tbc',
      'not assigned',
      'all of the above'
    ];
    return (
      !blocked.includes(lower) &&
      !/^no .+ recorded$/.test(lower) &&
      !/^no .+ yet$/.test(lower) &&
      !/^add .+ before/.test(lower)
    );
  };

  const hasMeaningfulNumber = (value: unknown, allowZero = false) => {
    const amount = num(value);
    return Number.isFinite(amount) && (allowZero ? amount >= 0 : amount > 0);
  };
  const nonEmptyLines = (items: string[]) =>
    Array.from(new Set(items.map((item) => normalizeProseText(item)).filter(hasMeaningfulText)));
  const cleanCopy = (value: unknown) => escapeHtml(normalizeProseText(safe(value)));
  const renderList = (items: string[]) =>
    nonEmptyLines(items).length
      ? `<ul>${nonEmptyLines(items).map((item) => `<li>${cleanCopy(item)}</li>`).join('')}</ul>`
      : '';

  const renderMetric = (
    label: string,
    value: string,
    emphasis: 'default' | 'primary' = 'default'
  ) =>
    hasMeaningfulText(value)
      ? `
        <div class="report-metric-card report-metric-card-${emphasis}">
          <span>${escapeHtml(humanizeTitle(label))}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `
      : '';

  const renderSection = (title: string, body: string, lead?: string) =>
    body.trim()
      ? `
        <article class="report-section-block">
          <div class="report-section-header">
            <h3>${escapeHtml(humanizeTitle(title))}</h3>
            ${hasMeaningfulText(lead) ? `<p>${escapeHtml(humanizeSentence(lead))}</p>` : ''}
          </div>
          ${body}
        </article>
      `
      : '';

  const renderStory = (title: string, body: string) =>
    body.trim()
      ? `
        <div class="report-story-card">
          <h3>${escapeHtml(humanizeTitle(title))}</h3>
          ${body}
        </div>
      `
      : '';

  const renderTable = (headers: string[], rows: string[], colWidths: string[]) =>
    rows.length
      ? `
        <table class="report-table report-table-tight">
          <colgroup>
            ${colWidths.map((width) => `<col style="width: ${escapeHtml(width)}" />`).join('')}
          </colgroup>
          <thead>
            <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
          </thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      `
      : '';

  const renderPhotoGallery = (section: string, emptyCopy = '') =>
    renderAuditPhotoGallery(state.photos, section, emptyCopy);

  const hasPhotos = (section: string) =>
    state.photos.some((photo: AuditPhoto) => photo.section === section && hasMeaningfulText(photo.imageDataUrl));

  const hasCommercialSignal =
    hasMeaningfulNumber(state.weeklySales) ||
    hasMeaningfulNumber(state.weeklyFoodCost) ||
    hasMeaningfulNumber(calc.weeklyWasteLoss) ||
    hasMeaningfulNumber(calc.labourOpportunityValue) ||
    hasMeaningfulNumber(calc.totalPortionLoss) ||
    hasMeaningfulNumber(calc.totalWeeklyOpportunity) ||
    (hasMeaningfulNumber(state.weeklySales) && hasMeaningfulNumber(state.targetGp));
  const hasMeaningfulControlEvidence = state.controlChecks.some(
    (item) =>
      item.status !== 'N/A' &&
      (item.status === 'Missing' || hasMeaningfulText(item.note)) &&
      hasMeaningfulText(item.label)
  );

  const pageTwoMetrics = [
    state.weeklySales > 0 ? renderMetric('Weekly food sales', fmtCurrency(state.weeklySales)) : '',
    state.weeklyFoodCost > 0 ? renderMetric('Weekly food cost', fmtCurrency(state.weeklyFoodCost)) : '',
    state.weeklySales > 0 && state.targetGp > 0 ? renderMetric('Target GP', fmtPercent(state.targetGp)) : '',
    state.weeklySales > 0 ? renderMetric('Actual GP', fmtPercent(calc.actualGp)) : '',
    calc.gpGap > 0 ? renderMetric('GP gap', `${calc.gpGap.toFixed(1)}%`) : '',
    calc.weeklyWasteLoss > 0 ? renderMetric('Weekly waste loss', fmtCurrency(calc.weeklyWasteLoss)) : '',
    calc.labourOpportunityValue > 0 ? renderMetric('Labour opportunity', fmtCurrency(calc.labourOpportunityValue)) : '',
    calc.totalPortionLoss > 0 ? renderMetric('Portion opportunity', fmtCurrency(calc.totalPortionLoss)) : '',
    calc.totalWeeklyOpportunity > 0
      ? renderMetric('Weekly profit opportunity', fmtCurrency(calc.totalWeeklyOpportunity), 'primary')
      : '',
    calc.totalAnnualOpportunity > 0 ? renderMetric('Annual opportunity', fmtCurrency(calc.totalAnnualOpportunity)) : '',
    hasMeaningfulControlEvidence ? renderMetric('Control compliance', `${Math.round(calc.controlScore)}%`) : ''
  ]
    .filter(Boolean)
    .join('');

  const hasNarrativeSignal =
    hasCommercialSignal ||
    hasMeaningfulText(state.systems) ||
    hasMeaningfulText(state.cultureLeadership) ||
    hasMeaningfulText(state.foodQuality) ||
    hasMeaningfulText(state.layoutIssues) ||
    hasMeaningfulText(state.layoutImpact) ||
    hasMeaningfulText(state.equipmentNeeds);

  const typedQuickWins = nonEmptyLines(lines(state.quickWins));
  const typedPriorityActions = nonEmptyLines(lines(state.priorityActions));
  const typedLongTerm = nonEmptyLines(lines(state.longTermStrategy));
  const quickWinsHtml = renderList(typedQuickWins.length ? typedQuickWins : hasNarrativeSignal ? narrative.quickWins : []);
  const actionPlanItems = typedLongTerm.length
    ? typedLongTerm
    : hasNarrativeSignal
      ? narrative.actionPlan30To90Days
      : [];
  const actionPlanHtml = renderList(actionPlanItems);
  const followUpParagraphs = [
    hasNarrativeSignal && hasMeaningfulText(narrative.followUpRecommendation)
      ? `<p>${cleanCopy(narrative.followUpRecommendation)}</p>`
      : '',
    hasMeaningfulText(state.nextVisit) ? `<p><strong>Next visit:</strong> ${cleanCopy(state.nextVisit)}</p>` : ''
  ]
    .filter(Boolean)
    .join('');
  const followUpHtml = followUpParagraphs;

  const controlsTableRows = state.controlChecks
    .filter(
      (item) =>
        item.status !== 'N/A' &&
        (item.status === 'Missing' || hasMeaningfulText(item.note)) &&
        hasMeaningfulText(item.label)
    )
    .map(
      (item) => `
        <tr>
          <td>${hasMeaningfulText(item.category) ? cleanCopy(item.category) : ''}</td>
          <td>${hasMeaningfulText(item.label) ? cleanCopy(item.label) : ''}</td>
          <td>${escapeHtml(item.status)}</td>
          <td>${hasMeaningfulText(item.note) ? cleanCopy(item.note) : ''}</td>
        </tr>
      `
    );

  const wasteRows = state.wasteItems
    .filter(
      (item) =>
        hasMeaningfulText(item.item) ||
        hasMeaningfulNumber(item.cost) ||
        hasMeaningfulText(item.cause) ||
        hasMeaningfulText(item.fix)
    )
    .map((item) => `
      <tr>
        <td>${hasMeaningfulText(item.item) ? cleanCopy(item.item) : ''}</td>
        <td>${num(item.cost) > 0 ? fmtCurrency(num(item.cost)) : ''}</td>
        <td>${hasMeaningfulText(item.cause) ? cleanCopy(item.cause) : ''}</td>
        <td>${hasMeaningfulText(item.fix) ? cleanCopy(item.fix) : ''}</td>
      </tr>
    `);

  const portionRows = state.portionItems
    .filter(
      (item) =>
        hasMeaningfulText(item.dish) ||
        hasMeaningfulNumber(item.loss) ||
        hasMeaningfulText(item.issue) ||
        hasMeaningfulText(item.fix)
    )
    .map((item) => `
      <tr>
        <td>${hasMeaningfulText(item.dish) ? cleanCopy(item.dish) : ''}</td>
        <td>${num(item.loss) > 0 ? fmtCurrency(num(item.loss)) : ''}</td>
        <td>${hasMeaningfulText(item.issue) ? cleanCopy(item.issue) : ''}</td>
        <td>${hasMeaningfulText(item.fix) ? cleanCopy(item.fix) : ''}</td>
      </tr>
    `);

  const orderingRows = state.orderingItems
    .filter(
      (item) =>
        hasMeaningfulText(item.category) ||
        hasMeaningfulText(item.problem) ||
        hasMeaningfulText(item.impact) ||
        hasMeaningfulText(item.fix)
    )
    .map((item) => `
      <tr>
        <td>${hasMeaningfulText(item.category) ? cleanCopy(item.category) : ''}</td>
        <td>${hasMeaningfulText(item.problem) ? cleanCopy(item.problem) : ''}</td>
        <td>${hasMeaningfulText(item.impact) ? cleanCopy(item.impact) : ''}</td>
        <td>${hasMeaningfulText(item.fix) ? cleanCopy(item.fix) : ''}</td>
      </tr>
    `);

  const findingsCards = [
    renderStory(
      'Systems',
      [
        hasMeaningfulText(state.systems) ? `<p>${cleanCopy(state.systems)}</p>` : '',
        controlsTableRows.length
          ? `<p class="muted-copy">Control compliance currently sits at ${Math.round(calc.controlScore)}%, with the register below capturing the named evidence points for follow-up.</p>`
          : ''
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

  const controlsTable = renderTable(
    ['Category', 'Control', 'Status', 'What Is Happening and Why?'],
    controlsTableRows,
    ['16%', '30%', '12%', '42%']
  );
  const controlsChapterBody = [controlsTable, renderPhotoGallery('controls')].filter(Boolean).join('');

  const findingsChapterBody = [
    wasteRows.length
      ? renderSection(
          'Cost Control',
          renderTable(
            ['Loss Area', 'Weekly Loss', 'What Is Happening and Why?', 'What Needs to Change Immediately?'],
            wasteRows,
            ['24%', '14%', '31%', '31%']
          ),
          'Waste lines that are currently leaking margin and the immediate correction required.'
        )
      : '',
    portionRows.length
      ? renderSection(
          'Portion Control',
          renderTable(
            ['Dish', 'Weekly Loss', 'What Is Happening and Why?', 'What Needs to Change Immediately?'],
            portionRows,
            ['24%', '14%', '31%', '31%']
          ),
          'Portion inconsistencies affecting gross profit and how to correct them.'
        )
      : '',
    orderingRows.length
      ? renderSection(
          'Ordering and Stock Control',
          renderTable(
            ['Area', 'What Is Happening and Why?', 'Commercial Impact', 'Immediate Change'],
            orderingRows,
            ['18%', '30%', '26%', '26%']
          ),
          'Ordering and operating issues that are driving avoidable cost or service risk.'
        )
      : '',
    findingsCards
      ? renderSection(
          'Consultancy Observations',
          `<div class="report-story-grid report-story-grid-editorial">${findingsCards}</div>`,
          'Operational context to support the commercial recommendations and follow-up plan.'
        )
      : ''
  ]
    .filter(Boolean)
    .join('');

  const renderChapter = (kicker: string, title: string, lead: string, body: string) =>
    body.trim()
      ? `
        <section class="report-chapter report-chapter-break">
          <div class="report-chapter-header">
            <p class="report-chapter-kicker">${escapeHtml(normalizeTitleLabel(kicker))}</p>
            <h2>${escapeHtml(normalizeTitleLabel(title))}</h2>
            ${hasMeaningfulText(lead) ? `<p>${escapeHtml(humanizeSentence(lead))}</p>` : ''}
          </div>
          ${body}
        </section>
      `
      : '';

  const namedActions = state.actionItems.filter((item) => hasMeaningfulText(item.title));
  const topNamedActions = sortAuditActionsByPriority(namedActions).slice(0, 5);
  const structuredActionTitles = new Set(topNamedActions.map((item) => normalizeProseText(item.title).toLowerCase()));
  const typedPriorityOnly = typedPriorityActions.filter(
    (item) => !structuredActionTitles.has(normalizeProseText(item).toLowerCase())
  );
  const hasActionOwnerTiming = topNamedActions.some((item) => hasMeaningfulText(item.owner) || hasMeaningfulText(item.dueDate));
  const hasActionImpact = topNamedActions.some((item) => hasMeaningfulText(item.impact));
  const finalActionColumns = [
    { key: 'priority', label: 'Priority', width: hasActionOwnerTiming || hasActionImpact ? '14%' : '18%' },
    { key: 'action', label: 'Action', width: hasActionOwnerTiming || hasActionImpact ? '38%' : '82%' },
    hasActionOwnerTiming
      ? { key: 'ownerTiming', label: 'Owner / timing', width: hasActionImpact ? '24%' : '48%' }
      : null,
    hasActionImpact
      ? { key: 'impact', label: 'Expected impact', width: hasActionOwnerTiming ? '24%' : '48%' }
      : null
  ].filter((column): column is { key: string; label: string; width: string } => Boolean(column));

  const priorityActionsTableHtml = topNamedActions.length
    ? `
        <table class="report-table report-table-tight kitchen-audit-final-actions-table">
          <colgroup>
            ${finalActionColumns.map((column) => `<col style="width: ${column.width}" />`).join('')}
          </colgroup>
          <thead>
            <tr>${finalActionColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${topNamedActions
              .map((item) => {
                const ownerTiming = [
                  hasMeaningfulText(item.owner) ? `Owner: ${cleanCopy(item.owner)}` : '',
                  hasMeaningfulText(item.dueDate) ? `Due: ${cleanCopy(item.dueDate)}` : ''
                ].filter(Boolean).join('<br />');
                const values: Record<string, string> = {
                  priority: hasMeaningfulText(item.priority) ? cleanCopy(item.priority) : '',
                  action: cleanCopy(item.title),
                  ownerTiming,
                  impact: hasMeaningfulText(item.impact) ? cleanCopy(item.impact) : ''
                };
                return `<tr>${finalActionColumns.map((column) => `<td>${values[column.key] ?? ''}</td>`).join('')}</tr>`;
              })
              .join('')}
          </tbody>
        </table>
      `
    : '';

  const typedPriorityHtml = renderList(typedPriorityOnly);
  const execProse = hasMeaningfulText(state.summary)
    ? state.summary
    : hasNarrativeSignal
      ? narrative.executiveSummary
      : '';
  const executiveLeadSection = hasMeaningfulText(execProse)
    ? `
        <section class="report-chapter report-chapter-break kitchen-audit-exec-lead">
          <div class="report-chapter-header">
            <p class="report-chapter-kicker">At a glance</p>
            <h2>Executive Summary</h2>
          </div>
          <div class="kitchen-audit-exec-body"><p>${cleanCopy(execProse)}</p></div>
        </section>`
    : '';

  const coverMetrics = [
    calc.totalWeeklyOpportunity > 0
      ? {
          label: 'Weekly profit opportunity',
          value: formatCurrencyShort(calc.totalWeeklyOpportunity),
          primary: true
        }
      : null,
    calc.totalAnnualOpportunity > 0
      ? {
          label: 'Annual opportunity',
          value: formatCurrencyShort(calc.totalAnnualOpportunity)
        }
      : null,
    controlsTableRows.length
      ? {
          label: 'Control compliance',
          value: `${Math.round(calc.controlScore)}%`
        }
      : null
  ].filter((item): item is { label: string; value: string; primary?: boolean } => Boolean(item));

  const clientName = normalizeTitleLabel(safe(state.businessName) || 'Client Site');
  const coverSummary = `Kitchen Profit Audit report for ${clientName}, focused on profit recovery, kitchen controls, labour efficiency, purchasing, waste, and menu performance.`;

  const coverHtml = buildReportCoverHtml({
    reportType: 'Kitchen Profit Audit Consultancy Report',
    clientName,
    preparedDate: safe(state.visitDate) || new Date().toISOString().split('T')[0],
    consultant: safe(state.consultantName) || 'The Final Check',
    summary: coverSummary,
    metrics: coverMetrics,
    details: [
      { label: 'Site', value: safe(state.businessName) },
      { label: 'Location', value: safe(state.location) },
      { label: 'Service style', value: safe(state.serviceStyle) },
      { label: 'Trading days', value: safe(state.tradingDays) }
    ]
  });

  const commercialChapter = renderChapter(
    'Commercial view',
    'Commercial Snapshot',
    'The current trading baseline, the performance gap, and the biggest issues reducing profit.',
    [
      pageTwoMetrics
        ? renderSection(
            'Key commercial metrics',
            `<div class="report-metric-grid report-metric-grid-4">${pageTwoMetrics}</div>`,
            'Weekly sales, food cost, labour, and gross profit markers captured during the visit.'
          )
        : ''
    ]
      .filter(Boolean)
      .join('')
  );

  const nextStepsChapter = renderChapter(
    'What happens next',
    '30–90 Day Programme',
    'Medium-term programme, cadence, and evidence for management.',
    [
      renderSection(
        '30–90 day programme',
        actionPlanHtml,
        'Structured medium-term actions to stabilise margin, systems, and team execution.'
      ),
      renderSection(
        'Follow-up and review',
        followUpHtml,
        'Recommended cadence and next review point.'
      )
    ]
      .filter(Boolean)
      .join('')
  );

  const foodOfferBody = [
    hasMeaningfulText(state.foodQuality) ? `<p>${cleanCopy(state.foodQuality)}</p>` : ''
  ]
    .filter(Boolean)
    .join('');

  const evidenceBody = [
    hasPhotos('commercial') ? renderSection('Commercial evidence', renderPhotoGallery('commercial')) : '',
    foodOfferBody
      ? renderSection(
          'Food and Quality Offer',
          `<div class="kitchen-audit-food-offer">${foodOfferBody}</div>`,
          'Food offer observations and supporting visit evidence where captured.'
        )
      : '',
    hasPhotos('findings') ? renderSection('Operational evidence', renderPhotoGallery('findings')) : '',
    hasPhotos('layout') ? renderSection('Layout and equipment evidence', renderPhotoGallery('layout')) : '',
    hasPhotos('actions') ? renderSection('Action evidence', renderPhotoGallery('actions')) : ''
  ]
    .filter(Boolean)
    .join('');

  const evidenceChapter = renderChapter(
    'Evidence',
    'Evidence / Photos',
    'Visit evidence grouped by the relevant Profit Audit section.',
    evidenceBody
  );

  const controlsChapter = renderChapter(
    'Controls and evidence',
    'Controls and Evidence Register',
    'Named control checks reviewed onsite, with clear status and supporting notes for management follow-up.',
    controlsChapterBody
  );

  const keyIssuesBody = [
    renderList(hasNarrativeSignal ? narrative.keyIssues : []),
    findingsChapterBody
  ]
    .filter(Boolean)
    .join('');

  const findingsChapter = renderChapter(
    'Findings',
    'Key Issues / Findings',
    'The practical issues currently suppressing margin, control, or operating consistency.',
    keyIssuesBody
  );

  const finalActionPlanBody = [
    renderSection(
      'Immediate focus',
      quickWinsHtml,
      'Fast operational corrections that can usually be put in place immediately.'
    ),
    renderSection(
      'Priority checklist',
      [priorityActionsTableHtml, typedPriorityHtml].filter(Boolean).join(''),
      'Recorded priority actions, with ownership, timing, and impact shown only where they have been captured.'
    )
  ]
    .filter(Boolean)
    .join('');

  const finalActionPlanChapter = renderChapter(
    'Final checklist',
    'Final Action Plan',
    'The final practical checklist for management follow-up after reading the report.',
    finalActionPlanBody
  );

  const primaryReading = [
    executiveLeadSection,
    commercialChapter,
    findingsChapter,
    evidenceChapter,
    controlsChapter,
    nextStepsChapter,
    finalActionPlanChapter
  ]
    .filter(Boolean)
    .join('');

  const inner = [
    coverHtml,
    `<div class="kitchen-audit-primary-reading">${primaryReading}</div>`
  ]
    .filter(Boolean)
    .join('');

  return `${KITCHEN_AUDIT_DELIVERABLE_STYLES}<div class="kitchen-audit-deliverable">${inner}</div>`;
}

export function buildStandaloneKitchenAuditReportHtml(title: string, reportHtml: string) {
  return buildPdfDocumentHtml(title, reportHtml, {
    autoPrint: false,
    showCloseButton: false,
    formatLabel: 'Standalone HTML report'
  });
}

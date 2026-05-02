import type { AuditActionItem, AuditPhoto } from '../../types';
import { safe } from '../../lib/utils';
import { renderAuditPhotoGallery } from '../../lib/photoEvidence';
import { escapeHtml, normalizeProseText, normalizeTitleLabel } from './buildPdfDocumentHtml';

export type ReportMetricCard = {
  label: string;
  value: string;
  detail?: string;
};

const PLACEHOLDER_PATTERNS = [
  /^not recorded$/i,
  /^not set$/i,
  /^no date$/i,
  /^no .* recorded\.?$/i,
  /^no .* yet\.?$/i,
  /^.* not set$/i,
  /^add .* before/i,
  /^portion not set$/i,
  /^area not set$/i,
  /^touchpoint not set$/i
];

export function isReportPlaceholder(value: unknown): boolean {
  const text = normalizeProseText(value);
  return !text || PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
}

export function hasReportContent(value: unknown): boolean {
  return !isReportPlaceholder(value);
}

export type PdfReportFamily = 'consultancy' | 'operational' | 'commercial';

export function buildReportBodyHtml(chapters: string[], family: PdfReportFamily = 'consultancy'): string {
  return `<div class="pdf-report-body pdf-report-body--${family}">${chapters.filter(Boolean).join('')}</div>`;
}

export function buildSummaryGridHtml(cards: ReportMetricCard[]): string {
  const visibleCards = cards.filter((card) => safe(card.label) && hasReportContent(card.value));
  if (!visibleCards.length) return '';

  return `
    <div class="summary-grid">
      ${visibleCards
        .map(
          (card) => `
            <div class="meta-card">
              <span>${escapeHtml(normalizeTitleLabel(card.label))}</span>
              <strong>${escapeHtml(card.value)}</strong>
              ${card.detail ? `<p>${escapeHtml(normalizeProseText(card.detail))}</p>` : ''}
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

export function buildRecommendationListHtml(items: string[], emptyText = ''): string {
  const visibleItems = items.map((item) => normalizeProseText(item)).filter(hasReportContent);
  if (!visibleItems.length) {
    return emptyText ? `<p class="pdf-empty-state">${escapeHtml(emptyText)}</p>` : '';
  }

  return `
    <ol class="report-priority-list">
      ${visibleItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ol>
  `;
}

export function buildActionRegisterHtml(actions: AuditActionItem[], emptyText = ''): string {
  const visibleActions = actions.filter((item) => safe(item.title));
  if (!visibleActions.length) {
    return emptyText ? `<p class="pdf-empty-state">${escapeHtml(emptyText)}</p>` : '';
  }

  return `
    <table class="report-table report-table-compact">
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
        ${visibleActions
          .map(
            (item) => `
              <tr>
                <td>${escapeHtml(safe(item.title) || 'Untitled action')}</td>
                <td>${escapeHtml(safe(item.area) || 'General')}</td>
                <td>${escapeHtml(item.priority)}</td>
                <td>${escapeHtml(safe(item.owner) || 'Not assigned')}</td>
                <td>${escapeHtml(safe(item.dueDate) || 'Not set')}</td>
                <td>${escapeHtml(item.status)}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

export function buildTextSectionHtml(title: string, text: unknown): string {
  if (!hasReportContent(text)) return '';

  return `
    <article class="pdf-section">
      <div class="pdf-section-header">
        <h3>${escapeHtml(normalizeTitleLabel(title))}</h3>
      </div>
      <p>${escapeHtml(normalizeProseText(text))}</p>
    </article>
  `;
}

export function buildDetailGridHtml(items: Array<{ label: string; value: unknown }>): string {
  const visibleItems = items.filter((item) => safe(item.label) && hasReportContent(item.value));
  if (!visibleItems.length) return '';

  return `
    <div class="report-grid columns-4">
      ${visibleItems
        .map(
          (item) => `
            <div>
              <strong>${escapeHtml(normalizeTitleLabel(item.label))}</strong><br />
              ${escapeHtml(normalizeProseText(item.value))}
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

export function buildStoryCardsHtml(
  cards: Array<{ title: string; body: unknown }>,
  className = 'report-story-grid'
): string {
  const visibleCards = cards.filter((card) => safe(card.title) && hasReportContent(card.body));
  if (!visibleCards.length) return '';

  return `
    <div class="${className}">
      ${visibleCards
        .map(
          (card) => `
            <div class="report-story-card">
              <h3>${escapeHtml(normalizeTitleLabel(card.title))}</h3>
              <p>${escapeHtml(normalizeProseText(card.body))}</p>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

export function buildDocumentPanelHtml(
  title: string,
  body: string,
  options: { eyebrow?: string; className?: string } = {}
): string {
  if (!body.trim()) return '';
  const className = options.className ? ` ${options.className}` : '';

  return `
    <section class="pdf-document-panel${className}">
      <div class="pdf-document-panel-header">
        ${options.eyebrow ? `<span>${escapeHtml(normalizeTitleLabel(options.eyebrow))}</span>` : ''}
        <h3>${escapeHtml(normalizeTitleLabel(title))}</h3>
      </div>
      <div class="pdf-document-panel-body">${body}</div>
    </section>
  `;
}

export function buildDefinitionListHtml(items: Array<{ label: string; value: unknown }>): string {
  const visibleItems = items.filter((item) => safe(item.label) && hasReportContent(item.value));
  if (!visibleItems.length) return '';

  return `
    <dl class="pdf-definition-list">
      ${visibleItems
        .map(
          (item) => `
            <div>
              <dt>${escapeHtml(normalizeTitleLabel(item.label))}</dt>
              <dd>${escapeHtml(normalizeProseText(item.value))}</dd>
            </div>
          `
        )
        .join('')}
    </dl>
  `;
}

export function buildReportPhotoGalleryHtml(photos: AuditPhoto[], section: string): string {
  if (!photos.some((photo) => photo.section === section)) return '';
  return renderAuditPhotoGallery(photos, section);
}

export type CalloutVariant = 'risk' | 'warn' | 'good' | 'neutral';

export function buildCalloutHtml(
  text: unknown,
  options: { title?: string; variant?: CalloutVariant } = {}
): string {
  const prose = normalizeProseText(text);
  if (!prose) return '';
  const variantClass = options.variant ? ` pdf-callout--${options.variant}` : '';
  const titleHtml = options.title
    ? `<strong>${escapeHtml(normalizeTitleLabel(options.title))}</strong>`
    : '';
  return `<div class="pdf-callout${variantClass}">${titleHtml}<p>${escapeHtml(prose)}</p></div>`;
}

export function buildKpiHeroHtml(value: string, label: string, detail?: string): string {
  if (!value) return '';
  return `
    <div class="pdf-kpi-hero">
      <div class="pdf-kpi-hero-value">${escapeHtml(value)}</div>
      <div class="pdf-kpi-hero-meta">
        <span class="pdf-kpi-hero-label">${escapeHtml(normalizeTitleLabel(label))}</span>
        ${detail ? `<div class="pdf-kpi-hero-detail">${escapeHtml(normalizeProseText(detail))}</div>` : ''}
      </div>
    </div>
  `;
}

export function buildActionCardsHtml(actions: AuditActionItem[]): string {
  const visible = actions.filter((item) => safe(item.title));
  if (!visible.length) return '';

  return `
    <div class="pdf-action-cards">
      ${visible
        .map((item) => {
          const priority = (item.priority || 'medium').toLowerCase();
          const priorityClass =
            priority === 'critical'
              ? 'pdf-action-card--critical'
              : priority === 'high'
                ? 'pdf-action-card--high'
                : 'pdf-action-card--medium';
          const impactHtml =
            safe(item.impact)
              ? `<div class="pdf-action-card-impact">${escapeHtml(normalizeProseText(item.impact))}</div>`
              : '';
          return `
            <div class="pdf-action-card ${priorityClass}">
              <div class="pdf-action-card-stripe"></div>
              <div class="pdf-action-card-body">
                <div class="pdf-action-card-title">${escapeHtml(safe(item.title) || 'Action')}</div>
                <div class="pdf-action-card-meta">
                  ${safe(item.area) ? `<div class="pdf-action-card-meta-item"><span>Area</span><strong>${escapeHtml(safe(item.area) || '')}</strong></div>` : ''}
                  <div class="pdf-action-card-meta-item"><span>Priority</span><strong>${escapeHtml(item.priority)}</strong></div>
                  ${safe(item.owner) ? `<div class="pdf-action-card-meta-item"><span>Owner</span><strong>${escapeHtml(safe(item.owner) || '')}</strong></div>` : ''}
                  ${safe(item.dueDate) ? `<div class="pdf-action-card-meta-item"><span>Due</span><strong>${escapeHtml(safe(item.dueDate) || '')}</strong></div>` : ''}
                </div>
                ${impactHtml}
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

export function buildScoreGridHtml(
  scores: Array<{ label: string; score: number; max?: number }>
): string {
  if (!scores.length) return '';

  return `
    <div class="pdf-score-grid">
      ${scores
        .map((item) => {
          const max = item.max ?? 10;
          const ratio = item.score / max;
          const scoreClass =
            ratio >= 0.8
              ? 'pdf-score-cell--strong'
              : ratio >= 0.6
                ? ''
                : ratio >= 0.45
                  ? 'pdf-score-cell--mid'
                  : 'pdf-score-cell--weak';
          return `
            <div class="pdf-score-cell ${scoreClass}">
              <span class="pdf-score-cell-label">${escapeHtml(normalizeTitleLabel(item.label))}</span>
              <span class="pdf-score-cell-value">${item.score}<span class="pdf-score-cell-max">/${max}</span></span>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

export function buildStatusCell(value: string): string {
  const lc = value.toLowerCase();
  const cls =
    lc === 'pass' || lc === 'done' || lc === 'in place'
      ? 'pdf-status-pass'
      : lc === 'fail' || lc === 'critical' || lc === 'missing'
        ? 'pdf-status-fail'
        : lc === 'watch' || lc === 'partial' || lc === 'high'
          ? 'pdf-status-watch'
          : lc === 'medium'
            ? 'pdf-status-medium'
            : 'pdf-status-low';
  return `<span class="${cls}">${escapeHtml(value)}</span>`;
}

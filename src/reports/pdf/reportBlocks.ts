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

export function buildReportBodyHtml(chapters: string[]): string {
  return `<div class="pdf-report-body">${chapters.filter(Boolean).join('')}</div>`;
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

export function buildReportPhotoGalleryHtml(photos: AuditPhoto[], section: string): string {
  if (!photos.some((photo) => photo.section === section)) return '';
  return renderAuditPhotoGallery(photos, section);
}

import type { AuditActionItem } from '../../types';
import { safe } from '../../lib/utils';
import { escapeHtml, normalizeProseText, normalizeTitleLabel } from './buildPdfDocumentHtml';

export type ReportMetricCard = {
  label: string;
  value: string;
  detail?: string;
};

export function buildReportBodyHtml(chapters: string[]): string {
  return `<div class="pdf-report-body">${chapters.filter(Boolean).join('')}</div>`;
}

export function buildSummaryGridHtml(cards: ReportMetricCard[]): string {
  const visibleCards = cards.filter((card) => safe(card.label) || safe(card.value));
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

export function buildRecommendationListHtml(items: string[], emptyText: string): string {
  const visibleItems = items.map((item) => normalizeProseText(item)).filter(Boolean);
  if (!visibleItems.length) {
    return `<p class="pdf-empty-state">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ol class="report-priority-list">
      ${visibleItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ol>
  `;
}

export function buildActionRegisterHtml(actions: AuditActionItem[], emptyText: string): string {
  const visibleActions = actions.filter((item) => safe(item.title));
  if (!visibleActions.length) {
    return `<p class="pdf-empty-state">${escapeHtml(emptyText)}</p>`;
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

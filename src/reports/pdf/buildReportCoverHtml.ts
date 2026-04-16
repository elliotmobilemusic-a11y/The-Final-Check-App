import { escapeHtml, normalizeProseText, normalizeTitleLabel } from './buildPdfDocumentHtml';

export type ReportCoverMetric = {
  label: string;
  value: string;
  primary?: boolean;
};

export type ReportCoverDetail = {
  label: string;
  value: string;
};

export type ReportCoverConfig = {
  reportType: string;
  clientName: string;
  preparedDate: string;
  consultant: string;
  summary?: string;
  metrics: ReportCoverMetric[];
  details: ReportCoverDetail[];
};

export function buildReportCoverHtml(config: ReportCoverConfig): string {
  const metricsHtml = config.metrics
    .map(metric => `
        <div class="pdf-cover-metric ${metric.primary ? 'primary' : ''}">
        <div class="pdf-cover-metric-label">${escapeHtml(normalizeTitleLabel(metric.label))}</div>
        <div class="pdf-cover-metric-value">${escapeHtml(metric.value)}</div>
      </div>
    `)
    .join('');

  const detailsHtml = config.details
    .map(detail => `
      <div class="pdf-cover-detail">
        <span class="pdf-cover-detail-label">${escapeHtml(normalizeTitleLabel(detail.label))}</span>
        <span class="pdf-cover-detail-value">${escapeHtml(normalizeTitleLabel(detail.value))}</span>
      </div>
    `)
    .join('');

  return `
    <div class="pdf-cover-page">
      <div class="pdf-cover-top-bar">
        <div class="pdf-cover-brand-block">
          <div class="pdf-cover-brand">The Final Check</div>
          <div class="pdf-cover-brand-tagline">Boutique consultancy reporting</div>
          <div class="pdf-cover-brand-context">${escapeHtml(normalizeTitleLabel(config.reportType))}</div>
        </div>
        <div class="pdf-cover-meta">
          <div class="pdf-cover-meta-item">
            <span>Prepared</span>
            <strong>${escapeHtml(config.preparedDate)}</strong>
          </div>
          <div class="pdf-cover-meta-item">
            <span>Consultant</span>
            <strong>${escapeHtml(config.consultant)}</strong>
          </div>
        </div>
      </div>

      <div class="pdf-cover-hero">
        <div class="pdf-cover-hero-main">
          <div class="pdf-cover-report-type">${escapeHtml(normalizeTitleLabel(config.reportType))}</div>
          <h1 class="pdf-cover-client-title">${escapeHtml(normalizeTitleLabel(config.clientName))}</h1>

          ${config.summary ? `
            <p class="pdf-cover-summary">${escapeHtml(normalizeProseText(config.summary))}</p>
          ` : ''}
        </div>

        <div class="pdf-cover-hero-aside" aria-hidden="true">
          <div class="pdf-cover-hero-aside-frame"></div>
          <div class="pdf-cover-hero-aside-accent"></div>
          <div class="pdf-cover-hero-aside-orb"></div>
        </div>
      </div>

      <div class="pdf-cover-metrics">
        ${metricsHtml}
      </div>

      <div class="pdf-cover-details-band">
        <div class="pdf-cover-details-heading">Engagement details</div>
        <div class="pdf-cover-details-grid">
          ${detailsHtml}
        </div>
      </div>
    </div>
  `;
}

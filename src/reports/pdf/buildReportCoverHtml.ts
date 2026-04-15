import { escapeHtml, humanizeTitle } from './buildPdfDocumentHtml';

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
        <div class="pdf-cover-metric-value">${escapeHtml(metric.value)}</div>
        <div class="pdf-cover-metric-label">${escapeHtml(metric.label)}</div>
      </div>
    `)
    .join('');

  const detailsHtml = config.details
    .map(detail => `
      <div class="pdf-cover-detail">
        <span class="pdf-cover-detail-label">${escapeHtml(detail.label)}</span>
        <span class="pdf-cover-detail-value">${escapeHtml(humanizeTitle(detail.value))}</span>
      </div>
    `)
    .join('');

  return `
    <div class="pdf-cover-page">
      <div class="pdf-cover-top-bar">
        <div>
          <div class="pdf-cover-brand">The Final Check</div>
          <div class="pdf-cover-brand-tagline">${escapeHtml(config.reportType)}</div>
        </div>
        <div class="pdf-cover-meta">
          <div>Prepared: ${escapeHtml(config.preparedDate)}</div>
          <div>${escapeHtml(config.consultant)}</div>
        </div>
      </div>

      <div>
        <div class="pdf-cover-report-type">${escapeHtml(config.reportType)}</div>
        <h1 class="pdf-cover-client-title">${escapeHtml(humanizeTitle(config.clientName))}</h1>
        
        ${config.summary ? `
          <p class="pdf-cover-summary">${escapeHtml(config.summary)}</p>
        ` : ''}
      </div>

      <div class="pdf-cover-metrics">
        ${metricsHtml}
      </div>

      <div class="pdf-cover-details-grid">
        ${detailsHtml}
      </div>
    </div>
  `;
}

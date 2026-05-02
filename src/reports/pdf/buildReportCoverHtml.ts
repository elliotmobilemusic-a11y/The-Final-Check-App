import { escapeHtml, normalizeProseText, normalizeTitleLabel } from './buildPdfDocumentHtml';
import { hasReportContent } from './reportBlocks';

function brandTopBar(
  reportType: string,
  preparedDate: string,
  consultant: string
): string {
  return `
    <div class="pdf-cover-top-bar">
      <div class="pdf-cover-brand-block">
        <div class="pdf-cover-brand">The Final Check</div>
        <div class="pdf-cover-brand-tagline">Hospitality Consultancy</div>
        <div class="pdf-cover-brand-context">${escapeHtml(normalizeTitleLabel(reportType))}</div>
      </div>
      <div class="pdf-cover-meta">
        <div class="pdf-cover-meta-item">
          <span>Prepared</span>
          <strong>${escapeHtml(preparedDate)}</strong>
        </div>
        <div class="pdf-cover-meta-item">
          <span>Consultant</span>
          <strong>${escapeHtml(consultant)}</strong>
        </div>
      </div>
    </div>
  `;
}

function detailsBand(details: ReportCoverDetail[]): string {
  const visibleDetails = details.filter((d) => hasReportContent(d.value));
  if (!visibleDetails.length) return '';
  return `
    <div class="pdf-cover-details-band">
      <div class="pdf-cover-details-heading">Engagement Details</div>
      <div class="pdf-cover-details-grid">
        ${visibleDetails
          .map(
            (d) => `
          <div class="pdf-cover-detail">
            <span class="pdf-cover-detail-label">${escapeHtml(normalizeTitleLabel(d.label))}</span>
            <span class="pdf-cover-detail-value">${escapeHtml(normalizeTitleLabel(d.value))}</span>
          </div>`
          )
          .join('')}
      </div>
    </div>
  `;
}

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
    .filter(metric => hasReportContent(metric.value))
    .map(metric => `
        <div class="pdf-cover-metric ${metric.primary ? 'primary' : ''}">
        <div class="pdf-cover-metric-label">${escapeHtml(normalizeTitleLabel(metric.label))}</div>
        <div class="pdf-cover-metric-value">${escapeHtml(metric.value)}</div>
      </div>
    `)
    .join('');

  const detailsHtml = config.details
    .filter(detail => hasReportContent(detail.value))
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
          <h1 class="pdf-cover-client-title">${escapeHtml(config.clientName)}</h1>

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

      ${detailsHtml ? `<div class="pdf-cover-details-band">
        <div class="pdf-cover-details-heading">Engagement details</div>
        <div class="pdf-cover-details-grid">
          ${detailsHtml}
        </div>
      </div>` : ''}
    </div>
  `;
}

/* -------------------------------------------------------
   OPERATIONAL COVER — Dish Spec / Handover family
   ------------------------------------------------------- */

export type OperationalCoverConfig = {
  reportType: string;
  dishName: string;
  preparedDate: string;
  consultant: string;
  chips?: string[];
  metrics: Array<{ label: string; value: string; primary?: boolean }>;
  details: ReportCoverDetail[];
};

export function buildOperationalCoverHtml(config: OperationalCoverConfig): string {
  const visibleMetrics = config.metrics.filter((m) => hasReportContent(m.value));
  const visibleChips = (config.chips ?? []).filter((c) => c && c.trim());

  const metricsHtml = visibleMetrics
    .map(
      (m) => `
      <div class="pdf-cover-op-metric ${m.primary ? 'primary' : ''}">
        <span class="pdf-cover-op-metric-value">${escapeHtml(m.value)}</span>
        <span class="pdf-cover-op-metric-label">${escapeHtml(normalizeTitleLabel(m.label))}</span>
      </div>`
    )
    .join('');

  const chipsHtml = visibleChips.length
    ? `<div class="pdf-cover-op-chips">
        ${visibleChips.map((c) => `<span class="pdf-cover-op-chip">${escapeHtml(c)}</span>`).join('')}
       </div>`
    : '';

  return `
    <div class="pdf-cover-page--operational">
      ${brandTopBar(config.reportType, config.preparedDate, config.consultant)}

      <div class="pdf-cover-op-body">
        <div class="pdf-cover-op-tag">${escapeHtml(normalizeTitleLabel(config.reportType))}</div>
        <h1 class="pdf-cover-op-name">${escapeHtml(config.dishName)}</h1>
        ${chipsHtml}
        ${visibleMetrics.length ? `<div class="pdf-cover-op-metrics">${metricsHtml}</div>` : ''}
      </div>

      ${detailsBand(config.details)}
    </div>
  `;
}

/* -------------------------------------------------------
   COMMERCIAL COVER — Recipe Costing family
   ------------------------------------------------------- */

export type CommercialCoverConfig = {
  reportType: string;
  dishName: string;
  preparedDate: string;
  consultant: string;
  numbers: Array<{ label: string; value: string; primary?: boolean }>;
  gpStatus?: {
    label: string;
    variant: 'above' | 'below';
  };
  details: ReportCoverDetail[];
};

export function buildCommercialCoverHtml(config: CommercialCoverConfig): string {
  const visibleNumbers = config.numbers.filter((n) => hasReportContent(n.value));

  const numbersHtml = visibleNumbers
    .map(
      (n) => `
      <div class="pdf-cover-com-number ${n.primary ? 'primary' : ''}">
        <span class="pdf-cover-com-number-value">${escapeHtml(n.value)}</span>
        <span class="pdf-cover-com-number-label">${escapeHtml(normalizeTitleLabel(n.label))}</span>
      </div>`
    )
    .join('');

  const gpStatusHtml = config.gpStatus
    ? `<div class="pdf-cover-com-gp-status ${config.gpStatus.variant === 'above' ? 'above-target' : 'below-target'}">${escapeHtml(normalizeProseText(config.gpStatus.label))}</div>`
    : '';

  return `
    <div class="pdf-cover-page--commercial">
      ${brandTopBar(config.reportType, config.preparedDate, config.consultant)}

      <div class="pdf-cover-com-body">
        <div class="pdf-cover-com-tag">${escapeHtml(normalizeTitleLabel(config.reportType))}</div>
        <h1 class="pdf-cover-com-name">${escapeHtml(config.dishName)}</h1>
        ${visibleNumbers.length ? `<div class="pdf-cover-com-numbers">${numbersHtml}</div>` : ''}
        ${gpStatusHtml}
      </div>

      ${detailsBand(config.details)}
    </div>
  `;
}

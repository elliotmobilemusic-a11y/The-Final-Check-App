import { escapeHtml, normalizeProseText, normalizeTitleLabel } from './buildPdfDocumentHtml';

export type ChapterConfig = {
  kicker: string;
  title: string;
  lead?: string;
  body: string;
};

export function buildChapterHtml(config: ChapterConfig): string {
  return `
    <section class="pdf-chapter pdf-chapter-break">
      <div class="pdf-chapter-header">
        <p class="pdf-chapter-kicker">${escapeHtml(normalizeTitleLabel(config.kicker))}</p>
        <h2>${escapeHtml(normalizeTitleLabel(config.title))}</h2>
        ${config.lead ? `<p>${escapeHtml(normalizeProseText(config.lead))}</p>` : ''}
      </div>
      ${config.body}
    </section>
  `;
}

export function buildSectionHtml(title: string, body: string, lead?: string): string {
  if (!body) return '';
  
  return `
    <article class="pdf-section">
      <div class="pdf-section-header">
        <h3>${escapeHtml(normalizeTitleLabel(title))}</h3>
        ${lead ? `<p>${escapeHtml(normalizeProseText(lead))}</p>` : ''}
      </div>
      ${body}
    </article>
  `;
}

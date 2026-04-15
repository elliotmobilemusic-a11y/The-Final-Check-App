import { escapeHtml } from './buildPdfDocumentHtml';

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
        <p class="pdf-chapter-kicker">${escapeHtml(config.kicker)}</p>
        <h2>${escapeHtml(config.title)}</h2>
        ${config.lead ? `<p>${escapeHtml(config.lead)}</p>` : ''}
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
        <h3>${escapeHtml(title)}</h3>
        ${lead ? `<p>${escapeHtml(lead)}</p>` : ''}
      </div>
      ${body}
    </article>
  `;
}
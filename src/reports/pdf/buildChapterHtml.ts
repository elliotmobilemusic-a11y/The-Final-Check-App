import { escapeHtml, humanizeSentence, humanizeTitle } from './buildPdfDocumentHtml';

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
        <p class="pdf-chapter-kicker">${escapeHtml(humanizeTitle(config.kicker))}</p>
        <h2>${escapeHtml(humanizeTitle(config.title))}</h2>
        ${config.lead ? `<p>${escapeHtml(humanizeSentence(config.lead))}</p>` : ''}
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
        <h3>${escapeHtml(humanizeTitle(title))}</h3>
        ${lead ? `<p>${escapeHtml(humanizeSentence(lead))}</p>` : ''}
      </div>
      ${body}
    </article>
  `;
}

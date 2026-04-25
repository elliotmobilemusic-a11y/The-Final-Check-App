import { describe, expect, it } from 'vitest';
import {
  buildReportDocumentHtml,
  buildReportHeroHtml,
  escapeReportHtml,
  formatReportDate
} from './htmlDocument';

describe('htmlDocument helpers', () => {
  it('escapes unsafe HTML characters', () => {
    expect(escapeReportHtml(`<script>alert("x")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });

  it('formats report dates consistently', () => {
    expect(formatReportDate('2026-04-24')).toBe('24 Apr 2026');
    expect(formatReportDate('')).toBe('Not set');
  });

  it('builds branded hero and document markup', () => {
    const hero = buildReportHeroHtml({
      eyebrow: 'Dish spec sheet',
      title: 'Steak Pie',
      chips: ['Manchester', 'Prepared by The Final Check'],
      cards: [{ label: 'Selling price', value: '£12.00' }]
    });
    const document = buildReportDocumentHtml('Steak Pie', hero, {
      showCloseButton: false,
      autoPrint: false
    });

    expect(hero).toContain('Dish spec sheet');
    expect(hero).toContain('Manchester');
    expect(document).toContain('<title>Steak Pie</title>');
    expect(document).toContain('The Final Check');
  });
});

import { describe, expect, it } from 'vitest';
import { normalizeDish } from './dishRecords';
import {
  buildMenuInsights,
  completionSummary,
  createDefaultMenu,
  normalizeMenuProject
} from './menuBuilderHelpers';

describe('menuBuilderHelpers', () => {
  it('creates a sensible starter project shape', () => {
    const project = createDefaultMenu('client-1');

    expect(project.clientId).toBe('client-1');
    expect(project.sections).toHaveLength(1);
    expect(project.sections[0]?.name).toBe('Starters');
    expect(project.selectedSectionId).toBe(project.sections[0]?.id);
  });

  it('normalizes menu projects and nested dishes', () => {
    const project = normalizeMenuProject({
      menuName: 'Seasonal Menu',
      siteName: 'Leeds',
      reviewDate: '2026-04-24',
      defaultTargetGp: 68,
      selectedSectionId: 'section-1',
      sections: [
        {
          id: 'section-1',
          name: 'Desserts',
          dishes: [
            normalizeDish({
              id: 'dish-1',
              name: 'Cheesecake'
            })
          ]
        }
      ]
    });

    expect(project.clientSiteId).toBeNull();
    expect(project.sections[0]?.dishes[0]?.recipeCosting.linkedDishId).toBe('dish-1');
    expect(project.sections[0]?.dishes[0]?.specSheet.linkedDishId).toBe('dish-1');
  });

  it('produces actionable menu insights from the commercial state', () => {
    const project = createDefaultMenu(null);
    project.sections[0]?.dishes.push(
      normalizeDish({
        id: 'dish-1',
        name: 'Roast Chicken',
        sellPrice: 0,
        targetGp: 70,
        ingredients: []
      })
    );

    const insights = buildMenuInsights(project, 50, 0, 0);
    const summary = completionSummary(project);

    expect(summary.percent).toBeLessThan(100);
    expect(insights.map((item) => item.title)).toContain('No client linked yet');
    expect(insights.map((item) => item.title)).toContain('Some dishes have no sell price');
  });
});

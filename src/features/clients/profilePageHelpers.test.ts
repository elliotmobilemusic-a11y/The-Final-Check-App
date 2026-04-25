import { describe, expect, it } from 'vitest';
import { normalizeDish } from '../menu-engine/dishRecords';
import {
  blankInvoice,
  buildDishWorkOpenPath,
  buildMenuLinkedDishRecords
} from './profilePageHelpers';
import type { MenuProjectState, SupabaseRecord } from '../../types';

describe('profilePageHelpers', () => {
  it('builds invoice drafts with a predictable due date and starter line', () => {
    const invoice = blankInvoice(4, 14);

    expect(invoice.number).toBe(`INV-${new Date().getFullYear()}-005`);
    expect(invoice.lines).toHaveLength(1);
    expect(invoice.lines[0]?.quantity).toBe(1);

    const issue = new Date(invoice.issueDate);
    const due = new Date(invoice.dueDate);
    const differenceInDays = Math.round((due.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24));

    expect(differenceInDays).toBe(14);
  });

  it('derives linked dish work records for spec and recipe views', () => {
    const project: MenuProjectState = {
      id: 'menu-1',
      clientId: 'client-1',
      clientSiteId: 'site-1',
      menuName: 'Core Menu',
      siteName: 'Manchester',
      reviewDate: '2026-04-24',
      defaultTargetGp: 70,
      selectedSectionId: 'section-1',
      sections: [
        {
          id: 'section-1',
          name: 'Mains',
          dishes: [
            normalizeDish({
              id: 'dish-1',
              name: 'Steak Pie'
            })
          ]
        }
      ]
    };

    const record: SupabaseRecord<MenuProjectState> = {
      id: 'menu-1',
      user_id: 'user-1',
      client_id: 'client-1',
      client_site_id: 'site-1',
      title: 'Core Menu',
      site_name: 'Manchester',
      location: 'Manchester',
      review_date: '2026-04-24',
      data: project,
      created_at: '2026-04-24T09:00:00.000Z',
      updated_at: '2026-04-24T10:00:00.000Z'
    };

    const linkedRecords = buildMenuLinkedDishRecords([record]);

    expect(linkedRecords).toHaveLength(1);
    expect(linkedRecords[0]).toMatchObject({
      workId: 'menu-dish:menu-1:dish-1',
      specWorkId: 'dish-spec:menu-1:dish-1',
      recipeWorkId: 'recipe-costing:menu-1:dish-1',
      sectionName: 'Mains'
    });
  });

  it('builds deep links into the menu dish workspace', () => {
    expect(buildDishWorkOpenPath('client-1', 'menu-1', 'dish-1', 'recipe')).toBe(
      '/menu?client=client-1&load=menu-1&dish=dish-1&dishTab=recipe'
    );
  });
});

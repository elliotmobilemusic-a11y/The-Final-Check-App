import { uid } from '../../lib/utils';
import type { QuoteInputAnswers, QuoteLineItem } from '../../types';

export type QuoteSeedTemplate = {
  id: string;
  label: string;
  description: string;
  values: Partial<QuoteInputAnswers>;
  manualLineItems?: QuoteLineItem[];
};

export const quoteSeedTemplates: QuoteSeedTemplate[] = [
  {
    id: 'operational-audit',
    label: 'Operational audit',
    description: 'Single-site restaurant audit with action plan and report.',
    values: {
      quoteTitle: 'Operational audit and action plan',
      serviceType: 'operationalAudit',
      businessType: 'restaurant',
      serviceStyle: 'fullService',
      venueSize: 'medium',
      estimatedWeeklyCovers: 850,
      averageSpendPerHead: 29,
      monthlyTurnover: 72000,
      annualTurnover: 864000,
      kitchenTeamSize: 8,
      frontOfHouseTeamSize: 12,
      menuSectionCount: 5,
      tradingDays: 7,
      revenueStreams: ['foodWet', 'events'],
      complexityLevel: 'medium',
      requiredTurnaround: 'standard',
      includesWrittenReport: true,
      includesActionPlan: true,
      requiresOnSiteVisit: true,
      onSiteVisitDays: 1,
      requiresRemoteReviewTime: true,
      remoteHours: 4,
      clientFacingNotes: 'Includes site review, written report, and action plan handover.'
    }
  },
  {
    id: 'menu-rebuild',
    label: 'Menu rebuild',
    description: 'Flexible menu rebuild with costing, allergens, and spec sheets.',
    values: {
      quoteTitle: 'Menu rebuild, costings, and allergen pack',
      serviceType: 'menuRebuild',
      businessType: 'gastroPub',
      serviceStyle: 'mixed',
      venueSize: 'large',
      estimatedWeeklyCovers: 1700,
      averageSpendPerHead: 24,
      monthlyTurnover: 145000,
      annualTurnover: 1740000,
      kitchenTeamSize: 16,
      frontOfHouseTeamSize: 21,
      menuSectionCount: 8,
      tradingDays: 7,
      revenueStreams: ['foodWet', 'events', 'deliveryTakeaway'],
      complexityLevel: 'high',
      requiredTurnaround: 'fast',
      includesWrittenReport: true,
      includesRecipeCosting: true,
      includesAllergenWork: true,
      includesSpecSheets: true,
      menuCount: 3,
      dishItemCount: 68,
      recipesNeedingCosting: 54,
      allergenSheetsNeeded: 54,
      specSheetsNeeded: 36,
      menuProjectScope: 'fullRebuild',
      menuImplementationSupportNeeded: true,
      menuTrainingNeededAfterBuild: true,
      clientFacingNotes: 'Rebuild covers main menu, lunch, and events offer with full documentation.'
    }
  },
  {
    id: 'training-mentoring',
    label: 'Training and mentoring',
    description: 'Multi-session training package with tailored materials and follow-up coaching.',
    values: {
      quoteTitle: 'Kitchen leadership training package',
      serviceType: 'trainingMentoring',
      businessType: 'hotel',
      serviceStyle: 'fullService',
      venueSize: 'medium',
      estimatedWeeklyCovers: 1100,
      averageSpendPerHead: 42,
      monthlyTurnover: 98000,
      annualTurnover: 1176000,
      kitchenTeamSize: 14,
      frontOfHouseTeamSize: 24,
      menuSectionCount: 6,
      tradingDays: 7,
      revenueStreams: ['foodWet', 'rooms', 'events'],
      complexityLevel: 'medium',
      requiredTurnaround: 'standard',
      trainingFormat: 'multiSessionPackage',
      attendeeCount: 18,
      trainingSessionCount: 4,
      trainingDeliveryMode: 'onSite',
      tailoredMaterialsRequired: true,
      followUpCoachingRequired: true,
      includesFollowUpSessions: true,
      followUpSessionCount: 2,
      requiresOnSiteVisit: true,
      onSiteVisitDays: 2,
      clientFacingNotes: 'Four-session package with leadership mentoring and tailored session content.'
    },
    manualLineItems: [
      {
        id: uid('quote-line'),
        key: 'manual-coaching-journal',
        label: 'Leadership coaching journal',
        description: 'Printed coaching workbook and reflection pack.',
        quantity: 1,
        unitPrice: 95,
        total: 95,
        type: 'manual'
      }
    ]
  }
];

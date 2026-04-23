import type {
  QuoteBusinessType,
  QuoteComplexity,
  QuoteDeliveryMode,
  QuoteMenuProjectScope,
  QuoteMysteryVisitMode,
  QuoteOpeningStage,
  QuoteRevenueStream,
  QuoteServiceStyle,
  QuoteServiceType,
  QuoteTrainingFormat,
  QuoteTurnaround,
  QuoteVenueSize
} from '../../types';

export const QUOTE_CALCULATION_VERSION = 1;

export const quoteServices: Record<
  QuoteServiceType,
  {
    id: QuoteServiceType;
    label: string;
    description: string;
    basePrice: number;
    pricingMode: 'fixed' | 'flexible';
  }
> = {
  operationalAudit: {
    id: 'operationalAudit',
    label: 'Operational Audit with Action Plan',
    description: 'Operational review, commercial diagnosis, and a clear action plan.',
    basePrice: 750,
    pricingMode: 'fixed'
  },
  menuRebuild: {
    id: 'menuRebuild',
    label: 'Full Menu Rebuild / Costings / Allergens / Spec Sheets',
    description: 'Menu development, costing, compliance support, and implementation planning.',
    basePrice: 1000,
    pricingMode: 'flexible'
  },
  trainingMentoring: {
    id: 'trainingMentoring',
    label: 'Staff Training & Tailored Mentoring',
    description: 'Service, kitchen, and mentoring sessions shaped around the venue team.',
    basePrice: 0,
    pricingMode: 'flexible'
  },
  kitchenLayout: {
    id: 'kitchenLayout',
    label: 'Kitchen Layout, Design & Workflow Advice',
    description: 'Layout review, flow optimisation, and practical operational design advice.',
    basePrice: 0,
    pricingMode: 'flexible'
  },
  procurementSupport: {
    id: 'procurementSupport',
    label: 'Procurement & Supplier Support',
    description: 'Supplier review, buying controls, and procurement support.',
    basePrice: 0,
    pricingMode: 'flexible'
  },
  complianceFoodSafety: {
    id: 'complianceFoodSafety',
    label: 'Compliance & Food Safety',
    description: 'Food safety systems, compliance support, and practical implementation guidance.',
    basePrice: 0,
    pricingMode: 'flexible'
  },
  mysteryShop: {
    id: 'mysteryShop',
    label: 'Mystery Shop Services',
    description: 'Mystery guest experience assessment with optional report and debrief.',
    basePrice: 500,
    pricingMode: 'fixed'
  },
  newOpenings: {
    id: 'newOpenings',
    label: 'New Openings Support',
    description: 'Planning, pre-opening, launch, and stabilisation support for new venues.',
    basePrice: 0,
    pricingMode: 'flexible'
  },
  recruitmentSupport: {
    id: 'recruitmentSupport',
    label: 'Recruitment & Interview Support',
    description: 'Role profiling, interview support, and recruitment decision guidance.',
    basePrice: 0,
    pricingMode: 'flexible'
  }
};

export const quotePricingConfig = {
  serviceBasePrice: Object.fromEntries(
    Object.values(quoteServices).map((service) => [service.id, service.basePrice])
  ) as Record<QuoteServiceType, number>,
  sizeMultiplier: {
    small: 1,
    medium: 1.2,
    large: 1.5
  } satisfies Record<QuoteVenueSize, number>,
  complexityMultiplier: {
    low: 1,
    medium: 1.15,
    high: 1.35
  } satisfies Record<QuoteComplexity, number>,
  urgencyMultiplier: {
    standard: 1,
    fast: 1.15,
    urgent: 1.3
  } satisfies Record<QuoteTurnaround, number>,
  turnoverBands: [
    { key: 'low', min: 0, max: 49999, label: 'Under £50k monthly', multiplier: 1 },
    { key: 'medium', min: 50000, max: 99999, label: '£50k to £99.9k monthly', multiplier: 1.15 },
    { key: 'high', min: 100000, max: 249999, label: '£100k to £249.9k monthly', multiplier: 1.3 },
    {
      key: 'enterprise',
      min: 250000,
      max: Number.POSITIVE_INFINITY,
      label: '£250k+ monthly',
      multiplier: 1.5
    }
  ],
  coversBands: [
    { key: 'low', min: 0, max: 599, label: 'Up to 599 covers', multiplier: 1 },
    { key: 'medium', min: 600, max: 1499, label: '600 to 1,499 covers', multiplier: 1.1 },
    { key: 'high', min: 1500, max: 2999, label: '1,500 to 2,999 covers', multiplier: 1.25 },
    {
      key: 'veryHigh',
      min: 3000,
      max: Number.POSITIVE_INFINITY,
      label: '3,000+ covers',
      multiplier: 1.4
    }
  ],
  siteMultiplierRules: [
    { min: 1, max: 1, label: 'Single site', multiplier: 1 },
    { min: 2, max: 3, label: '2 to 3 sites', multiplier: 1.25 },
    { min: 4, max: 7, label: '4 to 7 sites', multiplier: 1.6 },
    { min: 8, max: Number.POSITIVE_INFINITY, label: '8+ sites', multiplier: 2 }
  ],
  defaultRates: {
    hourlyRate: 125,
    halfDayRate: 395,
    fullDayRate: 750,
    followUpSessionRate: 150,
    trainingHalfDayRate: 395,
    trainingFullDayRate: 695,
    remoteReviewHourlyRate: 125
  },
  addOnRates: {
    writtenReport: 225,
    actionPlan: 175,
    implementationSupport: 325,
    teamTraining: 395,
    documentCreation: 180,
    allergenSheetRate: 18,
    recipeCostingRate: 14,
    specSheetRate: 12,
    supplierReview: 250,
    recruitmentSupport: 295,
    preOpeningSupport: 550,
    mysteryReport: 225,
    mysteryDebrief: 175,
    tailoredMaterials: 195,
    followUpCoaching: 150,
    menuRefreshCredit: -120,
    fullRebuildPremium: 350,
    departmentRate: 140
  },
  settings: {
    allowNegativeTotals: false,
    defaultTaxRate: 20
  }
};

export const quoteOptions = {
  serviceTypes: Object.values(quoteServices).map((service) => ({
    label: service.label,
    value: service.id
  })),
  businessTypes: [
    { label: 'Pub', value: 'pub' },
    { label: 'Restaurant', value: 'restaurant' },
    { label: 'Hotel', value: 'hotel' },
    { label: 'Gastro pub', value: 'gastroPub' },
    { label: 'Cafe', value: 'cafe' },
    { label: 'QSR / takeaway', value: 'qsrTakeaway' },
    { label: 'Leisure / holiday park', value: 'leisureHolidayPark' },
    { label: 'Multi-site group', value: 'multiSiteGroup' },
    { label: 'Other', value: 'other' }
  ] satisfies Array<{ label: string; value: QuoteBusinessType }>,
  serviceStyles: [
    { label: 'Full service', value: 'fullService' },
    { label: 'Quick service', value: 'quickService' },
    { label: 'Mixed', value: 'mixed' }
  ] satisfies Array<{ label: string; value: QuoteServiceStyle }>,
  venueSizes: [
    { label: 'Small', value: 'small' },
    { label: 'Medium', value: 'medium' },
    { label: 'Large', value: 'large' }
  ] satisfies Array<{ label: string; value: QuoteVenueSize }>,
  revenueStreams: [
    { label: 'Food only', value: 'foodOnly' },
    { label: 'Food + wet', value: 'foodWet' },
    { label: 'Rooms', value: 'rooms' },
    { label: 'Events', value: 'events' },
    { label: 'Delivery / takeaway', value: 'deliveryTakeaway' },
    { label: 'Multiple streams', value: 'multipleStreams' }
  ] satisfies Array<{ label: string; value: QuoteRevenueStream }>,
  turnarounds: [
    { label: 'Standard', value: 'standard' },
    { label: 'Fast', value: 'fast' },
    { label: 'Urgent', value: 'urgent' }
  ] satisfies Array<{ label: string; value: QuoteTurnaround }>,
  complexities: [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }
  ] satisfies Array<{ label: string; value: QuoteComplexity }>,
  mysteryVisitModes: [
    { label: 'Mystery visit only', value: 'visitOnly' },
    { label: 'Visit + report + debrief', value: 'visitReportDebrief' }
  ] satisfies Array<{ label: string; value: QuoteMysteryVisitMode }>,
  menuScopes: [
    { label: 'Refresh', value: 'refresh' },
    { label: 'Full rebuild', value: 'fullRebuild' }
  ] satisfies Array<{ label: string; value: QuoteMenuProjectScope }>,
  trainingFormats: [
    { label: '2-hour session', value: 'twoHourSession' },
    { label: 'Half day', value: 'halfDay' },
    { label: 'Full day', value: 'fullDay' },
    { label: 'Multi-session package', value: 'multiSessionPackage' },
    { label: 'Monthly mentoring', value: 'monthlyMentoring' }
  ] satisfies Array<{ label: string; value: QuoteTrainingFormat }>,
  deliveryModes: [
    { label: 'On-site', value: 'onSite' },
    { label: 'Remote', value: 'remote' },
    { label: 'Hybrid', value: 'hybrid' }
  ] satisfies Array<{ label: string; value: QuoteDeliveryMode }>,
  openingStages: [
    { label: 'Early concept', value: 'earlyConcept' },
    { label: 'Planning', value: 'planning' },
    { label: 'Pre-opening', value: 'preOpening' },
    { label: 'Launch support', value: 'launchSupport' },
    { label: 'Post-opening stabilisation', value: 'postOpeningStabilisation' }
  ] satisfies Array<{ label: string; value: QuoteOpeningStage }>
};

export function getSiteMultiplier(siteCount: number) {
  return (
    quotePricingConfig.siteMultiplierRules.find(
      (rule) => siteCount >= rule.min && siteCount <= rule.max
    ) ?? quotePricingConfig.siteMultiplierRules[0]
  );
}

export function getTurnoverBand(monthlyTurnover: number) {
  return (
    quotePricingConfig.turnoverBands.find(
      (band) => monthlyTurnover >= band.min && monthlyTurnover <= band.max
    ) ?? quotePricingConfig.turnoverBands[0]
  );
}

export function getCoversBand(weeklyCovers: number) {
  return (
    quotePricingConfig.coversBands.find(
      (band) => weeklyCovers >= band.min && weeklyCovers <= band.max
    ) ?? quotePricingConfig.coversBands[0]
  );
}

import type { ClientProfile, QuoteInputAnswers } from '../../types';
import { quoteOptions } from './config';

export type QuoteFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'date'
  | 'select'
  | 'multi-select'
  | 'toggle';

export type QuoteFieldDefinition = {
  key: keyof QuoteInputAnswers;
  label: string;
  type: QuoteFieldType;
  placeholder?: string;
  description?: string;
  min?: number;
  step?: number;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  width?: 'full' | 'half';
  condition?: (values: QuoteInputAnswers) => boolean;
};

export type QuoteSectionDefinition = {
  id: string;
  title: string;
  description: string;
  defaultCollapsed?: boolean;
  condition?: (values: QuoteInputAnswers) => boolean;
  fields: QuoteFieldDefinition[];
};

export function createEmptyQuoteInput(client: ClientProfile, consultantName: string): QuoteInputAnswers {
  const today = new Date();
  const validUntil = new Date(today);
  validUntil.setDate(validUntil.getDate() + 30);

  return {
    clientName: client.companyName || '',
    quoteTitle: '',
    serviceType: '',
    quoteDate: today.toISOString().slice(0, 10),
    validUntil: validUntil.toISOString().slice(0, 10),
    consultantName,
    location: client.location || '',
    accountScope: client.data.accountScope === 'Single site' ? 'singleSite' : 'multiSite',
    numberOfSites: Math.max(client.data.siteCountEstimate || client.data.sites.length || 1, 1),
    clientRelationship: client.createdAt ? 'existing' : 'new',
    projectBrief: '',
    businessType: '',
    serviceStyle: '',
    venueSize: '',
    estimatedWeeklyCovers: 0,
    averageSpendPerHead: 0,
    monthlyTurnover: 0,
    annualTurnover: 0,
    kitchenTeamSize: 0,
    frontOfHouseTeamSize: 0,
    menuSectionCount: 0,
    tradingDays: 0,
    revenueStreams: [],
    isUrgent: false,
    requiredTurnaround: 'standard',
    complexityLevel: 'medium',
    requiresOnSiteVisit: false,
    onSiteVisitDays: 0,
    requiresRemoteReviewTime: false,
    remoteHours: 0,
    includesWrittenReport: false,
    includesActionPlan: false,
    includesImplementationSupport: false,
    includesTeamTraining: false,
    includesFollowUpSessions: false,
    followUpSessionCount: 0,
    includesDocumentCreation: false,
    includesAllergenWork: false,
    includesRecipeCosting: false,
    includesSpecSheets: false,
    includesSupplierReview: false,
    includesRecruitmentSupport: false,
    includesPreOpeningSupport: false,
    mysteryVisitMode: 'visitOnly',
    menuCount: 0,
    dishItemCount: 0,
    recipesNeedingCosting: 0,
    allergenSheetsNeeded: 0,
    specSheetsNeeded: 0,
    menuProjectScope: 'refresh',
    menuImplementationSupportNeeded: false,
    menuTrainingNeededAfterBuild: false,
    trainingFormat: '',
    attendeeCount: 0,
    trainingSessionCount: 0,
    trainingDeliveryMode: '',
    tailoredMaterialsRequired: false,
    followUpCoachingRequired: false,
    openingDate: '',
    conceptStage: '',
    departmentsInvolved: 0,
    projectOnSiteDays: 0,
    includesSuppliersProcurement: false,
    includesTeamHiring: false,
    includesMenuDevelopment: false,
    includesComplianceSetup: false,
    discountAmount: 0,
    discountPercentage: 0,
    manualAdjustmentAmount: 0,
    optionalRushFee: 0,
    travelFee: 0,
    accommodationFee: 0,
    taxEnabled: false,
    taxRate: 20,
    internalNotes: '',
    clientFacingNotes: '',
    manualOverrideEnabled: false,
    overrideTotal: 0,
    finalPriceHidden: false
  };
}

function isMenuService(values: QuoteInputAnswers) {
  return values.serviceType === 'menuRebuild';
}

function isTrainingService(values: QuoteInputAnswers) {
  return values.serviceType === 'trainingMentoring';
}

function isProjectService(values: QuoteInputAnswers) {
  return values.serviceType === 'newOpenings';
}

export const quoteFormSections: QuoteSectionDefinition[] = [
  {
    id: 'basic',
    title: 'Basic Client / Project Details',
    description: 'Anchor the quote to the account, consultant, service type, and project brief.',
    fields: [
      { key: 'clientName', label: 'Client name', type: 'text', required: true },
      { key: 'quoteTitle', label: 'Quote title', type: 'text', required: true },
      {
        key: 'serviceType',
        label: 'Service type',
        type: 'select',
        required: true,
        options: quoteOptions.serviceTypes
      },
      { key: 'quoteDate', label: 'Quote date', type: 'date', required: true },
      { key: 'validUntil', label: 'Valid until', type: 'date' },
      { key: 'consultantName', label: 'Consultant name', type: 'text', required: true },
      { key: 'location', label: 'Location', type: 'text' },
      {
        key: 'accountScope',
        label: 'Single-site or multi-site',
        type: 'select',
        options: [
          { label: 'Single-site', value: 'singleSite' },
          { label: 'Multi-site', value: 'multiSite' }
        ]
      },
      { key: 'numberOfSites', label: 'Number of sites', type: 'number', min: 1, step: 1 },
      {
        key: 'clientRelationship',
        label: 'Client relationship',
        type: 'select',
        options: [
          { label: 'New client', value: 'new' },
          { label: 'Existing client', value: 'existing' }
        ]
      },
      {
        key: 'projectBrief',
        label: 'Notes / brief description',
        type: 'textarea',
        width: 'full',
        placeholder: 'Outline the brief, challenges, and expected output.'
      }
    ]
  },
  {
    id: 'business-profile',
    title: 'Business Profile',
    description: 'Capture commercial scale, trading style, team size, and service mix.',
    fields: [
      {
        key: 'businessType',
        label: 'Business type',
        type: 'select',
        options: quoteOptions.businessTypes
      },
      {
        key: 'serviceStyle',
        label: 'Service style',
        type: 'select',
        options: quoteOptions.serviceStyles
      },
      {
        key: 'venueSize',
        label: 'Venue size',
        type: 'select',
        options: quoteOptions.venueSizes
      },
      {
        key: 'estimatedWeeklyCovers',
        label: 'Estimated weekly covers',
        type: 'number',
        min: 0,
        step: 1
      },
      {
        key: 'averageSpendPerHead',
        label: 'Average spend per head',
        type: 'currency',
        min: 0,
        step: 1
      },
      { key: 'monthlyTurnover', label: 'Approx monthly turnover', type: 'currency', min: 0 },
      { key: 'annualTurnover', label: 'Approx annual turnover', type: 'currency', min: 0 },
      { key: 'kitchenTeamSize', label: 'Kitchen team size', type: 'number', min: 0, step: 1 },
      {
        key: 'frontOfHouseTeamSize',
        label: 'Front of house team size',
        type: 'number',
        min: 0,
        step: 1
      },
      {
        key: 'menuSectionCount',
        label: 'Number of menus / sections',
        type: 'number',
        min: 0,
        step: 1
      },
      { key: 'tradingDays', label: 'Number of trading days', type: 'number', min: 0, step: 1 },
      {
        key: 'revenueStreams',
        label: 'Revenue streams',
        type: 'multi-select',
        width: 'full',
        options: quoteOptions.revenueStreams
      }
    ]
  },
  {
    id: 'scope',
    title: 'Scope / Complexity Questions',
    description: 'Work out complexity, delivery mode, add-ons, and operational pressure.',
    fields: [
      { key: 'isUrgent', label: 'Is this urgent?', type: 'toggle' },
      {
        key: 'requiredTurnaround',
        label: 'Required turnaround',
        type: 'select',
        options: quoteOptions.turnarounds
      },
      {
        key: 'complexityLevel',
        label: 'Complexity level',
        type: 'select',
        options: quoteOptions.complexities
      },
      { key: 'requiresOnSiteVisit', label: 'Requires on-site visit?', type: 'toggle' },
      {
        key: 'onSiteVisitDays',
        label: 'Number of on-site visit days',
        type: 'number',
        min: 0,
        step: 0.5
      },
      { key: 'requiresRemoteReviewTime', label: 'Requires remote review time?', type: 'toggle' },
      { key: 'remoteHours', label: 'Estimated remote hours', type: 'number', min: 0, step: 0.5 },
      { key: 'includesWrittenReport', label: 'Include written report?', type: 'toggle' },
      { key: 'includesActionPlan', label: 'Include action plan?', type: 'toggle' },
      {
        key: 'includesImplementationSupport',
        label: 'Include implementation support?',
        type: 'toggle'
      },
      { key: 'includesTeamTraining', label: 'Include team training?', type: 'toggle' },
      { key: 'includesFollowUpSessions', label: 'Include follow-up sessions?', type: 'toggle' },
      {
        key: 'followUpSessionCount',
        label: 'Number of follow-up sessions',
        type: 'number',
        min: 0,
        step: 1
      },
      { key: 'includesDocumentCreation', label: 'Include document creation?', type: 'toggle' },
      { key: 'includesAllergenWork', label: 'Include allergen work?', type: 'toggle' },
      { key: 'includesRecipeCosting', label: 'Include recipe costing?', type: 'toggle' },
      { key: 'includesSpecSheets', label: 'Include spec sheets?', type: 'toggle' },
      { key: 'includesSupplierReview', label: 'Include supplier review?', type: 'toggle' },
      {
        key: 'includesRecruitmentSupport',
        label: 'Include recruitment / interview support?',
        type: 'toggle'
      },
      { key: 'includesPreOpeningSupport', label: 'Include pre-opening support?', type: 'toggle' },
      {
        key: 'mysteryVisitMode',
        label: 'Mystery visit format',
        type: 'select',
        options: quoteOptions.mysteryVisitModes,
        condition: (values) => values.serviceType === 'mysteryShop'
      }
    ]
  },
  {
    id: 'menu-specific',
    title: 'Menu-Specific Questions',
    description: 'Only shown for menu rebuild work so the quote can reflect volume and output.',
    condition: isMenuService,
    fields: [
      { key: 'menuCount', label: 'Number of menus', type: 'number', min: 0, step: 1 },
      { key: 'dishItemCount', label: 'Number of dishes / items', type: 'number', min: 0, step: 1 },
      {
        key: 'recipesNeedingCosting',
        label: 'Number of recipes needing costing',
        type: 'number',
        min: 0,
        step: 1
      },
      {
        key: 'allergenSheetsNeeded',
        label: 'Number of allergen sheets needed',
        type: 'number',
        min: 0,
        step: 1
      },
      {
        key: 'specSheetsNeeded',
        label: 'Number of spec sheets needed',
        type: 'number',
        min: 0,
        step: 1
      },
      {
        key: 'menuProjectScope',
        label: 'Refresh or full rebuild',
        type: 'select',
        options: quoteOptions.menuScopes
      },
      {
        key: 'menuImplementationSupportNeeded',
        label: 'Implementation support needed?',
        type: 'toggle'
      },
      {
        key: 'menuTrainingNeededAfterBuild',
        label: 'Staff training needed after menu build?',
        type: 'toggle'
      }
    ]
  },
  {
    id: 'training-specific',
    title: 'Training-Specific Questions',
    description: 'Only shown for training and mentoring work.',
    condition: isTrainingService,
    fields: [
      {
        key: 'trainingFormat',
        label: 'Training format',
        type: 'select',
        options: quoteOptions.trainingFormats
      },
      { key: 'attendeeCount', label: 'Number of attendees', type: 'number', min: 0, step: 1 },
      { key: 'trainingSessionCount', label: 'Number of sessions', type: 'number', min: 0, step: 1 },
      {
        key: 'trainingDeliveryMode',
        label: 'On-site or remote',
        type: 'select',
        options: quoteOptions.deliveryModes
      },
      {
        key: 'tailoredMaterialsRequired',
        label: 'Tailored materials required?',
        type: 'toggle'
      },
      {
        key: 'followUpCoachingRequired',
        label: 'Follow-up coaching required?',
        type: 'toggle'
      }
    ]
  },
  {
    id: 'project-specific',
    title: 'New Opening / Project Questions',
    description: 'Shown for new opening support and larger launch projects.',
    condition: isProjectService,
    fields: [
      { key: 'openingDate', label: 'Opening date', type: 'date' },
      {
        key: 'conceptStage',
        label: 'Concept stage',
        type: 'select',
        options: quoteOptions.openingStages
      },
      {
        key: 'departmentsInvolved',
        label: 'Number of departments involved',
        type: 'number',
        min: 0,
        step: 1
      },
      {
        key: 'projectOnSiteDays',
        label: 'Number of days required on-site',
        type: 'number',
        min: 0,
        step: 0.5
      },
      {
        key: 'includesSuppliersProcurement',
        label: 'Suppliers / procurement included?',
        type: 'toggle'
      },
      { key: 'includesTeamHiring', label: 'Team hiring included?', type: 'toggle' },
      { key: 'includesMenuDevelopment', label: 'Menu development included?', type: 'toggle' },
      { key: 'includesComplianceSetup', label: 'Compliance setup included?', type: 'toggle' }
    ]
  },
  {
    id: 'commercial-controls',
    title: 'Commercial Controls',
    description: 'Control discounts, manual adjustments, travel, VAT, notes, and final output.',
    defaultCollapsed: true,
    fields: [
      { key: 'discountAmount', label: 'Discount amount', type: 'currency', min: 0 },
      { key: 'discountPercentage', label: 'Discount percentage', type: 'number', min: 0, step: 1 },
      {
        key: 'manualAdjustmentAmount',
        label: 'Manual adjustment amount',
        type: 'currency',
        step: 1
      },
      { key: 'optionalRushFee', label: 'Optional rush fee', type: 'currency', min: 0 },
      { key: 'travelFee', label: 'Travel fee', type: 'currency', min: 0 },
      { key: 'accommodationFee', label: 'Accommodation fee', type: 'currency', min: 0 },
      { key: 'taxEnabled', label: 'Apply VAT / tax?', type: 'toggle' },
      {
        key: 'taxRate',
        label: 'Tax / VAT rate (%)',
        type: 'number',
        min: 0,
        step: 0.5
      },
      {
        key: 'manualOverrideEnabled',
        label: 'Manual override final total?',
        type: 'toggle'
      },
      { key: 'overrideTotal', label: 'Override total', type: 'currency', min: 0 },
      { key: 'finalPriceHidden', label: 'Hide final price?', type: 'toggle' },
      {
        key: 'internalNotes',
        label: 'Internal notes',
        type: 'textarea',
        width: 'full'
      },
      {
        key: 'clientFacingNotes',
        label: 'Client-facing notes',
        type: 'textarea',
        width: 'full'
      }
    ]
  }
];

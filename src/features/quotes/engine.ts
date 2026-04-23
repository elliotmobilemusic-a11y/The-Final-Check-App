import { fmtCurrency, num } from '../../lib/utils';
import type {
  QuoteCalculationMultiplier,
  QuoteInputAnswers,
  QuoteLineItem,
  QuoteLineItemOverride
} from '../../types';
import {
  QUOTE_CALCULATION_VERSION,
  getCoversBand,
  getSiteMultiplier,
  getTurnoverBand,
  quotePricingConfig,
  quoteServices
} from './config';

export type QuotePricingDraftState = {
  values: QuoteInputAnswers;
  manualLineItems: QuoteLineItem[];
  hiddenAutoLineItemKeys: string[];
  autoLineItemOverrides: Record<string, QuoteLineItemOverride>;
};

export type QuotePricingPreview = {
  basePrice: number;
  multipliersUsed: QuoteCalculationMultiplier[];
  generatedLineItems: QuoteLineItem[];
  manualLineItems: QuoteLineItem[];
  hiddenAutoLineItemKeys: string[];
  autoLineItemOverrides: Record<string, QuoteLineItemOverride>;
  addOns: QuoteLineItem[];
  finalLineItems: QuoteLineItem[];
  discountAmount: number;
  discountPercentage: number;
  appliedDiscountAmount: number;
  adjustmentAmount: number;
  suggestedSubtotal: number;
  suggestedTotal: number;
  overrideTotal: number | null;
  finalTotal: number;
  finalPriceHidden: boolean;
  validationErrors: string[];
  taxEnabled: boolean;
  taxRate: number;
  taxAmount: number;
  totalWithTax: number;
  calculationVersion: number;
};

function rounded(value: number) {
  return Math.round((num(value) + Number.EPSILON) * 100) / 100;
}

function createLineItem(
  key: string,
  label: string,
  description: string,
  quantity: number,
  unitPrice: number,
  type: QuoteLineItem['type'] = 'auto',
  source?: string
): QuoteLineItem {
  const safeQuantity = rounded(quantity);
  const safeUnitPrice = rounded(unitPrice);

  return {
    id: `quote-line-${key}`,
    key,
    label,
    description,
    quantity: safeQuantity,
    unitPrice: safeUnitPrice,
    total: rounded(safeQuantity * safeUnitPrice),
    type,
    source
  };
}

function mergeAutoOverride(
  item: QuoteLineItem,
  overrides: Record<string, QuoteLineItemOverride>
): QuoteLineItem {
  const override = item.key ? overrides[item.key] : undefined;
  if (!override) return item;

  const quantity = override.quantity === undefined ? item.quantity : num(override.quantity);
  const unitPrice =
    override.unitPrice === undefined ? item.unitPrice : num(override.unitPrice);

  return {
    ...item,
    label: override.label ?? item.label,
    description: override.description ?? item.description,
    quantity,
    unitPrice,
    total: rounded(quantity * unitPrice)
  };
}

function normalizeManualLineItems(items: QuoteLineItem[]) {
  return items.map((line, index) => {
    const quantity = rounded(num(line.quantity || 0));
    const unitPrice = rounded(num(line.unitPrice || 0));

    return {
      ...line,
      id: line.id || `quote-line-manual-${index + 1}`,
      key: line.key || line.id || `manual-${index + 1}`,
      quantity,
      unitPrice,
      total: rounded(quantity * unitPrice),
      type: line.type || 'manual'
    };
  });
}

function sumLineItems(items: QuoteLineItem[]) {
  return rounded(items.reduce((sum, line) => sum + num(line.total), 0));
}

function deriveMonthlyTurnover(values: QuoteInputAnswers) {
  if (num(values.monthlyTurnover) > 0) return num(values.monthlyTurnover);
  if (num(values.annualTurnover) > 0) return num(values.annualTurnover) / 12;
  return 0;
}

function buildFlexibleBaseLineItems(values: QuoteInputAnswers) {
  const rates = quotePricingConfig.defaultRates;
  const directDays = Math.max(
    num(values.onSiteVisitDays),
    num(values.projectOnSiteDays)
  );
  const remoteHours = Math.max(num(values.remoteHours), 0);
  const items: QuoteLineItem[] = [];

  if (directDays > 0) {
    items.push(
      createLineItem(
        'custom-onsite-days',
        'On-site consultancy days',
        'Recommended day allocation for delivery on-site.',
        directDays,
        rates.fullDayRate,
        'auto',
        'base'
      )
    );
  }

  if (remoteHours > 0) {
    items.push(
      createLineItem(
        'custom-remote-hours',
        'Remote review and preparation',
        'Recommended remote review, planning, and analysis time.',
        remoteHours,
        rates.remoteReviewHourlyRate,
        'auto',
        'base'
      )
    );
  }

  if (!items.length) {
    items.push(
      createLineItem(
        'custom-minimum-scope',
        'Scoping minimum',
        'Default recommendation until delivery days or remote hours are defined.',
        1,
        rates.halfDayRate,
        'auto',
        'base'
      )
    );
  }

  return items;
}

function buildTrainingBaseLineItems(values: QuoteInputAnswers) {
  const rates = quotePricingConfig.defaultRates;
  const sessionCount = Math.max(num(values.trainingSessionCount), 1);
  const items: QuoteLineItem[] = [];

  if (values.trainingFormat === 'twoHourSession') {
    items.push(
      createLineItem(
        'training-two-hour',
        '2-hour training session',
        'Short-format tailored staff training session.',
        sessionCount,
        rounded(rates.trainingHalfDayRate * 0.58),
        'auto',
        'base'
      )
    );
  } else if (values.trainingFormat === 'halfDay') {
    items.push(
      createLineItem(
        'training-half-day',
        'Half-day training session',
        'Half-day on-site or remote training delivery.',
        sessionCount,
        rates.trainingHalfDayRate,
        'auto',
        'base'
      )
    );
  } else if (values.trainingFormat === 'fullDay') {
    items.push(
      createLineItem(
        'training-full-day',
        'Full-day training session',
        'Full-day training and operational coaching delivery.',
        sessionCount,
        rates.trainingFullDayRate,
        'auto',
        'base'
      )
    );
  } else if (values.trainingFormat === 'multiSessionPackage') {
    items.push(
      createLineItem(
        'training-package',
        'Multi-session training package',
        'Package pricing for a linked training programme.',
        sessionCount,
        rounded(rates.trainingHalfDayRate * 0.94),
        'auto',
        'base'
      )
    );
  } else if (values.trainingFormat === 'monthlyMentoring') {
    items.push(
      createLineItem(
        'training-monthly-mentoring',
        'Monthly mentoring retainer',
        'Monthly mentoring support package.',
        sessionCount,
        rounded(rates.followUpSessionRate * 2.8),
        'auto',
        'base'
      )
    );
  } else {
    return buildFlexibleBaseLineItems(values);
  }

  if (num(values.attendeeCount) > 20) {
    items.push(
      createLineItem(
        'training-large-group',
        'Large attendee group uplift',
        'Additional prep and facilitation for larger sessions.',
        num(values.attendeeCount) - 20,
        8,
        'auto',
        'base'
      )
    );
  }

  return items;
}

function buildMenuBaseLineItems(values: QuoteInputAnswers) {
  const items: QuoteLineItem[] = [
    createLineItem(
      'menu-base',
      'Menu rebuild foundation',
      'Starting point for menu strategy, costing structure, and compliance setup.',
      1,
      quoteServices.menuRebuild.basePrice,
      'auto',
      'base'
    )
  ];

  if (num(values.menuCount) > 1) {
    items.push(
      createLineItem(
        'menu-count',
        'Additional menus',
        'Additional menu sets beyond the initial included menu.',
        num(values.menuCount) - 1,
        160,
        'auto',
        'base'
      )
    );
  }

  if (num(values.dishItemCount) > 30) {
    items.push(
      createLineItem(
        'menu-volume',
        'High item count uplift',
        'Additional scoping for larger menu item counts.',
        num(values.dishItemCount) - 30,
        9,
        'auto',
        'base'
      )
    );
  }

  return items;
}

function buildServiceBaseLineItems(values: QuoteInputAnswers) {
  const serviceType = values.serviceType;
  if (!serviceType) return [];

  if (serviceType === 'trainingMentoring') {
    return buildTrainingBaseLineItems(values);
  }

  if (serviceType === 'menuRebuild') {
    return buildMenuBaseLineItems(values);
  }

  if (serviceType === 'operationalAudit') {
    return [
      createLineItem(
        'audit-base',
        'Operational audit base service',
        'Operational audit and consultancy review.',
        1,
        quoteServices.operationalAudit.basePrice,
        'auto',
        'base'
      )
    ];
  }

  if (serviceType === 'mysteryShop') {
    return [
      createLineItem(
        'mystery-base',
        'Mystery shop base visit',
        'Mystery visit delivery and guest journey review.',
        1,
        quoteServices.mysteryShop.basePrice,
        'auto',
        'base'
      )
    ];
  }

  return buildFlexibleBaseLineItems(values);
}

function buildMultiplierAdjustments(
  basePrice: number,
  values: QuoteInputAnswers
): {
  multiplierItems: QuoteLineItem[];
  multipliersUsed: QuoteCalculationMultiplier[];
  multipliedBase: number;
} {
  const venueSize = values.venueSize || 'small';
  const sizeValue = quotePricingConfig.sizeMultiplier[venueSize];
  const complexityValue = quotePricingConfig.complexityMultiplier[values.complexityLevel];
  const siteRule = getSiteMultiplier(Math.max(num(values.numberOfSites), 1));
  const urgencyValue =
    quotePricingConfig.urgencyMultiplier[
      values.isUrgent ? values.requiredTurnaround || 'urgent' : values.requiredTurnaround
    ];

  const multipliersUsed: QuoteCalculationMultiplier[] = [
    {
      key: 'size',
      label: 'Size multiplier',
      value: sizeValue,
      reason: `${venueSize[0].toUpperCase()}${venueSize.slice(1)} venue profile`
    },
    {
      key: 'complexity',
      label: 'Complexity multiplier',
      value: complexityValue,
      reason: `${values.complexityLevel[0].toUpperCase()}${values.complexityLevel.slice(1)} complexity`
    },
    {
      key: 'sites',
      label: 'Site multiplier',
      value: siteRule.multiplier,
      reason: siteRule.label
    },
    {
      key: 'urgency',
      label: 'Urgency multiplier',
      value: urgencyValue,
      reason: `${values.requiredTurnaround[0].toUpperCase()}${values.requiredTurnaround.slice(1)} turnaround`
    }
  ];

  const combinedMultiplier = multipliersUsed.reduce((product, item) => product * item.value, 1);
  const multiplierAdjustment = rounded(basePrice * (combinedMultiplier - 1));
  const multiplierItems =
    Math.abs(multiplierAdjustment) > 0.009
      ? [
          createLineItem(
            'stacked-multiplier-adjustment',
            'Scale and delivery multiplier adjustment',
            'Combined size, complexity, site, and turnaround weighting.',
            1,
            multiplierAdjustment,
            'auto',
            'multiplier'
          )
        ]
      : [];

  return {
    multiplierItems,
    multipliersUsed,
    multipliedBase: rounded(basePrice + multiplierAdjustment)
  };
}

function buildBandAdjustments(multipliedBase: number, values: QuoteInputAnswers) {
  const monthlyTurnover = deriveMonthlyTurnover(values);
  const turnoverBand = getTurnoverBand(monthlyTurnover);
  const coversBand = getCoversBand(num(values.estimatedWeeklyCovers));
  const turnoverAdjustment = rounded(multipliedBase * (turnoverBand.multiplier - 1));
  const coversAdjustment = rounded(multipliedBase * (coversBand.multiplier - 1));

  const bandItems: QuoteLineItem[] = [];

  if (Math.abs(turnoverAdjustment) > 0.009) {
    bandItems.push(
      createLineItem(
        'turnover-band-adjustment',
        'Turnover band adjustment',
        turnoverBand.label,
        1,
        turnoverAdjustment,
        'auto',
        'band'
      )
    );
  }

  if (Math.abs(coversAdjustment) > 0.009) {
    bandItems.push(
      createLineItem(
        'covers-band-adjustment',
        'Covers band adjustment',
        coversBand.label,
        1,
        coversAdjustment,
        'auto',
        'band'
      )
    );
  }

  return {
    bandItems,
    bandMultipliers: [
      {
        key: 'turnover',
        label: 'Turnover band multiplier',
        value: turnoverBand.multiplier,
        reason: turnoverBand.label
      },
      {
        key: 'covers',
        label: 'Covers band multiplier',
        value: coversBand.multiplier,
        reason: coversBand.label
      }
    ] satisfies QuoteCalculationMultiplier[]
  };
}

function buildAddOnLineItems(values: QuoteInputAnswers) {
  const rates = quotePricingConfig.addOnRates;
  const items: QuoteLineItem[] = [];

  if (values.includesWrittenReport) {
    items.push(
      createLineItem(
        'addon-written-report',
        'Written report',
        'Client-ready written report deliverable.',
        1,
        rates.writtenReport,
        'auto',
        'add-on'
      )
    );
  }

  if (values.includesActionPlan) {
    items.push(
      createLineItem(
        'addon-action-plan',
        'Action plan',
        'Structured action plan with priorities and next steps.',
        1,
        rates.actionPlan,
        'auto',
        'add-on'
      )
    );
  }

  if (values.includesImplementationSupport) {
    items.push(
      createLineItem(
        'addon-implementation-support',
        'Implementation support',
        'Follow-through support to embed the work on site.',
        1,
        rates.implementationSupport,
        'auto',
        'add-on'
      )
    );
  }

  if (values.includesTeamTraining && values.serviceType !== 'trainingMentoring') {
    items.push(
      createLineItem(
        'addon-team-training',
        'Team training session',
        'Additional team training attached to the quoted service.',
        1,
        rates.teamTraining,
        'auto',
        'add-on'
      )
    );
  }

  if (values.includesFollowUpSessions && num(values.followUpSessionCount) > 0) {
    items.push(
      createLineItem(
        'addon-follow-up-sessions',
        'Follow-up sessions',
        'Planned follow-up consultancy sessions.',
        num(values.followUpSessionCount),
        quotePricingConfig.defaultRates.followUpSessionRate,
        'auto',
        'add-on'
      )
    );
  }

  if (values.includesDocumentCreation) {
    items.push(
      createLineItem(
        'addon-document-creation',
        'Document creation',
        'Creation or clean-up of supporting operational documentation.',
        1,
        rates.documentCreation,
        'auto',
        'add-on'
      )
    );
  }

  if (values.includesAllergenWork || num(values.allergenSheetsNeeded) > 0) {
    items.push(
      createLineItem(
        'addon-allergen-work',
        'Allergen documentation',
        'Allergen sheet production and review.',
        Math.max(num(values.allergenSheetsNeeded), 1),
        rates.allergenSheetRate,
        'auto',
        'add-on'
      )
    );
  }

  if (values.includesRecipeCosting || num(values.recipesNeedingCosting) > 0) {
    items.push(
      createLineItem(
        'addon-recipe-costing',
        'Recipe costing',
        'Recipe costing and margin review.',
        Math.max(num(values.recipesNeedingCosting), 1),
        rates.recipeCostingRate,
        'auto',
        'add-on'
      )
    );
  }

  if (values.includesSpecSheets || num(values.specSheetsNeeded) > 0) {
    items.push(
      createLineItem(
        'addon-spec-sheets',
        'Spec sheets',
        'Specification sheets and operational reference documents.',
        Math.max(num(values.specSheetsNeeded), 1),
        rates.specSheetRate,
        'auto',
        'add-on'
      )
    );
  }

  if (values.includesSupplierReview || values.includesSuppliersProcurement) {
    items.push(
      createLineItem(
        'addon-supplier-review',
        'Supplier review',
        'Procurement and supplier review support.',
        1,
        rates.supplierReview,
        'auto',
        'add-on'
      )
    );
  }

  if (values.includesRecruitmentSupport || values.includesTeamHiring) {
    items.push(
      createLineItem(
        'addon-recruitment-support',
        'Recruitment / interview support',
        'Interview preparation and recruitment support.',
        1,
        rates.recruitmentSupport,
        'auto',
        'add-on'
      )
    );
  }

  if (values.includesPreOpeningSupport) {
    items.push(
      createLineItem(
        'addon-pre-opening-support',
        'Pre-opening support',
        'Pre-opening launch support and operational readiness input.',
        1,
        rates.preOpeningSupport,
        'auto',
        'add-on'
      )
    );
  }

  if (values.serviceType === 'mysteryShop' && values.mysteryVisitMode === 'visitReportDebrief') {
    items.push(
      createLineItem(
        'addon-mystery-report',
        'Mystery visit report',
        'Written mystery visit reporting output.',
        1,
        rates.mysteryReport,
        'auto',
        'add-on'
      )
    );
    items.push(
      createLineItem(
        'addon-mystery-debrief',
        'Mystery visit debrief',
        'Debrief and follow-up session after the visit.',
        1,
        rates.mysteryDebrief,
        'auto',
        'add-on'
      )
    );
  }

  if (values.tailoredMaterialsRequired) {
    items.push(
      createLineItem(
        'addon-tailored-materials',
        'Tailored training materials',
        'Custom materials and session resources.',
        1,
        rates.tailoredMaterials,
        'auto',
        'add-on'
      )
    );
  }

  if (values.followUpCoachingRequired) {
    items.push(
      createLineItem(
        'addon-follow-up-coaching',
        'Follow-up coaching',
        'Coaching support after the main session delivery.',
        1,
        rates.followUpCoaching,
        'auto',
        'add-on'
      )
    );
  }

  if (values.serviceType === 'menuRebuild') {
    if (values.menuProjectScope === 'refresh') {
      items.push(
        createLineItem(
          'addon-menu-refresh-credit',
          'Refresh scope credit',
          'Credit applied when the work is a refresh rather than a full rebuild.',
          1,
          rates.menuRefreshCredit,
          'auto',
          'add-on'
        )
      );
    }

    if (values.menuProjectScope === 'fullRebuild') {
      items.push(
        createLineItem(
          'addon-menu-full-rebuild-premium',
          'Full rebuild premium',
          'Additional scope for complete rebuild work.',
          1,
          rates.fullRebuildPremium,
          'auto',
          'add-on'
        )
      );
    }

    if (values.menuImplementationSupportNeeded) {
      items.push(
        createLineItem(
          'addon-menu-implementation',
          'Menu implementation support',
          'Implementation support after the menu work is delivered.',
          1,
          rates.implementationSupport,
          'auto',
          'add-on'
        )
      );
    }

    if (values.menuTrainingNeededAfterBuild) {
      items.push(
        createLineItem(
          'addon-menu-training',
          'Post-build staff training',
          'Training support after the menu build is completed.',
          1,
          rates.teamTraining,
          'auto',
          'add-on'
        )
      );
    }
  }

  if (values.serviceType === 'newOpenings' && num(values.departmentsInvolved) > 1) {
    items.push(
      createLineItem(
        'addon-department-coordination',
        'Additional department coordination',
        'Cross-department coordination for wider launch projects.',
        num(values.departmentsInvolved) - 1,
        rates.departmentRate,
        'auto',
        'add-on'
      )
    );
  }

  if (values.includesMenuDevelopment) {
    items.push(
      createLineItem(
        'addon-menu-development',
        'Menu development support',
        'Menu development work included within a broader project.',
        1,
        420,
        'auto',
        'add-on'
      )
    );
  }

  if (values.includesComplianceSetup) {
    items.push(
      createLineItem(
        'addon-compliance-setup',
        'Compliance setup',
        'Compliance and food safety setup for the project.',
        1,
        350,
        'auto',
        'add-on'
      )
    );
  }

  if (num(values.optionalRushFee) > 0) {
    items.push(
      createLineItem(
        'addon-rush-fee',
        'Rush fee',
        'Manual rush fee entered for the quote.',
        1,
        num(values.optionalRushFee),
        'auto',
        'fee'
      )
    );
  }

  if (num(values.travelFee) > 0) {
    items.push(
      createLineItem(
        'addon-travel-fee',
        'Travel fee',
        'Travel cost added to the quote.',
        1,
        num(values.travelFee),
        'auto',
        'fee'
      )
    );
  }

  if (num(values.accommodationFee) > 0) {
    items.push(
      createLineItem(
        'addon-accommodation-fee',
        'Accommodation fee',
        'Accommodation cost added to the quote.',
        1,
        num(values.accommodationFee),
        'auto',
        'fee'
      )
    );
  }

  return items;
}

export function validateQuoteValues(values: QuoteInputAnswers, previewFinalTotal?: number) {
  const errors: string[] = [];

  if (!values.clientName.trim()) errors.push('Client name is required.');
  if (!values.quoteTitle.trim()) errors.push('Quote title is required.');
  if (!values.serviceType) errors.push('Service type is required.');
  if (!values.quoteDate) errors.push('Quote date is required.');
  if (!values.consultantName.trim()) errors.push('Consultant name is required.');
  if (num(values.numberOfSites) < 1) errors.push('Number of sites must be at least 1.');
  if (num(values.monthlyTurnover) < 0 || num(values.annualTurnover) < 0) {
    errors.push('Turnover values cannot be negative.');
  }
  if (num(values.estimatedWeeklyCovers) < 0) errors.push('Weekly covers cannot be negative.');
  if (num(values.remoteHours) < 0 || num(values.onSiteVisitDays) < 0 || num(values.projectOnSiteDays) < 0) {
    errors.push('Days and hours cannot be negative.');
  }
  if (num(values.discountAmount) > 0 && num(values.discountPercentage) > 0) {
    errors.push('Use either a fixed discount or a percentage discount, not both.');
  }
  if (values.requiresOnSiteVisit && num(values.onSiteVisitDays) <= 0 && num(values.projectOnSiteDays) <= 0) {
    errors.push('Add at least one on-site day when on-site delivery is required.');
  }
  if (values.requiresRemoteReviewTime && num(values.remoteHours) <= 0) {
    errors.push('Add remote hours when remote review time is required.');
  }
  if (values.manualOverrideEnabled && num(values.overrideTotal) < 0) {
    errors.push('Manual override total cannot be negative.');
  }
  if (
    previewFinalTotal !== undefined &&
    !quotePricingConfig.settings.allowNegativeTotals &&
    previewFinalTotal < 0
  ) {
    errors.push('Final total cannot be negative with the current settings.');
  }

  return errors;
}

export function buildQuotePricingPreview(state: QuotePricingDraftState): QuotePricingPreview {
  const baseLineItems = buildServiceBaseLineItems(state.values);
  const basePrice = sumLineItems(baseLineItems);
  const { multiplierItems, multipliersUsed, multipliedBase } = buildMultiplierAdjustments(
    basePrice,
    state.values
  );
  const { bandItems, bandMultipliers } = buildBandAdjustments(multipliedBase, state.values);
  const addOnLineItems = buildAddOnLineItems(state.values);
  const generatedLineItems = [...baseLineItems, ...multiplierItems, ...bandItems, ...addOnLineItems];

  const visibleAutoLineItems = generatedLineItems
    .filter((line) => !state.hiddenAutoLineItemKeys.includes(line.key || ''))
    .map((line) => mergeAutoOverride(line, state.autoLineItemOverrides));
  const manualLineItems = normalizeManualLineItems(state.manualLineItems);
  const combinedLineItems = [...visibleAutoLineItems, ...manualLineItems];
  const suggestedSubtotal = sumLineItems(combinedLineItems);
  const appliedDiscountAmount =
    num(state.values.discountAmount) > 0
      ? rounded(num(state.values.discountAmount))
      : rounded(suggestedSubtotal * (num(state.values.discountPercentage) / 100));
  const adjustmentAmount = rounded(num(state.values.manualAdjustmentAmount));
  const suggestedTotal = rounded(suggestedSubtotal - appliedDiscountAmount + adjustmentAmount);
  const overrideTotal = state.values.manualOverrideEnabled
    ? rounded(num(state.values.overrideTotal))
    : null;
  const finalTotal = overrideTotal ?? suggestedTotal;
  const taxRate = state.values.taxEnabled ? num(state.values.taxRate) : 0;
  const taxAmount = rounded(finalTotal * (taxRate / 100));
  const totalWithTax = rounded(finalTotal + taxAmount);
  const validationErrors = validateQuoteValues(state.values, finalTotal);

  return {
    basePrice,
    multipliersUsed: [...multipliersUsed, ...bandMultipliers],
    generatedLineItems,
    manualLineItems,
    hiddenAutoLineItemKeys: [...state.hiddenAutoLineItemKeys],
    autoLineItemOverrides: { ...state.autoLineItemOverrides },
    addOns: addOnLineItems,
    finalLineItems: combinedLineItems,
    discountAmount: rounded(num(state.values.discountAmount)),
    discountPercentage: rounded(num(state.values.discountPercentage)),
    appliedDiscountAmount,
    adjustmentAmount,
    suggestedSubtotal,
    suggestedTotal,
    overrideTotal,
    finalTotal,
    finalPriceHidden: state.values.finalPriceHidden,
    validationErrors,
    taxEnabled: state.values.taxEnabled,
    taxRate,
    taxAmount,
    totalWithTax,
    calculationVersion: QUOTE_CALCULATION_VERSION
  };
}

export function buildQuoteScopeSummary(values: QuoteInputAnswers) {
  const bits = [
    values.location ? `${values.location}` : '',
    values.accountScope === 'multiSite'
      ? `${Math.max(num(values.numberOfSites), 1)} sites`
      : 'Single site',
    values.venueSize ? `${values.venueSize} venue` : '',
    values.complexityLevel ? `${values.complexityLevel} complexity` : '',
    values.requiredTurnaround ? `${values.requiredTurnaround} turnaround` : ''
  ].filter(Boolean);

  const brief = values.projectBrief.trim();
  return [bits.join(' • '), brief].filter(Boolean).join(' — ');
}

export function buildQuoteRenderedSummary(
  title: string,
  values: QuoteInputAnswers,
  preview: QuotePricingPreview
) {
  return {
    headline: title || values.quoteTitle || 'Consultancy quote',
    scopeSummary: buildQuoteScopeSummary(values),
    pricingSummary: `Suggested total ${fmtCurrency(preview.finalTotal)}${
      preview.taxEnabled ? ` + VAT (${fmtCurrency(preview.taxAmount)})` : ''
    }`,
    lineItemSummary: preview.finalLineItems.map(
      (line) => `${line.label}: ${fmtCurrency(line.total)}`
    ),
    externalPriceLabel: values.finalPriceHidden
      ? 'Price intentionally hidden for bespoke presentation.'
      : fmtCurrency(preview.totalWithTax),
    generatedAt: new Date().toISOString()
  };
}

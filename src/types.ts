export type Nullable<T> = T | null;

export type MeasurementUnit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'each'
  | 'portion'
  | 'pack';

export interface AuditPhoto {
  id: string;
  section: string;
  sectionLabel: string;
  caption: string;
  imageDataUrl: string;
  createdAt: string;
}

export interface AuditWasteItem {
  id: string;
  item: string;
  cost: number;
  cause: string;
  fix: string;
}

export interface AuditPortionItem {
  id: string;
  dish: string;
  loss: number;
  issue: string;
  fix: string;
}

export interface AuditOrderingItem {
  id: string;
  category: string;
  problem: string;
  impact: string;
  fix: string;
}

export interface AuditCategoryScores {
  leadership: number;
  foodQuality: number;
  systems: number;
  cleanliness: number;
  flow: number;
  training: number;
  stock: number;
  safety: number;
}

export interface AuditActionItem {
  id: string;
  title: string;
  area: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  owner: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Done';
  impact: string;
}

export interface AuditControlCheck {
  id: string;
  category: string;
  label: string;
  status: 'In Place' | 'Partial' | 'Missing' | 'N/A';
  note: string;
}

export interface AuditFormState {
  id?: string;
  clientId?: string | null;
  clientSiteId?: string | null;
  title: string;
  businessName: string;
  location: string;
  visitDate: string;
  consultantName: string;
  contactName: string;
  auditType: string;
  serviceStyle: string;
  tradingDays: string;
  coversPerWeek: number;
  averageSpend: number;
  kitchenTeamSize: number;
  mainSupplier: string;
  weeklySales: number;
  weeklyFoodCost: number;
  targetGp: number;
  actualWasteValue: number;
  labourPercent: number;
  targetLabourPercent: number;
  orderingScore: 'Low' | 'Moderate' | 'High';
  allergenConfidence: 'Low' | 'Moderate' | 'High';
  hygieneRisk: 'Low' | 'Moderate' | 'High';
  equipmentCondition: 'Strong' | 'Mixed' | 'Poor';
  summary: string;
  cultureLeadership: string;
  foodQuality: string;
  systems: string;
  layoutStrengths: string;
  layoutIssues: string;
  equipmentNeeds: string;
  layoutImpact: string;
  quickWins: string;
  longTermStrategy: string;
  priorityActions: string;
  nextVisit: string;
  categoryScores: AuditCategoryScores;
  wasteItems: AuditWasteItem[];
  portionItems: AuditPortionItem[];
  orderingItems: AuditOrderingItem[];
  actionItems: AuditActionItem[];
  controlChecks: AuditControlCheck[];
  photos: AuditPhoto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FoodSafetyCheckItem {
  id: string;
  area: string;
  item: string;
  status: 'Pass' | 'Watch' | 'Fail' | 'N/A';
  note: string;
}

export interface FoodSafetyTemperatureItem {
  id: string;
  area: string;
  reading: string;
  target: string;
  note: string;
}

export interface AuditAreaSummary {
  id: string;
  area: string;
  summary: string;
  actionPlan: string;
}

export interface FoodSafetyAuditState {
  id?: string;
  clientId?: string | null;
  clientSiteId?: string | null;
  title: string;
  siteName: string;
  location: string;
  auditDate: string;
  auditorName: string;
  managerName: string;
  servicePeriod: string;
  hygieneRating: string;
  summary: string;
  goodPractice: string;
  criticalConcerns: string;
  immediateActions: string;
  followUpDate: string;
  checks: FoodSafetyCheckItem[];
  temperatureLog: FoodSafetyTemperatureItem[];
  focusAreas: AuditAreaSummary[];
  actionItems: AuditActionItem[];
  photos: AuditPhoto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MysteryShopObservation {
  id: string;
  area: string;
  touchpoint: string;
  score: number;
  note: string;
}

export interface MysteryShopScorecard {
  arrival: number;
  service: number;
  product: number;
  cleanliness: number;
  atmosphere: number;
  value: number;
}

export interface MysteryShopAuditState {
  id?: string;
  clientId?: string | null;
  clientSiteId?: string | null;
  title: string;
  siteName: string;
  location: string;
  visitDate: string;
  shopperName: string;
  visitWindow: string;
  spendAmount: number;
  overallSummary: string;
  firstImpression: string;
  serviceStory: string;
  foodAndDrink: string;
  cleanlinessNotes: string;
  recommendations: string;
  followUpDate: string;
  scorecard: MysteryShopScorecard;
  observations: MysteryShopObservation[];
  focusAreas: AuditAreaSummary[];
  actionItems: AuditActionItem[];
  photos: AuditPhoto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LocalToolRecord<T> {
  id: string;
  title: string;
  siteName: string;
  location: string;
  reviewDate: string;
  createdAt: string;
  updatedAt: string;
  data: T;
}

export interface DishIngredient {
  id: string;
  name: string;
  qtyUsed: number;
  qtyUnit: MeasurementUnit;
  packQty: number;
  packUnit: MeasurementUnit;
  packCost: number;
  supplier: string;
}

export interface MenuDishImage {
  id: string;
  label: string;
  imageDataUrl: string;
  isPrimary: boolean;
}

export interface MenuDishRecipeCosting {
  id: string;
  linkedDishId: string;
  portionSize: string;
  numberOfPortions: number;
  targetGpPercentage: number;
  actualGpPercentage: number;
  suggestedSellingPrice: number;
  vatEnabled: boolean;
  notes: string;
  portalVisible: boolean;
}

export interface MenuDishSpecSheet {
  id: string;
  linkedDishId: string;
  portionSize: string;
  recipeMethod: string;
  platingInstructions: string;
  prepNotes: string;
  serviceNotes: string;
  holdingStorageNotes: string;
  equipmentRequired: string;
  internalNotes: string;
  clientFacingNotes: string;
  portalVisible: boolean;
}

export interface MenuDish {
  id: string;
  name: string;
  description: string;
  sellPrice: number;
  targetGp: number;
  mix: number;
  salesMixPercent: number;
  weeklySalesVolume: number;
  portionSize: string;
  allergenInformation: string;
  dietaryTags: string[];
  recipeMethod: string;
  platingInstructions: string;
  prepNotes: string;
  serviceNotes: string;
  holdingStorageNotes: string;
  equipmentRequired: string;
  internalNotes: string;
  clientFacingNotes: string;
  notes: string;
  ingredients: DishIngredient[];
  dishImages: MenuDishImage[];
  recipeCosting: MenuDishRecipeCosting;
  specSheet: MenuDishSpecSheet;
}

export interface MenuSection {
  id: string;
  name: string;
  dishes: MenuDish[];
}

export interface MenuProjectState {
  id?: string;
  clientId?: string | null;
  clientSiteId?: string | null;
  menuName: string;
  siteName: string;
  reviewDate: string;
  defaultTargetGp: number;
  selectedSectionId: string | null;
  sections: MenuSection[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SupabaseRecord<T> {
  id: string;
  user_id: string;
  client_id?: string | null;
  client_site_id?: string | null;
  title: string;
  site_name: string | null;
  location?: string | null;
  review_date: string | null;
  data: T;
  created_at: string;
  updated_at: string;
}

export interface ReportShareRecord<T = Record<string, unknown>> {
  id: string;
  user_id: string;
  report_type: string;
  title: string;
  token: string;
  source_record_id: string | null;
  payload: T;
  is_public: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientPortalVisibilityMode = 'all' | 'paid_only';

export type ClientPortalSettings = {
  enabled: boolean;
  token: string;
  welcomeTitle: string;
  welcomeMessage: string;
  portalNote: string;
  visibilityMode: ClientPortalVisibilityMode;
  hiddenAuditIds: string[];
  hiddenFoodSafetyIds: string[];
  hiddenMysteryShopIds: string[];
  hiddenMenuIds: string[];
  hiddenDishSpecIds: string[];
  hiddenRecipeCostingIds: string[];
  hiddenQuoteIds: string[];
  hiddenInvoiceIds: string[];
  showReports: boolean;
  showActionPlans: boolean;
  lastPublishedAt: string;
};

export type ClientPortalResource = {
  id: string;
  title: string;
  kind:
    | 'audit'
    | 'food_safety'
    | 'mystery_shop'
    | 'menu'
    | 'dish_spec'
    | 'recipe_costing'
    | 'quote'
    | 'invoice'
    | 'report'
    | 'action_plan';
  subtitle: string;
  reviewDate: string | null;
  url: string | null;
  shareToken?: string | null;
  sharePath?: string | null;
  locked: boolean;
  lockReason: string;
};

export type ClientPortalSharePayload = {
  clientId: string;
  clientName: string;
  status: string;
  industry: string;
  location: string;
  logoUrl: string;
  coverUrl: string;
  nextReviewDate: string;
  welcomeTitle: string;
  welcomeMessage: string;
  portalNote: string;
  visibilityMode: ClientPortalVisibilityMode;
  hasOutstandingInvoices: boolean;
  outstandingInvoiceValue: number;
  paidInvoiceValue: number;
  openTaskCount: number;
  tasks: Array<{
    id: string;
    title: string;
    owner: string;
    dueDate: string;
    status: string;
  }>;
  resources: ClientPortalResource[];
  publishedAt: string;
};

export type ClientIntakeSharePayload = {
  message?: string;
  presetAccountOwner?: string;
  presetLeadSource?: string;
  presetTier?: string;
};

export type ClientIntakeSiteInput = {
  id: string;
  name: string;
  address: string;
  website: string;
  status: 'Active' | 'Inactive';
};

export type ClientIntakeFormData = {
  businessName: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  contactPhone: string;
  preferredContactMethod: string;
  website: string;
  headOfficeAddress: string;
  businessType: string;
  weeklySalesBand: string;
  challenges: string;
  supportNeeded: string;
  extraNotes: string;
  sites: ClientIntakeSiteInput[];
};

export interface DashboardStats {
  auditCount: number;
  menuCount: number;
  latestAuditTitle: string;
  latestMenuTitle: string;
}

export type ClientContact = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  category?: 'Primary' | 'Finance' | 'Operations' | 'General';
  isPrimary: boolean;
  notes: string;
};

export type ClientSite = {
  id: string;
  name: string;
  address: string;
  website: string;
  managerName?: string;
  status: string;
  notes: string;
};

export type ClientTimelineItem = {
  id: string;
  date: string;
  type: 'Visit' | 'Audit' | 'Menu Review' | 'Call' | 'Email' | 'Task' | 'Note';
  title: string;
  summary: string;
};

export type ClientTask = {
  id: string;
  title: string;
  dueDate: string;
  owner: string;
  status: 'Open' | 'In Progress' | 'Done';
};

export type ClientDeal = {
  id: string;
  title: string;
  stage: 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  value: number;
  closeDate: string;
  owner: string;
  notes: string;
};

export type QuoteServiceType =
  | 'operationalAudit'
  | 'menuRebuild'
  | 'trainingMentoring'
  | 'kitchenLayout'
  | 'procurementSupport'
  | 'complianceFoodSafety'
  | 'mysteryShop'
  | 'newOpenings'
  | 'recruitmentSupport';

export type QuoteStatus = 'draft' | 'saved' | 'sent' | 'accepted' | 'rejected' | 'invoiced';

export type QuoteClientRelationship = 'new' | 'existing';

export type QuoteBusinessType =
  | 'pub'
  | 'restaurant'
  | 'hotel'
  | 'gastroPub'
  | 'cafe'
  | 'qsrTakeaway'
  | 'leisureHolidayPark'
  | 'multiSiteGroup'
  | 'other';

export type QuoteServiceStyle = 'fullService' | 'quickService' | 'mixed';

export type QuoteVenueSize = 'small' | 'medium' | 'large';

export type QuoteRevenueStream =
  | 'foodOnly'
  | 'foodWet'
  | 'rooms'
  | 'events'
  | 'deliveryTakeaway'
  | 'multipleStreams';

export type QuoteTurnaround = 'standard' | 'fast' | 'urgent';

export type QuoteComplexity = 'low' | 'medium' | 'high';

export type QuoteMysteryVisitMode = 'visitOnly' | 'visitReportDebrief';

export type QuoteMenuProjectScope = 'refresh' | 'fullRebuild';

export type QuoteTrainingFormat =
  | 'twoHourSession'
  | 'halfDay'
  | 'fullDay'
  | 'multiSessionPackage'
  | 'monthlyMentoring';

export type QuoteDeliveryMode = 'onSite' | 'remote' | 'hybrid';

export type QuoteOpeningStage =
  | 'earlyConcept'
  | 'planning'
  | 'preOpening'
  | 'launchSupport'
  | 'postOpeningStabilisation';

export type QuoteLineItemType = 'auto' | 'manual' | 'adjustment' | 'discount';

export type QuoteLineItem = {
  id: string;
  key?: string;
  label: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: QuoteLineItemType;
  source?: string;
};

export type QuoteLineItemOverride = {
  label?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
};

export type QuoteInputAnswers = {
  clientName: string;
  quoteTitle: string;
  serviceType: QuoteServiceType | '';
  quoteDate: string;
  validUntil: string;
  consultantName: string;
  location: string;
  accountScope: 'singleSite' | 'multiSite';
  numberOfSites: number;
  clientRelationship: QuoteClientRelationship;
  projectBrief: string;
  businessType: QuoteBusinessType | '';
  serviceStyle: QuoteServiceStyle | '';
  venueSize: QuoteVenueSize | '';
  estimatedWeeklyCovers: number;
  averageSpendPerHead: number;
  monthlyTurnover: number;
  annualTurnover: number;
  kitchenTeamSize: number;
  frontOfHouseTeamSize: number;
  menuSectionCount: number;
  tradingDays: number;
  revenueStreams: QuoteRevenueStream[];
  isUrgent: boolean;
  requiredTurnaround: QuoteTurnaround;
  complexityLevel: QuoteComplexity;
  requiresOnSiteVisit: boolean;
  onSiteVisitDays: number;
  requiresRemoteReviewTime: boolean;
  remoteHours: number;
  includesWrittenReport: boolean;
  includesActionPlan: boolean;
  includesImplementationSupport: boolean;
  includesTeamTraining: boolean;
  includesFollowUpSessions: boolean;
  followUpSessionCount: number;
  includesDocumentCreation: boolean;
  includesAllergenWork: boolean;
  includesRecipeCosting: boolean;
  includesSpecSheets: boolean;
  includesSupplierReview: boolean;
  includesRecruitmentSupport: boolean;
  includesPreOpeningSupport: boolean;
  mysteryVisitMode: QuoteMysteryVisitMode;
  menuCount: number;
  dishItemCount: number;
  recipesNeedingCosting: number;
  allergenSheetsNeeded: number;
  specSheetsNeeded: number;
  menuProjectScope: QuoteMenuProjectScope;
  menuImplementationSupportNeeded: boolean;
  menuTrainingNeededAfterBuild: boolean;
  trainingFormat: QuoteTrainingFormat | '';
  attendeeCount: number;
  trainingSessionCount: number;
  trainingDeliveryMode: QuoteDeliveryMode | '';
  tailoredMaterialsRequired: boolean;
  followUpCoachingRequired: boolean;
  openingDate: string;
  conceptStage: QuoteOpeningStage | '';
  departmentsInvolved: number;
  projectOnSiteDays: number;
  includesSuppliersProcurement: boolean;
  includesTeamHiring: boolean;
  includesMenuDevelopment: boolean;
  includesComplianceSetup: boolean;
  discountAmount: number;
  discountPercentage: number;
  manualAdjustmentAmount: number;
  optionalRushFee: number;
  travelFee: number;
  accommodationFee: number;
  taxEnabled: boolean;
  taxRate: number;
  internalNotes: string;
  clientFacingNotes: string;
  manualOverrideEnabled: boolean;
  overrideTotal: number;
  finalPriceHidden: boolean;
};

export type QuoteCalculationMultiplier = {
  key: string;
  label: string;
  value: number;
  reason: string;
};

export type QuoteRenderedSummary = {
  headline: string;
  scopeSummary: string;
  pricingSummary: string;
  lineItemSummary: string[];
  externalPriceLabel: string;
  generatedAt: string;
};

export type QuoteAuditEntry = {
  id: string;
  action: 'created' | 'updated' | 'status_changed' | 'invoice_draft_created';
  actor: string;
  at: string;
  previousTotal: number | null;
  nextTotal: number | null;
  manualOverrideUsed: boolean;
  addedLineLabels: string[];
  removedLineLabels: string[];
  note: string;
};

export type QuoteCalculationSnapshot = {
  basePrice: number;
  multipliersUsed: QuoteCalculationMultiplier[];
  allInputAnswers: QuoteInputAnswers;
  generatedLineItems: QuoteLineItem[];
  manualLineItems: QuoteLineItem[];
  hiddenAutoLineItemKeys: string[];
  autoLineItemOverrides: Record<string, QuoteLineItemOverride>;
  addOns: QuoteLineItem[];
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
  finalLineItems: QuoteLineItem[];
};

export type ClientQuote = {
  quoteId: string;
  clientId: string;
  clientName: string;
  quoteTitle: string;
  serviceType: QuoteServiceType;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  consultantName: string;
  quoteDate: string;
  validUntil: string;
  location: string;
  scopeSummary: string;
  internalNotes: string;
  clientFacingNotes: string;
  calculation: QuoteCalculationSnapshot;
  lineItems: QuoteLineItem[];
  renderedSummary: QuoteRenderedSummary;
  history: QuoteAuditEntry[];
  linkedInvoiceId?: string | null;
  archivedAt?: string | null;
};

export type ClientInvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  sourceQuoteLineItemId?: string;
  type?: 'service' | 'discount' | 'adjustment';
};

export type ClientInvoice = {
  id: string;
  number: string;
  title: string;
  issueDate: string;
  dueDate: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  notes: string;
  lines: ClientInvoiceLine[];
  taxEnabled?: boolean;
  taxRate?: number;
  paymentTermsDays?: number;
  sourceQuoteId?: string | null;
  sourceQuoteTitle?: string;
  quoteReference?: string;
  archivedAt?: string | null;
};

export type ClientProfileData = {
  profileSummary: string;
  tradingName: string;
  businessType: string;
  goals: string[];
  risks: string[];
  opportunities: string[];
  internalNotes: string;
  clientBackground: string;
  clientContext: string;
  painPoints: string;
  priorWorkHistory: string;
  importantNotes: string;
  internalRelationshipNotes: string;
  contacts: ClientContact[];
  sites: ClientSite[];
  timeline: ClientTimelineItem[];
  tasks: ClientTask[];
  accountOwner: string;
  leadSource: string;
  accountScope: 'Single site' | 'Multi-site group' | 'Group / head office';
  operatingCountry: string;
  relationshipHealth: 'Strong' | 'Watch' | 'At Risk';
  estimatedMonthlyValue: number;
  siteCountEstimate: number;
  registeredName: string;
  registeredAddress: string;
  billingName: string;
  billingEmail: string;
  billingAddress: string;
  paymentTermsDays: number;
  vatNumber: string;
  companyNumber: string;
  deals: ClientDeal[];
  quotes: ClientQuote[];
  invoices: ClientInvoice[];
  archivedWorkItemIds: string[];
  portal: ClientPortalSettings;
};

export type ClientProfile = {
  id?: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  location: string;
  notes: string;
  logoUrl: string;
  coverUrl: string;
  status: string;
  tier: string;
  industry: string;
  website: string;
  nextReviewDate: string;
  tags: string[];
  data: ClientProfileData;
  createdAt?: string;
  updatedAt?: string;
};

export type ClientRecord = {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  location: string | null;
  notes: string | null;
  logo_url: string | null;
  cover_url: string | null;
  status: string | null;
  tier: string | null;
  industry: string | null;
  website: string | null;
  next_review_date: string | null;
  tags: string[] | null;
  data: ClientProfileData | null;
  created_at: string;
  updated_at: string;
};

export type ClientSummary = {
  client: ClientRecord;
  audits: number;
  menus: number;
};

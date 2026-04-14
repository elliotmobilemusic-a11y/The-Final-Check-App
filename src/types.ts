export type Nullable<T> = T | null;

export type MeasurementUnit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'each'
  | 'portion'
  | 'pack';

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
}

export interface MenuDish {
  id: string;
  name: string;
  sellPrice: number;
  targetGp: number;
  mix: number;
  salesMixPercent: number;
  weeklySalesVolume: number;
  notes: string;
  ingredients: DishIngredient[];
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
  hiddenMenuIds: string[];
  lastPublishedAt: string;
};

export type ClientPortalResource = {
  id: string;
  title: string;
  kind: 'audit' | 'menu';
  subtitle: string;
  reviewDate: string | null;
  url: string | null;
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

export type ClientIntakeFormData = {
  businessName: string;
  tradingName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  address: string;
  postcode: string;
  businessType: string;
  siteCount: number;
  weeklySalesBand: string;
  challenges: string;
  supportNeeded: string;
  extraNotes: string;
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
  isPrimary: boolean;
  notes: string;
};

export type ClientSite = {
  id: string;
  name: string;
  address: string;
  website: string;
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

export type ClientInvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
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
};

export type ClientProfileData = {
  profileSummary: string;
  goals: string[];
  risks: string[];
  opportunities: string[];
  internalNotes: string;
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
  invoices: ClientInvoice[];
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

export type Nullable<T> = T | null;

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

export interface AuditFormState {
  id?: string;
  clientId?: string | null;
  title: string;
  businessName: string;
  location: string;
  visitDate: string;
  consultantName: string;
  contactName: string;
  auditType: string;
  weeklySales: number;
  weeklyFoodCost: number;
  targetGp: number;
  actualWasteValue: number;
  labourPercent: number;
  orderingScore: 'Low' | 'Moderate' | 'High';
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
  wasteItems: AuditWasteItem[];
  portionItems: AuditPortionItem[];
  orderingItems: AuditOrderingItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DishIngredient {
  id: string;
  name: string;
  qtyUsed: number;
  packQty: number;
  packCost: number;
}

export interface MenuDish {
  id: string;
  name: string;
  sellPrice: number;
  targetGp: number;
  mix: number;
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
  title: string;
  site_name: string | null;
  location?: string | null;
  review_date: string | null;
  data: T;
  created_at: string;
  updated_at: string;
}

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
  relationshipHealth: 'Strong' | 'Watch' | 'At Risk';
  estimatedMonthlyValue: number;
  billingName: string;
  billingEmail: string;
  billingAddress: string;
  paymentTermsDays: number;
  vatNumber: string;
  companyNumber: string;
  deals: ClientDeal[];
  invoices: ClientInvoice[];
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


export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  AGENT = 'AGENT',
  OPERATOR = 'OPERATOR',
  SUPPLIER = 'SUPPLIER'
}

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'PENDING_VERIFICATION';

export interface AgentBranding {
  agencyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contactPhone?: string;
  website?: string;
  officeAddress?: string;
  whatsappNumber?: string;
}

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchName: string;
  swiftCode?: string;
  ifscCode?: string; // For India
  currency: string;
}

export type Permission = 
  | 'CREATE_QUOTE' 
  | 'EDIT_QUOTE' 
  | 'ASSIGN_OPERATOR' 
  | 'VIEW_NET_COST' 
  | 'SET_OPERATOR_PRICE' 
  | 'APPROVE_BOOKING' 
  | 'APPROVE_CANCELLATION' 
  | 'VIEW_PAYMENTS' 
  | 'MODIFY_PAYMENTS' 
  | 'VIEW_AUDIT_LOGS' 
  | 'MANAGE_COMPANIES' 
  | 'EXPORT_ACCOUNTING' 
  | 'VIEW_FINANCE_REPORTS'
  | 'APPROVE_INVENTORY'
  | 'MANAGE_CONTRACTS' // New
  | 'APPROVE_CONTRACTS'; // New

export interface User {
  id: string;
  uniqueId?: string; // e.g. AG-IH-000123
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  status?: UserStatus;
  companyName?: string;
  phone?: string;
  city?: string;
  state?: string;
  creditLimit?: number;
  permissions?: Permission[];
  assignedDestinations?: string[]; // For Operator
  serviceLocations?: string[];
  linkedInventoryIds?: string[]; // For Supplier
  supplierType?: 'HOTEL' | 'TRANSPORT';
  agentBranding?: AgentBranding;
  bankDetails?: BankDetails; // New: For Suppliers
  customDomain?: string;
  logoUrl?: string; // Legacy
  joinedAt?: string;
  updatedAt?: string;
  password?: string; // Mock only
  welcomeEmailSent?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  timestamp: string;
  isSystem: boolean;
}

export interface ItineraryService {
  id: string;
  type: 'HOTEL' | 'ACTIVITY' | 'TRANSFER' | 'OTHER';
  name: string;
  cost: number;
  price: number;
  isRef?: boolean;
  currency?: string;
  meta?: any;
  isOperatorInventory?: boolean; 
  operatorName?: string; 
  contractId?: string; // New: Link to contract snapshot
}

export interface ItineraryItem {
  day: number;
  title: string;
  description: string;
  inclusions?: string[];
  services?: ItineraryService[];
  cityId?: string;
}

export interface CityVisit {
  id: string;
  cityId: string;
  cityName: string;
  nights: number;
  hotelId?: string;
  hotelName?: string;
}

export interface Traveler {
  title: string;
  firstName: string;
  lastName: string;
  type: 'ADULT' | 'CHILD' | 'INFANT';
  passportNo?: string;
}

export type QuoteType = 'DETAILED' | 'QUICK';

export interface QuickQuoteInputs {
  hotelCategory: '3 Star' | '4 Star' | '5 Star' | 'Luxury';
  mealPlan: 'RO' | 'BB' | 'HB' | 'FB' | 'AI';
  transfersIncluded: boolean;
  sightseeingIntensity: 'None' | 'Standard' | 'Premium';
  rooms: number;
  budgetPerPerson?: number;
}

export interface QuickQuoteTemplate {
  id: string;
  name: string;
  description: string;
  destination: string;
  nights: number;
  inputs: QuickQuoteInputs;
  defaultPax: { adults: number; children: number };
  tags: string[]; // e.g., 'Best Seller', 'Luxury', 'Budget'
  isSystem: boolean;
  createdBy: string; // 'admin' or agentId
  createdAt: string;
  basePriceEstimate?: number; // Optional visual guide
}

export interface Quote {
  id: string;
  uniqueRefNo: string;
  destination: string;
  travelDate: string;
  paxCount: number;
  serviceDetails: string;
  itinerary: ItineraryItem[];
  price?: number; // B2B Price / Net Cost for Agent
  cost?: number; // System Net Cost (Admin View)
  sellingPrice?: number; // Agent Selling Price (Client View)
  markup?: number;
  currency: string;
  agentId: string;
  agentName: string;
  staffId?: string;
  staffName?: string;
  operatorId?: string;
  operatorName?: string;
  operatorStatus?: 'ASSIGNED' | 'ACCEPTED' | 'DECLINED' | 'PENDING';
  operatorPrice?: number;
  operatorDeclineReason?: string;
  netCostVisibleToOperator?: boolean;
  status: 'PENDING' | 'CONFIRMED' | 'BOOKED' | 'CANCELLED' | 'IN_PROGRESS' | 'COMPLETED' | 'ESTIMATE';
  messages: Message[];
  hotelMode?: 'CMS' | 'REF';
  childCount?: number;
  childAges?: number[];
  cityVisits?: CityVisit[];
  travelers?: Traveler[];
  
  // Quick Quote Specific
  type?: QuoteType;
  quickQuoteInputs?: QuickQuoteInputs;
  templateId?: string; // If created from a template
}

export type BookingStatus = 'REQUESTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED_NO_REFUND' | 'CANCELLED_WITH_REFUND' | 'CANCELLATION_REQUESTED' | 'ON_HOLD' | 'REJECTED';

export type PaymentStatus = 'PENDING' | 'ADVANCE_PAID' | 'PARTIALLY_PAID' | 'PAID_IN_FULL' | 'OVERDUE' | 'REFUNDED';

export type PaymentMode = 'BANK_TRANSFER' | 'UPI' | 'CASH' | 'ONLINE' | 'CREDIT_LIMIT';

export interface PaymentEntry {
  id: string;
  type: 'ADVANCE' | 'FULL' | 'BALANCE' | 'REFUND';
  amount: number;
  date: string;
  mode: PaymentMode;
  reference: string;
  receiptNumber?: string;
  recordedBy: string;
  companyId?: string;
}

export type CancellationType = 'FREE' | 'PARTIAL' | 'NON_REFUNDABLE';
export type RefundStatus = 'PENDING' | 'PROCESSED' | 'NOT_APPLICABLE';

export interface CancellationDetails {
  requestedBy: string;
  requestedAt: string;
  reason: string;
  processedBy?: string;
  processedAt?: string;
  type?: CancellationType;
  penaltyAmount?: number;
  refundAmount?: number;
  refundStatus: RefundStatus;
  adminNote?: string;
}

export interface DriverDetails {
  name: string;
  phone: string;
  vehicleModel: string;
  vehicleNumber: string;
}

export interface Booking {
  id: string;
  quoteId: string;
  uniqueRefNo: string;
  status: BookingStatus;
  
  destination: string;
  travelDate: string;
  paxCount: number;
  travelers: Traveler[];
  itinerary: ItineraryItem[];
  
  netCost: number;
  sellingPrice: number;
  currency: string;
  
  paymentStatus: PaymentStatus;
  totalAmount: number;
  advanceAmount: number;
  paidAmount: number;
  balanceAmount: number;
  payments: PaymentEntry[];

  agentId: string;
  agentName: string;
  staffId?: string;
  
  operatorId?: string;
  operatorName?: string;
  operatorStatus?: 'ASSIGNED' | 'ACCEPTED' | 'DECLINED';
  operatorPrice?: number;
  operatorAssignedBy?: string;
  operatorAssignedAt?: string;
  operatorDeclineReason?: string;
  operatorInstruction?: string;
  netCostVisibleToOperator?: boolean;
  
  companyId?: string;

  comments: Message[];
  createdAt: string;
  updatedAt: string;
  
  cancellation?: CancellationDetails;
  driverDetails?: DriverDetails;
  remindersDisabled?: boolean;
}

// --- Inventory ---

export interface Destination {
  id: string;
  country: string;
  city: string;
  currency: string;
  timezone: string;
  isActive: boolean;
  createdBy?: string;
}

export interface Hotel {
  id: string;
  name: string;
  destinationId: string;
  category: '3 Star' | '4 Star' | '5 Star' | 'Luxury';
  roomType: string;
  mealPlan: 'RO' | 'BB' | 'HB' | 'FB' | 'AI';
  cost: number;
  costType: 'Per Room' | 'Per Person';
  season: 'Peak' | 'Off-Peak' | 'Shoulder';
  validFrom: string;
  validTo: string;
  currency?: string;
  isActive: boolean;
  createdBy?: string;
  blackoutDates?: string[];
  isOperatorInventory?: boolean;
  operatorName?: string;
  contractId?: string; // New
  supplierId?: string; // New
}

export interface Activity {
  id: string;
  activityName: string;
  destinationId: string;
  activityType: 'City Tour' | 'Adventure' | 'Cruise' | 'Show' | 'Theme Park' | 'Other';
  costAdult: number;
  costChild: number;
  ticketIncluded: boolean;
  transferIncluded: boolean;
  isActive: boolean;
  createdBy?: string;
  currency?: string;
  description?: string;
  notes?: string;
  isOperatorInventory?: boolean;
  operatorName?: string;
  contractId?: string; // New
  supplierId?: string; // New
}

export interface Transfer {
  id: string;
  transferName: string;
  destinationId: string;
  transferType: 'PVT' | 'SIC';
  vehicleType: string;
  maxPassengers: number;
  cost: number;
  costBasis: 'Per Vehicle' | 'Per Person';
  nightSurcharge: number;
  isActive: boolean;
  createdBy?: string;
  description?: string;
  notes?: string;
  blackoutDates?: string[];
  currency?: string;
  isOperatorInventory?: boolean;
  operatorName?: string;
  contractId?: string; // New
  supplierId?: string; // New
}

export interface Visa {
  id: string;
  country: string;
  visaType: string;
  processingTime: string;
  cost: number;
  documentsRequired: string[];
  isActive: boolean;
  createdBy?: string;
}

export interface FixedPackage {
  id: string;
  packageName: string;
  destinationId: string;
  nights: number;
  inclusions: string[];
  exclusions: string[];
  fixedPrice: number;
  validDates: string[];
  isActive: boolean;
  createdBy?: string;
}

// --- System ---

export interface PricingRule {
  id: string;
  name: string;
  markupType: 'Percentage' | 'Fixed';
  companyMarkup: number;
  agentMarkup: number;
  gstPercentage: number;
  roundOff: 'Nearest 1' | 'Nearest 10' | 'Nearest 100' | 'None';
  isActive: boolean;
}

export interface PricingInput {
  travelers: { adults: number; children: number; infants: number };
  hotel: { nights: number; cost: number; costType: 'Per Room' | 'Per Person'; rooms: number };
  transfers: { cost: number; quantity: number; costBasis: 'Per Vehicle' | 'Per Person' }[];
  activities: { costAdult: number; costChild: number }[];
  visa: { costPerPerson: number; enabled: boolean };
  rules: PricingRule;
}

export interface PricingBreakdown {
  netCost: number;
  companyMarkupValue: number;
  agentMarkupValue: number;
  subtotal: number;
  gstAmount: number;
  finalPrice: number;
  perPersonPrice: number;
}

export interface GSTRecord {
  id: string;
  bookingId: string;
  bookingRef: string;
  invoiceNumber: string;
  invoiceDate: string;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGst: number;
  totalInvoiceAmount: number;
  customerName: string;
  companyId: string;
  status: 'ACTIVE' | 'CANCELLED' | 'REFUNDED';
  creditNoteId?: string;
  customerGst?: string;
}

export interface GSTCreditNote {
  id: string;
  originalInvoiceId: string;
  creditNoteNumber: string;
  issuedDate: string;
  refundTaxableAmount: number;
  refundGstAmount: number;
  totalRefundAmount: number;
  companyId: string;
  reason: string;
}

export interface CompanyProfile {
  id: string;
  companyName: string;
  brandName: string;
  gstin: string;
  email: string;
  phone: string;
  address: string;
  stateCode: string;
  gstRate: number;
  gstType: 'CGST_SGST' | 'IGST';
  invoicePrefix: string;
  nextInvoiceNumber: number;
  receiptPrefix: string;
  nextReceiptNumber: number;
  creditNotePrefix: string;
  nextCreditNoteNumber: number;
  isActive: boolean;
}

export type EntityType = 'BOOKING' | 'PAYMENT' | 'QUOTE' | 'USER' | 'PERMISSION' | 'OPERATOR_ASSIGNMENT' | 'CANCELLATION' | 'GST_INVOICE' | 'GST_CREDIT_NOTE' | 'ACCOUNTING_EXPORT' | 'PAYMENT_REMINDER' | 'CURRENCY_RATE' | 'SUPPLIER_UPDATE' | 'INVENTORY_APPROVAL' | 'CONTRACT';

export interface AuditLog {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: string;
  performedByRole: UserRole;
  performedById: string;
  performedByName: string;
  description: string;
  previousValue?: any;
  newValue?: any;
  timestamp: string;
}

export interface ExportLog {
  id: string;
  type: string;
  date: string;
  userId: string;
}

export interface LedgerEntry {
  entryId: string;
  date: string;
  voucherType: 'SALES' | 'RECEIPT' | 'PAYMENT' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  voucherNumber: string;
  ledgerDebit: string;
  ledgerCredit: string;
  amount: number;
  narration: string;
  bookingId?: string;
  companyId?: string;
  gstComponent?: { type: 'IGST' | 'CGST' | 'SGST'; amount: number };
}

export interface PLTransaction {
  id: string;
  date: string;
  referenceRef: string;
  agentName: string;
  income: number;
  cogs: number;
  grossProfit: number;
  status: string;
  type: 'INVOICE' | 'CREDIT_NOTE';
}

export interface PLSummary {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  netMarginPercent: number;
  totalBookings: number;
  refundedRevenue: number;
}

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  rate: number;
  isBase: boolean;
  isActive: boolean;
}

export type ReminderType = 'ADVANCE' | 'BALANCE';
export type ReminderStage = 'FIRST' | 'SECOND' | 'FINAL';

export interface PaymentReminder {
  id: string;
  bookingId: string;
  bookingRef: string;
  type: ReminderType;
  stage: ReminderStage;
  channel: 'EMAIL' | 'WHATSAPP';
  sentAt: string;
  recipientEmail: string;
  amountDue: number;
  status: 'SENT' | 'FAILED';
}

export interface ReminderConfig {
  enabled: boolean;
  firstReminderDays: number;
  secondReminderDays: number;
  finalReminderDays: number;
  includeWhatsApp: boolean;
}

export interface TravelerInfo {
  adults: number;
  children: number;
  infants: number;
}

export interface AgentFavoriteTemplate {
  id: string;
  agentId: string;
  templateName: string;
  note?: string;
  destinationId: string;
  destinationName: string;
  nights: number;
  itinerary: ItineraryItem[];
  createdAt: string;
}

export interface TemplateServiceSlot {
  type: 'ACTIVITY' | 'TRANSFER';
  category?: string; // e.g. 'City Tour', 'Adventure', 'Cruise'
  keywords?: string[]; // fallback matching e.g. ['Airport', 'Arrival']
  isArrival?: boolean;
  isDeparture?: boolean;
  timeSlot?: 'Morning' | 'Afternoon' | 'Evening';
}

export interface TemplateDay {
  day: number;
  title: string;
  description: string;
  slots: TemplateServiceSlot[];
}

export interface ItineraryTemplate {
  id: string;
  name: string;
  destinationKeyword: string; // To match with destination string
  nights: number;
  tags?: string[];
  days: TemplateDay[];
}

export interface GuideBookEntry {
  id: string;
  title: string;
  category: 'Platform Guide' | 'Destination Info' | 'Sales Tips' | 'Policy' | 'Inventory Management';
  content: string; // Markdown or HTML
  lastUpdated: string;
  targetRoles?: UserRole[]; // Which roles can see this guide
}

export interface PaymentGateway {
    key: string;
}

// --- OPERATOR INVENTORY SYSTEM ---

export type InventoryStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface OperatorInventoryItem {
  id: string;
  operatorId: string;
  operatorName: string; // Snapshot
  type: 'HOTEL' | 'ACTIVITY' | 'TRANSFER';
  
  // Common Fields
  name: string;
  destinationId: string;
  description?: string;
  currency: string;
  
  // Pricing
  costPrice: number;
  
  // Hotel Specific
  category?: '3 Star' | '4 Star' | '5 Star' | 'Luxury';
  roomType?: string;
  mealPlan?: 'RO' | 'BB' | 'HB' | 'FB' | 'AI';
  costType?: 'Per Room' | 'Per Person';
  
  // Transfer Specific
  vehicleType?: string;
  transferType?: 'PVT' | 'SIC';
  maxPassengers?: number;
  costBasis?: 'Per Vehicle' | 'Per Person';
  
  // Activity Specific
  activityType?: string;
  costChild?: number;
  
  // Approval Workflow
  status: InventoryStatus;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

// --- SUPPLIER CONTRACT MODULE ---

export type ContractStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REJECTED';
export type PricingModel = 'NET' | 'COMMISSION' | 'RATE_CARD';

export interface SupplierContract {
  id: string;
  supplierId: string;
  supplierName: string;
  contractCode: string; // Unique reference e.g., CTR-2024-001
  contractType: 'HOTEL' | 'TRANSFER' | 'ACTIVITY' | 'MULTIPLE';
  applicableCities: string[]; // City IDs
  
  validFrom: string; // ISO Date
  validTo: string; // ISO Date
  
  pricingModel: PricingModel;
  commissionPercentage?: number; // Only for COMMISSION model
  
  cancellationPolicy: string; // Text description or policy code
  paymentTerms: string; // e.g., "Net 30", "Prepaid"
  
  blackoutDates: string[]; // ISO Dates
  taxInclusive: boolean;
  
  status: ContractStatus;
  rejectionReason?: string;
  
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Optional file attachment URL (Mock)
  documentUrl?: string;
}


export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  AGENT = 'AGENT',
  OPERATOR = 'OPERATOR',
  SUPPLIER = 'SUPPLIER'
}

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'PENDING' | 'PENDING_VERIFICATION';

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
  | 'VIEW_FINANCE_REPORTS'; 

export interface AgentBranding {
  agencyName?: string;
  logoUrl?: string;
  primaryColor?: string; // Hex code
  secondaryColor?: string; // Hex code
  website?: string;
  officeAddress?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  avatarUrl?: string;
  
  // Common Profile Fields
  companyName?: string;
  contactPerson?: string; // Often same as name, but can be distinct
  phone?: string;
  city?: string;
  state?: string;
  status?: UserStatus; // Default ACTIVE
  joinedAt?: string;
  updatedAt?: string;
  
  // Auth (Mock)
  password?: string; // Stored in mock DB, not usually exposed to frontend logic

  // Agent Specific
  creditLimit?: number;
  logoUrl?: string; // Legacy field, prefer agentBranding.logoUrl
  customDomain?: string; // CNAME for white-label links
  agentBranding?: AgentBranding; // NEW: Detailed branding configuration
  
  // Operator Specific
  serviceLocations?: string[]; // IDs of destinations
  servicesHandled?: string[]; // 'Hotel', 'Transfer', etc.
  assignedDestinations?: string[]; // Legacy field support

  // Supplier Specific (Extranet)
  supplierType?: 'HOTEL' | 'TRANSPORT';
  linkedInventoryIds?: string[]; // IDs of Hotels or Transfers they own

  // Staff Specific
  permissions?: Permission[];
  assignedCompanyIds?: string[]; // For staff belonging to specific branches
}

// --- COMPANY / BRAND CONFIGURATION ---
export interface CompanyProfile {
  id: string;
  companyName: string;
  brandName: string; // Display name
  gstin: string;
  email: string;
  phone: string;
  address: string;
  stateCode: string; // e.g., '09' for UP
  
  // GST Settings
  gstRate: number; // Default rate
  gstType: 'CGST_SGST' | 'IGST'; // Default preference (usually auto-calculated based on state)
  
  // Invoicing
  invoicePrefix: string; // e.g., "IH-DEL-"
  nextInvoiceNumber: number;
  
  // Receipts
  receiptPrefix: string; // e.g., "RCPT-"
  nextReceiptNumber: number;

  // Credit Notes
  creditNotePrefix: string; // e.g. "CN-"
  nextCreditNoteNumber: number;

  isActive: boolean;
}

// --- CURRENCY & RATES ---
export interface CurrencyConfig {
  code: string; // USD, INR, THB
  name: string;
  symbol: string;
  rate: number; // Exchange rate relative to Base Currency (USD)
  isBase: boolean;
  isActive: boolean;
}

// --- ACCOUNTING TYPES ---
export type VoucherType = 'SALES' | 'RECEIPT' | 'PAYMENT' | 'JOURNAL' | 'CREDIT_NOTE' | 'REFUND';

export interface LedgerEntry {
  entryId: string;
  date: string;
  voucherType: VoucherType;
  voucherNumber: string;
  
  // Double Entry
  ledgerDebit: string;
  ledgerCredit: string;
  amount: number;
  
  // Tax breakdown for export
  gstComponent?: {
    type: 'CGST' | 'SGST' | 'IGST';
    amount: number;
  };
  
  narration: string;
  bookingId?: string;
  companyId: string;
}

export interface ExportLog {
  id: string;
  exportedBy: string;
  exportedAt: string;
  format: 'TALLY_XML' | 'ZOHO_CSV' | 'GENERIC_CSV';
  dateRange: { from: string; to: string };
  recordCount: number;
  type: 'FULL' | 'INVOICES' | 'PAYMENTS' | 'CREDIT_NOTES';
}

// --- P&L REPORTING TYPES ---
export interface PLTransaction {
  id: string;
  date: string;
  referenceRef: string; // Booking Ref or Invoice No
  agentName: string;
  
  income: number;      // Taxable Value
  cogs: number;        // Net Cost
  grossProfit: number; // Income - COGS
  
  status: 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';
  type: 'INVOICE' | 'CREDIT_NOTE';
}

export interface PLSummary {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  netMarginPercent: number;
  totalBookings: number;
  refundedRevenue: number; // Revenue lost due to refunds
}

// --- AUDIT LOG TYPES ---
export type EntityType = 
  | 'QUOTE' 
  | 'BOOKING' 
  | 'PAYMENT' 
  | 'OPERATOR_ASSIGNMENT' 
  | 'CANCELLATION' 
  | 'USER'
  | 'PERMISSION'
  | 'GST_INVOICE'
  | 'GST_CREDIT_NOTE'
  | 'COMPANY'
  | 'ACCOUNTING_EXPORT'
  | 'PL_REPORT'
  | 'CURRENCY_RATE'
  | 'SUPPLIER_UPDATE'
  | 'PAYMENT_REMINDER'
  | 'SIGNUP'; 

export interface AuditLog {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: string;
  performedByRole: UserRole;
  performedById: string;
  performedByName: string;
  description: string;
  previousValue?: any; // serialized JSON or string
  newValue?: any; // serialized JSON or string
  timestamp: string;
  metadata?: any;
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
  type: 'HOTEL' | 'ACTIVITY' | 'TRANSFER' | 'VISA' | 'OTHER';
  name: string;
  cost: number; // Net Cost from Inventory
  currency?: string; // Source currency of the cost
  price: number; // Suggested Selling Price
  isRef?: boolean; // If true, this is a Reference item (Agent pays externally, not to Platform)
  meta?: any;
}

export interface ItineraryItem {
  day: number;
  title: string;
  description: string;
  inclusions?: string[];
  services?: ItineraryService[]; // Structured data for pricing integration
  cityId?: string; // Context for Multi-City filtering
}

export interface CityVisit {
  id: string; // Unique ID for the visit sequence
  cityId: string;
  cityName: string;
  nights: number;
  hotelId?: string; // ID of selected hotel for this city leg
  hotelName?: string; // Snapshot for display
}

// AI Route Optimization
export interface RouteOptimizationResult {
  optimizedRoute: CityVisit[];
  originalRoute: CityVisit[];
  score: number;
  reasoning: string[];
  isOptimized: boolean;
}

export interface Traveler {
  title: string;
  firstName: string;
  lastName: string;
  type: 'ADULT' | 'CHILD' | 'INFANT';
  passportNo?: string;
}

export interface Quote {
  id: string;
  uniqueRefNo: string;
  destination: string;
  travelDate: string;
  paxCount: number;
  childCount?: number;
  childAges?: number[];
  serviceDetails: string;
  itinerary?: ItineraryItem[]; // New structured data
  price?: number; // B2B Price (Agent's Cost - Payable to Platform)
  sellingPrice?: number; // B2C Price (Client's Price including Agent Markup + Ref Costs)
  cost?: number; // Internal Net Cost (Admin's Cost)
  markup?: number;
  currency: string; // The display currency for the Agent
  displayExchangeRate?: number; // The rate used when quote was locked/generated
  agentId: string;
  agentName: string;
  staffId: string;
  staffName: string;
  
  // Operator Assignment Fields
  operatorId?: string;
  operatorName?: string;
  operatorStatus?: 'PENDING' | 'ASSIGNED' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED';
  operatorDeclineReason?: string;
  operatorPrice?: number; // Specific price visible to operator (overrides net cost view)
  netCostVisibleToOperator?: boolean; // If true, operator sees the system Net Cost
  
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'BOOKED' | 'IN_PROGRESS' | 'COMPLETED';
  messages: Message[];
  hotelMode?: 'CMS' | 'REF'; // Track which logic was used
  travelers?: Traveler[];
  cityVisits?: CityVisit[]; // Multi-city configuration snapshot
}

export type BookingStatus = 
  | 'REQUESTED' 
  | 'CONFIRMED' 
  | 'ON_HOLD' 
  | 'REJECTED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED'
  | 'CANCELLATION_REQUESTED' // New
  | 'CANCELLED_WITH_REFUND' // New
  | 'CANCELLED_NO_REFUND'; // New

// --- PAYMENT TYPES ---
export type PaymentStatus = 'PENDING' | 'ADVANCE_PAID' | 'PARTIALLY_PAID' | 'PAID_IN_FULL' | 'OVERDUE' | 'REFUNDED' | 'REFUND_PENDING';
export type PaymentMode = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'ONLINE' | 'CREDIT_LIMIT';
export type PaymentGateway = 'RAZORPAY' | 'STRIPE' | 'MANUAL';

export interface PaymentEntry {
  id: string;
  type: 'ADVANCE' | 'BALANCE' | 'FULL' | 'REFUND';
  amount: number;
  date: string;
  mode: PaymentMode;
  reference?: string; // Transaction ID
  gateway?: PaymentGateway; // New field
  gatewayTransactionId?: string; // New field
  receiptNumber?: string; // Auto-generated Receipt ID
  recordedBy: string; // User ID or 'SYSTEM'
  companyId?: string; // Which company received this payment
}

// --- REMINDER TYPES ---
export type ReminderType = 'ADVANCE' | 'BALANCE' | 'OVERDUE';
export type ReminderStage = 'FIRST' | 'SECOND' | 'FINAL';
export type ReminderChannel = 'EMAIL' | 'WHATSAPP';

export interface PaymentReminder {
  id: string;
  bookingId: string;
  bookingRef: string;
  type: ReminderType;
  stage: ReminderStage;
  channel: ReminderChannel;
  sentAt: string;
  recipientEmail: string;
  amountDue: number;
  status: 'SENT' | 'FAILED' | 'VIEWED';
}

export interface ReminderConfig {
  enabled: boolean;
  firstReminderDays: number; // e.g. 2 days after booking
  secondReminderDays: number; // e.g. 5 days after booking
  finalReminderDays: number; // e.g. 7 days after booking
  includeWhatsApp: boolean;
}

// --- CANCELLATION TYPES ---
export type CancellationType = 'FREE' | 'PARTIAL' | 'NON_REFUNDABLE';
export type RefundStatus = 'NOT_APPLICABLE' | 'PENDING' | 'PROCESSED' | 'DECLINED';

export interface CancellationDetails {
  requestedBy: string; // User ID
  requestedAt: string;
  reason: string;
  processedBy?: string; // Admin ID
  processedAt?: string;
  type?: CancellationType;
  penaltyAmount?: number;
  refundAmount?: number;
  refundStatus?: RefundStatus;
  adminNote?: string;
}

export interface DriverDetails {
  name: string;
  phone: string;
  vehicleNumber: string;
  vehicleModel: string;
  assignedAt: string;
}

export interface Booking {
  id: string;
  quoteId: string;
  uniqueRefNo: string; // Same as quote or new sequence
  status: BookingStatus;
  
  // Snapshot Data (Locked)
  destination: string;
  travelDate: string;
  paxCount: number;
  travelers: Traveler[];
  itinerary: ItineraryItem[];
  
  // Locked Pricing
  netCost: number;
  sellingPrice: number;
  currency: string;
  
  // Payment Tracking
  paymentStatus: PaymentStatus;
  totalAmount: number;   // Should equal sellingPrice (Client Price)
  advanceAmount: number; // Required Advance
  paidAmount: number;    // Total Paid so far
  balanceAmount: number; // Remaining Balance
  payments: PaymentEntry[];
  
  // Reminder Logic
  remindersDisabled?: boolean; 

  // Cancellation Data
  cancellation?: CancellationDetails;

  // Stakeholders
  agentId: string;
  agentName: string;
  staffId: string;
  
  // Multi-Company Support
  companyId: string; // The branch/entity owning this booking
  
  // Operator Assignment (Booking Level)
  operatorId?: string;
  operatorName?: string;
  operatorStatus?: 'ASSIGNED' | 'ACCEPTED' | 'DECLINED';
  operatorDeclineReason?: string;
  operatorPrice?: number; // Fixed price if set
  netCostVisibleToOperator?: boolean;
  operatorAssignedAt?: string;
  operatorAssignedBy?: string;
  operatorInstruction?: string;
  
  // Execution Details
  driverDetails?: DriverDetails;

  comments: Message[];
  createdAt: string;
  updatedAt: string;
}

// --- GST & COMPLIANCE TYPES ---

export interface GSTRecord {
  id: string;
  bookingId: string;
  bookingRef: string;
  invoiceNumber: string;
  invoiceDate: string;
  
  taxableAmount: number;
  gstRate: number; // Percentage
  
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  
  totalGst: number;
  totalInvoiceAmount: number;
  
  customerName: string; // Agent Name
  customerGst?: string; // Optional Agent GSTIN
  
  companyId: string; // Linked Company
  
  status: 'ACTIVE' | 'CANCELLED' | 'REFUNDED';
  creditNoteId?: string; // If refunded
}

export interface GSTCreditNote {
  id: string;
  originalInvoiceId: string;
  creditNoteNumber: string;
  issuedDate: string;
  
  refundTaxableAmount: number;
  refundGstAmount: number;
  totalRefundAmount: number; // refundTaxable + refundGst
  
  companyId: string;
  
  reason: string;
}

// --- CMS & Inventory Types ---

export interface Destination {
  id: string;
  country: string;
  city: string;
  currency: string;
  timezone: string;
  isActive: boolean;
  createdBy?: string; // User ID of creator
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
  currency?: string; // Source currency of the cost (e.g. THB)
  season: 'Peak' | 'Off-Peak' | 'Shoulder';
  validFrom: string;
  validTo: string;
  isActive: boolean;
  createdBy?: string;
  blackoutDates?: string[]; // YYYY-MM-DD strings
}

export interface Activity {
  id: string;
  activityName: string;
  destinationId: string;
  activityType: 'Adventure' | 'City Tour' | 'Cruise' | 'Show' | 'Theme Park' | 'Other';
  costAdult: number;
  costChild: number;
  currency?: string;
  ticketIncluded: boolean;
  transferIncluded: boolean;
  isActive: boolean;
  createdBy?: string;
  description?: string;
  notes?: string;
}

export interface Transfer {
  id: string;
  transferName: string;
  destinationId: string;
  transferType: 'PVT' | 'SIC';
  vehicleType: string; // e.g., Sedan, SUV, Van, Coach
  maxPassengers: number;
  cost: number;
  currency?: string;
  costBasis: 'Per Vehicle' | 'Per Person';
  nightSurcharge: number; 
  isActive: boolean;
  createdBy?: string;
  description?: string;
  notes?: string;
  blackoutDates?: string[]; // YYYY-MM-DD strings
}

export interface Visa {
  id: string;
  country: string;
  visaType: string; // e.g., Tourist 30 Days
  processingTime: string; // e.g., 3-4 Working Days
  cost: number;
  currency?: string;
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
  currency?: string;
  validDates: string[]; // Specific departure dates
  isActive: boolean;
  createdBy?: string;
}

export interface PricingRule {
  id: string;
  name: string;
  markupType: 'Percentage' | 'Flat';
  companyMarkup: number;
  agentMarkup: number;
  gstPercentage: number;
  roundOff: 'Nearest 1' | 'Nearest 10' | 'Nearest 100' | 'None';
  isActive: boolean;
}

// --- Pricing Engine Types ---

export interface TravelerInfo {
  adults: number;
  children: number;
  childAges?: number[];
  infants: number;
}

export interface PricingInput {
  travelers: TravelerInfo;
  hotel: {
    nights: number;
    cost: number;
    costType: 'Per Room' | 'Per Person';
    rooms: number;
  };
  transfers: Array<{
    cost: number;
    costBasis: 'Per Vehicle' | 'Per Person';
    quantity: number;
  }>;
  activities: Array<{
    costAdult: number;
    costChild: number;
  }>;
  visa: {
    costPerPerson: number;
    enabled: boolean;
  };
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

// --- System Template Types ---

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

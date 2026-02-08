
export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  AGENT = 'AGENT',
  OPERATOR = 'OPERATOR',
  HOTEL_PARTNER = 'HOTEL_PARTNER'
}

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'PENDING_VERIFICATION';

export interface AgentBranding {
  agencyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contactPhone?: string;
  email?: string;
  website?: string;
  officeAddress?: string;
  whatsappNumber?: string;
  defaultMarkup?: number; // Added for automatic pricing
}

export interface BankDetails {
    currency: string;
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    branchName?: string;
    ifscCode?: string;
    swiftCode?: string;
}

export interface UserNotification {
    id: string;
    recipientId: string; // User ID
    title: string;
    message: string;
    type: 'BOOKING' | 'PAYMENT' | 'ALERT' | 'SUCCESS' | 'WARNING' | 'INFO';
    link?: string; // URL to navigate to
    isRead: boolean;
    createdAt: string;
}

export interface User {
  id: string;
  uniqueId?: string; // e.g. AG-IH-0001
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  companyName?: string;
  phone?: string;
  city?: string;
  state?: string;
  status?: UserStatus;
  password?: string; // Optional for types, usually handled by Auth
  
  // Agent Specific
  creditLimit?: number;
  walletBalance?: number;
  customDomain?: string;
  logoUrl?: string;
  agentBranding?: AgentBranding;

  // Operator Specific
  assignedDestinations?: string[]; // IDs of destinations
  serviceLocations?: string[];

  // Staff Specific
  permissions?: Permission[];

  // Partner Specific
  partnerType?: 'HOTEL' | 'TRANSPORT';
  linkedInventoryIds?: string[];
  bankDetails?: BankDetails;

  joinedAt?: string;
  updatedAt?: string;
  dashboardRoute?: string;
  
  // Email logic
  welcomeEmailSent?: boolean;
  welcomeEmailSentAt?: any;
}

export type Permission = 
  | 'CREATE_QUOTE' | 'EDIT_QUOTE' | 'ASSIGN_OPERATOR' | 'VIEW_NET_COST'
  | 'SET_OPERATOR_PRICE' | 'APPROVE_BOOKING' | 'APPROVE_CANCELLATION'
  | 'VIEW_PAYMENTS' | 'MODIFY_PAYMENTS' | 'VIEW_AUDIT_LOGS'
  | 'MANAGE_COMPANIES' | 'EXPORT_ACCOUNTING' | 'VIEW_FINANCE_REPORTS'
  | 'APPROVE_INVENTORY';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  timestamp: string;
  isSystem: boolean;
}

export interface OperationalDetails {
  tripManagerName?: string;
  tripManagerPhone?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleModel?: string;
  vehicleNumber?: string;
  whatsappGroupLink?: string;
  paymentStatus?: 'PENDING' | 'PARTIAL' | 'CLEARED';
  paymentNotes?: string;
  otherNotes?: string;
}

export type QuoteType = 'QUICK' | 'DETAILED';

export interface QuickQuoteInputs {
  hotelCategory: '3 Star' | '4 Star' | '5 Star' | 'Luxury';
  mealPlan: 'RO' | 'BB' | 'HB' | 'FB' | 'AI';
  transfersIncluded: boolean;
  sightseeingIntensity: 'None' | 'Standard' | 'Premium';
  rooms: number;
}

export interface CityVisit {
  id: string;
  cityId: string;
  cityName: string;
  nights: number;
}

export interface Traveler {
  title: string;
  firstName: string;
  lastName: string;
  type: 'ADULT' | 'CHILD' | 'INFANT';
  passportNo?: string;
  age?: number;
}

export interface ItineraryService {
    id: string;
    inventory_id?: string;
    type: 'HOTEL' | 'ACTIVITY' | 'TRANSFER' | 'CUSTOM' | 'OTHER' | 'VISA';
    name: string;
    description?: string;
    cost: number;
    price: number;
    currency: string;
    quantity: number;
    duration_nights?: number;
    isRef?: boolean; // If reference only (not booked)
    meta?: any; // For storing roomType, mealPlan, vehicle etc.
}

export interface ItineraryItem {
  day: number;
  title: string;
  description: string;
  cityId?: string; // Optional context
  inclusions?: string[];
  services?: ItineraryService[];
}

export interface Quote {
  id: string;
  uniqueRefNo: string;
  version: number;
  isLocked: boolean;
  previousVersionId?: string;
  
  leadGuestName?: string;
  destination: string;
  travelDate: string;
  paxCount: number;
  serviceDetails: string;
  itinerary: ItineraryItem[];
  
  price?: number; // Net B2B Cost
  cost?: number; // System Net Cost (Supplier)
  sellingPrice?: number; // Agent Selling Price
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
  operatorAssignedBy?: string;
  operatorAssignedAt?: string;
  operatorInstruction?: string;
  
  operationalDetails?: OperationalDetails;
  
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PENDING' | 'CONFIRMED' | 'BOOKED' | 'CANCELLED' | 'IN_PROGRESS' | 'COMPLETED' | 'ESTIMATE' | 'REJECTED';
  
  messages: Message[];
  publicNote?: string;
  
  hotelMode?: 'CMS' | 'REF';
  childCount?: number;
  childAges?: number[];
  cityVisits?: CityVisit[];
  travelers?: Traveler[];
  
  type?: QuoteType;
  quickQuoteInputs?: QuickQuoteInputs;
  templateId?: string;

  createdAt?: string;
  updatedAt?: string;
}

// Admin / Inventory Types

export interface Destination {
  id: string;
  city: string;
  country: string;
  currency: string;
  timezone: string;
  isActive: boolean;
  imageUrl?: string;
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
  currency: string;
  season: 'Peak' | 'Off-Peak' | 'Shoulder';
  validFrom?: string;
  validTo?: string;
  isActive: boolean;
  description?: string;
  imageUrl?: string;
  address?: string;
  contactPhone?: string;
  email?: string;
  website?: string;
  createdBy?: string;
  
  // Status workflow
  status?: InventoryStatus;
  operatorName?: string;
}

export interface ActivityTransferOptions {
    sic: { enabled: boolean; costPerPerson: number };
    pvt: { enabled: boolean; costPerVehicle: number; vehicleCapacity?: number };
}

export interface Activity {
  id: string;
  activityName: string;
  destinationId: string;
  activityType: 'City Tour' | 'Adventure' | 'Cruise' | 'Show' | 'Theme Park' | 'Other';
  costAdult: number;
  costChild: number;
  currency: string;
  ticketIncluded: boolean;
  transferIncluded: boolean; // Legacy
  transferOptions?: ActivityTransferOptions;
  isActive: boolean;
  description?: string;
  notes?: string;
  duration?: string;
  startTime?: string;
  imageUrl?: string;
  season?: 'Peak' | 'Off-Peak' | 'Shoulder' | 'All Year';
  validFrom?: string;
  validTo?: string;
  createdBy?: string;
  // Status workflow (if operator created)
  status?: InventoryStatus;
}

export interface Transfer {
  id: string;
  transferName: string;
  destinationId: string;
  transferType: 'PVT' | 'SIC';
  vehicleType: string;
  maxPassengers: number;
  luggageCapacity?: number;
  cost: number;
  currency: string;
  costBasis: 'Per Vehicle' | 'Per Person';
  nightSurcharge: number;
  isActive: boolean;
  description?: string;
  notes?: string;
  meetingPoint?: string;
  imageUrl?: string;
  season?: 'Peak' | 'Off-Peak' | 'Shoulder' | 'All Year';
  validFrom?: string;
  validTo?: string;
  createdBy?: string;
  // Status workflow
  status?: InventoryStatus;
}

export interface Visa {
  id: string;
  country: string;
  visaType: string;
  processingTime: string;
  cost: number;
  validity?: string;
  entryType?: 'Single' | 'Double' | 'Multiple';
  description?: string;
  documentsRequired: string[];
  isActive: boolean;
  createdBy?: string;
}

export interface FixedPackage {
  id: string;
  packageName: string;
  destinationId: string;
  nights: number;
  basePax?: number;
  fixedPrice: number;
  inclusions: string[];
  exclusions: string[];
  validDates: string[]; // ISO Date strings
  dateType?: 'SPECIFIC' | 'DAILY' | 'RANGE'; // Updated to support RANGE
  validFrom?: string; // Added for RANGE
  validTo?: string;   // Added for RANGE
  description?: string;
  imageUrl?: string;
  category?: string;
  hotelDetails?: string;
  notes?: string;
  itinerary?: ItineraryItem[];
  isActive: boolean;
  createdBy?: string;
}

export interface TemplateServiceSlot {
  type: 'ACTIVITY' | 'TRANSFER';
  category?: string;
  keywords?: string[];
  timeSlot?: 'Morning' | 'Afternoon' | 'Evening' | 'Full Day';
  isArrival?: boolean;
  isDeparture?: boolean;
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
  destinationKeyword: string;
  nights: number;
  tags: string[];
  days: TemplateDay[];
}

export interface AgentFavoriteTemplate {
    id: string;
    agentId: string;
    templateName: string;
    destinationName: string;
    nights: number;
    itinerary: ItineraryItem[];
    note?: string;
    createdAt: string;
}

export interface QuickQuoteTemplate {
    id: string;
    name: string;
    description: string;
    destination: string;
    nights: number;
    defaultPax: { adults: number; children: number };
    inputs: QuickQuoteInputs;
    tags: string[];
    isSystem: boolean;
    createdBy: string;
    createdAt: string;
    basePriceEstimate?: number;
}

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
  targetCurrency: string;
  travelers: { adults: number; children: number; infants: number };
  hotel: { nights: number; cost: number; costType: 'Per Room' | 'Per Person'; rooms: number; currency: string };
  transfers: { cost: number; costBasis: 'Per Vehicle' | 'Per Person'; quantity: number; currency: string }[];
  activities: { costAdult: number; costChild: number; currency: string }[];
  visa: { costPerPerson: number; enabled: boolean; currency: string };
  rules: PricingRule;
}

export interface PricingBreakdown {
  supplierCost: number;
  companyMarkupValue: number;
  platformNetCost: number;
  agentMarkupValue: number;
  subtotal: number;
  gstAmount: number;
  finalPrice: number;
  perPersonPrice: number;
  netCost?: number; // Alias for platformNetCost
}

export interface SystemNotification {
    id: string;
    content: string;
    type: 'INFO' | 'URGENT' | 'PROMO' | 'MEETING';
    link?: string;
    isActive: boolean;
    createdAt?: string;
}

// Booking & Finance Types

export type BookingStatus = 'REQUESTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED_NO_REFUND' | 'CANCELLED_WITH_REFUND' | 'REJECTED' | 'ON_HOLD' | 'CANCELLATION_REQUESTED';
export type PaymentStatus = 'PENDING' | 'ADVANCE_PAID' | 'PARTIALLY_PAID' | 'PAID_IN_FULL' | 'OVERDUE';
export type PaymentMode = 'BANK_TRANSFER' | 'UPI' | 'CASH' | 'ONLINE' | 'CREDIT_LIMIT' | 'WALLET';
export type CancellationType = 'FREE' | 'PARTIAL' | 'NON_REFUNDABLE';

export interface DriverDetails {
    name: string;
    phone: string;
    vehicleModel: string;
    vehicleNumber: string;
}

export interface BookingOpsDetails {
    driverName?: string;
    driverPhone?: string;
    vehicleModel?: string;
    vehicleNumber?: string;
    tourManagerName?: string;
    tourManagerPhone?: string;
    tourGuideName?: string;
    otherNotes?: string;
}

export interface PaymentEntry {
    id: string;
    type: 'ADVANCE' | 'FULL' | 'BALANCE' | 'REFUND';
    amount: number;
    date: string;
    mode: PaymentMode;
    reference: string;
    receiptNumber: string;
    recordedBy: string; // User ID
    companyId: string;
    verificationStatus?: 'VERIFIED' | 'FAILED_VERIFY' | 'PENDING';
    source?: 'WEBHOOK' | 'MANUAL' | 'SYSTEM' | 'RAZORPAY_WEBHOOK' | 'RAZORPAY_WEBHOOK_VERIFIED';
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
    
    netCost: number; // Cost to Agent
    sellingPrice: number; // Client Price
    currency: string;
    
    paymentStatus: PaymentStatus;
    totalAmount: number; // Usually Net Cost if B2B
    advanceAmount: number;
    paidAmount: number;
    balanceAmount: number;
    payments: PaymentEntry[];
    
    agentId: string;
    agentName: string;
    staffId: string | null;
    
    operatorId: string | null;
    operatorName: string | null;
    operatorStatus?: 'ASSIGNED' | 'ACCEPTED' | 'DECLINED' | 'PENDING';
    operatorInstruction?: string;
    operatorDeclineReason?: string;
    operatorPrice?: number;
    operatorAssignedBy?: string;
    operatorAssignedAt?: string;
    netCostVisibleToOperator?: boolean;
    
    driverDetails?: DriverDetails;
    opsDetails?: BookingOpsDetails;

    companyId: string;
    publicNote?: string;
    
    comments: Message[];
    
    cancellation?: {
        requestedBy: string;
        requestedAt: string;
        reason: string;
        type?: CancellationType;
        penaltyAmount?: number;
        refundAmount?: number;
        refundStatus?: 'PENDING' | 'PROCESSED';
        adminNote?: string;
    };

    createdAt: string;
    updatedAt: string;
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
}

export interface GSTCreditNote {
    id: string;
    originalInvoiceId: string;
    creditNoteNumber: string;
    issuedDate: string;
    reason: string;
    refundTaxableAmount: number;
    refundGstAmount: number;
    totalRefundAmount: number;
    companyId: string;
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

export interface LedgerEntry {
    entryId: string;
    date: string;
    voucherType: 'SALES' | 'RECEIPT' | 'CREDIT_NOTE';
    voucherNumber: string;
    ledgerDebit: string;
    ledgerCredit: string;
    amount: number;
    narration: string;
    bookingId?: string;
    companyId: string;
    gstComponent?: { type: 'CGST' | 'SGST' | 'IGST'; amount: number };
}

export interface ExportLog {
    id: string;
    type: 'TALLY' | 'ZOHO';
    generatedAt: string;
    userId: string;
    dateRange: { from: string; to: string };
    recordCount: number;
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
    type: 'INVOICE' | 'ADJUSTMENT';
}

export interface PLSummary {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    netMarginPercent: number;
    totalBookings: number;
    refundedRevenue: number;
}

// Common Utility Types

export interface CurrencyConfig {
    code: string;
    name: string;
    symbol: string;
    rate: number;
    isBase: boolean;
    isActive: boolean;
}

export type EntityType = 'BOOKING' | 'PAYMENT' | 'QUOTE' | 'USER' | 'PERMISSION' | 'OPERATOR_ASSIGNMENT' | 'CANCELLATION' | 'INVENTORY_APPROVAL' | 'ACCOUNTING_EXPORT' | 'CONTRACT' | 'GST_INVOICE';

export interface AuditLog {
    id: string;
    entityType: EntityType;
    entityId: string;
    action: string;
    performedByRole?: UserRole;
    performedById?: string;
    performedByName: string;
    description: string;
    previousValue?: any;
    newValue?: any;
    timestamp: string;
}

// Inventory Workflow Types
export type InventoryStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface PackagePricingTiers {
    solo: number;
    twin: number; // 2 pax (Base)
    quad: number; // 4 pax
    six: number;  // 6 pax
    childWithBed?: number;
    childNoBed?: number;
}

export interface OperatorInventoryItem {
    id: string;
    productId: string; // Grouping revisions
    version: number;
    isCurrent: boolean;
    operatorId: string;
    operatorName: string;
    type: 'HOTEL' | 'ACTIVITY' | 'TRANSFER' | 'PACKAGE';
    name: string;
    destinationId: string;
    description: string;
    currency: string;
    
    // Union fields for simplicity
    costPrice: number; // Base cost (Usually Twin Sharing or Lowest)
    costAdult?: number;
    costChild?: number;
    
    // Hotel
    category?: string;
    roomType?: string;
    mealPlan?: string;
    
    // Transfer
    vehicleType?: string;
    maxPassengers?: number;
    luggageCapacity?: number;
    
    // Activity
    activityType?: string;
    transferOptions?: ActivityTransferOptions;

    // Package Extended
    hotelName?: string;
    pricingTiers?: PackagePricingTiers;
    nights?: number;
    validDates?: string[];
    dateType?: 'SPECIFIC' | 'RANGE';
    inclusions?: string[];
    exclusions?: string[];
    itinerary?: ItineraryItem[];

    imageUrl?: string;
    validFrom?: string;
    validTo?: string;

    status: InventoryStatus;
    rejectionReason?: string;
    approvedBy?: string;
    approvedAt?: string;
    createdAt: string;
}

export interface GuideBookEntry {
    id: string;
    title: string;
    category: string; // 'Platform Guide' | 'Destination Info' | 'Policy' | 'Inventory Management'
    lastUpdated: string;
    targetRoles: UserRole[];
    content: string; // Markdown supported
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
    recipientEmail?: string;
    recipientPhone?: string;
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

export interface PaymentGateway {
    keyId: string;
    keySecret: string; // Should be handled securely/backend only usually
    webhookSecret: string;
}

export interface ExpiringRate {
    id: string;
    type: 'HOTEL_RATE' | 'TRANSFER_RATE';
    name: string;
    details: string;
    validTo: string;
    daysRemaining: number;
    supplierName: string;
}

export interface SystemAlert {
    id: string;
    type: 'INFO' | 'WARNING' | 'CRITICAL';
    title: string;
    description: string;
    actionLink?: string;
    createdAt: string;
}

export interface OpsStats {
    pendingInventory: number;
    pendingHotels: number;
    expiringRates: number;
    rejectedItems: number;
}

export type ContractStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'EXPIRED' | 'SUSPENDED';

export interface SupplierContract {
    id: string;
    contractCode: string;
    supplierId: string;
    supplierName: string;
    status: ContractStatus;
    
    contractType: 'HOTEL' | 'TRANSFER' | 'ACTIVITY' | 'MULTIPLE';
    validFrom: string;
    validTo: string;
    
    pricingModel: 'NET' | 'COMMISSION' | 'RATE_CARD';
    commissionPercentage?: number;
    taxInclusive: boolean;
    
    applicableCities: string[]; // City IDs
    blackoutDates: string[]; // ISO Dates
    
    cancellationPolicy: string;
    paymentTerms: string;
    
    documentUrl?: string; // PDF Link
    
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    approvedBy?: string;
    rejectionReason?: string;
}

export interface TravelerInfo { 
    adults: number;
    children: number;
    infants: number;
}

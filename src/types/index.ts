export type UserRole = 'TENANT' | 'LANDLORD' | 'AGENT' | 'ADMIN';

export type LandlordVerificationStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'CORRECTION_REQUIRED';

export type AgentVerificationStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'PENDING_AGENT_APPROVAL'
  | 'APPROVED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'CORRECTION_REQUIRED'
  | 'AGENT_CORRECTION_REQUIRED'
  | 'SUSPENDED';

export type UserAccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

// ============================================================================
// CORE IDENTITY & SECURITY VERIFICATION TYPES (HOMEZA 3-STEP VERIFICATION)
// ============================================================================
export type IdentityVerificationStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'PROCESSING'
  | 'VERIFIED'
  | 'FAILED'
  | 'REVIEW';

export type NameVerificationStatus =
  | 'NOT_STARTED'
  | 'VERIFIED'
  | 'MISMATCH'
  | 'REVIEW';

export type PhoneVerificationStatus =
  | 'NOT_STARTED'
  | 'OTP_SENT'
  | 'VERIFIED'
  | 'FAILED';

export type OverallVerificationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'VERIFIED'
  | 'FAILED'
  | 'REVIEW';

export interface UserVerificationStatus {
  identityVerificationStatus: IdentityVerificationStatus;
  nameVerificationStatus: NameVerificationStatus;
  phoneVerificationStatus: PhoneVerificationStatus;
  overallVerificationStatus: OverallVerificationStatus;

  // Identity / NIN details (safe masked storage only)
  idType?: string;
  maskedIdNumber?: string;
  verifiedName?: string;
  verifiedFullName?: string;
  nameMatchConfidence?: 'MATCH' | 'PARTIAL/REVIEW' | 'MISMATCH' | number;
  phone?: string;
  phoneVerified?: boolean;
  identityCheckStatus?: string;
  nameMatchStatus?: string;

  // Timestamps
  phoneVerifiedAt?: string;
  identityVerifiedAt?: string;
  nameVerifiedAt?: string;
  overallVerifiedAt?: string;
  lastVerifiedAt?: string;

  // Diagnostics & Review Notes
  failureReason?: string;
  reviewReason?: string;
  adminReviewedBy?: string;
  adminReviewedAt?: string;
  adminNotes?: string;
  adminApprovalStatus?: 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUIRED' | 'PENDING';

  // Provider metadata (Environment mode & references)
  environment: 'TEST' | 'LIVE';
  provider?: string;
  providerReference?: string;
  updatedAt: string;

  // Stored identity document metadata
  documentUrl?: string;
  documentId?: string;
  documentFileName?: string;
  documentUploadedAt?: string;
}

export interface VerificationAuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  verificationType: 'PHONE_OTP' | 'IDENTITY_NIN' | 'NAME_MATCH' | 'OVERALL' | 'ADMIN_REVIEW';
  status: string;
  timestamp: string;
  referenceId?: string;
  reason?: string;
  environment: 'TEST' | 'LIVE';
  details?: Record<string, any>;
}

export type IdentityDocumentType =
  | 'National Identification Number (NIN)'
  | 'Voter\'s Card (PVC)'
  | 'International Passport'
  | 'Driver\'s License'
  | 'National Identity Card'
  | 'NIN_SLIP'
  | string;

export type OwnershipDocumentType =
  | 'Deed of Assignment'
  | 'Certificate of Occupancy (C of O)'
  | 'Governor\'s Consent'
  | 'Building Plan Approval'
  | 'Letter of Allocation'
  | 'Land Purchase Agreement / Receipt'
  | 'Letter of Authorization (Agent Authority)'
  | 'Utility / Electricity Bill in Landlord Name';

export type KYCApplicationStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CORRECTION_REQUIRED';

export interface KYCAuditEntry {
  id: string;
  action: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  notes?: string;
}

export interface KYCApplication {
  id: string;
  userId: string;
  userRole: 'LANDLORD' | 'AGENT';
  fullName: string;
  email: string;
  phoneNumber: string;
  isPhoneVerified: boolean;
  dateOfBirth?: string;
  residentialAddress?: string;
  idCardType: IdentityDocumentType | string;
  idCardNumber: string;
  idCardDocumentUrl?: string;
  selfiePhotoUrl?: string;
  selfieWithIdUrl?: string;
  // Agent authority fields
  agencyName?: string;
  cacNumber?: string;
  cacDocumentUrl?: string;
  licenseNumber?: string;
  licenseDocumentUrl?: string;
  operatingArea?: string;
  officeAddress?: string;
  // Landlord proof of ownership fields
  ownershipDocumentType?: OwnershipDocumentType | string;
  proofOfOwnershipDocUrl?: string;
  ownedPropertyAddress?: string;
  // Status & Administration
  status: KYCApplicationStatus;
  appliedDate: string;
  reviewedDate?: string;
  reviewedBy?: string;
  adminCorrectionNote?: string;
  adminRejectionReason?: string;
  adminNotes?: string;
  auditTrail?: KYCAuditEntry[];
}

export interface BaseUser {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  phoneNumber: string;
  isPhoneVerified?: boolean;
  phoneVerifiedAt?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  emailVerificationToken?: string;
  avatarUrl?: string;
  accountStatus: UserAccountStatus;
  verification?: UserVerificationStatus;
  verificationStatus?: any;
  createdAt: string;
}

export interface TenantUser extends BaseUser {
  role: 'TENANT';
  savedPropertyIds: string[];
  occupation?: string;
  currentAddress?: string;
}

export interface LandlordUser extends BaseUser {
  role: 'LANDLORD';
  businessName?: string;
  businessAddress?: string;
  verificationStatus: LandlordVerificationStatus;
  idCardType?: string;
  idCardNumber?: string;
  idCardDocumentUrl?: string;
  proofOfOwnershipDocUrl?: string;
  adminCorrectionNote?: string;
  adminRejectionReason?: string;
  appliedDate?: string;
  reviewedDate?: string;
  reviewedBy?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
}

export interface AgentClient {
  id: string;
  agentId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredLocations?: string[];
  preferredPropertyTypes?: string[];
  status: 'ACTIVE' | 'IN_SEARCH' | 'APPLICATION_SUBMITTED' | 'COMPLETED' | 'INACTIVE';
  notes?: string;
  assignedPropertyIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentUser extends BaseUser {
  role: 'AGENT';
  agencyName?: string;
  operatingArea?: string;
  cacNumber?: string;
  licenseNumber?: string;
  bio?: string;
  idCardType?: string;
  idCardNumber?: string;
  idCardDocumentUrl?: string;
  cacDocumentUrl?: string;
  licenseDocumentUrl?: string;
  verificationStatus: AgentVerificationStatus;
  adminCorrectionNote?: string;
  adminRejectionReason?: string;
  appliedDate?: string;
  reviewedDate?: string;
  reviewedBy?: string;
  savedPropertyIds?: string[];
  assistedPropertyIds?: string[];
}

export interface AdminUser extends BaseUser {
  role: 'ADMIN';
  department?: string;
  isSuperAdmin?: boolean;
}

export type User = TenantUser | LandlordUser | AgentUser | AdminUser;

export type PropertyType =
  | 'Self-contained'
  | 'Room and parlour'
  | '1-bedroom'
  | '2-bedroom'
  | '3-bedroom'
  | '4-bedroom'
  | '5+ bedroom'
  | 'Duplex'
  | 'Detached house'
  | 'Semi-detached house'
  | 'Full compound'
  | 'Shared apartment'
  | 'Other';

export type PropertyStatus =
  | 'PENDING_REVIEW'
  | 'CORRECTION_REQUIRED'
  | 'APPROVED'
  | 'AVAILABLE'
  | 'RENTED'
  | 'REJECTED'
  | 'UNAVAILABLE';

export type RentalPeriod =
  | 'Per Annum'
  | '1 Year'
  | '1 Year 6 Months'
  | '2 Years'
  | 'Bi-Annual'
  | '6 Months'
  | 'Per Month';

export type MediaCategory =
  | 'Exterior'
  | 'Living room'
  | 'Bedroom'
  | 'Kitchen'
  | 'Bathroom'
  | 'Toilet'
  | 'Compound'
  | 'Other';

export interface PropertyImage {
  id: string;
  url: string;
  category: MediaCategory;
  caption?: string;
  isCover?: boolean;
}

export interface PropertyVideo {
  id: string;
  url: string;
  title?: string;
  thumbnailUrl?: string;
}

export interface PropertyLocation {
  state: string;
  city: string;
  area: string; // e.g., "Ewet Housing Estate", "Shelter Afrique", "Oron Road"
  street: string;
  landmark?: string; // e.g., "Near Ibom Tropicana", "Off Wellington Bassey Way"
  postalCode?: string;
}

export interface PropertyPricing {
  rent: number; // In Naira (₦) - Expected Rent Payment (Monthly Rent × Payment Duration)
  rentalPeriod: RentalPeriod;
  monthlyRent?: number; // In Naira (₦) - Monthly Rent per month
  paymentDurationMonths?: number; // Agreed duration in months (min: 1)
  serviceCharge?: number;
  agreementFee?: number;
  legalFee?: number;
  cautionDeposit?: number;
  otherFees?: number;
  inspectionFee?: number; // In Naira (₦) - Property-specific inspection fee (₦3,000 - ₦5,000)
  totalEstimatedFirstPayment: number;
}

export type FacilityName =
  | 'Tiled floor'
  | 'POP ceiling'
  | 'Borehole'
  | 'Water supply'
  | 'Electricity'
  | 'Prepaid meter'
  | 'Dedicated transformer'
  | 'Parking'
  | 'Fenced compound'
  | 'Security'
  | 'Kitchen cabinets'
  | 'Wardrobe'
  | 'Air conditioning'
  | 'Generator'
  | 'Internet'
  | 'Balcony'
  | 'Garden'
  | 'Paved compound'
  | 'Water heater'
  | 'Other';

export type PropertyVerificationAction =
  | 'SUBMITTED'
  | 'CORRECTION_REQUESTED'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'REJECTED';

export type PropertyListingSource = 'LANDLORD' | 'AGENT';

export interface PropertyVerificationHistoryEntry {
  id: string;
  action: PropertyVerificationAction;
  status: PropertyStatus;
  timestamp: string;
  actorName?: string;
  actorRole?: 'LANDLORD' | 'AGENT' | 'ADMIN';
  notes?: string;
}

export interface DuplicateMatchInfo {
  matchingPropertyId: string;
  matchingPropertyTitle: string;
  similarityScore: number; // e.g., 0-100
  matchingReasons: string[]; // e.g., ["Same area: Ewet Housing", "Same 3 bedrooms", "Matching price"]
}

export type DuplicateReviewDecision =
  | 'PENDING'
  | 'CONFIRMED_DUPLICATE'
  | 'DISMISSED'
  | 'CLARIFICATION_REQUESTED';

export interface Property {
  id: string;
  listingSource?: PropertyListingSource; // 'LANDLORD' | 'AGENT'
  submittingAgentId?: string;
  submittingAgentName?: string;
  submittingAgentAgency?: string;
  submittingAgentPhone?: string;
  submittingAgentVerificationStatus?: AgentVerificationStatus;
  landlordId: string;
  landlordName: string;
  landlordPhone: string;
  landlordVerificationStatus?: LandlordVerificationStatus;
  title: string;
  propertyType: PropertyType;
  description: string;
  bedrooms: number;
  bathrooms: number;
  toilets: number;
  location: PropertyLocation;
  pricing: PropertyPricing;
  facilities: FacilityName[];
  images: PropertyImage[];
  videos: PropertyVideo[];
  status: PropertyStatus;
  isVerified: boolean;
  authorityDocumentType?: OwnershipDocumentType | string;
  authorityDocumentUrl?: string;
  authorityVerified?: boolean;
  adminCorrectionNote?: string;
  adminRejectionReason?: string;
  verificationHistory?: PropertyVerificationHistoryEntry[];
  viewsCount: number;
  // Dynamic Inspection Fee (Allowed range: ₦3,000 - ₦5,000)
  inspectionFee?: number;
  // Duplicate Detection fields
  isPossibleDuplicate?: boolean;
  duplicateScore?: number;
  duplicateMatches?: DuplicateMatchInfo[];
  duplicateFlagsReason?: string;
  duplicateDecision?: DuplicateReviewDecision;
  duplicateDecisionNotes?: string;
  duplicateReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type InspectionStatus =
  | 'INSPECTION_REQUESTED'
  | 'AWAITING_PAYMENT_VERIFICATION'
  | 'INSPECTION_CONFIRMED'
  | 'INSPECTION_DECLINED'
  | 'INSPECTION_RESCHEDULED'
  | 'INSPECTION_COMPLETED'
  | 'INSPECTION_CANCELLED'
  | 'CONFIRMED'
  | 'PENDING'
  | 'RESCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PROPOSED_NEW_TIME';

export type InspectionCoordinationMode =
  | 'ATTEND_IN_PERSON'
  | 'REMOTE_COORDINATION'
  | 'ASSIGNED_REPRESENTATIVE';

export type InspectionOutcomeType =
  | 'COMPLETED'
  | 'TENANT_NO_SHOW'
  | 'LANDLORD_AGENT_NO_SHOW'
  | 'RESCHEDULED'
  | 'PROPERTY_ISSUE_REPORTED'
  | 'LISTING_FLAGGED_FOR_REVIEW';

export interface HomezaRepresentative {
  id: string;
  name: string;
  role: string; // e.g. "HOMEZA Senior Inspection Officer", "Super Admin", "Field Coordinator"
  phone?: string;
  email?: string;
}

export interface InspectionAuditEntry {
  id: string;
  timestamp: string;
  action: string; // e.g. "INSPECTION_REQUESTED", "TIME_PROPOSED", "TIME_ACCEPTED", "ADMIN_NOTIFIED", "HOMEZA_COORDINATION_CONFIRMED", "REPRESENTATIVE_ASSIGNED", "EXACT_LOCATION_RELEASED", "INSPECTION_RESCHEDULED", "INSPECTION_CANCELLED", "OUTCOME_RECORDED"
  title: string;
  actorName: string;
  actorRole: 'TENANT' | 'LANDLORD' | 'AGENT' | 'ADMIN';
  notes?: string;
}

export interface PropertyInspection {
  id: string;
  bookingId?: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocationArea: string;
  propertyExactAddress?: string; // Released to confirmed tenant near inspection time
  propertyPrice: number;
  propertyImage?: string;
  tenantId: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  landlordId: string;
  landlordName: string;
  agentId?: string;
  agentName?: string;
  preferredDate: string; // e.g., "2026-08-25" or "Saturday, Aug 25"
  preferredTime: string; // e.g., "11:00 AM"
  notes?: string;
  tenantNotes?: string;
  propertyArea?: string;
  landlordPhone?: string;
  status: InspectionStatus;
  rescheduledDate?: string;
  rescheduledTime?: string;
  rescheduledReason?: string;
  landlordResponseNote?: string;
  isLocationReleased?: boolean;
  // Payment fields
  paymentStatus?: InspectionPaymentStatus;
  paymentId?: string;
  inspectionFee?: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paidAt?: string;
  // HOMEZA Admin Coordination extensions
  homezaCoordinationConfirmed?: boolean;
  coordinationMode?: InspectionCoordinationMode;
  assignedHomezaRep?: HomezaRepresentative;
  homezaNotes?: string;
  outcome?: InspectionOutcomeType;
  outcomeNotes?: string;
  outcomeRecordedAt?: string;
  outcomeRecordedBy?: string;
  auditHistory?: InspectionAuditEntry[];
  flaggedForReview?: boolean;
  flaggedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  receiverId: string;
  receiverName: string;
  propertyId?: string;
  propertyTitle?: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  propertyId?: string;
  propertyTitle?: string;
  propertyImage?: string;
  tenantId: string;
  tenantName: string;
  participantId: string; // Landlord or Agent ID
  participantName: string;
  participantRole: 'LANDLORD' | 'AGENT';
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCountTenant: number;
  unreadCountParticipant: number;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus =
  | 'PENDING_LANDLORD_REVIEW'
  | 'PENDING'
  | 'ADDITIONAL_INFO_REQUESTED'
  | 'INFORMATION_REQUESTED'
  | 'ADDITIONAL_INFO_SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface InfoRequestEntry {
  id: string;
  requestMessage: string;
  requestedAt: string;
  landlordId: string;
  landlordName?: string;
  tenantResponse?: string;
  respondedAt?: string;
  tenantId?: string;
}

export interface RentalApplication {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyType: PropertyType;
  propertyLocation: string;
  propertyPrice: number;
  propertyImage: string;
  landlordId: string;
  landlordName?: string;
  tenantId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  preferredMoveInDate: string;
  moveInDate?: string; // alias for compatibility
  message: string;
  status: ApplicationStatus;
  landlordNotes?: string;
  rejectionReason?: string;
  infoRequestMessage?: string;
  tenantResponse?: string;
  infoRequests?: InfoRequestEntry[];
  employmentStatus?: string;
  employerName?: string;
  appliedDate: string;
  createdAt?: string; // alias for compatibility
  updatedAt: string;
}

export type ReportReason =
  | 'Fake property'
  | 'Wrong information'
  | 'Property unavailable'
  | 'Misleading pictures/videos'
  | 'Suspicious landlord'
  | 'Other';

export type ReportStatus = 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED' | 'ACTION_TAKEN';

export interface PropertyReport {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  reportedByUserId: string;
  reportedByUserName: string;
  reportedByUserEmail: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  adminNotes?: string;
  createdAt: string;
}

export interface LocationArea {
  id: string;
  name: string;
  city: string;
  state: string;
  type?: string;
  postalCode?: string;
  popularLandmarks?: string[];
  description?: string;
  isActive: boolean;
}

export type NotificationTargetType =
  | 'PROPERTY'
  | 'KYC_AGENT'
  | 'KYC_LANDLORD'
  | 'APPLICATION'
  | 'INSPECTION'
  | 'REPORT'
  | 'SUPPORT_TICKET'
  | 'SYSTEM';

export type NotificationStatus = 'UNREAD' | 'READ' | 'ACTION_REQUIRED' | 'RESOLVED';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'APPLICATION' | 'INSPECTION' | 'MESSAGE' | 'STATUS_CHANGE' | 'REPORT' | 'DUPLICATE' | 'SYSTEM' | 'KYC_AGENT' | 'KYC_LANDLORD' | 'PROPERTY_SUBMISSION';
  isRead: boolean;
  createdAt: string;
  targetType?: NotificationTargetType;
  targetId?: string;
  status?: NotificationStatus;
  linkUrl?: string;
  propertyId?: string;
  applicationId?: string;
  inspectionId?: string;
  conversationId?: string;
}

export type ReviewDecision = 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUIRED';

export interface ReviewAuditLog {
  id: string;
  targetType: 'PROPERTY' | 'KYC_AGENT' | 'KYC_LANDLORD';
  targetId: string;
  targetTitleOrName: string;
  submitterId: string;
  submitterName: string;
  submitterRole: 'LANDLORD' | 'AGENT';
  submissionDate: string;
  reviewerId: string;
  reviewerName: string;
  reviewDate: string;
  decision: ReviewDecision;
  notes?: string;
}

export interface PendingReviewItem {
  id: string;
  targetType: 'PROPERTY' | 'KYC_AGENT' | 'KYC_LANDLORD';
  targetId: string;
  type?: 'PROPERTY' | 'KYC_AGENT' | 'KYC_LANDLORD';
  titleOrName: string;
  title?: string;
  subtitle?: string;
  detail?: string;
  details?: string;
  submitterId: string;
  submitterName: string;
  submitterRole: 'LANDLORD' | 'AGENT';
  submitterPhone?: string;
  submitterEmail?: string;
  submissionDate: string;
  submittedAt?: string;
  isResubmission?: boolean;
  status: string;
  correctionNote?: string;
  rejectionReason?: string;
  targetObject: Property | AgentUser | LandlordUser;
}

export interface SearchFilterState {
  city: string;
  area: string;
  propertyType: string;
  bedrooms: string; // "all", "1", "2", "3", "4", "5+"
  minPrice: number;
  maxPrice: number;
  facility: string;
}

export interface PlatformConfig {
  appName: string;
  tagline: string;
  description: string;
  defaultState: string;
  defaultCity: string;
  currencySymbol: string;
  supportPhone: string;
  supportEmail: string;
  address: string;
  minInspectionFee?: number;
  maxInspectionFee?: number;
  defaultInspectionFee?: number;
  inspectionFeeAmount?: number;
  paystackPublicKey?: string;
  companyBankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
}

export type PaymentMethod = 'PAYSTACK' | 'BANK_TRANSFER' | 'bank_transfer';

export type PaymentType = 'INSPECTION_FEE' | 'RENT_DEPOSIT' | 'OTHER';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'SUCCESSFUL'
  | 'FAILED'
  | 'AMOUNT_MISMATCH'
  | 'AWAITING_BANK_TRANSFER_VERIFICATION'
  | 'AWAITING_ADMIN_CONFIRMATION'
  | 'AWAITING_PAYMENT_VERIFICATION'
  | 'pending_verification'
  | 'verified'
  | 'REJECTED'
  | 'REFUNDED';

export type PaymentVerificationStatus =
  | 'UNVERIFIED'
  | 'VERIFIED'
  | 'FAILED'
  | 'FLAGGED';

export interface BankTransferDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  senderName: string;
  senderBank?: string;
  senderAccountNumber?: string;
  amountPaid: number;
  transferDate: string;
  proofOfPaymentUrl?: string;
  transferNotes?: string;
}

export interface AdminPaymentReview {
  reviewedBy: string;
  reviewedAt: string;
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
}

export interface Payment {
  id: string;
  reference: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocationArea: string;
  landlordId?: string;
  agentId?: string;
  inspectionId?: string;
  bookingId?: string;
  paymentPurpose?: string; // e.g. 'INSPECTION_FEE'
  inspectionFee?: number; // In Naira (expected fee for this property: 3,000 - 5,000)
  amount: number; // In Naira (e.g. 3000)
  currency: string; // 'NGN'
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  status: PaymentStatus;
  paymentStatus?: string;
  verificationStatus?: PaymentVerificationStatus;
  paystackReference?: string;
  paystackTransactionId?: string;
  paystackAuthorizationUrl?: string;
  paystackAccessCode?: string;
  bankTransferReference?: string;
  proofOfPaymentUrl?: string;
  channel?: string;
  paidAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  bankTransferDetails?: BankTransferDetails;
  adminReview?: AdminPaymentReview;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type InspectionPaymentStatus =
  | 'UNPAID'
  | 'AWAITING_PAYMENT'
  | 'PENDING_VERIFICATION'
  | 'pending_verification'
  | 'AWAITING_PAYMENT_VERIFICATION'
  | 'PAID'
  | 'verified'
  | 'REFUNDED';

export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SupportTicketUserRole = 'LANDLORD' | 'AGENT' | 'TENANT' | 'ADMIN';

export interface SupportTicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'ADMIN' | 'LANDLORD' | 'AGENT' | 'TENANT';
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  userRole: SupportTicketUserRole;
  category: string;
  subject: string;
  description: string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  propertyId?: string;
  propertyTitle?: string;
  adminResponse?: string;
  adminNotes?: string;
  messages: SupportTicketMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}


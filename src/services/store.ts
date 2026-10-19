import {
  AdminUser,
  AgentClient,
  AgentUser,
  AgentVerificationStatus,
  AppNotification,
  ApplicationStatus,
  Conversation,
  DirectMessage,
  DuplicateMatchInfo,
  DuplicateReviewDecision,
  HomezaRepresentative,
  InfoRequestEntry,
  InspectionAuditEntry,
  InspectionCoordinationMode,
  InspectionOutcomeType,
  InspectionStatus,
  KYCApplication,
  KYCApplicationStatus,
  KYCAuditEntry,
  LandlordUser,
  LandlordVerificationStatus,
  LocationArea,
  Payment,
  PaymentMethod,
  PaymentStatus,
  PendingReviewItem,
  PlatformConfig,
  Property,
  PropertyInspection,
  PropertyReport,
  PropertyStatus,
  PropertyVerificationHistoryEntry,
  RentalApplication,
  ReportStatus,
  ReviewAuditLog,
  SupportTicket,
  SupportTicketMessage,
  SupportTicketPriority,
  SupportTicketStatus,
  TenantUser,
  User,
  UserAccountStatus,
  UserRole,
} from '../types';
import {
  INITIAL_AGENT_CLIENTS,
  INITIAL_APPLICATIONS,
  INITIAL_CONVERSATIONS,
  INITIAL_INSPECTIONS,
  INITIAL_LOCATIONS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_PROPERTIES,
  INITIAL_REPORTS,
  INITIAL_SUPPORT_TICKETS,
  INITIAL_USERS,
} from '../data/seedData';
import { PLATFORM_CONFIG } from '../config/platform';
import { AuthSecurityService } from './authSecurity';
import { checkPropertyDuplicates } from '../utils/duplicateDetection';
import { evaluateUserVerification, reconcileUserVerification } from '../utils/verification';

const KEYS = {
  PROPERTIES: 'homeza_properties_v4',
  USERS: 'homeza_users_v4',
  APPLICATIONS: 'homeza_applications_v4',
  REPORTS: 'homeza_reports_v4',
  LOCATIONS: 'homeza_locations_v4',
  NOTIFICATIONS: 'homeza_notifications_v4',
  CURRENT_USER_ID: 'homeza_current_user_id_v4',
  CONFIG: 'homeza_platform_config_v4',
  AGENT_CLIENTS: 'homeza_agent_clients_v4',
  INSPECTIONS: 'homeza_inspections_v4',
  CONVERSATIONS: 'homeza_conversations_v4',
  MESSAGES: 'homeza_messages_v4',
  SUPPORT_TICKETS: 'homeza_support_tickets_v4',
  REVIEW_AUDITS: 'homeza_review_audits_v4',
  KYC_APPLICATIONS: 'homeza_kyc_applications_v4',
  PAYMENTS: 'homeza_payments_v4',
};

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('Store listener error:', err);
    }
  });
}

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (e) {
    console.warn(`Error reading ${key} from storage:`, e);
    return defaultValue;
  }
}

// Background / cross-device server push helper
async function pushPayloadToServer(payload: any): Promise<void> {
  try {
    await fetch('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Silently continue if offline
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notify();

    // Asynchronously push update to server database
    const payload: any = {};
    if (key === KEYS.PROPERTIES) payload.properties = value;
    else if (key === KEYS.USERS) payload.users = value;
    else if (key === KEYS.NOTIFICATIONS) payload.notifications = value;
    else if (key === KEYS.REVIEW_AUDITS) payload.reviewAudits = value;
    else if (key === KEYS.APPLICATIONS) payload.applications = value;
    else if (key === KEYS.REPORTS) payload.reports = value;
    else if (key === KEYS.LOCATIONS) payload.locations = value;
    else if (key === KEYS.CONFIG) payload.config = value;
    else if (key === KEYS.AGENT_CLIENTS) payload.agentClients = value;
    else if (key === KEYS.INSPECTIONS) payload.inspections = value;
    else if (key === KEYS.CONVERSATIONS) payload.conversations = value;
    else if (key === KEYS.MESSAGES) payload.messages = value;
    else if (key === KEYS.SUPPORT_TICKETS) payload.supportTickets = value;
    else if (key === KEYS.PAYMENTS) payload.payments = value;

    if (Object.keys(payload).length > 0) {
      pushPayloadToServer(payload);
    }
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

let isSyncing = false;

export async function syncStoreWithServer(force = false): Promise<void> {
  if (isSyncing && !force) return;
  isSyncing = true;
  try {
    const res = await fetch('/api/sync/state');
    if (!res.ok) return;
    const json = await res.json();
    if (json && json.data) {
      const serverData = json.data;
      let hasChanges = false;

      // 1. Merge Users
      if (Array.isArray(serverData.users) && serverData.users.length > 0) {
        const localUsers = loadFromStorage<User[]>(KEYS.USERS, INITIAL_USERS);
        const mergedUsersMap = new Map<string, User>();
        localUsers.forEach((u) => mergedUsersMap.set(u.id, u));
        serverData.users.forEach((su: User) => {
          mergedUsersMap.set(su.id, su);
        });
        const newUsers = Array.from(mergedUsersMap.values());
        if (JSON.stringify(newUsers) !== JSON.stringify(localUsers)) {
          localStorage.setItem(KEYS.USERS, JSON.stringify(newUsers));
          hasChanges = true;
        }
      }

      // 2. Merge Credentials into AuthSecurityService
      if (Array.isArray(serverData.credentials) && serverData.credentials.length > 0) {
        AuthSecurityService.syncCredentialsFromServer(serverData.credentials);
      }

      // 3. Merge Properties
      if (Array.isArray(serverData.properties)) {
        const localProps = loadFromStorage<Property[]>(KEYS.PROPERTIES, INITIAL_PROPERTIES);
        const mergedPropsMap = new Map<string, Property>();
        localProps.forEach((p) => mergedPropsMap.set(p.id, p));
        serverData.properties.forEach((sp: Property) => {
          mergedPropsMap.set(sp.id, sp);
        });
        const newProps = Array.from(mergedPropsMap.values());
        if (JSON.stringify(newProps) !== JSON.stringify(localProps)) {
          localStorage.setItem(KEYS.PROPERTIES, JSON.stringify(newProps));
          hasChanges = true;
        }
      }

      // 4. Merge Notifications
      if (Array.isArray(serverData.notifications)) {
        const localNotifs = loadFromStorage<AppNotification[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
        const mergedNotifsMap = new Map<string, AppNotification>();
        localNotifs.forEach((n) => mergedNotifsMap.set(n.id, n));
        serverData.notifications.forEach((sn: AppNotification) => {
          mergedNotifsMap.set(sn.id, sn);
        });
        const newNotifs = Array.from(mergedNotifsMap.values());
        if (JSON.stringify(newNotifs) !== JSON.stringify(localNotifs)) {
          localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(newNotifs));
          hasChanges = true;
        }
      }

      // 5. Merge Review Audits
      if (Array.isArray(serverData.reviewAudits)) {
        const localAudits = loadFromStorage<ReviewAuditLog[]>(KEYS.REVIEW_AUDITS, []);
        const mergedAuditsMap = new Map<string, ReviewAuditLog>();
        localAudits.forEach((a) => mergedAuditsMap.set(a.id, a));
        serverData.reviewAudits.forEach((sa: ReviewAuditLog) => {
          mergedAuditsMap.set(sa.id, sa);
        });
        const newAudits = Array.from(mergedAuditsMap.values());
        if (JSON.stringify(newAudits) !== JSON.stringify(localAudits)) {
          localStorage.setItem(KEYS.REVIEW_AUDITS, JSON.stringify(newAudits));
          hasChanges = true;
        }
      }

      // 6. Merge Inspections
      if (Array.isArray(serverData.inspections)) {
        const localInspections = loadFromStorage<PropertyInspection[]>(KEYS.INSPECTIONS, INITIAL_INSPECTIONS);
        const mergedMap = new Map<string, PropertyInspection>();
        localInspections.forEach((i) => mergedMap.set(i.id, i));
        serverData.inspections.forEach((si: PropertyInspection) => mergedMap.set(si.id, si));
        const newInspections = Array.from(mergedMap.values());
        if (JSON.stringify(newInspections) !== JSON.stringify(localInspections)) {
          localStorage.setItem(KEYS.INSPECTIONS, JSON.stringify(newInspections));
          hasChanges = true;
        }
      }

      // 7. Merge Payments
      if (Array.isArray(serverData.payments)) {
        const localPayments = loadFromStorage<Payment[]>(KEYS.PAYMENTS, []);
        const mergedPaymentsMap = new Map<string, Payment>();
        localPayments.forEach((p) => mergedPaymentsMap.set(p.id, p));
        serverData.payments.forEach((sp: Payment) => mergedPaymentsMap.set(sp.id, sp));
        const newPayments = Array.from(mergedPaymentsMap.values());
        if (JSON.stringify(newPayments) !== JSON.stringify(localPayments)) {
          localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(newPayments));
          hasChanges = true;
        }
      }

      // 8. Merge Other Collections
      if (Array.isArray(serverData.applications) && serverData.applications.length > 0) {
        localStorage.setItem(KEYS.APPLICATIONS, JSON.stringify(serverData.applications));
        hasChanges = true;
      }
      if (Array.isArray(serverData.locations) && serverData.locations.length > 0) {
        localStorage.setItem(KEYS.LOCATIONS, JSON.stringify(serverData.locations));
      }

      if (hasChanges) {
        notify();
      }
    }
  } catch (e) {
    // Silently ignore sync errors
  } finally {
    isSyncing = false;
  }
}

// Start auto-sync on browser load
if (typeof window !== 'undefined') {
  syncStoreWithServer();
  setInterval(() => {
    syncStoreWithServer();
  }, 2500);
  window.addEventListener('focus', () => syncStoreWithServer(true));
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncStoreWithServer(true);
  });
  window.addEventListener('online', () => syncStoreWithServer(true));
}

function evaluateDuplicateSimilarity(
  newProp: Partial<Property>,
  existing: Property
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // 1. Same area / neighbourhood
  if (
    newProp.location?.area &&
    existing.location?.area &&
    newProp.location.area.trim().toLowerCase() === existing.location.area.trim().toLowerCase()
  ) {
    score += 30;
    reasons.push(`Same neighbourhood (${existing.location.area})`);
  }

  // 2. Same property type
  if (newProp.propertyType && existing.propertyType && newProp.propertyType === existing.propertyType) {
    score += 20;
    reasons.push(`Identical property type (${existing.propertyType})`);
  }

  // 3. Same bedrooms
  if (
    newProp.bedrooms !== undefined &&
    existing.bedrooms !== undefined &&
    Number(newProp.bedrooms) === Number(existing.bedrooms)
  ) {
    score += 20;
    reasons.push(`Matching bedroom count (${existing.bedrooms} beds)`);
  }

  // 4. Rent price proximity
  if (newProp.pricing?.rent && existing.pricing?.rent) {
    const rentA = Number(newProp.pricing.rent);
    const rentB = Number(existing.pricing.rent);
    if (rentA > 0 && rentB > 0) {
      const diffRatio = Math.abs(rentA - rentB) / Math.max(rentA, rentB);
      if (diffRatio === 0) {
        score += 20;
        reasons.push(`Exact matching annual rent (₦${rentA.toLocaleString()})`);
      } else if (diffRatio <= 0.15) {
        score += 15;
        reasons.push(`Close pricing range (within 15%)`);
      }
    }
  }

  // 5. Street / Landmark / Title text similarity
  const newText = `${newProp.title || ''} ${newProp.location?.street || ''} ${newProp.location?.landmark || ''}`.toLowerCase();
  const existText = `${existing.title || ''} ${existing.location?.street || ''} ${existing.location?.landmark || ''}`.toLowerCase();

  const wordsA = newText.split(/\W+/).filter((w) => w.length > 3);
  const wordsB = new Set(existText.split(/\W+/).filter((w) => w.length > 3));
  let matchingWordsCount = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) matchingWordsCount++;
  });

  if (matchingWordsCount >= 3) {
    score += 15;
    reasons.push(`Shared description and address landmarks`);
  }

  return { score: Math.min(score, 100), reasons };
}

export const Store = {
  subscribe: subscribeToStore,

  // Properties
  getProperties(): Property[] {
    const properties = loadFromStorage<Property[]>(KEYS.PROPERTIES, INITIAL_PROPERTIES);
    return properties.map((p) => {
      let fee = 3000;
      if (typeof p.inspectionFee === 'number' && p.inspectionFee >= 3000 && p.inspectionFee <= 5000) {
        fee = p.inspectionFee;
      } else if (typeof p.pricing?.inspectionFee === 'number' && p.pricing.inspectionFee >= 3000 && p.pricing.inspectionFee <= 5000) {
        fee = p.pricing.inspectionFee;
      }
      return {
        ...p,
        inspectionFee: fee,
        pricing: {
          ...p.pricing,
          inspectionFee: fee,
        },
      };
    });
  },

  getPropertyById(id: string): Property | undefined {
    return this.getProperties().find((p) => p.id === id);
  },

  getPublicProperties(): Property[] {
    // Only approved & not unavailable properties appear publicly to tenants
    return this.getProperties().filter(
      (p) => p.status === 'AVAILABLE' || p.status === 'RENTED' || p.status === 'APPROVED'
    );
  },

  getPropertiesByLandlord(landlordId: string): Property[] {
    return this.getProperties().filter((p) => p.landlordId === landlordId);
  },

  addProperty(property: Property): void {
    // Authoritative check: Must be authenticated and possess LANDLORD, AGENT, or ADMIN role
    AuthSecurityService.assertRole(['LANDLORD', 'AGENT', 'ADMIN'], undefined, 'create a property listing');

    const isAgent = property.listingSource === 'AGENT' && !!property.submittingAgentId;
    const actorRole = isAgent ? 'AGENT' : 'LANDLORD';
    const submitterId = isAgent ? property.submittingAgentId : property.landlordId;

    // Check Submitter's KYC status if not Admin
    const session = AuthSecurityService.getActiveSession();
    if (session && session.role !== 'ADMIN') {
      const user = this.getUserById(session.userId);
      const kycApp = this.getKYCApplicationByUserId(session.userId);
      const verificationStatus = (user as any)?.verificationStatus || kycApp?.status;
      const overallStatus = user?.verification?.overallVerificationStatus;
      AuthSecurityService.assertKYCApproved(session.userId, session.role, verificationStatus, overallStatus, user);
    } else if (submitterId) {
      const user = this.getUserById(submitterId);
      if (user && user.role !== 'ADMIN') {
        const kycApp = this.getKYCApplicationByUserId(submitterId);
        const verificationStatus = (user as any)?.verificationStatus || kycApp?.status;
        const overallStatus = user?.verification?.overallVerificationStatus;
        AuthSecurityService.assertKYCApproved(submitterId, user.role, verificationStatus, overallStatus, user);
      }
    }

    const props = this.getProperties();
    const nowIso = new Date().toISOString();
    const actorName = isAgent
      ? (property.submittingAgentName || 'Verified Agent')
      : (property.landlordName || 'Landlord');

    // Run multi-signal intelligent duplicate detection against existing listings
    const existingProps = props.filter((p) => p.id !== property.id);
    const duplicateResult = checkPropertyDuplicates(property, existingProps, submitterId);

    // If High Confidence Duplicate and not an Admin, block creation
    if (duplicateResult.confidence === 'HIGH' && session?.role !== 'ADMIN') {
      throw new Error(
        'This property appears to have already been listed on HOMEZA. Please check the existing listing before submitting it again.'
      );
    }

    const duplicateMatches: DuplicateMatchInfo[] = [];
    if (duplicateResult.matchedProperty && duplicateResult.score >= 40) {
      duplicateMatches.push({
        matchingPropertyId: duplicateResult.matchedProperty.id,
        matchingPropertyTitle: duplicateResult.matchedProperty.title,
        similarityScore: duplicateResult.score,
        matchingReasons: duplicateResult.reasons,
      });
    }

    const isPossibleDuplicate = duplicateResult.isDuplicate || duplicateMatches.length > 0;
    const highestScore = duplicateResult.score;

    const historyEntry: PropertyVerificationHistoryEntry = {
      id: 'vh-' + Date.now() + '-submit',
      action: 'SUBMITTED',
      status: 'PENDING_REVIEW',
      timestamp: property.createdAt || nowIso,
      actorName,
      actorRole,
      notes: isAgent
        ? `Property listing submitted by Verified Agent ${property.submittingAgentName || ''} (${property.submittingAgentAgency || 'Agency'}) for administrative verification.`
        : 'Property listing submitted for administrative verification.',
    };

    const rawFee = property.inspectionFee ?? property.pricing?.inspectionFee;
    const validatedFee =
      typeof rawFee === 'number' && rawFee >= 3000 && rawFee <= 5000
        ? rawFee
        : typeof rawFee === 'string' && Number(rawFee) >= 3000 && Number(rawFee) <= 5000
        ? Number(rawFee)
        : 3000;

    const basePricing = property.pricing;
    const rent = basePricing?.rent ?? 0;
    const rentalPeriod = basePricing?.rentalPeriod ?? 'Per Annum';
    const totalEstimatedFirstPayment =
      basePricing?.totalEstimatedFirstPayment ??
      (rent +
        (basePricing?.serviceCharge || 0) +
        (basePricing?.agreementFee || 0) +
        (basePricing?.legalFee || 0) +
        (basePricing?.cautionDeposit || 0) +
        (basePricing?.otherFees || 0));

    const newProperty: Property = {
      ...property,
      inspectionFee: validatedFee,
      pricing: {
        ...basePricing,
        rent,
        rentalPeriod,
        totalEstimatedFirstPayment,
        inspectionFee: validatedFee,
      },
      status: 'PENDING_REVIEW',
      isVerified: false,
      isPossibleDuplicate,
      duplicateScore: isPossibleDuplicate ? highestScore : undefined,
      duplicateMatches: isPossibleDuplicate ? duplicateMatches : undefined,
      duplicateDecision: isPossibleDuplicate ? 'PENDING' : undefined,
      duplicateFlagsReason: isPossibleDuplicate
        ? duplicateMatches.map((m) => `${m.matchingPropertyTitle}: ${m.matchingReasons.join(', ')}`).join(' | ')
        : undefined,
      verificationHistory: property.verificationHistory && property.verificationHistory.length > 0
        ? property.verificationHistory
        : [historyEntry],
      createdAt: property.createdAt || nowIso,
      updatedAt: nowIso,
    };

    props.unshift(newProperty);
    saveToStorage(KEYS.PROPERTIES, props);

    console.log(`PROPERTY SUBMITTED: ${newProperty.id}`);
    console.log(`PROPERTY STATUS: ${newProperty.status || 'pending'}`);

    // Notify admins about new property awaiting review
    this.addNotification({
      id: 'notif-' + Date.now() + '-admin',
      userId: 'user-admin-1',
      title: isPossibleDuplicate
        ? '⚠️ Possible Duplicate Listing Awaiting Review'
        : isAgent
        ? 'New Agent Property Awaiting Review'
        : 'New Property Awaiting Review',
      message: isPossibleDuplicate
        ? `Listing '${newProperty.title}' submitted by ${actorName} was flagged as a potential duplicate (${highestScore}% similarity with existing listings).`
        : isAgent
        ? `Verified Agent ${newProperty.submittingAgentName} (${newProperty.submittingAgentAgency || 'Agency'}) submitted '${newProperty.title}' for verification.`
        : `${newProperty.landlordName} submitted '${newProperty.title}' for verification.`,
      type: isPossibleDuplicate ? 'DUPLICATE' : 'PROPERTY_SUBMISSION',
      targetType: 'PROPERTY',
      targetId: newProperty.id,
      isRead: false,
      createdAt: nowIso,
      propertyId: newProperty.id,
    });

    // Notify submitter (Agent or Landlord) about successful property submission
    if (isAgent && newProperty.submittingAgentId) {
      this.addNotification({
        id: 'notif-' + Date.now() + '-agent',
        userId: newProperty.submittingAgentId,
        title: 'Property Submitted for Review',
        message: `Your property listing '${newProperty.title}' has been submitted and is currently pending admin verification before appearing in the public marketplace.`,
        type: 'STATUS_CHANGE',
        targetType: 'PROPERTY',
        targetId: newProperty.id,
        isRead: false,
        createdAt: nowIso,
        propertyId: newProperty.id,
      });
    } else if (newProperty.landlordId) {
      this.addNotification({
        id: 'notif-' + Date.now() + '-landlord',
        userId: newProperty.landlordId,
        title: 'Property Submitted',
        message: `Your property '${newProperty.title}' has been submitted and is currently pending admin review.`,
        type: 'STATUS_CHANGE',
        targetType: 'PROPERTY',
        targetId: newProperty.id,
        isRead: false,
        createdAt: nowIso,
        propertyId: newProperty.id,
      });
    }
  },

  updateProperty(updatedProperty: Property): void {
    const existing = this.getProperties().find((p) => p.id === updatedProperty.id);
    if (existing) {
      const ownerId =
        existing.listingSource === 'AGENT' && existing.submittingAgentId
          ? existing.submittingAgentId
          : (existing.landlordId || '');
      AuthSecurityService.assertOwnership(ownerId, undefined, 'property listing');
    }

    const props = this.getProperties().map((p) =>
      p.id === updatedProperty.id ? { ...updatedProperty, updatedAt: new Date().toISOString() } : p
    );
    saveToStorage(KEYS.PROPERTIES, props);
  },

  resubmitProperty(updatedProperty: Property, resubmitNotes?: string): void {
    const existing = this.getProperties().find((p) => p.id === updatedProperty.id);
    if (existing) {
      const ownerId =
        existing.listingSource === 'AGENT' && existing.submittingAgentId
          ? existing.submittingAgentId
          : (existing.landlordId || '');
      AuthSecurityService.assertOwnership(ownerId, undefined, 'property listing');
    }

    let affectedProp: Property | undefined;
    const nowIso = new Date().toISOString();
    const isAgent = updatedProperty.listingSource === 'AGENT' && !!updatedProperty.submittingAgentId;

    const props = this.getProperties().map((p) => {
      if (p.id === updatedProperty.id) {
        const history = p.verificationHistory ? [...p.verificationHistory] : [];
        const historyEntry: PropertyVerificationHistoryEntry = {
          id: 'vh-' + Date.now() + '-resubmit',
          action: 'RESUBMITTED',
          status: 'PENDING_REVIEW',
          timestamp: nowIso,
          actorName: isAgent
            ? (updatedProperty.submittingAgentName || p.submittingAgentName || 'Agent')
            : (updatedProperty.landlordName || p.landlordName),
          actorRole: isAgent ? 'AGENT' : 'LANDLORD',
          notes: resubmitNotes || 'Listing edited and resubmitted for admin review after corrections.',
        };
        history.push(historyEntry);

        affectedProp = {
          ...p,
          ...updatedProperty,
          status: 'PENDING_REVIEW',
          isVerified: false,
          verificationHistory: history,
          updatedAt: nowIso,
        };
        return affectedProp;
      }
      return p;
    });
    saveToStorage(KEYS.PROPERTIES, props);

    if (affectedProp) {
      // Notify Admin
      this.addNotification({
        id: 'notif-' + Date.now() + '-admin',
        userId: 'user-admin-1',
        title: isAgent ? 'Agent Listing Resubmitted for Review' : 'Property Resubmitted for Review',
        message: isAgent
          ? `Verified Agent ${affectedProp.submittingAgentName} updated and resubmitted "${affectedProp.title}" for verification.`
          : `${affectedProp.landlordName} has updated and resubmitted "${affectedProp.title}" for verification.`,
        type: 'PROPERTY_SUBMISSION',
        targetType: 'PROPERTY',
        targetId: affectedProp.id,
        isRead: false,
        createdAt: nowIso,
        propertyId: affectedProp.id,
      });

      // Notify submitter
      if (isAgent && affectedProp.submittingAgentId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-agent',
          userId: affectedProp.submittingAgentId,
          title: 'Listing Resubmitted',
          message: `Your listing "${affectedProp.title}" was resubmitted and is currently pending admin verification.`,
          type: 'STATUS_CHANGE',
          targetType: 'PROPERTY',
          targetId: affectedProp.id,
          isRead: false,
          createdAt: nowIso,
          propertyId: affectedProp.id,
        });
      } else if (affectedProp.landlordId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-landlord',
          userId: affectedProp.landlordId,
          title: 'Property Resubmitted',
          message: `Your listing "${affectedProp.title}" was resubmitted and is currently pending admin verification.`,
          type: 'STATUS_CHANGE',
          targetType: 'PROPERTY',
          targetId: affectedProp.id,
          isRead: false,
          createdAt: nowIso,
          propertyId: affectedProp.id,
        });
      }
    }
  },

  deleteProperty(id: string): void {
    const existing = this.getProperties().find((p) => p.id === id);
    if (existing) {
      const ownerId =
        existing.listingSource === 'AGENT' && existing.submittingAgentId
          ? existing.submittingAgentId
          : (existing.landlordId || '');
      AuthSecurityService.assertOwnership(ownerId, undefined, 'property listing');
    }

    const props = this.getProperties().filter((p) => p.id !== id);
    saveToStorage(KEYS.PROPERTIES, props);
  },

  updatePropertyStatus(id: string, status: PropertyStatus, adminNote?: string, adminName?: string): void {
    AuthSecurityService.assertAdmin();

    let affectedProp: Property | undefined;
    const nowIso = new Date().toISOString();
    const props = this.getProperties().map((p) => {
      if (p.id === id) {
        const history = p.verificationHistory ? [...p.verificationHistory] : [];
        let action: 'SUBMITTED' | 'CORRECTION_REQUESTED' | 'RESUBMITTED' | 'APPROVED' | 'REJECTED' = 'APPROVED';
        if (status === 'CORRECTION_REQUIRED') action = 'CORRECTION_REQUESTED';
        else if (status === 'REJECTED') action = 'REJECTED';
        else if (status === 'APPROVED' || status === 'AVAILABLE') action = 'APPROVED';

        history.push({
          id: 'vh-' + Date.now() + '-' + status.toLowerCase(),
          action,
          status,
          timestamp: nowIso,
          actorName: adminName || 'Admin Moderator',
          actorRole: 'ADMIN',
          notes: adminNote,
        });

        affectedProp = {
          ...p,
          status,
          isVerified: status === 'APPROVED' || status === 'AVAILABLE' ? true : false,
          adminCorrectionNote: status === 'CORRECTION_REQUIRED' ? adminNote : p.adminCorrectionNote,
          adminRejectionReason: status === 'REJECTED' ? adminNote : p.adminRejectionReason,
          verificationHistory: history,
          updatedAt: nowIso,
        };
        return affectedProp;
      }
      return p;
    });
    saveToStorage(KEYS.PROPERTIES, props);
  },

  approveProperty(id: string, adminName?: string, notes?: string): void {
    AuthSecurityService.assertAdmin();

    let affectedProp: Property | undefined;
    const nowIso = new Date().toISOString();
    const reviewer = adminName || 'HOMEZA Admin';

    const props = this.getProperties().map((p) => {
      if (p.id === id) {
        const history = p.verificationHistory ? [...p.verificationHistory] : [];
        history.push({
          id: 'vh-' + Date.now() + '-approve',
          action: 'APPROVED',
          status: 'APPROVED',
          timestamp: nowIso,
          actorName: reviewer,
          actorRole: 'ADMIN',
          notes: notes || 'Listing passed verification inspection and approved for public marketplace.',
        });

        affectedProp = {
          ...p,
          status: 'AVAILABLE',
          isVerified: true,
          verificationHistory: history,
          updatedAt: nowIso,
        };
        return affectedProp;
      }
      return p;
    });
    saveToStorage(KEYS.PROPERTIES, props);

    if (affectedProp) {
      const propTitle = affectedProp.title;
      const isAgent = affectedProp.listingSource === 'AGENT' && !!affectedProp.submittingAgentId;
      const submitterId = isAgent ? affectedProp.submittingAgentId! : (affectedProp.landlordId || '');
      const submitterName = isAgent ? (affectedProp.submittingAgentName || 'Agent') : (affectedProp.landlordName || 'Landlord');

      // Record Audit Trail Log
      this.addReviewAudit({
        id: 'audit-' + Date.now() + '-prop-appr',
        targetType: 'PROPERTY',
        targetId: id,
        targetTitleOrName: propTitle,
        submitterId,
        submitterName,
        submitterRole: isAgent ? 'AGENT' : 'LANDLORD',
        submissionDate: affectedProp.createdAt || nowIso,
        reviewerId: 'admin-1',
        reviewerName: reviewer,
        reviewDate: nowIso,
        decision: 'APPROVED',
        notes: notes || 'Property verified and approved for marketplace.',
      });

      if (isAgent && affectedProp.submittingAgentId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-agent',
          userId: affectedProp.submittingAgentId,
          title: 'Agent Listing Approved',
          message: `Your submitted listing '${propTitle}' has been approved by admin and is now live in the marketplace.`,
          type: 'STATUS_CHANGE',
          targetType: 'PROPERTY',
          targetId: id,
          isRead: false,
          createdAt: nowIso,
          propertyId: id,
        });
      } else if (affectedProp.landlordId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-landlord',
          userId: affectedProp.landlordId,
          title: 'Property Approved',
          message: `Your property '${propTitle}' has been approved and is now live and verified in the marketplace.`,
          type: 'STATUS_CHANGE',
          targetType: 'PROPERTY',
          targetId: id,
          isRead: false,
          createdAt: nowIso,
          propertyId: id,
        });
      }
    }
  },

  rejectProperty(id: string, reason: string, adminName?: string): void {
    AuthSecurityService.assertAdmin();

    let affectedProp: Property | undefined;
    const nowIso = new Date().toISOString();
    const reviewer = adminName || 'HOMEZA Admin';

    const props = this.getProperties().map((p) => {
      if (p.id === id) {
        const history = p.verificationHistory ? [...p.verificationHistory] : [];
        history.push({
          id: 'vh-' + Date.now() + '-reject',
          action: 'REJECTED',
          status: 'REJECTED',
          timestamp: nowIso,
          actorName: reviewer,
          actorRole: 'ADMIN',
          notes: reason,
        });

        affectedProp = {
          ...p,
          status: 'REJECTED',
          isVerified: false,
          adminRejectionReason: reason,
          verificationHistory: history,
          updatedAt: nowIso,
        };
        return affectedProp;
      }
      return p;
    });
    saveToStorage(KEYS.PROPERTIES, props);

    if (affectedProp) {
      const propTitle = affectedProp.title;
      const isAgent = affectedProp.listingSource === 'AGENT' && !!affectedProp.submittingAgentId;
      const submitterId = isAgent ? affectedProp.submittingAgentId! : (affectedProp.landlordId || '');
      const submitterName = isAgent ? (affectedProp.submittingAgentName || 'Agent') : (affectedProp.landlordName || 'Landlord');

      // Record Audit Trail Log
      this.addReviewAudit({
        id: 'audit-' + Date.now() + '-prop-rej',
        targetType: 'PROPERTY',
        targetId: id,
        targetTitleOrName: propTitle,
        submitterId,
        submitterName,
        submitterRole: isAgent ? 'AGENT' : 'LANDLORD',
        submissionDate: affectedProp.createdAt || nowIso,
        reviewerId: 'admin-1',
        reviewerName: reviewer,
        reviewDate: nowIso,
        decision: 'REJECTED',
        notes: reason,
      });

      if (isAgent && affectedProp.submittingAgentId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-agent',
          userId: affectedProp.submittingAgentId,
          title: 'Agent Listing Rejected',
          message: `Your submitted property '${propTitle}' was not approved.\nReason: ${reason}`,
          type: 'STATUS_CHANGE',
          targetType: 'PROPERTY',
          targetId: id,
          isRead: false,
          createdAt: nowIso,
          propertyId: id,
        });
      } else if (affectedProp.landlordId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-landlord',
          userId: affectedProp.landlordId,
          title: 'Property Listing Rejected',
          message: `Your property '${propTitle}' was not approved.\nReason: ${reason}`,
          type: 'STATUS_CHANGE',
          targetType: 'PROPERTY',
          targetId: id,
          isRead: false,
          createdAt: nowIso,
          propertyId: id,
        });
      }
    }
  },

  requestPropertyCorrection(id: string, note: string, adminName?: string): void {
    AuthSecurityService.assertAdmin();

    let affectedProp: Property | undefined;
    const nowIso = new Date().toISOString();
    const reviewer = adminName || 'HOMEZA Admin';

    const props = this.getProperties().map((p) => {
      if (p.id === id) {
        const history = p.verificationHistory ? [...p.verificationHistory] : [];
        history.push({
          id: 'vh-' + Date.now() + '-correction',
          action: 'CORRECTION_REQUESTED',
          status: 'CORRECTION_REQUIRED',
          timestamp: nowIso,
          actorName: reviewer,
          actorRole: 'ADMIN',
          notes: note,
        });

        affectedProp = {
          ...p,
          status: 'CORRECTION_REQUIRED',
          isVerified: false,
          adminCorrectionNote: note,
          verificationHistory: history,
          updatedAt: nowIso,
        };
        return affectedProp;
      }
      return p;
    });
    saveToStorage(KEYS.PROPERTIES, props);

    if (affectedProp) {
      const propTitle = affectedProp.title;
      const isAgent = affectedProp.listingSource === 'AGENT' && !!affectedProp.submittingAgentId;
      const submitterId = isAgent ? affectedProp.submittingAgentId! : (affectedProp.landlordId || '');
      const submitterName = isAgent ? (affectedProp.submittingAgentName || 'Agent') : (affectedProp.landlordName || 'Landlord');

      // Record Audit Trail Log
      this.addReviewAudit({
        id: 'audit-' + Date.now() + '-prop-corr',
        targetType: 'PROPERTY',
        targetId: id,
        targetTitleOrName: propTitle,
        submitterId,
        submitterName,
        submitterRole: isAgent ? 'AGENT' : 'LANDLORD',
        submissionDate: affectedProp.createdAt || nowIso,
        reviewerId: 'admin-1',
        reviewerName: reviewer,
        reviewDate: nowIso,
        decision: 'CORRECTION_REQUIRED',
        notes: note,
      });

      if (isAgent && affectedProp.submittingAgentId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-agent',
          userId: affectedProp.submittingAgentId,
          title: 'Listing Correction Required',
          message: `Admin has requested changes to your property listing "${propTitle}": ${note}`,
          type: 'STATUS_CHANGE',
          targetType: 'PROPERTY',
          targetId: id,
          isRead: false,
          createdAt: nowIso,
          propertyId: id,
        });
      } else if (affectedProp.landlordId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-landlord',
          userId: affectedProp.landlordId,
          title: 'Property Correction Required',
          message: `Admin has requested changes to your property listing "${propTitle}": ${note}`,
          type: 'STATUS_CHANGE',
          targetType: 'PROPERTY',
          targetId: id,
          isRead: false,
          createdAt: nowIso,
          propertyId: id,
        });
      }
    }
  },

  reviewDuplicateFlag(
    id: string,
    decision: 'CONFIRMED_DUPLICATE' | 'DISMISSED' | 'CLARIFICATION_REQUESTED',
    notes?: string,
    adminName?: string
  ): void {
    AuthSecurityService.assertAdmin();

    let affectedProp: Property | undefined;
    const nowIso = new Date().toISOString();
    const props = this.getProperties().map((p) => {
      if (p.id === id) {
        const history = p.verificationHistory ? [...p.verificationHistory] : [];
        const isDismissed = decision === 'DISMISSED';
        const isConfirmed = decision === 'CONFIRMED_DUPLICATE';

        history.push({
          id: 'vh-' + Date.now() + '-duplicate-review',
          action: isConfirmed ? 'REJECTED' : isDismissed ? 'APPROVED' : 'CORRECTION_REQUESTED',
          status: isConfirmed ? 'REJECTED' : p.status,
          timestamp: nowIso,
          actorName: adminName || 'Admin Moderator',
          actorRole: 'ADMIN',
          notes: `Duplicate Review Decision: ${decision}. ${notes || ''}`,
        });

        affectedProp = {
          ...p,
          isPossibleDuplicate: isDismissed ? false : p.isPossibleDuplicate,
          duplicateDecision: decision,
          duplicateDecisionNotes: notes || '',
          duplicateReviewedAt: nowIso,
          status: isConfirmed ? 'REJECTED' : p.status,
          isVerified: isConfirmed ? false : p.isVerified,
          adminRejectionReason: isConfirmed
            ? `Duplicate Listing Rejected: ${notes || 'Identical or duplicate property already exists on the platform.'}`
            : p.adminRejectionReason,
          verificationHistory: history,
          updatedAt: nowIso,
        };
        return affectedProp;
      }
      return p;
    });
    saveToStorage(KEYS.PROPERTIES, props);

    if (affectedProp) {
      const recipientId =
        affectedProp.listingSource === 'AGENT' && affectedProp.submittingAgentId
          ? affectedProp.submittingAgentId
          : affectedProp.landlordId;

      if (recipientId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-dup-decision',
          userId: recipientId,
          title:
            decision === 'CONFIRMED_DUPLICATE'
              ? 'Duplicate Listing Flag Confirmed'
              : decision === 'DISMISSED'
              ? 'Duplicate Flag Dismissed by Admin'
              : 'Clarification Needed Regarding Listing',
          message:
            decision === 'CONFIRMED_DUPLICATE'
              ? `Your listing "${affectedProp.title}" was identified as a duplicate listing and marked REJECTED. ${notes ? `Note: ${notes}` : ''}`
              : decision === 'DISMISSED'
              ? `Admin has reviewed and cleared the duplicate flag on "${affectedProp.title}".`
              : `Admin requested clarification on "${affectedProp.title}": ${notes || ''}`,
          type: 'DUPLICATE',
          isRead: false,
          createdAt: nowIso,
          propertyId: id,
        });
      }
    }
  },

  incrementPropertyView(id: string): void {
    const props = this.getProperties().map((p) =>
      p.id === id ? { ...p, viewsCount: (p.viewsCount || 0) + 1 } : p
    );
    saveToStorage(KEYS.PROPERTIES, props);
  },

  // Users
  getUsers(): User[] {
    const users = loadFromStorage<User[]>(KEYS.USERS, INITIAL_USERS);
    // Sanitize any deprecated demo users from previous storage
    const cleanUsers = users.filter(
      (u) =>
        !u.id.startsWith('user-tenant-') &&
        !u.id.startsWith('user-landlord-') &&
        !u.id.startsWith('user-agent-') &&
        u.email !== 'tenant@homeza.ng' &&
        u.email !== 'landlord@homeza.ng' &&
        u.email !== 'agent@homeza.ng' &&
        u.email !== 'iniobong@gmail.com' &&
        u.email !== 'etebong@homeza.ng' &&
        u.email !== 'sunday@homeza.ng' &&
        u.email !== 'victoria@homeza.ng' &&
        u.email !== 'nseobong@homeza.ng' &&
        u.email !== 'edidiong@homeza.ng'
    );

    // Ensure Admin account is always present
    if (!cleanUsers.some((u) => u.role === 'ADMIN')) {
      cleanUsers.push(INITIAL_USERS[0]);
    }

    if (cleanUsers.length !== users.length) {
      saveToStorage(KEYS.USERS, cleanUsers);
    }
    return cleanUsers;
  },

  getUserById(id: string): User | undefined {
    let user = this.getUsers().find((u) => u.id === id);
    if (!user) {
      // Auto-repair from credentials vault if profile document is desynced
      const cred = AuthSecurityService.getCredentials().find((c) => c.userId === id);
      if (cred) {
        user = {
          id: cred.userId,
          email: cred.email,
          role: cred.role,
          fullName: cred.email.split('@')[0],
          phoneNumber: '',
          accountStatus: 'ACTIVE',
          emailVerified: true,
          savedPropertyIds: [],
          createdAt: cred.createdAt || new Date().toISOString(),
        } as User;
        this.addUser(user);
      } else {
        // Fallback: Check currently active authenticated session
        const active = AuthSecurityService.getActiveSession();
        if (active && active.userId === id) {
          user = {
            id: active.userId,
            email: active.email,
            role: active.role,
            fullName: active.fullName || active.email.split('@')[0],
            phoneNumber: '',
            accountStatus: 'ACTIVE',
            emailVerified: true,
            savedPropertyIds: [],
            createdAt: new Date(active.issuedAt || Date.now()).toISOString(),
          } as User;
          this.addUser(user);
        }
      }
    }
    return user;
  },

  getUserByEmail(email: string): User | undefined {
    if (!email || typeof email !== 'string') return undefined;
    const clean = email.toLowerCase().trim();
    if (!clean) return undefined;
    let user = this.getUsers().find((u) => {
      if (!u || !u.email || typeof u.email !== 'string') return false;
      return u.email.toLowerCase().trim() === clean;
    });
    if (!user) {
      // Auto-repair from credentials vault if profile document is desynced
      const cred = AuthSecurityService.getCredentials().find((c) => c.email && c.email.toLowerCase().trim() === clean);
      if (cred) {
        user = {
          id: cred.userId,
          email: cred.email,
          role: cred.role,
          fullName: cred.email.split('@')[0],
          phoneNumber: '',
          accountStatus: 'ACTIVE',
          emailVerified: true,
          savedPropertyIds: [],
          createdAt: cred.createdAt || new Date().toISOString(),
        } as User;
        this.addUser(user);
      } else {
        // Fallback: Check currently active authenticated session
        const active = AuthSecurityService.getActiveSession();
        if (active && active.email && active.email.toLowerCase().trim() === clean) {
          user = {
            id: active.userId,
            email: active.email,
            role: active.role,
            fullName: active.fullName || active.email.split('@')[0],
            phoneNumber: '',
            accountStatus: 'ACTIVE',
            emailVerified: true,
            savedPropertyIds: [],
            createdAt: new Date(active.issuedAt || Date.now()).toISOString(),
          } as User;
          this.addUser(user);
        }
      }
    }
    return user;
  },

  addUser(user: User): void {
    const users = this.getUsers();
    const cleanEmail = user.email ? user.email.toLowerCase().trim() : '';
    const existingIdx = users.findIndex(
      (u) => u.id === user.id || (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail)
    );
    if (existingIdx >= 0) {
      users[existingIdx] = { ...users[existingIdx], ...user };
    } else {
      users.push(user);
    }
    saveToStorage(KEYS.USERS, users);

    if (user.role === 'LANDLORD') {
      console.log('LANDLORD REGISTRATION STARTED');
      console.log(`LANDLORD RECORD CREATED: ${user.id}`);
      console.log(`LANDLORD STATUS: ${(user as any).verificationStatus || 'pending'}`);
    } else if (user.role === 'AGENT') {
      console.log('AGENT REGISTRATION STARTED');
      console.log(`AGENT RECORD CREATED: ${user.id}`);
      console.log(`AGENT STATUS: ${(user as any).verificationStatus || 'pending'}`);
    }
  },

  updateUser(user: User): void {
    const existing = this.getUserById(user.id);
    if (existing && !AuthSecurityService.isCurrentSessionAdmin()) {
      // Strictly prevent tampering with critical security/role fields by non-admin callers
      user.role = existing.role;
      user.accountStatus = existing.accountStatus;
    }
    const users = this.getUsers().map((u) => (u.id === user.id ? user : u));
    saveToStorage(KEYS.USERS, users);
    notify();
  },

  toggleUserAccountStatus(id: string): void {
    AuthSecurityService.assertAdmin();

    const users = this.getUsers().map((u) => {
      if (u.id === id) {
        const nextStatus: UserAccountStatus = u.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        return { ...u, accountStatus: nextStatus };
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);
  },

  // Landlord KYC & Identity Verification
  submitLandlordKYC(
    id: string,
    kycData: {
      fullName?: string;
      phoneNumber?: string;
      businessName?: string;
      businessAddress?: string;
      idCardType?: string;
      idCardNumber?: string;
      idCardDocumentUrl?: string;
      proofOfOwnershipDocUrl?: string;
      bankDetails?: {
        accountName: string;
        accountNumber: string;
        bankName: string;
      };
    }
  ): void {
    const existing = this.getUserById(id);
    if (existing) {
      AuthSecurityService.assertOwnership(existing.id, undefined, 'landlord KYC');
    }

    const nowIso = new Date().toISOString();
    let landlordName = '';
    let bizName = '';

    const users = this.getUsers().map((u) => {
      if (u.id === id && u.role === 'LANDLORD') {
        const landlord = u as LandlordUser;
        landlordName = kycData.fullName || landlord.fullName;
        bizName = kycData.businessName || landlord.businessName || '';
        return {
          ...landlord,
          ...kycData,
          verificationStatus: 'PENDING' as LandlordVerificationStatus,
          appliedDate: nowIso,
          adminCorrectionNote: undefined,
          adminRejectionReason: undefined,
        };
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);

    // Notify Admin of new Landlord KYC application
    this.addNotification({
      id: 'notif-' + Date.now() + '-admin-l-kyc',
      userId: 'user-admin-1',
      title: 'New Landlord KYC Application',
      message: `New Landlord KYC submitted by ${landlordName}${bizName ? ` (${bizName})` : ''}. Requires identity verification.`,
      type: 'KYC_LANDLORD',
      targetType: 'KYC_LANDLORD',
      targetId: id,
      isRead: false,
      createdAt: nowIso,
    });

    // Notify Landlord confirmation
    this.addNotification({
      id: 'notif-' + Date.now() + '-landlord-kyc-ack',
      userId: id,
      title: 'Landlord KYC Submitted',
      message: 'Your Landlord KYC verification has been submitted and is currently under review by HOMEZA administrators.',
      type: 'STATUS_CHANGE',
      targetType: 'KYC_LANDLORD',
      targetId: id,
      isRead: false,
      createdAt: nowIso,
    });
  },

  approveLandlordKYC(id: string, adminName?: string, notes?: string): void {
    AuthSecurityService.assertAdmin();

    const nowIso = new Date().toISOString();
    const reviewer = adminName || 'HOMEZA Admin';
    let landlordName = '';
    let appliedDate = '';

    const users = this.getUsers().map((u) => {
      if (u.id === id && u.role === 'LANDLORD') {
        const landlord = u as LandlordUser;
        landlordName = landlord.fullName;
        appliedDate = landlord.appliedDate || landlord.createdAt || nowIso;
        return {
          ...landlord,
          verificationStatus: 'VERIFIED' as LandlordVerificationStatus,
          reviewedDate: nowIso,
          reviewedBy: reviewer,
          adminCorrectionNote: undefined,
          adminRejectionReason: undefined,
        };
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);

    // Update landlord verification badge across their existing properties
    const props = this.getProperties().map((p) => {
      if (p.landlordId === id) {
        return { ...p, landlordVerificationStatus: 'VERIFIED' as const };
      }
      return p;
    });
    saveToStorage(KEYS.PROPERTIES, props);

    // Record Audit Trail Log
    this.addReviewAudit({
      id: 'audit-' + Date.now() + '-landlord-appr',
      targetType: 'KYC_LANDLORD',
      targetId: id,
      targetTitleOrName: landlordName || 'Landlord',
      submitterId: id,
      submitterName: landlordName || 'Landlord',
      submitterRole: 'LANDLORD',
      submissionDate: appliedDate,
      reviewerId: 'admin-1',
      reviewerName: reviewer,
      reviewDate: nowIso,
      decision: 'APPROVED',
      notes: notes || 'Landlord identity credentials verified successfully.',
    });

    // Notify Landlord
    this.addNotification({
      id: 'notif-' + Date.now() + '-landlord-appr',
      userId: id,
      title: 'Landlord KYC Approved!',
      message: 'Your Landlord KYC verification has been approved. Your property listings now feature verified landlord badges.',
      type: 'STATUS_CHANGE',
      targetType: 'KYC_LANDLORD',
      targetId: id,
      isRead: false,
      createdAt: nowIso,
    });
  },

  rejectLandlordKYC(id: string, rejectionReason: string, adminName?: string): void {
    AuthSecurityService.assertAdmin();

    const nowIso = new Date().toISOString();
    const reviewer = adminName || 'HOMEZA Admin';
    let landlordName = '';
    let appliedDate = '';

    const users = this.getUsers().map((u) => {
      if (u.id === id && u.role === 'LANDLORD') {
        const landlord = u as LandlordUser;
        landlordName = landlord.fullName;
        appliedDate = landlord.appliedDate || landlord.createdAt || nowIso;
        return {
          ...landlord,
          verificationStatus: 'REJECTED' as LandlordVerificationStatus,
          adminRejectionReason: rejectionReason,
          reviewedDate: nowIso,
          reviewedBy: reviewer,
        };
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);

    // Update landlord verification badge across their existing properties
    const props = this.getProperties().map((p) => {
      if (p.landlordId === id) {
        return { ...p, landlordVerificationStatus: 'REJECTED' as const };
      }
      return p;
    });
    saveToStorage(KEYS.PROPERTIES, props);

    // Record Audit Trail Log
    this.addReviewAudit({
      id: 'audit-' + Date.now() + '-landlord-rej',
      targetType: 'KYC_LANDLORD',
      targetId: id,
      targetTitleOrName: landlordName || 'Landlord',
      submitterId: id,
      submitterName: landlordName || 'Landlord',
      submitterRole: 'LANDLORD',
      submissionDate: appliedDate,
      reviewerId: 'admin-1',
      reviewerName: reviewer,
      reviewDate: nowIso,
      decision: 'REJECTED',
      notes: rejectionReason,
    });

    // Notify Landlord
    this.addNotification({
      id: 'notif-' + Date.now() + '-landlord-rej',
      userId: id,
      title: 'Landlord KYC Status Update',
      message: `Your Landlord KYC verification was not approved. Reason: ${rejectionReason}`,
      type: 'STATUS_CHANGE',
      targetType: 'KYC_LANDLORD',
      targetId: id,
      isRead: false,
      createdAt: nowIso,
    });
  },

  requestLandlordCorrection(id: string, correctionNotes: string, adminName?: string): void {
    AuthSecurityService.assertAdmin();

    const nowIso = new Date().toISOString();
    const reviewer = adminName || 'HOMEZA Admin';
    let landlordName = '';
    let appliedDate = '';

    const users = this.getUsers().map((u) => {
      if (u.id === id && u.role === 'LANDLORD') {
        const landlord = u as LandlordUser;
        landlordName = landlord.fullName;
        appliedDate = landlord.appliedDate || landlord.createdAt || nowIso;
        return {
          ...landlord,
          verificationStatus: 'CORRECTION_REQUIRED' as LandlordVerificationStatus,
          adminCorrectionNote: correctionNotes,
          reviewedDate: nowIso,
          reviewedBy: reviewer,
        };
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);

    // Record Audit Trail Log
    this.addReviewAudit({
      id: 'audit-' + Date.now() + '-landlord-corr',
      targetType: 'KYC_LANDLORD',
      targetId: id,
      targetTitleOrName: landlordName || 'Landlord',
      submitterId: id,
      submitterName: landlordName || 'Landlord',
      submitterRole: 'LANDLORD',
      submissionDate: appliedDate,
      reviewerId: 'admin-1',
      reviewerName: reviewer,
      reviewDate: nowIso,
      decision: 'CORRECTION_REQUIRED',
      notes: correctionNotes,
    });

    // Notify Landlord
    this.addNotification({
      id: 'notif-' + Date.now() + '-landlord-corr',
      userId: id,
      title: 'Landlord KYC: Action Required',
      message: `Additional information is required for your Landlord verification: ${correctionNotes}`,
      type: 'STATUS_CHANGE',
      targetType: 'KYC_LANDLORD',
      targetId: id,
      isRead: false,
      createdAt: nowIso,
    });
  },

  updateLandlordVerification(id: string, verificationStatus: LandlordVerificationStatus): void {
    AuthSecurityService.assertAdmin();

    const users = this.getUsers().map((u) => {
      if (u.id === id && u.role === 'LANDLORD') {
        return { ...u, verificationStatus };
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);

    // Also update landlord verification badge across their existing properties
    const props = this.getProperties().map((p) => {
      if (p.landlordId === id) {
        return { ...p, landlordVerificationStatus: verificationStatus };
      }
      return p;
    });
    saveToStorage(KEYS.PROPERTIES, props);

    // Notify landlord
    this.addNotification({
      id: 'notif-' + Date.now(),
      userId: id,
      title: `Landlord Account ${verificationStatus === 'VERIFIED' ? 'Verified!' : 'Status Updated'}`,
      message: `Your landlord profile verification status has been set to ${verificationStatus} by administrators.`,
      type: 'STATUS_CHANGE',
      targetType: 'KYC_LANDLORD',
      targetId: id,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  },

  // Agent Approval & Verification Workflow by Admin
  approveAgent(id: string, adminName?: string, notes?: string): void {
    AuthSecurityService.assertAdmin();

    const nowIso = new Date().toISOString();
    const reviewer = adminName || 'HOMEZA Admin';
    let approvedAgentName = '';
    let appliedDate = '';

    const users = this.getUsers().map((u) => {
      if (u.id === id && u.role === 'AGENT') {
        const agent = u as AgentUser;
        approvedAgentName = agent.fullName;
        appliedDate = agent.appliedDate || agent.createdAt || nowIso;
        return {
          ...agent,
          verificationStatus: 'APPROVED' as AgentVerificationStatus,
          reviewedDate: nowIso,
          reviewedBy: reviewer,
          adminCorrectionNote: undefined,
          adminRejectionReason: undefined,
        };
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);

    // Record Audit Trail Log
    this.addReviewAudit({
      id: 'audit-' + Date.now() + '-agent-appr',
      targetType: 'KYC_AGENT',
      targetId: id,
      targetTitleOrName: approvedAgentName || 'Agent',
      submitterId: id,
      submitterName: approvedAgentName || 'Agent',
      submitterRole: 'AGENT',
      submissionDate: appliedDate,
      reviewerId: 'admin-1',
      reviewerName: reviewer,
      reviewDate: nowIso,
      decision: 'APPROVED',
      notes: notes || 'Agent accreditation credentials verified and approved.',
    });

    // Notify Agent
    this.addNotification({
      id: 'notif-' + Date.now() + '-agent-appr',
      userId: id,
      title: 'Agent Application Approved!',
      message: 'Agent application approved successfully. You can now access your Agent Dashboard and manage client listings.',
      type: 'STATUS_CHANGE',
      targetType: 'KYC_AGENT',
      targetId: id,
      isRead: false,
      createdAt: nowIso,
    });
  },

  rejectAgent(id: string, rejectionReason: string, adminName?: string): void {
    AuthSecurityService.assertAdmin();

    const nowIso = new Date().toISOString();
    const reviewer = adminName || 'HOMEZA Admin';
    let agentName = '';
    let appliedDate = '';

    const users = this.getUsers().map((u) => {
      if (u.id === id && u.role === 'AGENT') {
        const agent = u as AgentUser;
        agentName = agent.fullName;
        appliedDate = agent.appliedDate || agent.createdAt || nowIso;
        return {
          ...agent,
          verificationStatus: 'REJECTED' as AgentVerificationStatus,
          adminRejectionReason: rejectionReason,
          reviewedDate: nowIso,
          reviewedBy: reviewer,
        };
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);

    // Record Audit Trail Log
    this.addReviewAudit({
      id: 'audit-' + Date.now() + '-agent-rej',
      targetType: 'KYC_AGENT',
      targetId: id,
      targetTitleOrName: agentName || 'Agent',
      submitterId: id,
      submitterName: agentName || 'Agent',
      submitterRole: 'AGENT',
      submissionDate: appliedDate,
      reviewerId: 'admin-1',
      reviewerName: reviewer,
      reviewDate: nowIso,
      decision: 'REJECTED',
      notes: rejectionReason,
    });

    // Notify Agent
    this.addNotification({
      id: 'notif-' + Date.now() + '-agent-rej',
      userId: id,
      title: 'Agent Application Status Update',
      message: `Agent application was not approved.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
      type: 'STATUS_CHANGE',
      targetType: 'KYC_AGENT',
      targetId: id,
      isRead: false,
      createdAt: nowIso,
    });
  },

  requestAgentCorrection(id: string, correctionNotes: string, adminName?: string): void {
    AuthSecurityService.assertAdmin();

    const nowIso = new Date().toISOString();
    const reviewer = adminName || 'HOMEZA Admin';
    let agentName = '';
    let appliedDate = '';

    const users = this.getUsers().map((u) => {
      if (u.id === id && u.role === 'AGENT') {
        const agent = u as AgentUser;
        agentName = agent.fullName;
        appliedDate = agent.appliedDate || agent.createdAt || nowIso;
        return {
          ...agent,
          verificationStatus: 'AGENT_CORRECTION_REQUIRED' as AgentVerificationStatus,
          adminCorrectionNote: correctionNotes,
          reviewedDate: nowIso,
          reviewedBy: reviewer,
        };
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);

    // Record Audit Trail Log
    this.addReviewAudit({
      id: 'audit-' + Date.now() + '-agent-corr',
      targetType: 'KYC_AGENT',
      targetId: id,
      targetTitleOrName: agentName || 'Agent',
      submitterId: id,
      submitterName: agentName || 'Agent',
      submitterRole: 'AGENT',
      submissionDate: appliedDate,
      reviewerId: 'admin-1',
      reviewerName: reviewer,
      reviewDate: nowIso,
      decision: 'CORRECTION_REQUIRED',
      notes: correctionNotes,
    });

    // Notify Agent
    this.addNotification({
      id: 'notif-' + Date.now() + '-agent-corr',
      userId: id,
      title: 'Agent Application: Action Required',
      message: `Additional information is required for your Agent application: ${correctionNotes}`,
      type: 'STATUS_CHANGE',
      targetType: 'KYC_AGENT',
      targetId: id,
      isRead: false,
      createdAt: nowIso,
    });
  },

  resubmitAgentApplication(
    id: string,
    updates: {
      fullName?: string;
      phoneNumber?: string;
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
    }
  ): void {
    const existing = this.getUserById(id);
    if (existing) {
      AuthSecurityService.assertOwnership(existing.id, undefined, 'agent application');
    }

    const nowIso = new Date().toISOString();
    let agentName = '';
    const users = this.getUsers().map((u) => {
      if (u.id === id && u.role === 'AGENT') {
        const agent = u as AgentUser;
        agentName = updates.fullName || agent.fullName;
        return {
          ...agent,
          ...updates,
          verificationStatus: 'PENDING_AGENT_APPROVAL' as AgentVerificationStatus,
          appliedDate: nowIso,
          adminCorrectionNote: undefined,
          adminRejectionReason: undefined,
        };
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);

    // Notify Admins
    this.addNotification({
      id: 'notif-' + Date.now() + '-admin-resub',
      userId: 'user-admin-1',
      title: 'Agent Application Resubmitted',
      message: `Agent application requires review: ${agentName} has updated and resubmitted credentials.`,
      type: 'KYC_AGENT',
      targetType: 'KYC_AGENT',
      targetId: id,
      isRead: false,
      createdAt: nowIso,
    });

    // Notify Agent confirmation
    this.addNotification({
      id: 'notif-' + Date.now() + '-agent-resub-ack',
      userId: id,
      title: 'Application Resubmitted',
      message: 'Agent application resubmitted successfully. Your profile is now under admin review.',
      type: 'STATUS_CHANGE',
      targetType: 'KYC_AGENT',
      targetId: id,
      isRead: false,
      createdAt: nowIso,
    });
  },

  updateAgentVerification(id: string, verificationStatus: AgentVerificationStatus): void {
    AuthSecurityService.assertAdmin();

    const users = this.getUsers().map((u) => {
      if (u.id === id && u.role === 'AGENT') {
        return { ...u, verificationStatus };
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);

    // Notify Agent
    this.addNotification({
      id: 'notif-' + Date.now(),
      userId: id,
      title: `Agent Account ${verificationStatus === 'APPROVED' || verificationStatus === 'VERIFIED' ? 'Approved!' : verificationStatus === 'SUSPENDED' ? 'Suspended' : 'Status Updated'}`,
      message: `Your Agent profile verification status has been updated to ${verificationStatus} by platform administration.`,
      type: 'STATUS_CHANGE',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  },

  // Saved Properties (Bookmarks for Tenants and Agents)
  toggleSaveProperty(userId: string, propertyId: string): boolean {
    const users = this.getUsers();
    let isSaved = false;
    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        if (u.role === 'TENANT') {
          const tenant = u as TenantUser;
          const currentSaved = tenant.savedPropertyIds || [];
          const exists = currentSaved.includes(propertyId);
          const newSaved = exists
            ? currentSaved.filter((id) => id !== propertyId)
            : [...currentSaved, propertyId];
          isSaved = !exists;
          return { ...tenant, savedPropertyIds: newSaved };
        } else if (u.role === 'AGENT') {
          const agent = u as AgentUser;
          const currentSaved = agent.savedPropertyIds || [];
          const exists = currentSaved.includes(propertyId);
          const newSaved = exists
            ? currentSaved.filter((id) => id !== propertyId)
            : [...currentSaved, propertyId];
          isSaved = !exists;
          return { ...agent, savedPropertyIds: newSaved };
        }
      }
      return u;
    });
    saveToStorage(KEYS.USERS, updatedUsers);
    return isSaved;
  },

  // Agent Clients Management
  getAgentClients(agentId?: string): AgentClient[] {
    const allClients = loadFromStorage<AgentClient[]>(KEYS.AGENT_CLIENTS, INITIAL_AGENT_CLIENTS);
    if (!agentId) return allClients;
    return allClients.filter((c) => c.agentId === agentId);
  },

  getAgentClientById(id: string): AgentClient | undefined {
    return this.getAgentClients().find((c) => c.id === id);
  },

  addAgentClient(client: AgentClient): void {
    const clients = this.getAgentClients();
    clients.unshift(client);
    saveToStorage(KEYS.AGENT_CLIENTS, clients);
  },

  updateAgentClient(client: AgentClient): void {
    const clients = this.getAgentClients().map((c) => (c.id === client.id ? client : c));
    saveToStorage(KEYS.AGENT_CLIENTS, clients);
  },

  deleteAgentClient(clientId: string): void {
    const clients = this.getAgentClients().filter((c) => c.id !== clientId);
    saveToStorage(KEYS.AGENT_CLIENTS, clients);
  },

  assignPropertyToClient(clientId: string, propertyId: string, agentId: string): void {
    const clients = this.getAgentClients().map((c) => {
      if (c.id === clientId && c.agentId === agentId) {
        const assigned = c.assignedPropertyIds || [];
        if (!assigned.includes(propertyId)) {
          return { ...c, assignedPropertyIds: [...assigned, propertyId], updatedAt: new Date().toISOString() };
        }
      }
      return c;
    });
    saveToStorage(KEYS.AGENT_CLIENTS, clients);

    // Also ensure property is in agent's assistedPropertyIds
    const users = this.getUsers().map((u) => {
      if (u.id === agentId && u.role === 'AGENT') {
        const agent = u as AgentUser;
        const currentAssisted = agent.assistedPropertyIds || [];
        if (!currentAssisted.includes(propertyId)) {
          return { ...agent, assistedPropertyIds: [...currentAssisted, propertyId] };
        }
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);
  },

  removePropertyFromClient(clientId: string, propertyId: string, agentId: string): void {
    const clients = this.getAgentClients().map((c) => {
      if (c.id === clientId && c.agentId === agentId) {
        const assigned = (c.assignedPropertyIds || []).filter((id) => id !== propertyId);
        return { ...c, assignedPropertyIds: assigned, updatedAt: new Date().toISOString() };
      }
      return c;
    });
    saveToStorage(KEYS.AGENT_CLIENTS, clients);
  },

  removeAssistedPropertyFromAgent(propertyId: string, agentId: string): void {
    // 1. Remove from all clients of this agent
    const clients = this.getAgentClients().map((c) => {
      if (c.agentId === agentId) {
        const assigned = (c.assignedPropertyIds || []).filter((id) => id !== propertyId);
        return { ...c, assignedPropertyIds: assigned, updatedAt: new Date().toISOString() };
      }
      return c;
    });
    saveToStorage(KEYS.AGENT_CLIENTS, clients);

    // 2. Remove from agent assistedPropertyIds
    const users = this.getUsers().map((u) => {
      if (u.id === agentId && u.role === 'AGENT') {
        const agent = u as AgentUser;
        const currentAssisted = (agent.assistedPropertyIds || []).filter((id) => id !== propertyId);
        return { ...agent, assistedPropertyIds: currentAssisted };
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);
  },

  getAssistedPropertiesByAgent(agentId: string): Property[] {
    const user = this.getUserById(agentId);
    if (!user || user.role !== 'AGENT') return [];
    const agent = user as AgentUser;
    const clientAssignedPropIds = this.getAgentClients(agentId).flatMap((c) => c.assignedPropertyIds || []);
    const directAssistedPropIds = agent.assistedPropertyIds || [];
    const allAssistedIds = Array.from(new Set([...clientAssignedPropIds, ...directAssistedPropIds]));
    return this.getProperties().filter((p) => allAssistedIds.includes(p.id) && p.isVerified && p.status !== 'REJECTED');
  },

  // Applications
  getApplications(): RentalApplication[] {
    return loadFromStorage<RentalApplication[]>(KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
  },

  getApplicationById(id: string): RentalApplication | undefined {
    return this.getApplications().find((a) => a.id === id);
  },

  getApplicationsByTenant(tenantId: string): RentalApplication[] {
    return this.getApplications().filter((a) => a.tenantId === tenantId);
  },

  getApplicationsByLandlord(landlordId: string): RentalApplication[] {
    return this.getApplications().filter((a) => a.landlordId === landlordId);
  },

  addApplication(application: RentalApplication): void {
    const apps = this.getApplications();
    apps.unshift(application);
    saveToStorage(KEYS.APPLICATIONS, apps);

    // Notify Landlord
    this.addNotification({
      id: 'notif-' + Date.now() + '-landlord',
      userId: application.landlordId,
      title: 'New Tenant Application',
      message: `${application.fullName} has applied for ${application.propertyTitle}.`,
      type: 'APPLICATION',
      isRead: false,
      createdAt: new Date().toISOString(),
      applicationId: application.id,
      propertyId: application.propertyId,
    });

    // Notify Tenant
    this.addNotification({
      id: 'notif-' + Date.now() + '-tenant',
      userId: application.tenantId,
      title: 'Application Submitted',
      message: `Your rental application for "${application.propertyTitle}" has been sent to the landlord for review.`,
      type: 'APPLICATION',
      isRead: false,
      createdAt: new Date().toISOString(),
      applicationId: application.id,
      propertyId: application.propertyId,
    });
  },

  approveApplication(id: string, notes?: string): void {
    let affectedApp: RentalApplication | undefined;
    const apps = this.getApplications().map((a) => {
      if (a.id === id) {
        affectedApp = {
          ...a,
          status: 'APPROVED',
          landlordNotes: notes !== undefined ? notes : a.landlordNotes,
          updatedAt: new Date().toISOString(),
        };
        return affectedApp;
      }
      return a;
    });
    saveToStorage(KEYS.APPLICATIONS, apps);

    if (affectedApp) {
      this.addNotification({
        id: 'notif-' + Date.now() + '-tenant',
        userId: affectedApp.tenantId,
        title: 'Application Approved',
        message: `Your application for ${affectedApp.propertyTitle} has been approved by the landlord.`,
        type: 'STATUS_CHANGE',
        isRead: false,
        createdAt: new Date().toISOString(),
        applicationId: id,
        propertyId: affectedApp.propertyId,
      });
    }
  },

  rejectApplication(id: string, reason: string): void {
    let affectedApp: RentalApplication | undefined;
    const apps = this.getApplications().map((a) => {
      if (a.id === id) {
        affectedApp = {
          ...a,
          status: 'REJECTED',
          rejectionReason: reason,
          landlordNotes: reason,
          updatedAt: new Date().toISOString(),
        };
        return affectedApp;
      }
      return a;
    });
    saveToStorage(KEYS.APPLICATIONS, apps);

    if (affectedApp) {
      this.addNotification({
        id: 'notif-' + Date.now() + '-tenant',
        userId: affectedApp.tenantId,
        title: 'Application Rejected',
        message: `Your application for ${affectedApp.propertyTitle} was not approved.${reason ? `\nReason: ${reason}` : ''}`,
        type: 'STATUS_CHANGE',
        isRead: false,
        createdAt: new Date().toISOString(),
        applicationId: id,
        propertyId: affectedApp.propertyId,
      });
    }
  },

  requestApplicationInfo(id: string, infoMessage: string): void {
    let affectedApp: RentalApplication | undefined;
    const nowIso = new Date().toISOString();
    const apps = this.getApplications().map((a) => {
      if (a.id === id) {
        const newEntry: InfoRequestEntry = {
          id: 'req-' + Date.now(),
          requestMessage: infoMessage.trim(),
          requestedAt: nowIso,
          landlordId: a.landlordId,
          landlordName: a.landlordName,
        };
        const existingEntries = a.infoRequests ? [...a.infoRequests] : [];
        affectedApp = {
          ...a,
          status: 'ADDITIONAL_INFO_REQUESTED',
          infoRequestMessage: infoMessage.trim(),
          landlordNotes: infoMessage.trim(),
          infoRequests: [...existingEntries, newEntry],
          updatedAt: nowIso,
        };
        return affectedApp;
      }
      return a;
    });
    saveToStorage(KEYS.APPLICATIONS, apps);

    if (affectedApp) {
      this.addNotification({
        id: 'notif-' + Date.now() + '-tenant',
        userId: affectedApp.tenantId,
        title: 'Additional Information Required',
        message: `${affectedApp.landlordName || 'The Landlord'} has requested additional information regarding your application for ${affectedApp.propertyTitle}.\n\n"${infoMessage.trim()}"`,
        type: 'APPLICATION',
        isRead: false,
        createdAt: nowIso,
        applicationId: id,
        propertyId: affectedApp.propertyId,
      });
    }
  },

  submitApplicationInfoResponse(id: string, responseMessage: string): void {
    let affectedApp: RentalApplication | undefined;
    const nowIso = new Date().toISOString();
    const apps = this.getApplications().map((a) => {
      if (a.id === id) {
        const history: InfoRequestEntry[] = a.infoRequests ? [...a.infoRequests] : [];
        if (history.length > 0) {
          const lastIndex = history.length - 1;
          history[lastIndex] = {
            ...history[lastIndex],
            tenantResponse: responseMessage.trim(),
            respondedAt: nowIso,
            tenantId: a.tenantId,
          };
        } else {
          history.push({
            id: 'req-' + Date.now(),
            requestMessage: a.infoRequestMessage || 'Please provide additional information.',
            requestedAt: a.updatedAt || nowIso,
            landlordId: a.landlordId,
            landlordName: a.landlordName,
            tenantResponse: responseMessage.trim(),
            respondedAt: nowIso,
            tenantId: a.tenantId,
          });
        }

        affectedApp = {
          ...a,
          status: 'ADDITIONAL_INFO_SUBMITTED',
          tenantResponse: responseMessage.trim(),
          infoRequests: history,
          updatedAt: nowIso,
        };
        return affectedApp;
      }
      return a;
    });
    saveToStorage(KEYS.APPLICATIONS, apps);

    if (affectedApp) {
      this.addNotification({
        id: 'notif-' + Date.now() + '-landlord',
        userId: affectedApp.landlordId,
        title: 'Additional Information Received',
        message: `${affectedApp.fullName} has submitted the requested information for ${affectedApp.propertyTitle}.`,
        type: 'APPLICATION',
        isRead: false,
        createdAt: nowIso,
        applicationId: id,
        propertyId: affectedApp.propertyId,
      });
    }
  },

  updateApplicationStatus(id: string, status: ApplicationStatus, landlordNotes?: string): void {
    if (status === 'APPROVED') {
      this.approveApplication(id, landlordNotes);
    } else if (status === 'REJECTED') {
      this.rejectApplication(id, landlordNotes || '');
    } else if (status === 'ADDITIONAL_INFO_REQUESTED' || status === 'INFORMATION_REQUESTED') {
      this.requestApplicationInfo(id, landlordNotes || 'Please provide more details regarding your move-in plan.');
    } else {
      let affectedApp: RentalApplication | undefined;
      const apps = this.getApplications().map((a) => {
        if (a.id === id) {
          affectedApp = {
            ...a,
            status,
            landlordNotes: landlordNotes !== undefined ? landlordNotes : a.landlordNotes,
            updatedAt: new Date().toISOString(),
          };
          return affectedApp;
        }
        return a;
      });
      saveToStorage(KEYS.APPLICATIONS, apps);

      if (affectedApp) {
        this.addNotification({
          id: 'notif-' + Date.now(),
          userId: affectedApp.tenantId,
          title: `Application ${status.charAt(0) + status.slice(1).toLowerCase()}`,
          message: `Your application for "${affectedApp.propertyTitle}" status updated to ${status}.`,
          type: 'STATUS_CHANGE',
          isRead: false,
          createdAt: new Date().toISOString(),
          applicationId: id,
          propertyId: affectedApp.propertyId,
        });
      }
    }
  },

  // Reports
  getReports(): PropertyReport[] {
    return loadFromStorage<PropertyReport[]>(KEYS.REPORTS, INITIAL_REPORTS);
  },

  resolveReport(id: string, status: 'ACTION_TAKEN' | 'DISMISSED', adminNotes?: string): void {
    AuthSecurityService.assertAdmin();

    const reports = this.getReports().map((r) =>
      r.id === id
        ? {
            ...r,
            status: (status === 'ACTION_TAKEN' ? 'RESOLVED' : 'DISMISSED') as ReportStatus,
            adminNotes: adminNotes !== undefined ? adminNotes : r.adminNotes,
          }
        : r
    );
    saveToStorage(KEYS.REPORTS, reports);
  },

  deleteReport(id: string): void {
    AuthSecurityService.assertAdmin();

    const reports = this.getReports().filter((r) => r.id !== id);
    saveToStorage(KEYS.REPORTS, reports);
  },

  updateUserVerification(userId: string, verificationStatus: LandlordVerificationStatus): void {
    AuthSecurityService.assertAdmin();
    this.updateLandlordVerification(userId, verificationStatus);
  },

  updateLocationStatus(id: string, isActive: boolean): void {
    AuthSecurityService.assertAdmin();

    const locs = this.getLocations().map((l) => (l.id === id ? { ...l, isActive } : l));
    saveToStorage(KEYS.LOCATIONS, locs);
  },

  addReport(report: PropertyReport): void {
    const reports = this.getReports();
    reports.unshift(report);
    saveToStorage(KEYS.REPORTS, reports);

    // Notify Admin
    this.addNotification({
      id: 'notif-' + Date.now(),
      userId: 'user-admin-1',
      title: 'Property Reported',
      message: `Property "${report.propertyTitle}" was reported for "${report.reason}".`,
      type: 'REPORT',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  },

  updateReportStatus(id: string, status: ReportStatus, adminNotes?: string): void {
    AuthSecurityService.assertAdmin();

    const reports = this.getReports().map((r) =>
      r.id === id
        ? {
            ...r,
            status,
            adminNotes: adminNotes !== undefined ? adminNotes : r.adminNotes,
          }
        : r
    );
    saveToStorage(KEYS.REPORTS, reports);
  },

  // Locations
  getLocations(): LocationArea[] {
    return loadFromStorage<LocationArea[]>(KEYS.LOCATIONS, INITIAL_LOCATIONS);
  },

  addLocation(loc: LocationArea): void {
    AuthSecurityService.assertAdmin();

    const locs = this.getLocations();
    locs.push(loc);
    saveToStorage(KEYS.LOCATIONS, locs);
  },

  updateLocation(updatedLoc: LocationArea): void {
    AuthSecurityService.assertAdmin();

    const locs = this.getLocations().map((l) => (l.id === updatedLoc.id ? updatedLoc : l));
    saveToStorage(KEYS.LOCATIONS, locs);
  },

  toggleLocationStatus(id: string): void {
    AuthSecurityService.assertAdmin();

    const locs = this.getLocations().map((l) => (l.id === id ? { ...l, isActive: !l.isActive } : l));
    saveToStorage(KEYS.LOCATIONS, locs);
  },

  deleteLocation(id: string): void {
    AuthSecurityService.assertAdmin();

    const locs = this.getLocations().filter((l) => l.id !== id);
    saveToStorage(KEYS.LOCATIONS, locs);
  },

  // Notifications
  getNotifications(userId?: string): AppNotification[] {
    const notifs = loadFromStorage<AppNotification[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    if (!userId) return notifs;
    return notifs.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  addNotification(notif: AppNotification): void {
    const notifs = loadFromStorage<AppNotification[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    notifs.unshift(notif);
    saveToStorage(KEYS.NOTIFICATIONS, notifs);

    if (
      notif.userId === 'user-admin-1' ||
      notif.userId === 'admin-1' ||
      notif.userId === 'admin' ||
      (notif as any).targetRole === 'ADMIN'
    ) {
      console.log(`ADMIN NOTIFICATION CREATED: ${notif.id} - ${notif.title}`);
    }
  },

  markNotificationAsRead(id: string): void {
    const notifs = loadFromStorage<AppNotification[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS).map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    saveToStorage(KEYS.NOTIFICATIONS, notifs);
  },

  markAllNotificationsAsRead(userId: string): void {
    const notifs = loadFromStorage<AppNotification[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS).map((n) =>
      n.userId === userId ? { ...n, isRead: true } : n
    );
    saveToStorage(KEYS.NOTIFICATIONS, notifs);
  },

  // Review Audit Trail Logs (Admin Review History)
  getReviewAudits(): ReviewAuditLog[] {
    return loadFromStorage<ReviewAuditLog[]>(KEYS.REVIEW_AUDITS, []);
  },

  addReviewAudit(audit: ReviewAuditLog): void {
    const audits = this.getReviewAudits();
    audits.unshift(audit);
    saveToStorage(KEYS.REVIEW_AUDITS, audits);
    console.log(`ADMIN APPROVAL RECORD CREATED: ${audit.id} (${audit.decision}) on ${audit.targetType} ${audit.targetId}`);
  },

  getPendingReviewItems(): PendingReviewItem[] {
    const allProps = this.getProperties();
    const allUsers = this.getUsers();
    const items: PendingReviewItem[] = [];

    // Properties pending review
    allProps
      .filter((p) => p.status === 'PENDING_REVIEW' || p.status === 'PENDING_VERIFICATION' || p.status === 'CORRECTION_REQUIRED')
      .forEach((p) => {
        const isAgent = p.listingSource === 'AGENT' && !!p.submittingAgentId;
        items.push({
          id: `review-prop-${p.id}`,
          targetType: 'PROPERTY',
          targetId: p.id,
          type: 'PROPERTY',
          titleOrName: p.title,
          title: p.title,
          subtitle: `${p.location.area}, Uyo • ${p.propertyType}`,
          detail: `${p.bedrooms} Beds • ${p.bathrooms} Baths • ₦${p.pricing.rent.toLocaleString()}/${p.pricing.rentalPeriod.toLowerCase()}`,
          submitterId: isAgent ? (p.submittingAgentId || '') : (p.landlordId || ''),
          submitterName: isAgent ? (p.submittingAgentName || 'Agent') : (p.landlordName || 'Landlord'),
          submitterRole: isAgent ? 'AGENT' : 'LANDLORD',
          submitterPhone: isAgent ? p.submittingAgentPhone : p.landlordPhone,
          submitterEmail: isAgent ? p.submittingAgentEmail : undefined,
          submissionDate: p.createdAt,
          status: p.status,
          correctionNote: p.adminCorrectionNote,
          rejectionReason: p.adminRejectionReason,
          targetObject: p,
        });
      });

    // Landlords pending KYC
    allUsers
      .filter((u): u is LandlordUser => u.role === 'LANDLORD' && (u.verificationStatus === 'PENDING' || u.verificationStatus === 'CORRECTION_REQUIRED'))
      .forEach((l) => {
        items.push({
          id: `review-landlord-${l.id}`,
          targetType: 'KYC_LANDLORD',
          targetId: l.id,
          type: 'KYC_LANDLORD',
          titleOrName: l.fullName,
          title: l.fullName,
          subtitle: l.businessName ? `Business: ${l.businessName}` : 'Individual Property Owner',
          detail: `ID Type: ${l.idCardType || 'NIN / Voter Card'} • ${l.phoneNumber}`,
          submitterId: l.id,
          submitterName: l.fullName,
          submitterRole: 'LANDLORD',
          submitterPhone: l.phoneNumber,
          submitterEmail: l.email,
          submissionDate: l.appliedDate || l.createdAt || new Date().toISOString(),
          status: l.verificationStatus,
          correctionNote: l.adminCorrectionNote,
          rejectionReason: l.adminRejectionReason,
          targetObject: l,
        });
      });

    // Agents pending approval
    allUsers
      .filter((u): u is AgentUser => u.role === 'AGENT' && (u.verificationStatus === 'PENDING_AGENT_APPROVAL' || u.verificationStatus === 'PENDING' || u.verificationStatus === 'AGENT_CORRECTION_REQUIRED' || u.verificationStatus === 'CORRECTION_REQUIRED'))
      .forEach((a) => {
        items.push({
          id: `review-agent-${a.id}`,
          targetType: 'KYC_AGENT',
          targetId: a.id,
          type: 'KYC_AGENT',
          titleOrName: a.fullName,
          title: a.fullName,
          subtitle: `Agency: ${a.agencyName || 'Independent Real Estate Agent'} • Area: ${a.operatingArea || 'Uyo Metropolis'}`,
          detail: `CAC: ${a.cacNumber || 'N/A'} • License: ${a.licenseNumber || 'N/A'} • ${a.phoneNumber}`,
          submitterId: a.id,
          submitterName: a.fullName,
          submitterRole: 'AGENT',
          submitterPhone: a.phoneNumber,
          submitterEmail: a.email,
          submissionDate: a.appliedDate || a.createdAt || new Date().toISOString(),
          status: a.verificationStatus,
          correctionNote: a.adminCorrectionNote,
          rejectionReason: a.adminRejectionReason,
          targetObject: a,
        });
      });

    console.log('ADMIN DASHBOARD QUERY STARTED');
    console.log(`PENDING LANDLORDS FOUND: ${items.filter((i) => i.targetType === 'KYC_LANDLORD').length}`);
    console.log(`PENDING AGENTS FOUND: ${items.filter((i) => i.targetType === 'KYC_AGENT').length}`);
    console.log(`PENDING PROPERTIES FOUND: ${items.filter((i) => i.targetType === 'PROPERTY').length}`);
    console.log(`ADMIN NOTIFICATIONS FOUND: ${this.getNotifications('user-admin-1').length}`);

    return items.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
  },

  // Unified Pending Reviews for Admin
  getPendingReviews(): {
    pendingProperties: Property[];
    pendingAgentKYCs: AgentUser[];
    pendingLandlordKYCs: LandlordUser[];
    totalPendingCount: number;
    items: PendingReviewItem[];
  } {
    const items = this.getPendingReviewItems();
    const allProps = this.getProperties();
    const allUsers = this.getUsers();

    const pendingProperties = allProps.filter(
      (p) => p.status === 'PENDING_REVIEW' || p.status === 'PENDING_VERIFICATION' || p.status === 'CORRECTION_REQUIRED'
    );

    const pendingAgentKYCs = allUsers.filter(
      (u): u is AgentUser => u.role === 'AGENT' && (u.verificationStatus === 'PENDING_AGENT_APPROVAL' || u.verificationStatus === 'PENDING' || u.verificationStatus === 'AGENT_CORRECTION_REQUIRED' || u.verificationStatus === 'CORRECTION_REQUIRED')
    );

    const pendingLandlordKYCs = allUsers.filter(
      (u): u is LandlordUser => u.role === 'LANDLORD' && (u.verificationStatus === 'PENDING' || u.verificationStatus === 'CORRECTION_REQUIRED')
    );

    return {
      pendingProperties,
      pendingAgentKYCs,
      pendingLandlordKYCs,
      totalPendingCount: items.length,
      items,
    };
  },

  // Current session
  getCurrentUserId(): string | null {
    return loadFromStorage<string | null>(KEYS.CURRENT_USER_ID, null);
  },

  setCurrentUserId(id: string | null): void {
    saveToStorage(KEYS.CURRENT_USER_ID, id);
  },

  // Platform Config
  getPlatformConfig(): PlatformConfig {
    return loadFromStorage<PlatformConfig>(KEYS.CONFIG, PLATFORM_CONFIG);
  },

  updatePlatformConfig(config: PlatformConfig): void {
    AuthSecurityService.assertAdmin();
    saveToStorage(KEYS.CONFIG, config);
  },

  // Duplicate Listing Moderation Actions (Admin)
  confirmDuplicate(propertyId: string, adminNotes?: string): void {
    AuthSecurityService.assertAdmin();

    const nowIso = new Date().toISOString();
    const props = this.getProperties().map((p) => {
      if (p.id === propertyId) {
        const history = p.verificationHistory ? [...p.verificationHistory] : [];
        history.push({
          id: 'vh-' + Date.now() + '-dup-confirm',
          action: 'REJECTED',
          status: 'SUSPENDED',
          timestamp: nowIso,
          actorName: 'System Admin',
          actorRole: 'ADMIN',
          notes: adminNotes || 'Listing confirmed as a duplicate of an existing property and suspended from marketplace.',
        });
        return {
          ...p,
          status: 'SUSPENDED' as PropertyStatus,
          isPossibleDuplicate: true,
          duplicateDecision: 'CONFIRMED_DUPLICATE' as DuplicateReviewDecision,
          duplicateDecisionNotes: adminNotes,
          duplicateReviewedAt: nowIso,
          verificationHistory: history,
          updatedAt: nowIso,
        };
      }
      return p;
    });
    saveToStorage(KEYS.PROPERTIES, props);

    const targetProp = props.find((p) => p.id === propertyId);
    if (targetProp) {
      // Notify submitter
      const recipientId = targetProp.listingSource === 'AGENT' && targetProp.submittingAgentId
        ? targetProp.submittingAgentId
        : targetProp.landlordId;
      if (recipientId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-dup-reject',
          userId: recipientId,
          title: 'Duplicate Listing Moderation Notice',
          message: `Your listing '${targetProp.title}' was reviewed by Admin and flagged as a duplicate of an existing property listing. It has been suspended from the public marketplace.`,
          type: 'DUPLICATE',
          isRead: false,
          createdAt: nowIso,
          propertyId,
        });
      }
    }
  },

  dismissDuplicate(propertyId: string, adminNotes?: string): void {
    AuthSecurityService.assertAdmin();

    const nowIso = new Date().toISOString();
    const props = this.getProperties().map((p) => {
      if (p.id === propertyId) {
        const history = p.verificationHistory ? [...p.verificationHistory] : [];
        history.push({
          id: 'vh-' + Date.now() + '-dup-dismiss',
          action: 'APPROVED',
          status: p.status === 'SUSPENDED' ? 'PENDING_REVIEW' : p.status,
          timestamp: nowIso,
          actorName: 'System Admin',
          actorRole: 'ADMIN',
          notes: adminNotes || 'Potential duplicate flag dismissed by Admin. Verified as distinct property.',
        });
        return {
          ...p,
          isPossibleDuplicate: false,
          duplicateDecision: 'DISMISSED' as DuplicateReviewDecision,
          duplicateDecisionNotes: adminNotes,
          duplicateReviewedAt: nowIso,
          verificationHistory: history,
          updatedAt: nowIso,
        };
      }
      return p;
    });
    saveToStorage(KEYS.PROPERTIES, props);
  },

  requestDuplicateClarification(propertyId: string, clarificationNote: string): void {
    AuthSecurityService.assertAdmin();

    const nowIso = new Date().toISOString();
    const props = this.getProperties().map((p) => {
      if (p.id === propertyId) {
        const history = p.verificationHistory ? [...p.verificationHistory] : [];
        history.push({
          id: 'vh-' + Date.now() + '-dup-clarify',
          action: 'CORRECTION_REQUESTED',
          status: 'NEEDS_CORRECTION',
          timestamp: nowIso,
          actorName: 'System Admin',
          actorRole: 'ADMIN',
          notes: `Duplicate Clarification: ${clarificationNote}`,
        });
        return {
          ...p,
          status: 'NEEDS_CORRECTION' as PropertyStatus,
          duplicateDecision: 'CLARIFICATION_REQUESTED' as DuplicateReviewDecision,
          adminCorrectionNote: clarificationNote,
          duplicateReviewedAt: nowIso,
          verificationHistory: history,
          updatedAt: nowIso,
        };
      }
      return p;
    });
    saveToStorage(KEYS.PROPERTIES, props);

    const targetProp = props.find((p) => p.id === propertyId);
    if (targetProp) {
      const recipientId = targetProp.listingSource === 'AGENT' && targetProp.submittingAgentId
        ? targetProp.submittingAgentId
        : targetProp.landlordId;
      if (recipientId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-dup-clarify',
          userId: recipientId,
          title: 'Duplicate Check Clarification Required',
          message: `Admin requested clarification for '${targetProp.title}': ${clarificationNote}`,
          type: 'DUPLICATE',
          isRead: false,
          createdAt: nowIso,
          propertyId,
        });
      }
    }
  },

  // Inspections Workflow
  getInspections(): PropertyInspection[] {
    return loadFromStorage<PropertyInspection[]>(KEYS.INSPECTIONS, INITIAL_INSPECTIONS);
  },

  getInspectionsByTenant(tenantId: string): PropertyInspection[] {
    return this.getInspections().filter((i) => i.tenantId === tenantId);
  },

  getInspectionsByLandlord(landlordId: string): PropertyInspection[] {
    return this.getInspections().filter((i) => i.landlordId === landlordId);
  },

  getInspectionsByAgent(agentId: string): PropertyInspection[] {
    return this.getInspections().filter((i) => i.agentId === agentId);
  },

  requestInspection(
    data: Omit<PropertyInspection, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'isLocationReleased'>
  ): PropertyInspection {
    const inspections = this.getInspections();
    const nowIso = new Date().toISOString();
    const repName = data.agentName || data.landlordName;

    const auditHistory: InspectionAuditEntry[] = [
      {
        id: 'aud-' + Date.now() + '-req',
        timestamp: nowIso,
        action: 'INSPECTION_REQUESTED',
        title: 'Inspection Requested by Tenant',
        actorName: data.tenantName,
        actorRole: 'TENANT',
        notes: `Requested date: ${data.preferredDate} (${data.preferredTime})`,
      },
      {
        id: 'aud-' + Date.now() + '-adm',
        timestamp: nowIso,
        action: 'ADMIN_NOTIFIED',
        title: 'HOMEZA Admin Notified',
        actorName: 'System',
        actorRole: 'ADMIN',
        notes: 'Inspection dispatched to HOMEZA schedule',
      },
    ];

    const newId = 'insp-' + Date.now();
    const propertyObj = this.getPropertyById(data.propertyId);
    const resolvedInspectionFee =
      (typeof data.inspectionFee === 'number' && data.inspectionFee >= 3000 && data.inspectionFee <= 5000)
        ? data.inspectionFee
        : (typeof propertyObj?.inspectionFee === 'number' && propertyObj.inspectionFee >= 3000 && propertyObj.inspectionFee <= 5000)
        ? propertyObj.inspectionFee
        : (typeof propertyObj?.pricing?.inspectionFee === 'number' && propertyObj.pricing.inspectionFee >= 3000 && propertyObj.pricing.inspectionFee <= 5000)
        ? propertyObj.pricing.inspectionFee
        : 3000;

    const newInspection: PropertyInspection = {
      ...data,
      id: newId,
      bookingId: newId,
      inspectionFee: resolvedInspectionFee,
      status: 'INSPECTION_REQUESTED',
      isLocationReleased: false,
      homezaCoordinationConfirmed: false,
      coordinationMode: 'REMOTE_COORDINATION',
      assignedHomezaRep: {
        id: 'rep-admin',
        name: 'HOMEZA Super Admin',
        role: 'Super Admin / Inspection Officer',
        phone: '+234 800 466 3921',
        email: 'admin@homeza.ng',
      },
      auditHistory,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    inspections.unshift(newInspection);
    saveToStorage(KEYS.INSPECTIONS, inspections);

    // Persist immediately to server database
    fetch('/api/inspections/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newInspection,
        propertySnapshot: propertyObj,
      }),
    }).catch((err) => console.warn('[STORE] Inspection booking server persist failed:', err));

    // 1. Notify Landlord or Agent
    const recipientId = newInspection.agentId || newInspection.landlordId;
    if (recipientId) {
      this.addNotification({
        id: 'notif-' + Date.now() + '-insp-req',
        userId: recipientId,
        title: 'New Inspection Request',
        message: `${newInspection.tenantName} requested a physical inspection for '${newInspection.propertyTitle}' on ${newInspection.preferredDate} (${newInspection.preferredTime}).`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: newInspection.propertyId,
        inspectionId: newInspection.id,
      });
    }

    // 2. Notify Tenant of submission
    this.addNotification({
      id: 'notif-' + Date.now() + '-insp-tenant',
      userId: newInspection.tenantId,
      title: 'Inspection Request Submitted',
      message: `Your inspection request for '${newInspection.propertyTitle}' on ${newInspection.preferredDate} has been sent. Exact property location will be released upon confirmation.`,
      type: 'INSPECTION',
      isRead: false,
      createdAt: nowIso,
      propertyId: newInspection.propertyId,
      inspectionId: newInspection.id,
    });

    // 3. Notify Admin (Requirement 1: Exact format with Property, Area, Tenant, Representative, Date, Time, Status)
    const adminMessage = `New Inspection Request:\n${newInspection.propertyTitle}, ${newInspection.propertyLocationArea}\n${newInspection.preferredDate}, ${newInspection.preferredTime}\nTenant: ${newInspection.tenantName}\nRepresentative: ${repName}`;
    
    this.addNotification({
      id: 'notif-' + Date.now() + '-insp-admin',
      userId: 'user-admin-1',
      title: `New Inspection Request: ${newInspection.propertyLocationArea}`,
      message: adminMessage,
      type: 'INSPECTION',
      isRead: false,
      createdAt: nowIso,
      propertyId: newInspection.propertyId,
      inspectionId: newInspection.id,
    });

    return newInspection;
  },

  confirmInspection(inspectionId: string, responseNote?: string): void {
    const nowIso = new Date().toISOString();
    let confirmedInspection: PropertyInspection | undefined;

    const inspections = this.getInspections().map((i) => {
      if (i.id === inspectionId) {
        const history: InspectionAuditEntry[] = i.auditHistory ? [...i.auditHistory] : [];
        history.push({
          id: 'aud-' + Date.now() + '-accept',
          timestamp: nowIso,
          action: 'TIME_ACCEPTED',
          title: 'Time Proposed/Accepted by Landlord or Agent',
          actorName: i.agentName || i.landlordName,
          actorRole: i.agentId ? 'AGENT' : 'LANDLORD',
          notes: responseNote || 'Availability confirmed for requested inspection slot.',
        });
        history.push({
          id: 'aud-' + Date.now() + '-coord',
          timestamp: nowIso,
          action: 'HOMEZA_COORDINATION_CONFIRMED',
          title: 'HOMEZA Coordination Confirmed',
          actorName: 'HOMEZA Operations',
          actorRole: 'ADMIN',
          notes: 'Inspection confirmed and added to active schedule',
        });

        confirmedInspection = {
          ...i,
          status: 'INSPECTION_CONFIRMED' as InspectionStatus,
          isLocationReleased: true,
          homezaCoordinationConfirmed: true,
          landlordResponseNote: responseNote || 'Inspection confirmed. Meeting point and location unlocked.',
          auditHistory: history,
          updatedAt: nowIso,
        };
        return confirmedInspection;
      }
      return i;
    });

    saveToStorage(KEYS.INSPECTIONS, inspections);

    if (confirmedInspection) {
      // 1. Notify Tenant
      this.addNotification({
        id: 'notif-' + Date.now() + '-insp-conf-tenant',
        userId: confirmedInspection.tenantId,
        title: 'INSPECTION CONFIRMED',
        message: 'Your inspection has been confirmed.',
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: confirmedInspection.propertyId,
        inspectionId: confirmedInspection.id,
      });

      // 2. Notify Landlord or Agent
      const recipientId = confirmedInspection.agentId || confirmedInspection.landlordId;
      if (recipientId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-insp-conf-landlord',
          userId: recipientId,
          title: 'INSPECTION CONFIRMED',
          message: 'The inspection has been confirmed. Please be available at the scheduled time.',
          type: 'INSPECTION',
          isRead: false,
          createdAt: nowIso,
          propertyId: confirmedInspection.propertyId,
          inspectionId: confirmedInspection.id,
        });
      }

      // 3. Notify Admin
      this.addNotification({
        id: 'notif-' + Date.now() + '-insp-conf-admin',
        userId: 'user-admin-1',
        title: 'INSPECTION CONFIRMED',
        message: `Inspection confirmed and added to your schedule: ${confirmedInspection.propertyTitle} with ${confirmedInspection.tenantName}.`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: confirmedInspection.propertyId,
        inspectionId: confirmedInspection.id,
      });
    }
  },

  // Authoritative update method for inspection records
  updateInspection(inspectionId: string, updates: Partial<PropertyInspection>): PropertyInspection | undefined {
    const nowIso = new Date().toISOString();
    let updatedInspection: PropertyInspection | undefined;

    const list: PropertyInspection[] = (typeof Store !== 'undefined' && Store?.getInspections)
      ? Store.getInspections()
      : (this?.getInspections ? this.getInspections() : []);

    const inspections = list.map((i) => {
      if (i.id === inspectionId || (i as any).bookingId === inspectionId) {
        updatedInspection = {
          ...i,
          ...updates,
          updatedAt: nowIso,
        };
        return updatedInspection;
      }
      return i;
    });

    saveToStorage(KEYS.INSPECTIONS, inspections);
    notify();
    return updatedInspection;
  },

  // Authoritative inspection payment confirmation and location release
  confirmInspectionAndUnlockLocation(
    inspectionId: string,
    reviewerName: string = 'HOMEZA Operations',
    notes?: string
  ): PropertyInspection | undefined {
    const nowIso = new Date().toISOString();
    let confirmedInspection: PropertyInspection | undefined;

    const list: PropertyInspection[] = (typeof Store !== 'undefined' && Store?.getInspections)
      ? Store.getInspections()
      : (this?.getInspections ? this.getInspections() : []);

    const inspections = list.map((i) => {
      if (i.id === inspectionId || (i as any).bookingId === inspectionId) {
        const history: InspectionAuditEntry[] = i.auditHistory ? [...i.auditHistory] : [];
        history.push({
          id: `aud-${Date.now()}-adm-unlock`,
          timestamp: nowIso,
          action: 'PAYMENT_RECEIVED',
          title: 'Payment Confirmed & Exact Location Released',
          actorName: reviewerName,
          actorRole: 'ADMIN',
          notes: notes || 'Inspection fee payment verified by HOMEZA Operations. Full location released.',
        });

        confirmedInspection = {
          ...i,
          status: 'INSPECTION_CONFIRMED' as InspectionStatus,
          paymentStatus: 'PAID',
          isLocationReleased: true,
          homezaCoordinationConfirmed: true,
          auditHistory: history,
          updatedAt: nowIso,
        };
        return confirmedInspection;
      }
      return i;
    });

    saveToStorage(KEYS.INSPECTIONS, inspections);

    if (confirmedInspection) {
      // 1. Notify Tenant
      Store?.addNotification ? Store.addNotification({
        id: `notif-${Date.now()}-insp-unlocked-t`,
        userId: confirmedInspection.tenantId,
        title: 'Inspection Payment Confirmed',
        message: `Your inspection for '${confirmedInspection.propertyTitle}' is confirmed and full location details are now unlocked.`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: confirmedInspection.propertyId,
        inspectionId: confirmedInspection.id,
      }) : this.addNotification({
        id: `notif-${Date.now()}-insp-unlocked-t`,
        userId: confirmedInspection.tenantId,
        title: 'Inspection Payment Confirmed',
        message: `Your inspection for '${confirmedInspection.propertyTitle}' is confirmed and full location details are now unlocked.`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: confirmedInspection.propertyId,
        inspectionId: confirmedInspection.id,
      });

      // 2. Notify Landlord or Agent
      const recipientId = confirmedInspection.agentId || confirmedInspection.landlordId;
      if (recipientId) {
        Store?.addNotification ? Store.addNotification({
          id: `notif-${Date.now()}-insp-unlocked-l`,
          userId: recipientId,
          title: 'Inspection Fee Confirmed',
          message: `Inspection payment for '${confirmedInspection.propertyTitle}' has been verified. Inspection is scheduled for ${confirmedInspection.preferredDate}.`,
          type: 'INSPECTION',
          isRead: false,
          createdAt: nowIso,
          propertyId: confirmedInspection.propertyId,
          inspectionId: confirmedInspection.id,
        }) : this.addNotification({
          id: `notif-${Date.now()}-insp-unlocked-l`,
          userId: recipientId,
          title: 'Inspection Fee Confirmed',
          message: `Inspection payment for '${confirmedInspection.propertyTitle}' has been verified. Inspection is scheduled for ${confirmedInspection.preferredDate}.`,
          type: 'INSPECTION',
          isRead: false,
          createdAt: nowIso,
          propertyId: confirmedInspection.propertyId,
          inspectionId: confirmedInspection.id,
        });
      }
    }

    notify();
    return confirmedInspection;
  },

  confirmHomezaCoordination(
    inspectionId: string,
    mode: InspectionCoordinationMode,
    rep?: HomezaRepresentative,
    notes?: string,
    adminName: string = 'Super Admin'
  ): void {
    const nowIso = new Date().toISOString();
    let updatedInspection: PropertyInspection | undefined;

    const inspections = this.getInspections().map((i) => {
      if (i.id === inspectionId) {
        const history: InspectionAuditEntry[] = i.auditHistory ? [...i.auditHistory] : [];
        history.push({
          id: 'aud-' + Date.now() + '-homeza-conf',
          timestamp: nowIso,
          action: 'HOMEZA_COORDINATION_CONFIRMED',
          title: 'HOMEZA Coordination Confirmed',
          actorName: adminName,
          actorRole: 'ADMIN',
          notes: `Mode: ${mode === 'ATTEND_IN_PERSON' ? 'Will attend in person' : mode === 'REMOTE_COORDINATION' ? 'Coordinating remotely' : 'Assigned representative'}.${notes ? ` Note: ${notes}` : ''}`,
        });

        if (rep) {
          history.push({
            id: 'aud-' + Date.now() + '-rep-assign',
            timestamp: nowIso,
            action: 'REPRESENTATIVE_ASSIGNED',
            title: `Representative Assigned: ${rep.name}`,
            actorName: adminName,
            actorRole: 'ADMIN',
            notes: `${rep.role} (${rep.phone || 'In-app coordination'})`,
          });
        }

        updatedInspection = {
          ...i,
          homezaCoordinationConfirmed: true,
          coordinationMode: mode,
          assignedHomezaRep: rep || i.assignedHomezaRep,
          homezaNotes: notes || i.homezaNotes,
          status: i.status === 'INSPECTION_REQUESTED' ? 'INSPECTION_CONFIRMED' : i.status,
          auditHistory: history,
          updatedAt: nowIso,
        };
        return updatedInspection;
      }
      return i;
    });

    saveToStorage(KEYS.INSPECTIONS, inspections);

    if (updatedInspection) {
      const repTitle = rep?.name || updatedInspection.assignedHomezaRep?.name || 'HOMEZA Officer';
      // Notify Tenant
      this.addNotification({
        id: 'notif-' + Date.now() + '-insp-rep-t',
        userId: updatedInspection.tenantId,
        title: 'HOMEZA Inspection Coordination Confirmed',
        message: `HOMEZA has confirmed coordination for '${updatedInspection.propertyTitle}'. Assigned Officer: ${repTitle}. Mode: ${mode === 'ATTEND_IN_PERSON' ? 'In-Person' : 'Remote Coordination'}.`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: updatedInspection.propertyId,
        inspectionId: updatedInspection.id,
      });

      // Notify Landlord/Agent
      const recipientId = updatedInspection.agentId || updatedInspection.landlordId;
      if (recipientId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-insp-rep-l',
          userId: recipientId,
          title: 'HOMEZA Inspection Coordination Confirmed',
          message: `HOMEZA confirmed inspection coordination for '${updatedInspection.propertyTitle}'. Assigned Officer: ${repTitle}.`,
          type: 'INSPECTION',
          isRead: false,
          createdAt: nowIso,
          propertyId: updatedInspection.propertyId,
          inspectionId: updatedInspection.id,
        });
      }
    }
  },

  assignHomezaRepresentative(
    inspectionId: string,
    rep: HomezaRepresentative,
    adminName: string = 'Super Admin'
  ): void {
    const nowIso = new Date().toISOString();
    let updatedInspection: PropertyInspection | undefined;

    const inspections = this.getInspections().map((i) => {
      if (i.id === inspectionId) {
        const history: InspectionAuditEntry[] = i.auditHistory ? [...i.auditHistory] : [];
        history.push({
          id: 'aud-' + Date.now() + '-rep',
          timestamp: nowIso,
          action: 'REPRESENTATIVE_ASSIGNED',
          title: `Representative Assigned: ${rep.name}`,
          actorName: adminName,
          actorRole: 'ADMIN',
          notes: `${rep.role} (${rep.phone || 'In-app'})`,
        });

        updatedInspection = {
          ...i,
          assignedHomezaRep: rep,
          auditHistory: history,
          updatedAt: nowIso,
        };
        return updatedInspection;
      }
      return i;
    });

    saveToStorage(KEYS.INSPECTIONS, inspections);

    if (updatedInspection) {
      this.addNotification({
        id: 'notif-' + Date.now() + '-rep-asgn-t',
        userId: updatedInspection.tenantId,
        title: 'HOMEZA Representative Assigned',
        message: `${rep.name} (${rep.role}) has been assigned to coordinate your inspection for '${updatedInspection.propertyTitle}'.`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: updatedInspection.propertyId,
        inspectionId: updatedInspection.id,
      });

      const recipientId = updatedInspection.agentId || updatedInspection.landlordId;
      if (recipientId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-rep-asgn-l',
          userId: recipientId,
          title: 'HOMEZA Representative Assigned',
          message: `${rep.name} (${rep.role}) has been assigned to coordinate the inspection for '${updatedInspection.propertyTitle}'.`,
          type: 'INSPECTION',
          isRead: false,
          createdAt: nowIso,
          propertyId: updatedInspection.propertyId,
          inspectionId: updatedInspection.id,
        });
      }
    }
  },

  releaseInspectionExactLocation(inspectionId: string, adminName: string = 'Super Admin'): void {
    const nowIso = new Date().toISOString();
    let updatedInspection: PropertyInspection | undefined;

    const inspections = this.getInspections().map((i) => {
      if (i.id === inspectionId) {
        const history: InspectionAuditEntry[] = i.auditHistory ? [...i.auditHistory] : [];
        history.push({
          id: 'aud-' + Date.now() + '-loc-rel',
          timestamp: nowIso,
          action: 'EXACT_LOCATION_RELEASED',
          title: 'Exact Meeting Location Released',
          actorName: adminName,
          actorRole: 'ADMIN',
          notes: 'Exact property address unlocked for verified tenant & participants.',
        });

        updatedInspection = {
          ...i,
          isLocationReleased: true,
          auditHistory: history,
          updatedAt: nowIso,
        };
        return updatedInspection;
      }
      return i;
    });

    saveToStorage(KEYS.INSPECTIONS, inspections);

    if (updatedInspection) {
      this.addNotification({
        id: 'notif-' + Date.now() + '-loc-unlocked',
        userId: updatedInspection.tenantId,
        title: '📍 Exact Meeting Location Unlocked',
        message: `The exact location for your inspection of '${updatedInspection.propertyTitle}' is now visible on your dashboard: ${updatedInspection.propertyExactAddress || updatedInspection.propertyLocationArea}.`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: updatedInspection.propertyId,
        inspectionId: updatedInspection.id,
      });
    }
  },

  recordInspectionOutcome(
    inspectionId: string,
    outcome: InspectionOutcomeType,
    notes?: string,
    recordedBy: string = 'Super Admin',
    flagListing: boolean = false,
    flagReason?: string
  ): void {
    const nowIso = new Date().toISOString();
    let targetInspection: PropertyInspection | undefined;

    const outcomeTitles: Record<InspectionOutcomeType, string> = {
      COMPLETED: 'Inspection Completed Successfully',
      TENANT_NO_SHOW: 'Tenant Did Not Show',
      LANDLORD_AGENT_NO_SHOW: 'Landlord / Agent Did Not Show',
      RESCHEDULED: 'Inspection Rescheduled',
      PROPERTY_ISSUE_REPORTED: 'Property Issue Reported',
      LISTING_FLAGGED_FOR_REVIEW: 'Listing Flagged for Admin Review',
    };

    const inspections = this.getInspections().map((i) => {
      if (i.id === inspectionId) {
        const history: InspectionAuditEntry[] = i.auditHistory ? [...i.auditHistory] : [];
        history.push({
          id: 'aud-' + Date.now() + '-outcome',
          timestamp: nowIso,
          action: 'OUTCOME_RECORDED',
          title: outcomeTitles[outcome] || 'Inspection Outcome Recorded',
          actorName: recordedBy,
          actorRole: 'ADMIN',
          notes: `${notes || ''}${flagListing ? ` [Flagged: ${flagReason || 'Issue noted during walkthrough'}]` : ''}`,
        });

        let newStatus: InspectionStatus = i.status;
        if (outcome === 'COMPLETED') newStatus = 'INSPECTION_COMPLETED';
        if (outcome === 'RESCHEDULED') newStatus = 'INSPECTION_RESCHEDULED';

        targetInspection = {
          ...i,
          outcome,
          outcomeNotes: notes,
          outcomeRecordedAt: nowIso,
          outcomeRecordedBy: recordedBy,
          flaggedForReview: flagListing || i.flaggedForReview,
          flaggedReason: flagReason || i.flaggedReason,
          status: newStatus,
          auditHistory: history,
          updatedAt: nowIso,
        };
        return targetInspection;
      }
      return i;
    });

    saveToStorage(KEYS.INSPECTIONS, inspections);

    // If listing flagged, also flag the property in properties store
    if (flagListing && targetInspection) {
      const props = this.getProperties().map((p) => {
        if (p.id === targetInspection?.propertyId) {
          return {
            ...p,
            adminNotes: `${p.adminNotes ? p.adminNotes + ' | ' : ''}Flagged from inspection outcome: ${flagReason || notes || 'Walkthrough issue'}`,
            updatedAt: nowIso,
          };
        }
        return p;
      });
      saveToStorage(KEYS.PROPERTIES, props);
    }

    if (targetInspection) {
      // 1. Notify Admin
      this.addNotification({
        id: 'notif-' + Date.now() + '-out-adm',
        userId: 'user-admin-1',
        title: `Inspection Outcome: ${outcomeTitles[outcome]}`,
        message: `Outcome recorded for '${targetInspection.propertyTitle}'. ${notes ? `Note: "${notes}"` : ''}`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: targetInspection.propertyId,
        inspectionId: targetInspection.id,
      });

      // 2. Notify Tenant
      this.addNotification({
        id: 'notif-' + Date.now() + '-out-tenant',
        userId: targetInspection.tenantId,
        title: outcome === 'COMPLETED' ? 'Inspection Completed' : `Inspection Update: ${outcomeTitles[outcome]}`,
        message: `Inspection outcome logged for '${targetInspection.propertyTitle}'. ${notes ? `Details: ${notes}` : ''}`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: targetInspection.propertyId,
        inspectionId: targetInspection.id,
      });

      // 3. Notify Landlord or Agent
      const recipientId = targetInspection.agentId || targetInspection.landlordId;
      if (recipientId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-out-landlord',
          userId: recipientId,
          title: `Inspection Outcome: ${outcomeTitles[outcome]}`,
          message: `Inspection outcome logged for '${targetInspection.propertyTitle}'. ${notes ? `Details: ${notes}` : ''}`,
          type: 'INSPECTION',
          isRead: false,
          createdAt: nowIso,
          propertyId: targetInspection.propertyId,
          inspectionId: targetInspection.id,
        });
      }
    }
  },

  adminRescheduleInspection(
    inspectionId: string,
    newDate: string,
    newTime: string,
    reason?: string,
    adminName: string = 'Super Admin'
  ): void {
    const nowIso = new Date().toISOString();
    let targetInspection: PropertyInspection | undefined;

    const inspections = this.getInspections().map((i) => {
      if (i.id === inspectionId) {
        const history: InspectionAuditEntry[] = i.auditHistory ? [...i.auditHistory] : [];
        history.push({
          id: 'aud-' + Date.now() + '-resched',
          timestamp: nowIso,
          action: 'INSPECTION_RESCHEDULED',
          title: `Inspection Rescheduled to ${newDate} (${newTime})`,
          actorName: adminName,
          actorRole: 'ADMIN',
          notes: reason || 'Rescheduled by HOMEZA Admin Coordinator',
        });

        targetInspection = {
          ...i,
          status: 'INSPECTION_RESCHEDULED' as InspectionStatus,
          preferredDate: newDate,
          preferredTime: newTime,
          rescheduledDate: newDate,
          rescheduledTime: newTime,
          rescheduledReason: reason,
          auditHistory: history,
          updatedAt: nowIso,
        };
        return targetInspection;
      }
      return i;
    });

    saveToStorage(KEYS.INSPECTIONS, inspections);

    if (targetInspection) {
      // Notify Tenant
      this.addNotification({
        id: 'notif-' + Date.now() + '-adm-resched-t',
        userId: targetInspection.tenantId,
        title: 'Inspection Time Changed by HOMEZA Admin',
        message: `Your inspection for '${targetInspection.propertyTitle}' has been updated to ${newDate} at ${newTime}. ${reason ? `Reason: "${reason}"` : ''}`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: targetInspection.propertyId,
        inspectionId: targetInspection.id,
      });

      // Notify Landlord/Agent
      const recipientId = targetInspection.agentId || targetInspection.landlordId;
      if (recipientId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-adm-resched-l',
          userId: recipientId,
          title: 'Inspection Time Changed by HOMEZA Admin',
          message: `The inspection for '${targetInspection.propertyTitle}' has been updated to ${newDate} at ${newTime}. ${reason ? `Reason: "${reason}"` : ''}`,
          type: 'INSPECTION',
          isRead: false,
          createdAt: nowIso,
          propertyId: targetInspection.propertyId,
          inspectionId: targetInspection.id,
        });
      }
    }
  },

  adminCancelInspection(
    inspectionId: string,
    reason?: string,
    adminName: string = 'Super Admin'
  ): void {
    const nowIso = new Date().toISOString();
    let targetInspection: PropertyInspection | undefined;

    const inspections = this.getInspections().map((i) => {
      if (i.id === inspectionId) {
        const history: InspectionAuditEntry[] = i.auditHistory ? [...i.auditHistory] : [];
        history.push({
          id: 'aud-' + Date.now() + '-cancel',
          timestamp: nowIso,
          action: 'INSPECTION_CANCELLED',
          title: 'Inspection Cancelled by Admin',
          actorName: adminName,
          actorRole: 'ADMIN',
          notes: reason || 'Cancelled by HOMEZA Admin Coordinator',
        });

        targetInspection = {
          ...i,
          status: 'INSPECTION_CANCELLED' as InspectionStatus,
          landlordResponseNote: reason || 'Cancelled by HOMEZA Admin',
          isLocationReleased: false,
          auditHistory: history,
          updatedAt: nowIso,
        };
        return targetInspection;
      }
      return i;
    });

    saveToStorage(KEYS.INSPECTIONS, inspections);

    if (targetInspection) {
      // Notify Tenant
      this.addNotification({
        id: 'notif-' + Date.now() + '-adm-cancel-t',
        userId: targetInspection.tenantId,
        title: 'Inspection Cancelled',
        message: `The inspection for '${targetInspection.propertyTitle}' was cancelled by HOMEZA Admin. ${reason ? `Reason: "${reason}"` : ''}`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: targetInspection.propertyId,
        inspectionId: targetInspection.id,
      });

      // Notify Landlord/Agent
      const recipientId = targetInspection.agentId || targetInspection.landlordId;
      if (recipientId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-adm-cancel-l',
          userId: recipientId,
          title: 'Inspection Cancelled by Admin',
          message: `The scheduled inspection for '${targetInspection.propertyTitle}' was cancelled. ${reason ? `Reason: "${reason}"` : ''}`,
          type: 'INSPECTION',
          isRead: false,
          createdAt: nowIso,
          propertyId: targetInspection.propertyId,
          inspectionId: targetInspection.id,
        });
      }
    }
  },

  adminFlagInspection(
    inspectionId: string,
    reason: string,
    adminName: string = 'Super Admin'
  ): void {
    const nowIso = new Date().toISOString();
    let targetInspection: PropertyInspection | undefined;

    const inspections = this.getInspections().map((i) => {
      if (i.id === inspectionId) {
        const history: InspectionAuditEntry[] = i.auditHistory ? [...i.auditHistory] : [];
        history.push({
          id: 'aud-' + Date.now() + '-flag',
          timestamp: nowIso,
          action: 'LISTING_FLAGGED_FOR_REVIEW',
          title: 'Listing Flagged for Review',
          actorName: adminName,
          actorRole: 'ADMIN',
          notes: reason,
        });

        targetInspection = {
          ...i,
          flaggedForReview: true,
          flaggedReason: reason,
          auditHistory: history,
          updatedAt: nowIso,
        };
        return targetInspection;
      }
      return i;
    });

    saveToStorage(KEYS.INSPECTIONS, inspections);

    if (targetInspection) {
      this.addNotification({
        id: 'notif-' + Date.now() + '-adm-flag',
        userId: 'user-admin-1',
        title: 'Listing Flagged from Inspection',
        message: `Inspection for '${targetInspection.propertyTitle}' was flagged for review: "${reason}".`,
        type: 'REPORT',
        isRead: false,
        createdAt: nowIso,
        propertyId: targetInspection.propertyId,
        inspectionId: targetInspection.id,
      });
    }
  },

  declineInspection(inspectionId: string, reason: string): void {
    const nowIso = new Date().toISOString();
    let targetInspection: PropertyInspection | undefined;

    const inspections = this.getInspections().map((i) => {
      if (i.id === inspectionId) {
        const history: InspectionAuditEntry[] = i.auditHistory ? [...i.auditHistory] : [];
        history.push({
          id: 'aud-' + Date.now() + '-dec',
          timestamp: nowIso,
          action: 'INSPECTION_DECLINED',
          title: 'Inspection Declined by Landlord / Agent',
          actorName: i.agentName || i.landlordName,
          actorRole: i.agentId ? 'AGENT' : 'LANDLORD',
          notes: reason,
        });

        targetInspection = {
          ...i,
          status: 'INSPECTION_DECLINED' as InspectionStatus,
          isLocationReleased: false,
          landlordResponseNote: reason,
          auditHistory: history,
          updatedAt: nowIso,
        };
        return targetInspection;
      }
      return i;
    });

    saveToStorage(KEYS.INSPECTIONS, inspections);

    if (targetInspection) {
      // 1. Notify Tenant
      this.addNotification({
        id: 'notif-' + Date.now() + '-insp-dec-t',
        userId: targetInspection.tenantId,
        title: 'Inspection Request Declined',
        message: `The inspection for '${targetInspection.propertyTitle}' could not be accommodated: "${reason}". You can request another date or message the representative.`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: targetInspection.propertyId,
        inspectionId: targetInspection.id,
      });

      // 2. Notify Admin
      this.addNotification({
        id: 'notif-' + Date.now() + '-insp-dec-adm',
        userId: 'user-admin-1',
        title: `Inspection Declined: ${targetInspection.propertyLocationArea}`,
        message: `Inspection request for '${targetInspection.propertyTitle}' was declined. Reason: "${reason}".`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: targetInspection.propertyId,
        inspectionId: targetInspection.id,
      });
    }
  },

  rescheduleInspection(inspectionId: string, newDate: string, newTime: string, reason?: string): void {
    const nowIso = new Date().toISOString();
    let targetInspection: PropertyInspection | undefined;

    const inspections = this.getInspections().map((i) => {
      if (i.id === inspectionId) {
        const history: InspectionAuditEntry[] = i.auditHistory ? [...i.auditHistory] : [];
        history.push({
          id: 'aud-' + Date.now() + '-resched',
          timestamp: nowIso,
          action: 'INSPECTION_RESCHEDULED',
          title: `Time Rescheduled to ${newDate} (${newTime})`,
          actorName: i.agentName || i.landlordName,
          actorRole: i.agentId ? 'AGENT' : 'LANDLORD',
          notes: reason || 'Proposed new inspection slot',
        });

        targetInspection = {
          ...i,
          status: 'INSPECTION_RESCHEDULED' as InspectionStatus,
          rescheduledDate: newDate,
          rescheduledTime: newTime,
          rescheduledReason: reason,
          isLocationReleased: false,
          auditHistory: history,
          updatedAt: nowIso,
        };
        return targetInspection;
      }
      return i;
    });

    saveToStorage(KEYS.INSPECTIONS, inspections);

    if (targetInspection) {
      // 1. Notify Tenant
      this.addNotification({
        id: 'notif-' + Date.now() + '-insp-resched-t',
        userId: targetInspection.tenantId,
        title: 'Inspection Rescheduled',
        message: `A new inspection time was proposed for '${targetInspection.propertyTitle}': ${newDate} at ${newTime}. ${reason ? `Reason: "${reason}"` : ''}`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: targetInspection.propertyId,
        inspectionId: targetInspection.id,
      });

      // 2. Notify Landlord or Agent
      const recipientId = targetInspection.agentId || targetInspection.landlordId;
      if (recipientId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-insp-resched-l',
          userId: recipientId,
          title: 'Inspection Rescheduled',
          message: `Inspection slot for '${targetInspection.propertyTitle}' adjusted to ${newDate} at ${newTime}.`,
          type: 'INSPECTION',
          isRead: false,
          createdAt: nowIso,
          propertyId: targetInspection.propertyId,
          inspectionId: targetInspection.id,
        });
      }

      // 3. Notify Admin
      this.addNotification({
        id: 'notif-' + Date.now() + '-insp-resched-adm',
        userId: 'user-admin-1',
        title: `Inspection Rescheduled: ${targetInspection.propertyLocationArea}`,
        message: `Inspection for '${targetInspection.propertyTitle}' was rescheduled to ${newDate} (${newTime}) for tenant ${targetInspection.tenantName}.`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: targetInspection.propertyId,
        inspectionId: targetInspection.id,
      });
    }
  },

  completeInspection(inspectionId: string): void {
    const nowIso = new Date().toISOString();
    let completedInspection: PropertyInspection | undefined;
    const inspections = this.getInspections().map((i) => {
      if (i.id === inspectionId) {
        const history: InspectionAuditEntry[] = i.auditHistory ? [...i.auditHistory] : [];
        history.push({
          id: 'aud-' + Date.now() + '-comp',
          timestamp: nowIso,
          action: 'INSPECTION_COMPLETED',
          title: 'Inspection Completed',
          actorName: 'HOMEZA Operations',
          actorRole: 'ADMIN',
        });
        completedInspection = {
          ...i,
          status: 'INSPECTION_COMPLETED' as InspectionStatus,
          outcome: (i.outcome || 'COMPLETED') as InspectionOutcomeType,
          auditHistory: history,
          updatedAt: nowIso,
        };
        return completedInspection;
      }
      return i;
    });
    saveToStorage(KEYS.INSPECTIONS, inspections);

    if (completedInspection) {
      this.addNotification({
        id: 'notif-' + Date.now() + '-insp-comp-t',
        userId: completedInspection.tenantId,
        title: 'Inspection Completed',
        message: `Your physical inspection for '${completedInspection.propertyTitle}' has been marked as completed. You can proceed to submit a rental application!`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: completedInspection.propertyId,
        inspectionId: completedInspection.id,
      });
    }
  },

  cancelInspection(inspectionId: string, reason?: string): void {
    const nowIso = new Date().toISOString();
    let targetInspection: PropertyInspection | undefined;

    const inspections = this.getInspections().map((i) => {
      if (i.id === inspectionId) {
        const history: InspectionAuditEntry[] = i.auditHistory ? [...i.auditHistory] : [];
        history.push({
          id: 'aud-' + Date.now() + '-canc',
          timestamp: nowIso,
          action: 'INSPECTION_CANCELLED',
          title: 'Inspection Cancelled',
          actorName: 'User',
          actorRole: 'TENANT',
          notes: reason || 'Cancelled by participant',
        });
        targetInspection = {
          ...i,
          status: 'INSPECTION_CANCELLED' as InspectionStatus,
          landlordResponseNote: reason || 'Inspection cancelled by user.',
          isLocationReleased: false,
          auditHistory: history,
          updatedAt: nowIso,
        };
        return targetInspection;
      }
      return i;
    });

    saveToStorage(KEYS.INSPECTIONS, inspections);

    if (targetInspection) {
      const recipientId = targetInspection.agentId || targetInspection.landlordId;
      if (recipientId) {
        this.addNotification({
          id: 'notif-' + Date.now() + '-insp-cancel-l',
          userId: recipientId,
          title: 'Inspection Cancelled',
          message: `The scheduled inspection for '${targetInspection.propertyTitle}' on ${targetInspection.preferredDate} was cancelled. ${reason ? `Reason: ${reason}` : ''}`,
          type: 'INSPECTION',
          isRead: false,
          createdAt: nowIso,
          propertyId: targetInspection.propertyId,
          inspectionId: targetInspection.id,
        });
      }

      this.addNotification({
        id: 'notif-' + Date.now() + '-insp-cancel-t',
        userId: targetInspection.tenantId,
        title: 'Inspection Cancelled',
        message: `Your inspection for '${targetInspection.propertyTitle}' on ${targetInspection.preferredDate} was cancelled.`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: targetInspection.propertyId,
        inspectionId: targetInspection.id,
      });

      this.addNotification({
        id: 'notif-' + Date.now() + '-insp-cancel-adm',
        userId: 'user-admin-1',
        title: `Inspection Cancelled: ${targetInspection.propertyLocationArea}`,
        message: `Inspection for '${targetInspection.propertyTitle}' (${targetInspection.preferredDate}) was cancelled. Reason: "${reason || 'No reason provided'}".`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: targetInspection.propertyId,
        inspectionId: targetInspection.id,
      });
    }
  },

  isInspectionLocationReleased(inspection: PropertyInspection): boolean {
    if (inspection.status === 'INSPECTION_DECLINED' || inspection.status === 'INSPECTION_CANCELLED') {
      return false;
    }
    return inspection.status === 'INSPECTION_CONFIRMED' || !!inspection.isLocationReleased;
  },

  // In-App Messaging
  getConversations(userId: string): Conversation[] {
    const convs = loadFromStorage<Conversation[]>(KEYS.CONVERSATIONS, INITIAL_CONVERSATIONS);
    return convs
      .filter((c) => c.tenantId === userId || c.participantId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  getMessages(conversationId: string): DirectMessage[] {
    const msgs = loadFromStorage<DirectMessage[]>(KEYS.MESSAGES, INITIAL_MESSAGES);
    return msgs
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  sendMessage(
    sender: User,
    receiverId: string,
    receiverName: string,
    receiverRole: 'LANDLORD' | 'AGENT' | 'TENANT',
    content: string,
    propertyId?: string,
    propertyTitle?: string,
    propertyImage?: string
  ): DirectMessage {
    const nowIso = new Date().toISOString();
    const convs = loadFromStorage<Conversation[]>(KEYS.CONVERSATIONS, INITIAL_CONVERSATIONS);
    const msgs = loadFromStorage<DirectMessage[]>(KEYS.MESSAGES, INITIAL_MESSAGES);

    // Identify if sender is tenant or landlord/agent
    const isSenderTenant = sender.role === 'TENANT';
    const tenantId = isSenderTenant ? sender.id : receiverId;
    const tenantName = isSenderTenant ? sender.fullName : receiverName;
    const participantId = isSenderTenant ? receiverId : sender.id;
    const participantName = isSenderTenant ? receiverName : sender.fullName;
    const participantRole = isSenderTenant ? (receiverRole as 'LANDLORD' | 'AGENT') : (sender.role as 'LANDLORD' | 'AGENT');

    let conversation = convs.find(
      (c) =>
        c.tenantId === tenantId &&
        c.participantId === participantId &&
        (!propertyId || c.propertyId === propertyId)
    );

    if (!conversation) {
      conversation = {
        id: 'conv-' + Date.now(),
        propertyId,
        propertyTitle,
        propertyImage,
        tenantId,
        tenantName,
        participantId,
        participantName,
        participantRole: participantRole || 'LANDLORD',
        lastMessage: content,
        lastMessageTimestamp: nowIso,
        unreadCountTenant: isSenderTenant ? 0 : 1,
        unreadCountParticipant: isSenderTenant ? 1 : 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      convs.unshift(conversation);
    } else {
      conversation.lastMessage = content;
      conversation.lastMessageTimestamp = nowIso;
      conversation.updatedAt = nowIso;
      if (propertyTitle && !conversation.propertyTitle) {
        conversation.propertyTitle = propertyTitle;
      }
      if (propertyImage && !conversation.propertyImage) {
        conversation.propertyImage = propertyImage;
      }
      if (isSenderTenant) {
        conversation.unreadCountParticipant += 1;
      } else {
        conversation.unreadCountTenant += 1;
      }
    }

    const newMessage: DirectMessage = {
      id: 'msg-' + Date.now(),
      conversationId: conversation.id,
      senderId: sender.id,
      senderName: sender.fullName,
      senderRole: sender.role,
      receiverId,
      receiverName,
      propertyId,
      propertyTitle,
      content,
      timestamp: nowIso,
      isRead: false,
    };

    msgs.push(newMessage);

    saveToStorage(KEYS.CONVERSATIONS, convs);
    saveToStorage(KEYS.MESSAGES, msgs);

    // Notify receiver
    this.addNotification({
      id: 'notif-' + Date.now() + '-msg',
      userId: receiverId,
      title: `New Message from ${sender.fullName}`,
      message: `${content.slice(0, 100)}${content.length > 100 ? '...' : ''}`,
      type: 'MESSAGE',
      isRead: false,
      createdAt: nowIso,
      conversationId: conversation.id,
      propertyId,
    });

    return newMessage;
  },

  markConversationRead(conversationId: string, userId: string): void {
    const convs = loadFromStorage<Conversation[]>(KEYS.CONVERSATIONS, INITIAL_CONVERSATIONS);
    const msgs = loadFromStorage<DirectMessage[]>(KEYS.MESSAGES, INITIAL_MESSAGES);

    let updatedConv = false;
    const updatedConvs = convs.map((c) => {
      if (c.id === conversationId) {
        if (c.tenantId === userId && (c.unreadCountTenant || 0) > 0) {
          updatedConv = true;
          return { ...c, unreadCountTenant: 0 };
        } else if (c.participantId === userId && (c.unreadCountParticipant || 0) > 0) {
          updatedConv = true;
          return { ...c, unreadCountParticipant: 0 };
        }
      }
      return c;
    });

    let updatedMsgs = false;
    const updatedMsgsList = msgs.map((m) => {
      if (m.conversationId === conversationId && m.receiverId === userId && !m.isRead) {
        updatedMsgs = true;
        return { ...m, isRead: true };
      }
      return m;
    });

    if (updatedConv) saveToStorage(KEYS.CONVERSATIONS, updatedConvs);
    if (updatedMsgs) saveToStorage(KEYS.MESSAGES, updatedMsgsList);
  },

  // Support Tickets
  getSupportTickets(userId?: string): SupportTicket[] {
    const tickets = loadFromStorage<SupportTicket[]>(KEYS.SUPPORT_TICKETS, INITIAL_SUPPORT_TICKETS);
    if (!userId) {
      return [...tickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return tickets
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  getSupportTicketById(id: string): SupportTicket | undefined {
    const tickets = loadFromStorage<SupportTicket[]>(KEYS.SUPPORT_TICKETS, INITIAL_SUPPORT_TICKETS);
    return tickets.find((t) => t.id === id);
  },

  createSupportTicket(ticketData: {
    userId: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    userRole: UserRole;
    category: string;
    subject: string;
    description: string;
    priority?: SupportTicketPriority;
    propertyId?: string;
    propertyTitle?: string;
  }): SupportTicket {
    const tickets = loadFromStorage<SupportTicket[]>(KEYS.SUPPORT_TICKETS, INITIAL_SUPPORT_TICKETS);
    const nowIso = new Date().toISOString();
    const newId = `TIC-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialMessage: SupportTicketMessage = {
      id: `tmsg-${Date.now()}-1`,
      senderId: ticketData.userId,
      senderName: ticketData.userName,
      senderRole: ticketData.userRole,
      message: ticketData.description,
      createdAt: nowIso,
    };

    const newTicket: SupportTicket = {
      id: newId,
      userId: ticketData.userId,
      userName: ticketData.userName,
      userEmail: ticketData.userEmail,
      userPhone: ticketData.userPhone,
      userRole: ticketData.userRole,
      category: ticketData.category,
      subject: ticketData.subject,
      description: ticketData.description,
      priority: ticketData.priority || 'MEDIUM',
      status: 'OPEN',
      propertyId: ticketData.propertyId,
      propertyTitle: ticketData.propertyTitle,
      messages: [initialMessage],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    tickets.unshift(newTicket);
    saveToStorage(KEYS.SUPPORT_TICKETS, tickets);

    // Dispatch notification to Admin
    this.addNotification({
      id: 'notif-' + Date.now() + '-ticket-created',
      userId: 'user-admin-1',
      title: `New Support Ticket: ${newTicket.id}`,
      message: `[${ticketData.userRole}] ${ticketData.userName} submitted a support ticket: "${ticketData.subject}" (${ticketData.category})`,
      type: 'SYSTEM',
      isRead: false,
      createdAt: nowIso,
    });

    return newTicket;
  },

  addSupportTicketMessage(
    ticketId: string,
    messageText: string,
    sender: { id: string; name: string; role: UserRole }
  ): SupportTicket | null {
    const tickets = loadFromStorage<SupportTicket[]>(KEYS.SUPPORT_TICKETS, INITIAL_SUPPORT_TICKETS);
    const index = tickets.findIndex((t) => t.id === ticketId);
    if (index === -1) return null;

    const ticket = tickets[index];
    const nowIso = new Date().toISOString();

    const newMsg: SupportTicketMessage = {
      id: `tmsg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      message: messageText,
      createdAt: nowIso,
    };

    const updatedMessages = [...(ticket.messages || []), newMsg];
    let updatedStatus = ticket.status;

    if (sender.role === 'ADMIN') {
      if (updatedStatus === 'OPEN') {
        updatedStatus = 'IN_PROGRESS';
      }
    } else if (updatedStatus === 'RESOLVED' || updatedStatus === 'CLOSED') {
      updatedStatus = 'IN_PROGRESS';
    }

    const updatedTicket: SupportTicket = {
      ...ticket,
      messages: updatedMessages,
      status: updatedStatus,
      updatedAt: nowIso,
      adminResponse: sender.role === 'ADMIN' ? messageText : ticket.adminResponse,
    };

    tickets[index] = updatedTicket;
    saveToStorage(KEYS.SUPPORT_TICKETS, tickets);

    // Notification handling
    if (sender.role === 'ADMIN') {
      this.addNotification({
        id: 'notif-' + Date.now() + '-admin-reply',
        userId: ticket.userId,
        title: `Support Ticket ${ticket.id} Updated`,
        message: `HOMEZA Admin has replied to your ticket: "${ticket.subject}"`,
        type: 'SYSTEM',
        isRead: false,
        createdAt: nowIso,
      });
    } else {
      this.addNotification({
        id: 'notif-' + Date.now() + '-user-reply',
        userId: 'user-admin-1',
        title: `Support Reply on ${ticket.id}`,
        message: `${sender.name} replied to ticket: "${ticket.subject}"`,
        type: 'SYSTEM',
        isRead: false,
        createdAt: nowIso,
      });
    }

    return updatedTicket;
  },

  updateSupportTicketStatus(
    ticketId: string,
    status: SupportTicketStatus,
    adminNote?: string
  ): SupportTicket | null {
    const tickets = loadFromStorage<SupportTicket[]>(KEYS.SUPPORT_TICKETS, INITIAL_SUPPORT_TICKETS);
    const index = tickets.findIndex((t) => t.id === ticketId);
    if (index === -1) return null;

    const ticket = tickets[index];
    const nowIso = new Date().toISOString();

    const updatedTicket: SupportTicket = {
      ...ticket,
      status,
      adminNotes: adminNote !== undefined ? adminNote : ticket.adminNotes,
      updatedAt: nowIso,
      resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? (ticket.resolvedAt || nowIso) : undefined,
    };

    tickets[index] = updatedTicket;
    saveToStorage(KEYS.SUPPORT_TICKETS, tickets);

    // Notify ticket owner
    this.addNotification({
      id: 'notif-' + Date.now() + '-ticket-status',
      userId: ticket.userId,
      title: `Ticket ${ticket.id} Status: ${status}`,
      message: `Your support ticket "${ticket.subject}" status was updated to ${status}.${adminNote ? ` Note: ${adminNote}` : ''}`,
      type: 'STATUS_CHANGE',
      isRead: false,
      createdAt: nowIso,
    });

    return updatedTicket;
  },

  updateSupportTicketPriority(
    ticketId: string,
    priority: SupportTicketPriority
  ): SupportTicket | null {
    const tickets = loadFromStorage<SupportTicket[]>(KEYS.SUPPORT_TICKETS, INITIAL_SUPPORT_TICKETS);
    const index = tickets.findIndex((t) => t.id === ticketId);
    if (index === -1) return null;

    const ticket = tickets[index];
    const nowIso = new Date().toISOString();

    const updatedTicket: SupportTicket = {
      ...ticket,
      priority,
      updatedAt: nowIso,
    };

    tickets[index] = updatedTicket;
    saveToStorage(KEYS.SUPPORT_TICKETS, tickets);
    return updatedTicket;
  },

  // Phone Verification
  verifyUserPhone(userId: string, phoneNumber?: string): User | null {
    const nowIso = new Date().toISOString();
    let updatedUser: User | null = null;
    const users = this.getUsers().map((u) => {
      if (u.id === userId) {
        updatedUser = {
          ...u,
          phoneNumber: phoneNumber || u.phoneNumber,
          isPhoneVerified: true,
          phoneVerifiedAt: nowIso,
        };
        return updatedUser;
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);
    return updatedUser;
  },

  // KYC Application Management (Phase 1)
  getKYCApplications(): KYCApplication[] {
    return loadFromStorage<KYCApplication[]>(KEYS.KYC_APPLICATIONS, []);
  },

  getKYCApplicationByUserId(userId: string): KYCApplication | undefined {
    const app = this.getKYCApplications().find((a) => a.userId === userId);
    const user = this.getUserById(userId);
    if (user && evaluateUserVerification(user).isFullyVerified) {
      if (app) {
        return { ...app, status: 'VERIFIED' };
      }
      return {
        id: 'kyc-app-' + userId,
        userId,
        userRole: (user.role as 'LANDLORD' | 'AGENT') || 'LANDLORD',
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: true,
        idCardType: (user as any).idCardType || 'National Identification Number (NIN)',
        idCardNumber: (user as any).idCardNumber || '',
        status: 'VERIFIED',
        appliedDate: user.createdAt,
      };
    }
    return app;
  },

  submitKYCApplication(
    data: Omit<KYCApplication, 'id' | 'status' | 'appliedDate' | 'auditTrail'>
  ): KYCApplication {
    const nowIso = new Date().toISOString();
    const existing = this.getKYCApplications();
    const existingIndex = existing.findIndex((a) => a.userId === data.userId);
    const existingUser = this.getUserById(data.userId);
    const isAlreadyVerified = existingUser ? evaluateUserVerification(existingUser).isFullyVerified : false;

    const auditTrail: KYCAuditEntry[] = [
      {
        id: 'kyc-aud-' + Date.now() + '-sub',
        action: existingIndex >= 0 ? 'RESUBMITTED' : 'SUBMITTED',
        timestamp: nowIso,
        actorName: data.fullName,
        actorRole: data.userRole,
        notes: `KYC submission for ${data.userRole.toLowerCase()} verification submitted.`,
      },
    ];

    const newKycApp: KYCApplication = {
      ...data,
      id: existingIndex >= 0 ? existing[existingIndex].id : 'kyc-app-' + Date.now(),
      status: isAlreadyVerified ? 'VERIFIED' : 'PENDING',
      appliedDate: nowIso,
      auditTrail,
    };

    if (existingIndex >= 0) {
      existing[existingIndex] = newKycApp;
    } else {
      existing.unshift(newKycApp);
    }
    saveToStorage(KEYS.KYC_APPLICATIONS, existing);

    // Update user entity's verification status and fields
    const users = this.getUsers().map((u) => {
      if (u.id === data.userId) {
        if (data.userRole === 'LANDLORD') {
          const landlord = u as LandlordUser;
          const updated = {
            ...landlord,
            verificationStatus: isAlreadyVerified ? ('VERIFIED' as LandlordVerificationStatus) : ('PENDING' as LandlordVerificationStatus),
            idCardType: data.idCardType,
            idCardNumber: data.idCardNumber,
            idCardDocumentUrl: data.idCardDocumentUrl,
            proofOfOwnershipDocUrl: data.proofOfOwnershipDocUrl,
            appliedDate: nowIso,
            isPhoneVerified: true,
          };
          return isAlreadyVerified ? reconcileUserVerification(updated) : updated;
        } else if (data.userRole === 'AGENT') {
          const agent = u as AgentUser;
          const updated = {
            ...agent,
            verificationStatus: isAlreadyVerified ? ('VERIFIED' as AgentVerificationStatus) : ('PENDING' as AgentVerificationStatus),
            agencyName: data.agencyName || agent.agencyName,
            cacNumber: data.cacNumber || agent.cacNumber,
            licenseNumber: data.licenseNumber || agent.licenseNumber,
            idCardType: data.idCardType,
            idCardNumber: data.idCardNumber,
            idCardDocumentUrl: data.idCardDocumentUrl,
            cacDocumentUrl: data.cacDocumentUrl,
            licenseDocumentUrl: data.licenseDocumentUrl,
            appliedDate: nowIso,
            isPhoneVerified: true,
          };
          return isAlreadyVerified ? reconcileUserVerification(updated) : updated;
        }
      }
      return u;
    });
    saveToStorage(KEYS.USERS, users);

    // Notify Admin
    this.addNotification({
      id: 'notif-' + Date.now() + '-kyc-admin',
      userId: 'user-admin-1',
      title: `New KYC Verification Submission: ${data.fullName}`,
      message: `${data.fullName} has submitted their ${data.userRole} identity & credentials for verification.`,
      type: data.userRole === 'AGENT' ? 'KYC_AGENT' : 'KYC_LANDLORD',
      targetType: data.userRole === 'AGENT' ? 'KYC_AGENT' : 'KYC_LANDLORD',
      targetId: data.userId,
      isRead: false,
      createdAt: nowIso,
    });

    // Notify Submitter
    this.addNotification({
      id: 'notif-' + Date.now() + '-kyc-user',
      userId: data.userId,
      title: 'KYC Verification Submitted',
      message: 'Your identity and verification documents have been received and are currently under review by the HOMEZA Trust & Verification team.',
      type: 'STATUS_CHANGE',
      isRead: false,
      createdAt: nowIso,
    });

    return newKycApp;
  },

  reviewKYCApplication(
    applicationId: string,
    decision: 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUIRED',
    notes?: string,
    adminName: string = 'Super Admin'
  ): KYCApplication | null {
    AuthSecurityService.assertAdmin();
    const nowIso = new Date().toISOString();
    const apps = this.getKYCApplications();
    const index = apps.findIndex((a) => a.id === applicationId || a.userId === applicationId);
    if (index === -1) return null;

    const kyc = apps[index];
    const audit: KYCAuditEntry[] = kyc.auditTrail ? [...kyc.auditTrail] : [];
    audit.push({
      id: 'kyc-aud-' + Date.now() + '-' + decision.toLowerCase(),
      action: decision,
      timestamp: nowIso,
      actorName: adminName,
      actorRole: 'ADMIN',
      notes: notes || `KYC decision set to ${decision}`,
    });

    let newStatus: KYCApplicationStatus = 'PENDING';
    if (decision === 'APPROVED') newStatus = 'APPROVED';
    else if (decision === 'REJECTED') newStatus = 'REJECTED';
    else if (decision === 'CORRECTION_REQUIRED') newStatus = 'CORRECTION_REQUIRED';

    const updatedApp: KYCApplication = {
      ...kyc,
      status: newStatus,
      reviewedDate: nowIso,
      reviewedBy: adminName,
      adminCorrectionNote: decision === 'CORRECTION_REQUIRED' ? notes : undefined,
      adminRejectionReason: decision === 'REJECTED' ? notes : undefined,
      adminNotes: notes,
      auditTrail: audit,
    };

    apps[index] = updatedApp;
    saveToStorage(KEYS.KYC_APPLICATIONS, apps);

    // Sync to user record
    if (kyc.userRole === 'LANDLORD') {
      if (decision === 'APPROVED') {
        this.approveLandlordKYC(kyc.userId, adminName, notes);
      } else if (decision === 'REJECTED') {
        this.rejectLandlordKYC(kyc.userId, notes || 'Requirements not met', adminName);
      } else if (decision === 'CORRECTION_REQUIRED') {
        this.requestLandlordCorrection(kyc.userId, notes || 'Please re-upload clearer identity documents.', adminName);
      }
    } else if (kyc.userRole === 'AGENT') {
      if (decision === 'APPROVED') {
        this.approveAgent(kyc.userId, adminName, notes);
      } else if (decision === 'REJECTED') {
        this.rejectAgent(kyc.userId, notes || 'Requirements not met', adminName);
      } else if (decision === 'CORRECTION_REQUIRED') {
        this.requestAgentCorrection(kyc.userId, notes || 'Please re-upload credentials or CAC documents.', adminName);
      }
    }

    return updatedApp;
  },

  /* ======================================================================= */
  /* PAYMENTS & INSPECTION FEE PROCESSING                                     */
  /* ======================================================================= */
  getPayments(): Payment[] {
    return loadFromStorage<Payment[]>(KEYS.PAYMENTS, []);
  },

  getPaymentsByTenant(tenantId: string): Payment[] {
    return Store.getPayments().filter((p) => p.tenantId === tenantId);
  },

  getPaymentById(id: string): Payment | undefined {
    return Store.getPayments().find((p) => p.id === id);
  },

  getPaymentByReference(ref: string): Payment | undefined {
    return Store.getPayments().find((p) => p.reference === ref);
  },

  getPaymentByInspectionId(inspectionId: string): Payment | undefined {
    return Store.getPayments().find((p) => p.inspectionId === inspectionId);
  },

  addPayment(payment: Payment): Payment {
    const list = Store.getPayments();
    const updated = [payment, ...list.filter((p) => p.id !== payment.id)];
    saveToStorage(KEYS.PAYMENTS, updated);
    notify();
    return payment;
  },

  updatePayment(paymentId: string, updates: Partial<Payment>): Payment | undefined {
    const list = Store.getPayments();
    const index = list.findIndex((p) => p.id === paymentId);
    if (index === -1) return undefined;
    const updated = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
    list[index] = updated;
    saveToStorage(KEYS.PAYMENTS, list);
    notify();
    return updated;
  },

  // Initialize Payment (Paystack or standard)
  async initializePayment(data: {
    propertyId: string;
    propertyTitle?: string;
    propertyLocationArea?: string;
    inspectionId?: string;
    amount?: number;
    tenantId: string;
    tenantName: string;
    tenantEmail: string;
    tenantPhone?: string;
    paymentMethod?: PaymentMethod;
    channels?: string[];
    callbackUrl?: string;
  }): Promise<{ success: boolean; data?: Payment; authorization_url?: string; access_code?: string; reference?: string; paystackPublicKey?: string; error?: string }> {
    try {
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        Store.addPayment(json.data);
        if (data.inspectionId) {
          Store.updateInspection(data.inspectionId, {
            paymentStatus: 'AWAITING_PAYMENT',
            paymentId: json.data.id,
            paymentReference: json.data.reference,
            paymentMethod: json.data.paymentMethod,
            inspectionFee: json.data.amount,
          });
        }
        return json;
      }
      return { success: false, error: json.message || 'Failed to initialize payment' };
    } catch (err: any) {
      console.error('Initialize payment error:', err);
      return { success: false, error: err.message || 'Unable to connect to Paystack payment gateway. Please check connection and try again.' };
    }
  },

  // Verify Paystack Payment on server
  async verifyPayment(reference: string, paymentId?: string): Promise<{ success: boolean; verified: boolean; data?: Payment; inspection?: PropertyInspection; error?: string }> {
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, paymentId }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        Store.addPayment(json.data);
        if (json.inspection) {
          const inspections = Store.getInspections();
          const idx = inspections.findIndex((i) => i.id === json.inspection.id);
          if (idx >= 0) {
            inspections[idx] = json.inspection;
            saveToStorage(KEYS.INSPECTIONS, inspections);
            notify();
          }
        }
        await syncStoreWithServer(true);
        return json;
      }
      return { success: false, verified: false, error: json.message || 'Payment verification failed' };
    } catch (err: any) {
      console.error('Verify payment error:', err);
      return { success: false, verified: false, error: err.message || 'Unable to verify payment with server. Please check connection.' };
    }
  },

  // Submit Bank Transfer Proof
  async submitBankTransfer(data: {
    bookingId?: string;
    propertyId: string;
    propertyTitle?: string;
    propertyLocationArea?: string;
    inspectionId?: string;
    amount?: number;
    tenantId: string;
    tenantName: string;
    tenantEmail: string;
    tenantPhone?: string;
    bankTransferDetails: {
      senderName: string;
      senderBank?: string;
      senderAccountNumber?: string;
      transferDate?: string;
      proofOfPaymentUrl?: string;
      transferNotes?: string;
    };
    propertySnapshot?: any;
  }): Promise<{ success: boolean; data?: Payment; error?: string; bookingId?: string; status?: string }> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const session = AuthSecurityService.getActiveSession();
      if (session?.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }

      const snapshot = data.propertySnapshot || Store.getPropertyById(data.propertyId);
      const effectiveBookingId = data.bookingId || data.inspectionId;

      const res = await fetch('/api/payments/bank-transfer/submit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...data,
          bookingId: effectiveBookingId,
          inspectionId: effectiveBookingId,
          propertySnapshot: snapshot,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        Store.addPayment(json.data);
        const targetInspectionId = data.inspectionId || data.bookingId;
        if (targetInspectionId) {
          Store.updateInspection(targetInspectionId, {
            paymentStatus: 'AWAITING_PAYMENT_VERIFICATION',
            status: 'AWAITING_PAYMENT_VERIFICATION',
            paymentId: json.data.id,
            paymentReference: json.data.reference,
            paymentMethod: 'BANK_TRANSFER',
            inspectionFee: json.data.amount,
          });
        }
        await syncStoreWithServer(true);
        return json;
      }
      return { success: false, error: json.message || 'Failed to submit bank transfer' };
    } catch (err: any) {
      console.error('Submit bank transfer error:', err);
      const nowIso = new Date().toISOString();
      const reference = `HMZ-BT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const fee = data.amount || PLATFORM_CONFIG.inspectionFeeAmount || 3000;
      const targetInspectionId = data.inspectionId || data.bookingId;
      const fallbackPayment: Payment = {
        id: `pay-${Date.now()}`,
        reference,
        tenantId: data.tenantId,
        tenantName: data.tenantName,
        tenantEmail: data.tenantEmail,
        tenantPhone: data.tenantPhone,
        propertyId: data.propertyId,
        propertyTitle: data.propertyTitle || 'Property Inspection',
        propertyLocationArea: data.propertyLocationArea || 'Uyo',
        inspectionId: targetInspectionId,
        bookingId: targetInspectionId,
        amount: fee,
        currency: 'NGN',
        paymentMethod: 'BANK_TRANSFER',
        paymentType: 'INSPECTION_FEE',
        status: 'AWAITING_PAYMENT_VERIFICATION',
        bankTransferDetails: {
          bankName: 'Paystack Automated Escrow',
          accountName: 'HOMEZA Inspection Escrow',
          accountNumber: 'N/A',
          senderName: data.bankTransferDetails.senderName,
          senderBank: data.bankTransferDetails.senderBank || 'Bank Transfer',
          senderAccountNumber: data.bankTransferDetails.senderAccountNumber || '',
          amountPaid: fee,
          transferDate: data.bankTransferDetails.transferDate || nowIso,
          proofOfPaymentUrl: data.bankTransferDetails.proofOfPaymentUrl || '',
          transferNotes: data.bankTransferDetails.transferNotes || '',
        },
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      Store.addPayment(fallbackPayment);
      if (targetInspectionId) {
        Store.updateInspection(targetInspectionId, {
          paymentStatus: 'AWAITING_PAYMENT_VERIFICATION',
          status: 'AWAITING_PAYMENT_VERIFICATION',
          paymentId: fallbackPayment.id,
          paymentReference: reference,
          paymentMethod: 'BANK_TRANSFER',
          inspectionFee: fee,
        });
      }
      return { success: true, data: fallbackPayment };
    }
  },

  // Admin Review of Bank Transfer (Approve or Reject)
  async adminReviewBankTransfer(
    paymentId: string,
    decision: 'APPROVED' | 'REJECTED',
    notes?: string,
    reviewerName: string = 'HOMEZA Operations'
  ): Promise<{ success: boolean; data?: Payment; error?: string }> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const session = AuthSecurityService.getActiveSession();
      if (session?.token) headers['Authorization'] = `Bearer ${session.token}`;

      const res = await fetch('/api/payments/bank-transfer/admin-decision', {
        method: 'POST',
        headers,
        body: JSON.stringify({ paymentId, decision, notes, reviewerName }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        Store.addPayment(json.data);
        if (json.inspection) {
          const inspections = Store.getInspections();
          const idx = inspections.findIndex((i) => i.id === json.inspection.id);
          if (idx >= 0) {
            inspections[idx] = json.inspection;
            saveToStorage(KEYS.INSPECTIONS, inspections);
            notify();
          }
        }
        await syncStoreWithServer(true);
        return json;
      }
      return { success: false, error: json.message || 'Failed to review bank transfer' };
    } catch (err: any) {
      console.error('Admin review bank transfer error:', err);
      const payment = Store.getPaymentById(paymentId);
      if (!payment) return { success: false, error: 'Payment not found' };

      const nowIso = new Date().toISOString();
      if (decision === 'APPROVED') {
        const updated = Store.updatePayment(paymentId, {
          status: 'SUCCESSFUL',
          paidAt: nowIso,
          adminReview: {
            reviewedBy: reviewerName,
            reviewedAt: nowIso,
            decision: 'APPROVED',
            notes: notes || 'Verified with bank statement',
          },
        });
        if (payment.inspectionId) {
          Store.confirmInspectionAndUnlockLocation(payment.inspectionId, reviewerName);
        }
        return { success: true, data: updated };
      } else {
        const updated = Store.updatePayment(paymentId, {
          status: 'REJECTED',
          adminReview: {
            reviewedBy: reviewerName,
            reviewedAt: nowIso,
            decision: 'REJECTED',
            notes: notes || 'Proof could not be verified',
          },
        });
        if (payment.inspectionId) {
          Store.updateInspection(payment.inspectionId, {
            paymentStatus: 'UNPAID',
          });
        }
        return { success: true, data: updated };
      }
    }
  },

  // Payment Analytics
  getPaymentStats() {
    const all = Store.getPayments();
    const successful = all.filter((p) => p.status === 'SUCCESSFUL');
    const pendingBank = all.filter((p) => p.status === 'AWAITING_ADMIN_CONFIRMATION');
    const totalRevenue = successful.reduce((sum, p) => sum + (p.amount || 0), 0);
    const paystackRevenue = successful.filter((p) => p.paymentMethod === 'PAYSTACK').reduce((sum, p) => sum + (p.amount || 0), 0);
    const bankTransferRevenue = successful.filter((p) => p.paymentMethod === 'BANK_TRANSFER').reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalCount: all.length,
      successfulCount: successful.length,
      pendingBankCount: pendingBank.length,
      totalRevenue,
      paystackRevenue,
      bankTransferRevenue,
      defaultFee: PLATFORM_CONFIG.inspectionFeeAmount || 3000,
    };
  },

  // =========================================================================
  // CORE IDENTITY & SECURITY VERIFICATION (3-STEP SYSTEM)
  // =========================================================================

  async sendVerificationPhoneOtp(phoneNumber: string, userId?: string): Promise<{
    success: boolean;
    message: string;
    reference?: string;
    maskedPhone?: string;
    cooldownSeconds?: number;
    expiresInSeconds?: number;
    environment?: string;
    deliveryStatus?: string;
    provider?: string;
    messageId?: string;
    isTest?: boolean;
    explanation?: string;
  }> {
    try {
      const res = await fetch('/api/verification/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to send verification code.');
      }
      return data;
    } catch (err: any) {
      console.error('Error sending verification OTP:', err);
      if (err?.name === 'TypeError' || (err?.message && err.message.toLowerCase().includes('failed to fetch'))) {
        throw new Error('Unable to connect to the verification service. Please check your internet connection and try again.');
      }
      throw err;
    }
  },

  async getSmsDeliveryStatus(reference: string): Promise<{
    success: boolean;
    record?: any;
    error?: string;
  }> {
    try {
      const res = await fetch(`/api/verification/phone/sms-status?reference=${encodeURIComponent(reference)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to retrieve SMS status.');
      }
      return data;
    } catch (err: any) {
      console.error('Error fetching SMS status:', err);
      throw err;
    }
  },

  async verifyVerificationPhoneOtp(phoneNumber: string, code: string, userId?: string): Promise<{
    success: boolean;
    message: string;
    verification?: any;
    user?: any;
  }> {
    try {
      const res = await fetch('/api/verification/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code, userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to verify code.');
      }
      if (data.user) {
        this.updateUser(data.user);
      }
      return data;
    } catch (err: any) {
      console.error('Error verifying phone OTP:', err);
      throw err;
    }
  },

  async uploadVerificationDocument(params: {
    userId: string;
    file: File;
    documentType?: string;
  }): Promise<{
    success: boolean;
    documentId: string;
    documentUrl: string;
    fileName: string;
    fileSize: number;
    verification?: any;
    message?: string;
  }> {
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(params.file);
      });

      const res = await fetch('/api/verification/document/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: params.userId,
          fileData: base64,
          fileName: params.file.name,
          fileType: params.file.type,
          documentType: params.documentType || 'GOVERNMENT_ID',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to upload document.');
      }
      return data;
    } catch (err: any) {
      console.error('Error uploading verification document:', err);
      throw err;
    }
  },

  async submitIdentityVerification(params: {
    userId: string;
    idType: string;
    idNumber: string;
    fullName: string;
    dateOfBirth?: string;
    documentUrl?: string;
    documentId?: string;
  }): Promise<{
    success: boolean;
    status: string;
    verification: any;
    nameMatchResult?: any;
    user?: any;
    message?: string;
  }> {
    try {
      const res = await fetch('/api/verification/identity/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok && !data.verification) {
        throw new Error(data.message || data.error || 'Identity verification failed.');
      }
      if (data.user) {
        this.updateUser(data.user);
      }
      return data;
    } catch (err: any) {
      console.error('Error submitting identity verification:', err);
      throw err;
    }
  },

  async verifyLegalName(params: {
    userId: string;
    submittedName: string;
    verifiedName: string;
  }): Promise<any> {
    try {
      const res = await fetch('/api/verification/name/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Name verification failed.');
      }
      if (data.user) {
        this.updateUser(data.user);
      }
      return data;
    } catch (err: any) {
      console.error('Error verifying name:', err);
      throw err;
    }
  },

  async getVerificationStatus(userId: string): Promise<any> {
    try {
      const res = await fetch(`/api/verification/status?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.user) {
        this.updateUser(reconcileUserVerification(data.user));
      } else if (data && data.verification) {
        const u = this.getUserById(userId);
        if (u) {
          u.verification = data.verification;
          this.updateUser(reconcileUserVerification(u));
        }
      }
      return data;
    } catch (err) {
      console.error('Error fetching verification status:', err);
      return null;
    }
  },

  async getAdminVerificationList(): Promise<any> {
    try {
      const res = await fetch('/api/verification/admin/list');
      if (!res.ok) return { users: [], audits: [] };
      return await res.json();
    } catch (err) {
      console.error('Error fetching admin verification list:', err);
      return { users: [], audits: [] };
    }
  },

  async adminDecisionVerification(params: {
    userId: string;
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION';
    adminNotes?: string;
    adminName?: string;
  }): Promise<any> {
    try {
      const res = await fetch('/api/verification/admin/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to record verification decision.');
      }
      if (data.user) {
        this.updateUser(data.user);
      }
      return data;
    } catch (err: any) {
      console.error('Error recording admin verification decision:', err);
      throw err;
    }
  },

  async submitAdminVerificationDecision(params: {
    userId: string;
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION';
    adminNotes?: string;
    adminName?: string;
  }): Promise<any> {
    return this.adminDecisionVerification(params);
  },

  async resetTestVerification(userId: string): Promise<any> {
    try {
      const res = await fetch('/api/verification/test-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.user) {
        this.updateUser(data.user);
      }
      return data;
    } catch (err) {
      console.error('Error resetting test verification:', err);
      throw err;
    }
  },

  // Store cleanup & sync helper
  refreshFromStorage(): void {
    notify();
  },
};

import { User, UserVerificationStatus } from '../types';

export interface VerificationEvaluation {
  isFullyVerified: boolean;
  phoneVerified: boolean;
  idVerified: boolean;
  nameVerified: boolean;
  adminApproved: boolean;
  overallStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'VERIFIED' | 'FAILED' | 'REVIEW';
  missingSteps: string[];
  incompleteCheckLabels: string[];
  kycState: 'NOT_STARTED' | 'PENDING' | 'REJECTED' | 'CORRECTION_REQUIRED' | 'APPROVED';
}

/**
 * Authoritative Canonical 3-Step Verification Evaluator.
 * 
 * Rules:
 * - Phone OTP verification: user.isPhoneVerified === true OR user.verification.phoneVerificationStatus === 'VERIFIED'
 * - Government NIN verification: user.verification.identityVerificationStatus === 'VERIFIED'
 * - Legal name match verification: user.verification.nameVerificationStatus === 'VERIFIED'
 * 
 * Fully verified requires ALL 3 checks genuinely passed, OR explicit administrator approval.
 */
export function evaluateUserVerification(user: Partial<User> | null | undefined): VerificationEvaluation {
  if (!user) {
    return {
      isFullyVerified: false,
      phoneVerified: false,
      idVerified: false,
      nameVerified: false,
      adminApproved: false,
      overallStatus: 'NOT_STARTED',
      missingSteps: ['Phone OTP Verification', 'Government NIN Verification', 'Legal Name Match'],
      incompleteCheckLabels: ['Phone Number', 'Government NIN', 'Legal Name Match'],
      kycState: 'NOT_STARTED',
    };
  }

  // Administrators always have full platform authority
  if (user.role === 'ADMIN') {
    return {
      isFullyVerified: true,
      phoneVerified: true,
      idVerified: true,
      nameVerified: true,
      adminApproved: true,
      overallStatus: 'VERIFIED',
      missingSteps: [],
      incompleteCheckLabels: [],
      kycState: 'APPROVED',
    };
  }

  const v: UserVerificationStatus | undefined = user.verification;

  // 1. Phone OTP Verification
  const phoneVerified = Boolean(
    user.isPhoneVerified ||
    v?.phoneVerificationStatus === 'VERIFIED'
  );

  // 2. Government identity / NIN Verification
  const idVerified = Boolean(
    v?.identityVerificationStatus === 'VERIFIED'
  );

  // 3. Legal Name Match Verification
  const nameVerified = Boolean(
    v?.nameVerificationStatus === 'VERIFIED'
  );

  // 4. Admin manual approval override
  const adminApproved = Boolean(
    v?.adminApprovalStatus === 'APPROVED' && v?.adminReviewedBy
  );

  // Authoritative qualification: ALL 3 required checks passed, OR explicit admin approval
  const isFullyVerified = (phoneVerified && idVerified && nameVerified) || adminApproved;

  const missingSteps: string[] = [];
  const incompleteCheckLabels: string[] = [];
  if (!phoneVerified) {
    missingSteps.push('Phone OTP Verification');
    incompleteCheckLabels.push('Phone Number');
  }
  if (!idVerified) {
    missingSteps.push('Government NIN Verification');
    incompleteCheckLabels.push('Government NIN');
  }
  if (!nameVerified) {
    missingSteps.push('Legal Name Match');
    incompleteCheckLabels.push('Legal Name Match');
  }

  let overallStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'VERIFIED' | 'FAILED' | 'REVIEW';
  let kycState: 'NOT_STARTED' | 'PENDING' | 'REJECTED' | 'CORRECTION_REQUIRED' | 'APPROVED';

  if (isFullyVerified) {
    overallStatus = 'VERIFIED';
    kycState = 'APPROVED';
  } else if (
    v?.identityVerificationStatus === 'FAILED' ||
    v?.nameVerificationStatus === 'MISMATCH' ||
    v?.overallVerificationStatus === 'FAILED' ||
    (user as any).verificationStatus === 'REJECTED' ||
    v?.adminApprovalStatus === 'REJECTED'
  ) {
    overallStatus = 'FAILED';
    kycState = 'REJECTED';
  } else if (
    v?.identityVerificationStatus === 'REVIEW' ||
    v?.nameVerificationStatus === 'REVIEW' ||
    v?.overallVerificationStatus === 'REVIEW' ||
    (user as any).verificationStatus === 'CORRECTION_REQUIRED' ||
    (user as any).verificationStatus === 'AGENT_CORRECTION_REQUIRED' ||
    v?.adminApprovalStatus === 'CORRECTION_REQUIRED'
  ) {
    overallStatus = 'REVIEW';
    kycState = 'CORRECTION_REQUIRED';
  } else if (
    phoneVerified ||
    v?.identityVerificationStatus === 'PROCESSING' ||
    v?.identityVerificationStatus === 'PENDING' ||
    v?.overallVerificationStatus === 'IN_PROGRESS' ||
    (user as any).verificationStatus === 'PENDING' ||
    (user as any).verificationStatus === 'PENDING_AGENT_APPROVAL' ||
    (user as any).verificationStatus === 'UNDER_REVIEW'
  ) {
    overallStatus = 'IN_PROGRESS';
    kycState = 'PENDING';
  } else {
    overallStatus = 'NOT_STARTED';
    kycState = 'NOT_STARTED';
  }

  return {
    isFullyVerified,
    phoneVerified,
    idVerified,
    nameVerified,
    adminApproved,
    overallStatus,
    missingSteps,
    incompleteCheckLabels,
    kycState,
  };
}

/**
 * Reconciles user record fields so that `verification`, `isPhoneVerified`, and
 * `verificationStatus` remain strictly consistent with the 3-step evaluation.
 */
export function reconcileUserVerification<T extends Partial<User>>(user: T): T {
  if (!user) return user;
  const evalResult = evaluateUserVerification(user);

  if (evalResult.isFullyVerified) {
    user.isPhoneVerified = true;
    if (!user.verification) {
      user.verification = {
        identityVerificationStatus: 'VERIFIED',
        nameVerificationStatus: 'VERIFIED',
        phoneVerificationStatus: 'VERIFIED',
        overallVerificationStatus: 'VERIFIED',
        environment: 'LIVE',
        updatedAt: new Date().toISOString(),
      };
    } else {
      user.verification.phoneVerificationStatus = 'VERIFIED';
      user.verification.overallVerificationStatus = 'VERIFIED';
      if (evalResult.adminApproved) {
        user.verification.identityVerificationStatus = 'VERIFIED';
        user.verification.nameVerificationStatus = 'VERIFIED';
      }
    }
    user.verificationStatus = 'VERIFIED';
  } else {
    // Reconcile phone verification status
    if (user.isPhoneVerified && user.verification) {
      user.verification.phoneVerificationStatus = 'VERIFIED';
    } else if (user.verification?.phoneVerificationStatus === 'VERIFIED') {
      user.isPhoneVerified = true;
    }

    if (user.verification) {
      user.verification.overallVerificationStatus = evalResult.overallStatus;
    }

    if (evalResult.kycState === 'REJECTED') {
      user.verificationStatus = 'REJECTED';
    } else if (evalResult.kycState === 'CORRECTION_REQUIRED') {
      user.verificationStatus = 'CORRECTION_REQUIRED';
    } else if (evalResult.kycState === 'PENDING') {
      if (!user.verificationStatus || user.verificationStatus === 'NOT_SUBMITTED') {
        user.verificationStatus = 'PENDING';
      }
    }
  }

  return user;
}

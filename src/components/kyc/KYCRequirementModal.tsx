import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  X,
  FileCheck2,
  Lock,
} from 'lucide-react';
import { UserRole } from '../../types';

export type NormalizedKYCState = 'NOT_STARTED' | 'PENDING' | 'REJECTED' | 'CORRECTION_REQUIRED' | 'APPROVED';

interface KYCRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  kycState: NormalizedKYCState;
  role?: 'LANDLORD' | 'AGENT';
  userRole?: 'LANDLORD' | 'AGENT';
  onNavigateToKYC?: () => void;
  onStartKYC?: () => void;
  adminNote?: string;
  adminCorrectionNote?: string;
  adminRejectionReason?: string;
  fullName?: string;
  missingSteps?: string[];
}

export const KYCRequirementModal: React.FC<KYCRequirementModalProps> = ({
  isOpen,
  onClose,
  kycState,
  role,
  userRole,
  onNavigateToKYC,
  onStartKYC,
  adminNote,
  adminCorrectionNote,
  adminRejectionReason,
  fullName,
  missingSteps,
}) => {
  if (!isOpen) return null;

  const effectiveRole = role || userRole || 'LANDLORD';
  const effectiveNavigate = onNavigateToKYC || onStartKYC;
  const effectiveNote = adminNote || adminCorrectionNote || adminRejectionReason;
  const isAgent = effectiveRole === 'AGENT';
  const roleLabel = isAgent ? 'Agent' : 'Landlord';

  // Modal Configuration based on exact requirements
  const getConfig = () => {
    switch (kycState) {
      case 'PENDING':
        return {
          icon: <Clock className="w-8 h-8 text-amber-500" />,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
          badgeText: 'Under Compliance Review',
          title: 'KYC Under Review',
          message:
            'Your KYC has been submitted and is currently under review. You will be able to add or list a property once your KYC has been approved.',
          actionButtonText: 'View / Continue KYC',
          actionButtonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
          allowAdd: false,
        };

      case 'REJECTED':
      case 'CORRECTION_REQUIRED':
        return {
          icon: <XCircle className="w-8 h-8 text-red-500" />,
          badgeColor: 'bg-red-100 text-red-800 border-red-300',
          badgeText: 'Verification Incomplete',
          title: 'KYC Verification Issue',
          message:
            'Your KYC was not approved. Please review the reason and resubmit your information before adding a property.',
          actionButtonText: 'Review / Resubmit KYC',
          actionButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
          allowAdd: false,
        };

      case 'NOT_STARTED':
      default:
        return {
          icon: <ShieldAlert className="w-8 h-8 text-purple-600" />,
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
          badgeText: 'Identity Verification Required',
          title: 'KYC Required',
          message:
            'You need to complete your KYC first before you are able to add or list a property on HOMEZA.',
          actionButtonText: 'Complete KYC',
          actionButtonClass: 'bg-emerald-700 hover:bg-emerald-800 text-white',
          allowAdd: false,
        };
    }
  };

  const config = getConfig();

  const handleActionClick = () => {
    onClose();
    if (effectiveNavigate) {
      effectiveNavigate();
    }
  };

  return (
    <div
      id="kyc-requirement-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
    >
      <div
        id="kyc-requirement-modal-card"
        className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden"
      >
        {/* Top Decorative Header */}
        <div className="bg-stone-50 border-b border-stone-100 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${config.badgeColor}`}
            >
              <Lock className="w-3.5 h-3.5" />
              {config.badgeText}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-stone-100 border border-stone-200/80 shrink-0">
              {config.icon}
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {config.title}
              </h3>
              <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                {config.message}
              </p>
            </div>
          </div>

          {/* Incomplete Verification Checks if any */}
          {missingSteps && missingSteps.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-xs sm:text-sm text-amber-950 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Incomplete Verification Check{missingSteps.length > 1 ? 's' : ''}:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-900 font-medium">
                {missingSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Admin Note / Rejection Reason if any */}
          {effectiveNote && (
            <div className="p-4 rounded-2xl bg-red-50/80 border border-red-200 text-xs sm:text-sm text-red-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-red-800">
                <AlertTriangle className="w-4 h-4" />
                <span>Administrator Feedback:</span>
              </div>
              <p className="italic text-red-950 font-medium">"{effectiveNote}"</p>
            </div>
          )}

          {/* Why KYC is Required notice */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-stone-700 space-y-1">
            <div className="font-bold text-emerald-900 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Why is KYC required on HOMEZA?</span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              HOMEZA protects tenants from unverified listings and rent fraud in Uyo. Verifying your identity as a legitimate {roleLabel.toLowerCase()} unlocks instant listing capabilities, verified badges, and automated inspection appointments.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              id="btn-kyc-modal-cancel"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-sm font-bold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              id="btn-kyc-modal-action"
              onClick={handleActionClick}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${config.actionButtonClass}`}
            >
              <span>{config.actionButtonText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

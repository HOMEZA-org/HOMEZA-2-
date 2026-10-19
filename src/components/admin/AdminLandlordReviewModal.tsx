import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  History,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import { LandlordUser, ReviewAuditLog } from '../../types';
import { Store } from '../../services/store';

interface AdminLandlordReviewModalProps {
  landlord: LandlordUser | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (landlordId: string, newStatus: string) => void;
}

export const AdminLandlordReviewModal: React.FC<AdminLandlordReviewModalProps> = ({
  landlord,
  isOpen,
  onClose,
  onStatusUpdated,
}) => {
  if (!isOpen || !landlord) return null;

  // Workflow Confirmation / Decision Modals
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [approveNote, setApproveNote] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'APPROVE' | 'REJECT' | 'CORRECTION' | 'ERROR';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'APPROVE',
  });

  // Get past audit logs for this landlord
  const audits = Store.getReviewAudits().filter(
    (a) => a.targetType === 'KYC_LANDLORD' && a.targetId === landlord.id
  );

  const handleConfirmApproval = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      Store.approveLandlordKYC(landlord.id, 'HOMEZA Admin', approveNote.trim() || undefined);
      setIsProcessing(false);
      setShowApproveConfirm(false);

      if (onStatusUpdated) {
        onStatusUpdated(landlord.id, 'VERIFIED');
      }

      setFeedback({
        isOpen: true,
        title: 'Landlord KYC Approved',
        message: `${landlord.fullName} has been verified as an authentic property owner on HOMEZA.`,
        type: 'APPROVE',
      });
    } catch (err: any) {
      setIsProcessing(false);
      setFeedback({
        isOpen: true,
        title: 'Verification Failed',
        message: err?.message || 'Could not approve landlord.',
        type: 'ERROR',
      });
    }
  };

  const handleConfirmRejection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setRejectionError('Please provide an official reason for declining this KYC application.');
      return;
    }

    if (isProcessing) return;
    setIsProcessing(true);

    try {
      Store.rejectLandlordKYC(landlord.id, rejectionReason.trim(), 'HOMEZA Admin');
      setIsProcessing(false);
      setShowRejectModal(false);

      if (onStatusUpdated) {
        onStatusUpdated(landlord.id, 'REJECTED');
      }

      setFeedback({
        isOpen: true,
        title: 'KYC Application Rejected',
        message: `The KYC verification for ${landlord.fullName} was rejected. A notification with your reason has been sent.`,
        type: 'REJECT',
      });
    } catch (err: any) {
      setIsProcessing(false);
      setFeedback({
        isOpen: true,
        title: 'Action Failed',
        message: err?.message || 'Could not reject landlord.',
        type: 'ERROR',
      });
    }
  };

  const handleConfirmCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionNote.trim()) {
      setCorrectionError('Please specify the exact document or details required from the landlord.');
      return;
    }

    if (isProcessing) return;
    setIsProcessing(true);

    try {
      Store.requestLandlordCorrection(landlord.id, correctionNote.trim(), 'HOMEZA Admin');
      setIsProcessing(false);
      setShowCorrectionModal(false);

      if (onStatusUpdated) {
        onStatusUpdated(landlord.id, 'CORRECTION_REQUIRED');
      }

      setFeedback({
        isOpen: true,
        title: 'Correction Requested',
        message: `Information request sent to ${landlord.fullName}. The landlord can now update their details and resubmit.`,
        type: 'CORRECTION',
      });
    } catch (err: any) {
      setIsProcessing(false);
      setFeedback({
        isOpen: true,
        title: 'Action Failed',
        message: err?.message || 'Could not request correction.',
        type: 'ERROR',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div
        id="admin-landlord-review-modal"
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-stone-950 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Landlord KYC Inspection
                </h2>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    landlord.verificationStatus === 'VERIFIED'
                      ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                      : landlord.verificationStatus === 'REJECTED'
                      ? 'bg-red-900 text-red-300 border border-red-700'
                      : landlord.verificationStatus === 'CORRECTION_REQUIRED'
                      ? 'bg-orange-900 text-orange-300 border border-orange-700'
                      : 'bg-amber-900 text-amber-300 border border-amber-700'
                  }`}
                >
                  {landlord.verificationStatus === 'VERIFIED'
                    ? 'Verified Landlord'
                    : landlord.verificationStatus === 'REJECTED'
                    ? 'Rejected'
                    : landlord.verificationStatus === 'CORRECTION_REQUIRED'
                    ? 'Correction Required'
                    : 'Pending Verification'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Submitter ID: <code className="text-stone-300 font-mono">{landlord.id}</code> • Registered:{' '}
                {new Date(landlord.createdAt).toLocaleDateString('en-NG')}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-landlord-review-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Submitter Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity & Contact Card */}
            <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-700" />
                <span>Personal & Contact Credentials</span>
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-stone-500 block">Full Legal Name</span>
                  <span className="font-bold text-stone-900 text-base">{landlord.fullName}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-stone-500 block">Email Address</span>
                    <span className="font-semibold text-stone-800 flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      {landlord.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-500 block">Phone Number</span>
                    <span className="font-semibold text-stone-800 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      {landlord.phoneNumber}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-stone-500 block">Property Brand / Business Name</span>
                  <span className="font-semibold text-stone-800">
                    {landlord.businessName || 'Independent Landlord (Private Owner)'}
                  </span>
                </div>

                {landlord.businessAddress && (
                  <div>
                    <span className="text-xs text-stone-500 block">Physical / Operating Address</span>
                    <span className="font-medium text-stone-700 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      {landlord.businessAddress}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* KYC Identity Documents Card */}
            <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-amber-700" />
                <span>KYC Identity & Ownership Verification</span>
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-stone-500 block">Government ID Document Type</span>
                  <span className="font-bold text-stone-900">
                    {landlord.idCardType || 'National Identification Number (NIN)'}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-stone-500 block">ID / NIN Number</span>
                  <span className="font-mono font-bold text-stone-900 bg-white px-3 py-1.5 rounded-lg border border-stone-200 inline-block mt-1">
                    {landlord.idCardNumber || 'Verified in person / via digital submission'}
                  </span>
                </div>

                {landlord.idCardDocumentUrl && (
                  <div>
                    <span className="text-xs text-stone-500 block mb-1">ID Document File</span>
                    <a
                      href={landlord.idCardDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Uploaded Government ID</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {landlord.proofOfOwnershipDocUrl && (
                  <div>
                    <span className="text-xs text-stone-500 block mb-1">Proof of Ownership Document</span>
                    <a
                      href={landlord.proofOfOwnershipDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 hover:text-blue-950 bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>View Title / Deed / Utility Proof</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {landlord.bankDetails && landlord.bankDetails.accountNumber && (
                  <div className="pt-2 border-t border-stone-200">
                    <span className="text-xs text-stone-500 block">Settlement Bank Account</span>
                    <span className="font-semibold text-stone-800 text-xs mt-0.5 block">
                      {landlord.bankDetails.bankName} • {landlord.bankDetails.accountNumber} (
                      {landlord.bankDetails.accountName})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Current Review Notes / Existing Feedback */}
          {landlord.adminCorrectionNote && (
            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 space-y-1 text-sm">
              <div className="flex items-center gap-2 text-orange-950 font-bold">
                <AlertCircle className="w-4 h-4 text-orange-700" />
                <span>Current Correction Request on Record</span>
              </div>
              <p className="text-orange-900 text-xs sm:text-sm pl-6 leading-relaxed">
                {landlord.adminCorrectionNote}
              </p>
            </div>
          )}

          {landlord.adminRejectionReason && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-1 text-sm">
              <div className="flex items-center gap-2 text-red-950 font-bold">
                <AlertTriangle className="w-4 h-4 text-red-700" />
                <span>Rejection Reason on Record</span>
              </div>
              <p className="text-red-900 text-xs sm:text-sm pl-6 leading-relaxed">
                {landlord.adminRejectionReason}
              </p>
            </div>
          )}

          {/* Past Review Audit Trail */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              <span>Review Audit History ({audits.length})</span>
            </h4>

            {audits.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No prior review decisions logged for this landlord.</p>
            ) : (
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white">
                {audits.map((a) => (
                  <div key={a.id} className="p-3.5 text-xs space-y-1 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                            a.decision === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.decision === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {a.decision}
                        </span>
                        <span className="font-semibold text-stone-800">By {a.reviewerName}</span>
                      </div>
                      {a.notes && <p className="text-stone-600 mt-1 pl-1">{a.notes}</p>}
                    </div>
                    <span className="text-stone-400 shrink-0">
                      {new Date(a.reviewDate).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Admin Action Controls */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-stone-500">
            Decisions take effect immediately across all landlord listings and send live push notifications.
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="btn-request-landlord-correction"
              onClick={() => {
                setCorrectionError(null);
                setCorrectionNote(landlord.adminCorrectionNote || '');
                setShowCorrectionModal(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-stone-100 hover:bg-orange-50 text-orange-800 hover:text-orange-900 border border-stone-200 hover:border-orange-300 transition cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Request Additional Info</span>
            </button>

            <button
              type="button"
              id="btn-reject-landlord-kyc"
              onClick={() => {
                setRejectionError(null);
                setRejectionReason(landlord.adminRejectionReason || '');
                setShowRejectModal(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-stone-100 hover:bg-red-50 text-red-700 hover:text-red-900 border border-stone-200 hover:border-red-300 transition cursor-pointer flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>Decline / Reject</span>
            </button>

            <button
              type="button"
              id="btn-approve-landlord-kyc"
              onClick={() => {
                setApproveNote('');
                setShowApproveConfirm(true);
              }}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve &amp; Verify Landlord</span>
            </button>
          </div>
        </div>
      </div>

      {/* APPROVE CONFIRMATION MODAL */}
      {showApproveConfirm && (
        <div className="fixed inset-0 z-60 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-stone-200 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-emerald-800">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-stone-950 text-lg">Approve Landlord KYC?</h3>
                <p className="text-xs text-stone-600">Verification badge will be granted immediately.</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              Are you sure you want to verify <strong>{landlord.fullName}</strong>? Their profile and current/future
              listings will display the official <strong>Verified Landlord</strong> trust badge to prospective tenants.
            </p>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Optional Audit Note
              </label>
              <input
                type="text"
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="e.g. Verified with National ID and deed of ownership"
                className="w-full text-xs sm:text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowApproveConfirm(false)}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                {isProcessing ? 'Processing...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-60 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmRejection}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-stone-200 shadow-2xl space-y-5"
          >
            <div className="flex items-center gap-3 text-red-800">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-700" />
              </div>
              <div>
                <h3 className="font-bold text-stone-950 text-lg">Decline Landlord KYC</h3>
                <p className="text-xs text-stone-600">Provide reason for record and user notice.</p>
              </div>
            </div>

            {rejectionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                <span>{rejectionError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">
                Official Reason for Rejection <span className="text-red-600">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  setRejectionError(null);
                }}
                rows={4}
                required
                placeholder="e.g. Identity document submitted is expired or illegible. Name on deed does not match applicant ID."
                className="w-full text-xs sm:text-sm border border-stone-300 rounded-xl p-3.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-red-700 hover:bg-red-800 text-white shadow-sm transition cursor-pointer"
              >
                {isProcessing ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CORRECTION / ADDITIONAL INFO MODAL */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-60 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmCorrection}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-stone-200 shadow-2xl space-y-5"
          >
            <div className="flex items-center gap-3 text-orange-800">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-orange-700" />
              </div>
              <div>
                <h3 className="font-bold text-stone-950 text-lg">Request Information Correction</h3>
                <p className="text-xs text-stone-600">Landlord will be notified to update their KYC file.</p>
              </div>
            </div>

            {correctionError && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-700 shrink-0" />
                <span>{correctionError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">
                Instructions for Landlord <span className="text-orange-600">*</span>
              </label>
              <textarea
                value={correctionNote}
                onChange={(e) => {
                  setCorrectionNote(e.target.value);
                  setCorrectionError(null);
                }}
                rows={4}
                required
                placeholder="e.g. Please re-upload a clear photograph of your National ID card (NIN slip) and provide your latest electricity utility bill for the property."
                className="w-full text-xs sm:text-sm border border-stone-300 rounded-xl p-3.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-orange-700 hover:bg-orange-800 text-white shadow-sm transition cursor-pointer"
              >
                {isProcessing ? 'Processing...' : 'Send Request to Landlord'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FEEDBACK TOAST / MODAL */}
      {feedback.isOpen && (
        <div className="fixed inset-0 z-70 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-stone-200 shadow-2xl text-center space-y-4">
            <div
              className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
                feedback.type === 'APPROVE'
                  ? 'bg-emerald-100 text-emerald-700'
                  : feedback.type === 'REJECT'
                  ? 'bg-red-100 text-red-700'
                  : feedback.type === 'CORRECTION'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {feedback.type === 'APPROVE' ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : feedback.type === 'REJECT' ? (
                <XCircle className="w-8 h-8" />
              ) : (
                <AlertCircle className="w-8 h-8" />
              )}
            </div>

            <h3 className="text-lg font-bold text-stone-950">{feedback.title}</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{feedback.message}</p>

            <button
              type="button"
              onClick={() => {
                setFeedback({ isOpen: false, title: '', message: '', type: 'APPROVE' });
                onClose();
              }}
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer mt-2"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

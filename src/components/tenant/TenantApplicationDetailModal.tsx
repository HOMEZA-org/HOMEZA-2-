import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  Info,
  MapPin,
  MessageSquare,
  Send,
  User,
  X,
} from 'lucide-react';
import { RentalApplication } from '../../types';
import { formatNaira } from '../../config/platform';
import { Store } from '../../services/store';

interface TenantApplicationDetailModalProps {
  application: RentalApplication;
  isOpen: boolean;
  onClose: () => void;
  autoFocusResponse?: boolean;
}

export const TenantApplicationDetailModal: React.FC<TenantApplicationDetailModalProps> = ({
  application,
  isOpen,
  onClose,
  autoFocusResponse = false,
}) => {
  const [currentApp, setCurrentApp] = useState<RentalApplication>(application);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if prop changes
  React.useEffect(() => {
    setCurrentApp(application);
  }, [application]);

  if (!isOpen) return null;

  const isInfoRequested =
    currentApp.status === 'ADDITIONAL_INFO_REQUESTED' ||
    currentApp.status === 'INFORMATION_REQUESTED';

  const isInfoSubmitted = currentApp.status === 'ADDITIONAL_INFO_SUBMITTED';

  // Extract request history or build from legacy fields
  const infoRequests = currentApp.infoRequests && currentApp.infoRequests.length > 0
    ? currentApp.infoRequests
    : (currentApp.infoRequestMessage
      ? [
          {
            id: 'req-legacy',
            requestMessage: currentApp.infoRequestMessage,
            requestedAt: currentApp.updatedAt || currentApp.appliedDate,
            landlordId: currentApp.landlordId,
            landlordName: currentApp.landlordName,
            tenantResponse: currentApp.tenantResponse,
            respondedAt: currentApp.updatedAt,
          },
        ]
      : []);

  // Latest pending request message
  const latestRequest = infoRequests.length > 0 ? infoRequests[infoRequests.length - 1] : null;

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseText.trim()) {
      setErrorMessage('Please enter your response before submitting.');
      return;
    }
    setErrorMessage(null);
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!responseText.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Simulate minor async tick for clean feedback & duplicate submission prevention
      await new Promise((resolve) => setTimeout(resolve, 300));
      Store.submitApplicationInfoResponse(currentApp.id, responseText.trim());

      // Fetch fresh record from store
      const updated = Store.getApplicationById(currentApp.id);
      if (updated) {
        setCurrentApp(updated);
      } else {
        setCurrentApp((prev) => ({
          ...prev,
          status: 'ADDITIONAL_INFO_SUBMITTED',
          tenantResponse: responseText.trim(),
        }));
      }

      setResponseText('');
      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        id="tenant-app-detail-modal-backdrop"
        className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      >
        <div
          id="tenant-app-detail-modal-panel"
          className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="font-bold text-stone-900 text-base">Rental Application Details</h3>
                <p className="text-[11px] text-stone-500">ID: {currentApp.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* Status Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div>
                <span className="text-[11px] font-semibold text-stone-500 block">Application Status:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full text-xs font-bold ${
                    currentApp.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : currentApp.status === 'REJECTED'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : isInfoRequested
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                      : isInfoSubmitted
                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                      : 'bg-stone-200 text-stone-800'
                  }`}
                >
                  {currentApp.status === 'APPROVED'
                    ? '✓ Approved by Landlord'
                    : currentApp.status === 'REJECTED'
                    ? '✕ Declined'
                    : isInfoRequested
                    ? '⚠️ ADDITIONAL INFORMATION REQUIRED'
                    : isInfoSubmitted
                    ? 'Response Submitted — Awaiting Landlord Review'
                    : '⏳ Pending Landlord Review'}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-stone-500 block">Submitted On:</span>
                <span className="text-stone-800 font-bold">
                  {new Date(currentApp.appliedDate || currentApp.createdAt || Date.now()).toLocaleDateString(
                    'en-NG',
                    {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </span>
              </div>
            </div>

            {/* SECTION 1: PROMINENT ADDITIONAL INFORMATION REQUEST (IF ACTIVE OR PAST) */}
            {isInfoRequested && latestRequest && (
              <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-5 space-y-4 shadow-sm animate-fadeIn">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Additional Information Requested</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-amber-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-stone-600">
                    <div>
                      <span className="font-semibold text-stone-500">Requested by: </span>
                      <strong className="text-stone-900">
                        {latestRequest.landlordName || currentApp.landlordName || 'Property Landlord'}
                      </strong>
                    </div>
                    <span className="text-[11px] text-stone-400">
                      {new Date(latestRequest.requestedAt).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="pt-1">
                    <span className="font-bold text-stone-800 block mb-1">Request Message:</span>
                    <p className="text-stone-900 bg-amber-50/50 p-3 rounded-lg border border-amber-100 font-medium leading-relaxed">
                      "{latestRequest.requestMessage}"
                    </p>
                  </div>
                </div>

                {/* Form to submit tenant's response */}
                <form onSubmit={handleOpenConfirm} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-stone-900 mb-1.5 flex items-center justify-between">
                      <span>
                        Your Response <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[11px] font-normal text-stone-500">
                        Please provide detailed answers
                      </span>
                    </label>
                    <textarea
                      id="input-tenant-info-response"
                      autoFocus={autoFocusResponse}
                      value={responseText}
                      onChange={(e) => {
                        setResponseText(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      rows={4}
                      placeholder="Enter the information requested by the landlord..."
                      className="w-full text-xs sm:text-sm border border-stone-300 rounded-xl p-3.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 resize-none shadow-xs"
                      required
                    />
                  </div>

                  {errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      id="btn-submit-additional-info"
                      type="submit"
                      disabled={!responseText.trim() || isSubmitting}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-6 py-3 rounded-xl transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? 'Submitting...' : 'Submit Information'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Chronological Information Requests & Responses History (for repeated requests) */}
            {infoRequests.length > 0 && (!isInfoRequested || infoRequests.length > 1) && (
              <div className="space-y-3">
                <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  <span>Information Exchange History ({infoRequests.length})</span>
                </h4>

                <div className="space-y-3">
                  {infoRequests.map((req, idx) => (
                    <div
                      key={req.id || idx}
                      className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-3 text-xs"
                    >
                      {/* Request */}
                      <div className="border-l-2 border-amber-500 pl-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-stone-500">
                          <span className="font-bold text-amber-900">
                            Request #{idx + 1} from {req.landlordName || currentApp.landlordName || 'Landlord'}:
                          </span>
                          <span>
                            {new Date(req.requestedAt).toLocaleDateString('en-NG', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-stone-800 font-medium italic">"{req.requestMessage}"</p>
                      </div>

                      {/* Tenant Response if provided */}
                      {req.tenantResponse ? (
                        <div className="border-l-2 border-emerald-600 pl-3 space-y-1 bg-white p-2.5 rounded-lg border border-stone-200">
                          <div className="flex items-center justify-between text-[11px] text-stone-500">
                            <span className="font-bold text-emerald-800">Your Submitted Response:</span>
                            {req.respondedAt && (
                              <span>
                                {new Date(req.respondedAt).toLocaleDateString('en-NG', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-stone-900 leading-relaxed font-normal">{req.tenantResponse}</p>
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-700 italic bg-amber-50 p-2 rounded-lg">
                          ⏳ Waiting for your response
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Property Information */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>Property Applied For</span>
              </h4>

              <div className="flex items-start gap-4">
                <img
                  src={currentApp.propertyImage}
                  alt={currentApp.propertyTitle}
                  className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl shrink-0 border border-stone-200"
                />
                <div className="space-y-1 min-w-0">
                  <h5 className="font-bold text-stone-900 text-sm sm:text-base leading-snug">
                    {currentApp.propertyTitle}
                  </h5>
                  <div className="flex items-center gap-1.5 text-stone-600">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{currentApp.propertyLocation}</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-800 pt-0.5">
                    {formatNaira(currentApp.propertyPrice)} / yr
                  </div>
                </div>
              </div>
            </div>

            {/* Original Application Details */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-700" />
                <span>Original Application Information</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-stone-200">
                  <span className="text-[11px] text-stone-500 block">Applicant Name:</span>
                  <span className="font-bold text-stone-900">{currentApp.fullName}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200">
                  <span className="text-[11px] text-stone-500 block">Preferred Move-in Date:</span>
                  <span className="font-bold text-stone-900">{currentApp.preferredMoveInDate}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200">
                  <span className="text-[11px] text-stone-500 block">Phone Number:</span>
                  <span className="font-medium text-stone-800">{currentApp.phoneNumber}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200">
                  <span className="text-[11px] text-stone-500 block">Email Address:</span>
                  <span className="font-medium text-stone-800">{currentApp.email}</span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200">
                <span className="text-[11px] text-stone-500 block mb-1">Original Cover Note:</span>
                <p className="text-stone-800 italic leading-relaxed">
                  "{currentApp.message || 'No additional note provided.'}"
                </p>
              </div>
            </div>

            {/* Landlord Decision Notes (if approved or rejected) */}
            {currentApp.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-950 space-y-1">
                <span className="font-bold block text-red-900">Landlord Rejection Reason:</span>
                <p>{currentApp.rejectionReason}</p>
              </div>
            )}

            {currentApp.status === 'APPROVED' && currentApp.landlordNotes && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 space-y-1">
                <span className="font-bold block text-emerald-900">Landlord Approval Note:</span>
                <p>{currentApp.landlordNotes}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-end shrink-0">
            <button
              onClick={onClose}
              className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL: "Submit Additional Information?" */}
      {showConfirmModal && (
        <div
          id="tenant-submit-confirm-modal"
          className="fixed inset-0 z-60 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
        >
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-emerald-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-stone-900 text-base">
                  Submit Additional Information?
                </h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                Your response will be sent to the landlord for review.
              </p>

              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-800 italic max-h-32 overflow-y-auto">
                "{responseText}"
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmSubmit}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Response</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL: "Information Submitted Successfully" */}
      {showSuccessModal && (
        <div
          id="tenant-submit-success-modal"
          className="fixed inset-0 z-60 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
        >
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-stone-900">
              Information Submitted Successfully
            </h3>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-sm mx-auto">
              Your response has been sent to the landlord. The landlord will review your application
              again.
            </p>

            <div className="pt-2">
              <button
                id="btn-tenant-view-application-post-submit"
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-3 px-4 rounded-xl transition shadow-sm cursor-pointer"
              >
                View Application
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

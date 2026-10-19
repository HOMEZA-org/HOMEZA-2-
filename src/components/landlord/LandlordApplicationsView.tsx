import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  HelpCircle,
  Info,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { ApplicationStatus, RentalApplication } from '../../types';
import { formatNaira } from '../../config/platform';
import { Store } from '../../services/store';

interface LandlordApplicationsViewProps {
  applications: RentalApplication[];
  onRefresh?: () => void;
  isInspectionMode?: boolean;
  onInspectionAction?: (actionName: string) => void;
}

export const LandlordApplicationsView: React.FC<LandlordApplicationsViewProps> = ({
  applications,
  onRefresh,
  isInspectionMode = false,
  onInspectionAction,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modals state
  const [detailModalApp, setDetailModalApp] = useState<RentalApplication | null>(null);
  const [approveConfirmApp, setApproveConfirmApp] = useState<RentalApplication | null>(null);
  const [rejectApp, setRejectApp] = useState<RentalApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [infoRequestApp, setInfoRequestApp] = useState<RentalApplication | null>(null);
  const [infoRequestText, setInfoRequestText] = useState('');
  const [infoRequestError, setInfoRequestError] = useState<string | null>(null);

  // Feedback Modal State
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'APPROVE' | 'REJECT' | 'INFO';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'APPROVE',
  });

  const isPending = (status: ApplicationStatus) =>
    status === 'PENDING_LANDLORD_REVIEW' || status === 'PENDING';

  const isInfoRequested = (status: ApplicationStatus) =>
    status === 'ADDITIONAL_INFO_REQUESTED' || status === 'INFORMATION_REQUESTED';

  const isInfoSubmitted = (status: ApplicationStatus) =>
    status === 'ADDITIONAL_INFO_SUBMITTED';

  const filteredApps = applications.filter((a) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PENDING_LANDLORD_REVIEW') return isPending(a.status);
    if (filterStatus === 'ADDITIONAL_INFO_REQUESTED') return isInfoRequested(a.status);
    if (filterStatus === 'ADDITIONAL_INFO_SUBMITTED') return isInfoSubmitted(a.status);
    return a.status === filterStatus;
  });

  const pendingCount = applications.filter((a) => isPending(a.status)).length;
  const infoRequestedCount = applications.filter((a) => isInfoRequested(a.status)).length;
  const infoSubmittedCount = applications.filter((a) => isInfoSubmitted(a.status)).length;
  const approvedCount = applications.filter((a) => a.status === 'APPROVED').length;
  const rejectedCount = applications.filter((a) => a.status === 'REJECTED').length;

  const handleInitiateApprove = (app: RentalApplication) => {
    if (isInspectionMode) {
      if (onInspectionAction) onInspectionAction('Approving tenant applications');
      return;
    }
    setApproveConfirmApp(app);
  };

  const handleInitiateReject = (app: RentalApplication) => {
    if (isInspectionMode) {
      if (onInspectionAction) onInspectionAction('Rejecting tenant applications');
      return;
    }
    setRejectApp(app);
    setRejectionReason('');
    setRejectionError(null);
  };

  const handleInitiateInfoRequest = (app: RentalApplication) => {
    if (isInspectionMode) {
      if (onInspectionAction) onInspectionAction('Requesting additional information from applicants');
      return;
    }
    setInfoRequestApp(app);
    setInfoRequestText('');
    setInfoRequestError(null);
  };

  const handleConfirmApprove = () => {
    if (!approveConfirmApp) return;
    try {
      Store.approveApplication(approveConfirmApp.id);
      const updated = Store.getApplicationById(approveConfirmApp.id);
      if (detailModalApp?.id === approveConfirmApp.id && updated) {
        setDetailModalApp(updated);
      }
      setApproveConfirmApp(null);
      setFeedbackModal({
        isOpen: true,
        title: 'Application Approved Successfully',
        message: 'The tenant has been notified.',
        type: 'APPROVE',
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setFeedbackModal({
        isOpen: true,
        title: 'Action Failed',
        message: 'Something went wrong. Please try again.',
        type: 'REJECT',
      });
    }
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectApp) return;
    if (!rejectionReason.trim()) {
      setRejectionError('Please provide a reason for rejecting this application.');
      return;
    }

    try {
      const reason = rejectionReason.trim();
      Store.rejectApplication(rejectApp.id, reason);
      const updated = Store.getApplicationById(rejectApp.id);
      if (detailModalApp?.id === rejectApp.id && updated) {
        setDetailModalApp(updated);
      }
      setRejectApp(null);
      setRejectionReason('');
      setRejectionError(null);
      setFeedbackModal({
        isOpen: true,
        title: 'Application Rejected',
        message: 'The tenant has been notified.',
        type: 'REJECT',
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setFeedbackModal({
        isOpen: true,
        title: 'Action Failed',
        message: 'Something went wrong. Please try again.',
        type: 'REJECT',
      });
    }
  };

  const handleConfirmInfoRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoRequestApp) return;
    if (!infoRequestText.trim()) {
      setInfoRequestError('Please enter what information you need from the tenant.');
      return;
    }

    try {
      Store.requestApplicationInfo(infoRequestApp.id, infoRequestText.trim());
      const updated = Store.getApplicationById(infoRequestApp.id);
      if (detailModalApp?.id === infoRequestApp.id && updated) {
        setDetailModalApp(updated);
      }
      setInfoRequestApp(null);
      setInfoRequestText('');
      setInfoRequestError(null);
      setFeedbackModal({
        isOpen: true,
        title: 'Information Request Sent Successfully',
        message: 'The tenant has been notified to provide the requested details.',
        type: 'INFO',
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setFeedbackModal({
        isOpen: true,
        title: 'Action Failed',
        message: 'Could not send information request. Please try again.',
        type: 'REJECT',
      });
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    if (status === 'APPROVED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          APPROVED
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
          REJECTED
        </span>
      );
    }
    if (status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-200 text-stone-700">
          CANCELLED
        </span>
      );
    }
    if (status === 'ADDITIONAL_INFO_REQUESTED' || status === 'INFORMATION_REQUESTED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
          ADDITIONAL INFO REQUESTED
        </span>
      );
    }
    if (status === 'ADDITIONAL_INFO_SUBMITTED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
          ADDITIONAL INFO SUBMITTED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-800 border border-stone-300">
        PENDING REVIEW
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Tenant Rental Applications</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Review applicant inquiries, request additional details, and approve tenants for lease signing.
          </p>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-stone-200 text-xs overflow-x-auto">
          {[
            { id: 'ALL', label: `All (${applications.length})` },
            { id: 'PENDING_LANDLORD_REVIEW', label: `Pending (${pendingCount})` },
            { id: 'ADDITIONAL_INFO_REQUESTED', label: `Info Requested (${infoRequestedCount})` },
            { id: 'ADDITIONAL_INFO_SUBMITTED', label: `Info Submitted (${infoSubmittedCount})` },
            { id: 'APPROVED', label: `Approved (${approvedCount})` },
            { id: 'REJECTED', label: `Rejected (${rejectedCount})` },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                filterStatus === st.id
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-sm max-w-md mx-auto">
          <FileCheck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-900 mb-1">No Applications Found</h3>
          <p className="text-xs text-stone-500">
            {filterStatus === 'ALL'
              ? 'You have not received any tenant applications for your properties yet.'
              : `No applications matching filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => {
            const hasSubmittedResponse = app.status === 'ADDITIONAL_INFO_SUBMITTED';
            const history = app.infoRequests && app.infoRequests.length > 0 ? app.infoRequests : [];
            const latestExchange = history.length > 0 ? history[history.length - 1] : null;

            return (
              <div
                key={app.id}
                className={`bg-white rounded-2xl p-5 sm:p-6 border shadow-sm space-y-4 transition ${
                  hasSubmittedResponse
                    ? 'border-blue-300 ring-1 ring-blue-200 bg-blue-50/10'
                    : 'border-stone-200'
                }`}
              >
                {/* Top Row: Applicant & Property & Status */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-stone-100">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-base shrink-0">
                      {app.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-stone-900 text-base">{app.fullName}</h3>
                        {getStatusBadge(app.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          <strong className="text-stone-800">{app.phoneNumber}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-stone-400" />
                          <span>{app.email}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Property context badge */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs shrink-0 max-w-xs">
                    <div className="font-bold text-stone-900 truncate">{app.propertyTitle}</div>
                    <div className="text-stone-500 mt-0.5">{app.propertyLocation}</div>
                    <div className="font-bold text-emerald-800 mt-1">
                      {formatNaira(app.propertyPrice)} / yr
                    </div>
                  </div>
                </div>

                {/* PROMINENT ALERT WHEN TENANT HAS SUBMITTED ADDITIONAL INFORMATION */}
                {hasSubmittedResponse && (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold text-blue-900 block text-sm">
                          Tenant has submitted additional information — Review Required
                        </strong>
                        <p className="text-blue-800 mt-0.5 line-clamp-2">
                          "{app.tenantResponse || (latestExchange && latestExchange.tenantResponse) || 'Tenant submitted the requested information.'}"
                        </p>
                      </div>
                    </div>

                    <button
                      id={`btn-review-response-${app.id}`}
                      onClick={() => setDetailModalApp(app)}
                      className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
                    >
                      Review Response
                    </button>
                  </div>
                )}

                {/* Middle Row: Message & Move-in Date */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="md:col-span-2 bg-stone-50 p-3.5 rounded-xl border border-stone-100">
                    <div className="font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-stone-500" />
                      <span>Tenant Cover Note:</span>
                    </div>
                    <p className="text-stone-800 leading-relaxed italic">
                      "{app.message || 'No additional message provided.'}"
                    </p>
                  </div>

                  <div className="space-y-2 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                    <div>
                      <span className="text-stone-500 block">Preferred Move-in:</span>
                      <strong className="text-stone-900">{app.preferredMoveInDate}</strong>
                    </div>
                    <div>
                      <span className="text-stone-500 block">Application Date:</span>
                      <span className="text-stone-700">
                        {new Date(app.appliedDate || app.createdAt || Date.now()).toLocaleDateString(
                          'en-NG',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active or past info request message */}
                {isInfoRequested(app.status) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Your Information Request (Awaiting Tenant Response):</strong>
                      <p className="italic mt-0.5">
                        "{app.infoRequestMessage || (latestExchange && latestExchange.requestMessage) || 'Information requested.'}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Rejection feedback if any */}
                {app.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-950 flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Rejection Reason:</strong> {app.rejectionReason}
                    </div>
                  </div>
                )}

                {/* Action Buttons: View Application, Approve, Reject, Request Info */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    id={`btn-view-app-card-${app.id}`}
                    onClick={() => setDetailModalApp(app)}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                  >
                    View Full Application
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {app.status !== 'APPROVED' && (
                      <button
                        id={`btn-approve-app-${app.id}`}
                        onClick={() => handleInitiateApprove(app)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Application</span>
                      </button>
                    )}

                    {app.status !== 'REJECTED' && (
                      <button
                        id={`btn-reject-app-${app.id}`}
                        onClick={() => handleInitiateReject(app)}
                        className="bg-stone-100 hover:bg-red-50 text-red-700 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition border border-stone-200 cursor-pointer flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject Application</span>
                      </button>
                    )}

                    <button
                      id={`btn-request-info-${app.id}`}
                      onClick={() => {
                        setInfoRequestApp(app);
                        setInfoRequestText('');
                        setInfoRequestError(null);
                      }}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition border border-blue-200 cursor-pointer flex items-center gap-1.5"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>
                        {history.length > 0 ? 'Request More Information' : 'Request Additional Information'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. FULL APPLICATION DETAIL REVIEW SCREEN (MODAL) */}
      {detailModalApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Application Review</h3>
                  <p className="text-[11px] text-stone-500">ID: {detailModalApp.id}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalApp(null)}
                className="p-1.5 rounded-xl hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Applicant Header */}
              <div className="flex items-center gap-4 pb-4 border-b border-stone-100">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 text-xl font-bold flex items-center justify-center shrink-0">
                  {detailModalApp.fullName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-bold text-stone-900">{detailModalApp.fullName}</h4>
                    {getStatusBadge(detailModalApp.status)}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {detailModalApp.email} • {detailModalApp.phoneNumber}
                  </p>
                </div>
              </div>

              {/* Property Details */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2">
                <div className="font-bold text-stone-900 text-sm">
                  {detailModalApp.propertyTitle}
                </div>
                <div className="text-stone-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{detailModalApp.propertyLocation}</span>
                </div>
                <div className="font-bold text-emerald-800">
                  {formatNaira(detailModalApp.propertyPrice)} / yr
                </div>
              </div>

              {/* Original Application Details */}
              <div className="space-y-3">
                <h5 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-stone-700">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Original Application Information</span>
                </h5>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <span className="text-stone-500 block text-[11px]">Preferred Move-in Date:</span>
                    <strong className="text-stone-900">{detailModalApp.preferredMoveInDate}</strong>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <span className="text-stone-500 block text-[11px]">Application Date:</span>
                    <span className="text-stone-800 font-medium">
                      {new Date(
                        detailModalApp.appliedDate || detailModalApp.createdAt || Date.now()
                      ).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-stone-700 block mb-1">
                    Tenant Cover Note:
                  </span>
                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-stone-800 italic leading-relaxed">
                    "{detailModalApp.message || 'No additional note provided.'}"
                  </div>
                </div>
              </div>

              {/* CHRONOLOGICAL INFORMATION REQUEST & RESPONSE HISTORY */}
              {((detailModalApp.infoRequests && detailModalApp.infoRequests.length > 0) ||
                detailModalApp.infoRequestMessage ||
                detailModalApp.tenantResponse) && (
                <div className="space-y-3 pt-2">
                  <h5 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-stone-700">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Additional Information History</span>
                  </h5>

                  {detailModalApp.infoRequests && detailModalApp.infoRequests.length > 0 ? (
                    <div className="space-y-3">
                      {detailModalApp.infoRequests.map((req, idx) => (
                        <div
                          key={req.id || idx}
                          className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-3"
                        >
                          {/* Landlord request */}
                          <div className="border-l-2 border-amber-500 pl-3 space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-stone-500">
                              <span className="font-bold text-amber-900">
                                Your Request #{idx + 1}:
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

                          {/* Tenant response */}
                          {req.tenantResponse ? (
                            <div className="border-l-2 border-blue-600 pl-3 space-y-1 bg-white p-3 rounded-lg border border-blue-200 shadow-2xs">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-blue-900 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Tenant's Submitted Response:</span>
                                </span>
                                {req.respondedAt && (
                                  <span className="text-stone-400">
                                    {new Date(req.respondedAt).toLocaleDateString('en-NG', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                )}
                              </div>
                              <p className="text-stone-900 font-normal leading-relaxed">
                                {req.tenantResponse}
                              </p>
                            </div>
                          ) : (
                            <div className="text-[11px] text-amber-700 italic bg-amber-50 p-2 rounded-lg">
                              ⏳ Awaiting response from tenant
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-3">
                      {detailModalApp.infoRequestMessage && (
                        <div className="border-l-2 border-amber-500 pl-3 space-y-1">
                          <span className="font-bold text-amber-900 block text-[11px]">
                            Your Request:
                          </span>
                          <p className="text-stone-800 font-medium italic">
                            "{detailModalApp.infoRequestMessage}"
                          </p>
                        </div>
                      )}
                      {detailModalApp.tenantResponse && (
                        <div className="border-l-2 border-blue-600 pl-3 space-y-1 bg-white p-3 rounded-lg border border-blue-200">
                          <span className="font-bold text-blue-900 block text-[11px]">
                            Tenant's Response:
                          </span>
                          <p className="text-stone-900 font-normal leading-relaxed">
                            {detailModalApp.tenantResponse}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Rejection / Note display */}
              {detailModalApp.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-950">
                  <strong className="font-bold">Rejection Reason:</strong>{' '}
                  {detailModalApp.rejectionReason}
                </div>
              )}
            </div>

            {/* Primary Actions Footer */}
            <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setDetailModalApp(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-modal-request-more-info"
                  onClick={() => {
                    setInfoRequestApp(detailModalApp);
                    setInfoRequestText('');
                    setInfoRequestError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition border border-blue-200 cursor-pointer flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>
                    {(detailModalApp.infoRequests && detailModalApp.infoRequests.length > 0) ||
                    detailModalApp.infoRequestMessage
                      ? 'Request More Information'
                      : 'Request Additional Information'}
                  </span>
                </button>

                {detailModalApp.status !== 'REJECTED' && (
                  <button
                    id="btn-modal-reject-app"
                    onClick={() => handleInitiateReject(detailModalApp)}
                    className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Application</span>
                  </button>
                )}

                {detailModalApp.status !== 'APPROVED' && (
                  <button
                    id="btn-modal-approve-app"
                    onClick={() => handleInitiateApprove(detailModalApp)}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Application</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. APPROVAL CONFIRMATION MODAL */}
      {approveConfirmApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-emerald-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-stone-900 text-base">Approve Tenant Application?</h3>
              </div>
              <button
                onClick={() => setApproveConfirmApp(null)}
                className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-stone-700 leading-relaxed">
                Are you sure you want to approve this application from{' '}
                <strong className="text-stone-900">{approveConfirmApp.fullName}</strong> for{' '}
                <strong className="text-stone-900">{approveConfirmApp.propertyTitle}</strong>?
              </p>

              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs text-stone-600 space-y-1.5">
                <div>• The tenant will be notified immediately of your approval.</div>
                <div>• The application status will be updated to <strong>APPROVED</strong> across the platform.</div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  id="btn-cancel-approve"
                  type="button"
                  onClick={() => setApproveConfirmApp(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-approve"
                  onClick={handleConfirmApprove}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                >
                  Confirm Approval
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. REJECT APPLICATION MODAL (WITH MANDATORY REASON) */}
      {rejectApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-red-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-700" />
                <h3 className="font-bold text-stone-900 text-base">Reject Application</h3>
              </div>
              <button
                onClick={() => {
                  setRejectApp(null);
                  setRejectionReason('');
                  setRejectionError(null);
                }}
                className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="p-6 space-y-4">
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Decline the rental application from{' '}
                <strong className="text-stone-900">{rejectApp.fullName}</strong> for{' '}
                <strong className="text-stone-900">{rejectApp.propertyTitle}</strong>.
              </p>

              {rejectionError && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{rejectionError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Please provide a reason for rejecting this application.{' '}
                  <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="input-rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (rejectionError) setRejectionError(null);
                  }}
                  rows={3}
                  placeholder="e.g. Property is already reserved, or proposed move-in date does not align with vacancy schedule."
                  required
                  className="w-full text-xs border border-stone-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-600 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  id="btn-cancel-reject"
                  type="button"
                  onClick={() => {
                    setRejectApp(null);
                    setRejectionReason('');
                    setRejectionError(null);
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-reject"
                  type="submit"
                  disabled={!rejectionReason.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. REQUEST ADDITIONAL INFORMATION MODAL */}
      {infoRequestApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-blue-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-700" />
                <h3 className="font-bold text-stone-900 text-base">Request Additional Information</h3>
              </div>
              <button
                onClick={() => {
                  setInfoRequestApp(null);
                  setInfoRequestText('');
                  setInfoRequestError(null);
                }}
                className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmInfoRequest} className="p-6 space-y-4">
              <p className="text-xs text-stone-600 leading-relaxed">
                Send a request for details to{' '}
                <strong className="text-stone-900">{infoRequestApp.fullName}</strong> regarding their
                application for{' '}
                <strong className="text-stone-900">{infoRequestApp.propertyTitle}</strong>.
              </p>

              {infoRequestError && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{infoRequestError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  What information do you need from the tenant? <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="input-info-request-message"
                  value={infoRequestText}
                  onChange={(e) => {
                    setInfoRequestText(e.target.value);
                    if (infoRequestError) setInfoRequestError(null);
                  }}
                  rows={4}
                  placeholder="e.g. Please provide your preferred move-in date and confirm your employment status."
                  required
                  className="w-full text-xs border border-stone-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  id="btn-cancel-info-request"
                  type="button"
                  onClick={() => {
                    setInfoRequestApp(null);
                    setInfoRequestText('');
                    setInfoRequestError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-send-info-request"
                  type="submit"
                  disabled={!infoRequestText.trim()}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. FEEDBACK SUCCESS / NOTIFICATION MODAL */}
      {feedbackModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 p-6 text-center space-y-4">
            <div
              className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
                feedbackModal.type === 'APPROVE'
                  ? 'bg-emerald-100 text-emerald-700'
                  : feedbackModal.type === 'REJECT'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {feedbackModal.type === 'APPROVE' ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : feedbackModal.type === 'REJECT' ? (
                <XCircle className="w-8 h-8" />
              ) : (
                <Info className="w-8 h-8" />
              )}
            </div>

            <h3 className="text-lg font-bold text-stone-900">{feedbackModal.title}</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-sm mx-auto">
              {feedbackModal.message}
            </p>

            <div className="pt-2">
              <button
                id="btn-close-feedback-modal"
                onClick={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

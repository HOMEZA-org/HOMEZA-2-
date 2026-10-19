import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Shield,
  ShieldCheck,
  User,
  Building2,
  Navigation,
  FileText,
  HelpCircle,
  X,
  ChevronRight,
  ArrowRight,
  Send,
  Flag,
  CreditCard,
} from 'lucide-react';
import { PropertyInspection, User as AppUser, InspectionOutcomeType } from '../../types';
import { Store, subscribeToStore } from '../../services/store';
import { useAuth } from '../../context/AuthContext';
import { formatNaira } from '../../config/platform';
import { PaymentModal } from './PaymentModal';

interface InspectionWorkflowModalProps {
  inspectionId: string;
  onClose: () => void;
  onOpenDirectMessaging?: (inspectionId: string) => void;
}

export const InspectionWorkflowModal: React.FC<InspectionWorkflowModalProps> = ({
  inspectionId,
  onClose,
  onOpenDirectMessaging,
}) => {
  const { currentUser } = useAuth();
  const [inspection, setInspection] = useState<PropertyInspection | null>(null);

  // Action states
  const [actionView, setActionView] = useState<'DETAILS' | 'CONFIRM' | 'RESCHEDULE' | 'DECLINE' | 'OUTCOME' | 'CANCEL'>('DETAILS');
  const [confirmNote, setConfirmNote] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00 AM - 12:00 PM');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  
  // Outcome state
  const [outcomeType, setOutcomeType] = useState<InspectionOutcomeType>('COMPLETED');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [flagListing, setFlagListing] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = () => {
    const found = Store.getInspections().find((i) => i.id === inspectionId);
    if (found) {
      setInspection(found);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToStore(loadData);
    return unsub;
  }, [inspectionId]);

  if (!inspection) {
    return null;
  }

  const isTenant = currentUser?.id === inspection.tenantId;
  const isLandlord = currentUser?.id === inspection.landlordId;
  const isAgent = currentUser?.id === inspection.agentId;
  const isAdmin = currentUser?.role === 'ADMIN';
  const isHost = isLandlord || isAgent || isAdmin;

  const rawProp = Store.getPropertyById(inspection.propertyId);
  const inspectionFee = inspection.inspectionFee || rawProp?.inspectionFee || rawProp?.pricing?.inspectionFee || 3000;
  const prop = rawProp || ({
    id: inspection.propertyId,
    title: inspection.propertyTitle || '2 bedroom flat',
    location: {
      area: inspection.propertyLocationArea || 'Afaha Ube Itam',
      city: 'Uyo',
      state: 'Akwa Ibom State',
      street: inspection.propertyExactAddress || 'Afaha Ube Itam, Uyo',
    },
    pricing: {
      rent: inspection.propertyPrice || 450000,
      rentalPeriod: 'YEARLY',
      inspectionFee: inspectionFee,
    },
    inspectionFee: inspectionFee,
    images: inspection.propertyImage ? [{ id: 'img-1', url: inspection.propertyImage }] : [],
    status: 'AVAILABLE',
    isVerified: true,
  } as any);

  // Time slot presets
  const timeSlots = [
    '09:00 AM - 11:00 AM',
    '11:00 AM - 01:00 PM',
    '01:00 PM - 03:00 PM',
    '03:00 PM - 05:00 PM',
    '05:00 PM - 06:30 PM',
  ];

  // Quick action handlers
  const handleConfirmInspection = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      Store.confirmInspection(inspection.id, confirmNote.trim() || undefined);
      setFeedbackMsg({ type: 'success', text: 'Inspection successfully confirmed! Exact meeting details unlocked.' });
      setActionView('DETAILS');
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to confirm inspection.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDate) {
      setFeedbackMsg({ type: 'error', text: 'Please select a preferred alternative date.' });
      return;
    }
    setIsSubmitting(true);
    try {
      Store.rescheduleInspection(inspection.id, rescheduleDate, rescheduleTime, rescheduleReason.trim() || undefined);
      setFeedbackMsg({ type: 'success', text: 'New inspection schedule proposed successfully.' });
      setActionView('DETAILS');
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to reschedule inspection.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineReason.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please specify the reason for declining this inspection request.' });
      return;
    }
    setIsSubmitting(true);
    try {
      Store.declineInspection(inspection.id, declineReason.trim());
      setFeedbackMsg({ type: 'success', text: 'Inspection request declined.' });
      setActionView('DETAILS');
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to decline inspection.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      Store.cancelInspection(inspection.id, cancelReason.trim() || undefined);
      setFeedbackMsg({ type: 'success', text: 'Inspection appointment has been cancelled.' });
      setActionView('DETAILS');
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to cancel inspection.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordOutcome = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      Store.recordInspectionOutcome(
        inspection.id,
        outcomeType,
        outcomeNotes.trim() || undefined,
        currentUser?.fullName || 'HOMEZA Operations',
        flagListing,
        flagReason.trim() || undefined
      );
      setFeedbackMsg({ type: 'success', text: 'Inspection outcome recorded in platform audit logs.' });
      setActionView('DETAILS');
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to record outcome.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    switch (inspection.status) {
      case 'INSPECTION_CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Inspection Confirmed</span>
          </span>
        );
      case 'INSPECTION_RESCHEDULED':
      case 'PROPOSED_NEW_TIME':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <Clock className="w-3.5 h-3.5 text-blue-700" />
            <span>Rescheduled / New Slot Proposed</span>
          </span>
        );
      case 'INSPECTION_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-200 text-stone-900">
            <CheckCircle2 className="w-3.5 h-3.5 text-stone-700" />
            <span>Inspection Completed</span>
          </span>
        );
      case 'INSPECTION_DECLINED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <XCircle className="w-3.5 h-3.5 text-amber-700" />
            <span>Declined by Host</span>
          </span>
        );
      case 'INSPECTION_CANCELLED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-300">
            <XCircle className="w-3.5 h-3.5 text-red-700" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>Awaiting Host Confirmation</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div
        id="inspection-workflow-modal"
        className="bg-white rounded-3xl max-w-3xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-stone-50 border-b border-stone-200 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-500">
                  Inspection Appointment
                </span>
                {getStatusBadge()}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 mt-1">
                {inspection.propertyTitle}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{inspection.propertyLocationArea}, Uyo, Akwa Ibom</span>
                {prop && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-stone-900">{formatNaira(prop.pricing.rent)} / yr</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-inspection-modal"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`px-6 py-3 text-sm font-semibold flex items-center justify-between border-b ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-xs underline hover:no-underline font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* APPOINTMENT KEY STATS CARD */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-50 p-4 sm:p-5 rounded-2xl border border-stone-200">
            <div className="space-y-1">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Scheduled Date</span>
              <div className="flex items-center gap-2 text-stone-900 font-bold text-base">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>{inspection.rescheduledDate || inspection.preferredDate}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Time Slot</span>
              <div className="flex items-center gap-2 text-stone-900 font-bold text-base">
                <Clock className="w-4 h-4 text-emerald-700" />
                <span>{inspection.rescheduledTime || inspection.preferredTime}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Coordinating Rep</span>
              <div className="flex items-center gap-2 text-stone-900 font-bold text-base truncate">
                <User className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="truncate">{inspection.agentName || inspection.landlordName}</span>
              </div>
            </div>
          </div>

          {/* EXACT LOCATION & SAFETY SECTION */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-700" />
                <span>Inspection Meeting Point & Address</span>
              </h3>
              {inspection.isLocationReleased ? (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  ✓ Location Unlocked
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  🔒 Hidden until Confirmed
                </span>
              )}
            </div>

            {inspection.isLocationReleased ? (
              <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 text-stone-800 text-sm space-y-1">
                <p className="font-extrabold text-stone-950">
                  {inspection.propertyExactAddress || prop?.location?.street || inspection.propertyLocationArea}
                </p>
                <p className="text-xs text-stone-600">
                  Area: {inspection.propertyLocationArea}, Uyo. Please arrive 10 minutes prior to scheduled slot.
                </p>
              </div>
            ) : (
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-600 space-y-1">
                <p className="font-medium">
                  <strong>Area:</strong> {inspection.propertyLocationArea}, Uyo.
                </p>
                <p className="text-stone-500 text-xs">
                  Exact house number and meeting coordinates will be visible once the Landlord/Agent accepts the requested appointment time.
                </p>
              </div>
            )}

            {/* HOMEZA Contact & Anti-Scam Shield Banner */}
            <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl flex items-start gap-3 text-xs text-amber-950">
              <ShieldCheck className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="font-bold text-amber-900 block">HOMEZA Verified Inspection Protocol</strong>
                <p className="leading-relaxed">
                  Never pay cash inspection fees on-site. All tenancy agreements and verified payment escrows are processed exclusively through HOMEZA to safeguard you against fraudulent agents.
                </p>
              </div>
            </div>

            {/* Pay Inspection Fee Banner for Tenants */}
            {!inspection.isLocationReleased && isTenant && (
              inspection.paymentStatus === 'PENDING_VERIFICATION' || (inspection.paymentMethod === 'BANK_TRANSFER' && !inspection.isLocationReleased) ? (
                <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-900 shadow-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5 text-sm">
                      <Clock className="w-4 h-4 text-amber-700 animate-pulse" />
                      <span>Bank Transfer Submitted • Pending Verification</span>
                    </div>
                    <p className="text-stone-700">
                      Your transfer proof {inspection.paymentReference ? `(${inspection.paymentReference})` : ''} has been submitted. HOMEZA Operations is verifying the deposit. Exact coordinates will unlock once confirmed.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="btn-view-transfer-details-workflow"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-4 py-2.5 rounded-xl transition shadow-xs text-xs whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-4 h-4" />
                    <span>View Transfer Details</span>
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950">
                  <div className="space-y-0.5">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                      <CreditCard className="w-4 h-4 text-emerald-700" />
                      <span>Inspection Booking Fee ({formatNaira(inspectionFee)})</span>
                    </div>
                    <p className="text-emerald-800">
                      Pay securely with Paystack or Direct Bank Transfer to unlock meeting location coordinates.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="btn-pay-inspection-fee-workflow"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl transition shadow-xs text-xs whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay {formatNaira(inspectionFee)} Fee</span>
                  </button>
                </div>
              )
            )}
          </div>

          {/* VIEW: DETAILS / DEFAULT ACTION HUB */}
          {actionView === 'DETAILS' && (
            <div className="space-y-5">
              {/* Note / Message from Host if any */}
              {inspection.landlordResponseNote && (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 text-sm text-blue-950 space-y-1">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    <span>Host Response / Meeting Instructions:</span>
                  </span>
                  <p className="italic">"{inspection.landlordResponseNote}"</p>
                </div>
              )}

              {/* ACTION BUTTONS (Role-tailored) */}
              <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-500">
                  Available Workflow Actions
                </h4>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Landlord / Agent Action Buttons */}
                  {isHost && inspection.status === 'INSPECTION_REQUESTED' && (
                    <>
                      <button
                        type="button"
                        id="btn-confirm-inspection-action"
                        onClick={() => setActionView('CONFIRM')}
                        className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept & Confirm Inspection</span>
                      </button>

                      <button
                        type="button"
                        id="btn-reschedule-inspection-action"
                        onClick={() => setActionView('RESCHEDULE')}
                        className="px-5 py-2.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 font-bold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Propose Different Time</span>
                      </button>

                      <button
                        type="button"
                        id="btn-decline-inspection-action"
                        onClick={() => setActionView('DECLINE')}
                        className="px-5 py-2.5 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 font-bold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Decline Request</span>
                      </button>
                    </>
                  )}

                  {/* If already confirmed, allow recording outcome or rescheduling */}
                  {isHost && inspection.status === 'INSPECTION_CONFIRMED' && (
                    <>
                      <button
                        type="button"
                        id="btn-record-outcome-action"
                        onClick={() => setActionView('OUTCOME')}
                        className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Record Inspection Outcome</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActionView('RESCHEDULE')}
                        className="px-5 py-2.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 font-bold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Reschedule Appointment</span>
                      </button>
                    </>
                  )}

                  {/* Tenant specific actions */}
                  {isTenant && inspection.status === 'INSPECTION_RESCHEDULED' && (
                    <button
                      type="button"
                      onClick={() => {
                        Store.confirmInspection(inspection.id, 'Tenant agreed to proposed rescheduled slot.');
                        setFeedbackMsg({ type: 'success', text: 'You accepted the new inspection slot!' });
                      }}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept Proposed New Time</span>
                    </button>
                  )}

                  {isTenant && inspection.status !== 'INSPECTION_CANCELLED' && inspection.status !== 'INSPECTION_COMPLETED' && (
                    <button
                      type="button"
                      id="btn-cancel-inspection-tenant"
                      onClick={() => setActionView('CANCEL')}
                      className="px-5 py-2.5 text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 font-bold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>Cancel Appointment</span>
                    </button>
                  )}

                  {/* Separate In-App Direct Messaging Inquiry */}
                  {onOpenDirectMessaging && (
                    <button
                      type="button"
                      id="btn-open-direct-inquiry"
                      onClick={() => {
                        onOpenDirectMessaging(inspection.id);
                      }}
                      className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer ml-auto"
                    >
                      <MessageSquare className="w-4 h-4 text-stone-700" />
                      <span>Open In-App Chat</span>
                    </button>
                  )}
                </div>
              </div>

              {/* AUDIT TRAIL / TIMELINE */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Inspection Activity & Audit Log
                </h4>

                <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                  {(inspection.auditHistory || []).map((entry, idx) => (
                    <div key={entry.id || idx} className="flex items-start gap-3.5 relative pl-1">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ring-4 ring-white">
                        ✓
                      </div>
                      <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 text-xs flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-stone-900">{entry.title}</span>
                          <span className="text-stone-400 text-[11px]">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-stone-600 mt-0.5">
                          By <strong className="text-stone-800">{entry.actorName}</strong> ({entry.actorRole})
                          {entry.notes ? ` — ${entry.notes}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: CONFIRM ACTION FORM */}
          {actionView === 'CONFIRM' && (
            <form onSubmit={handleConfirmInspection} className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  <span>Confirm Inspection Appointment</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActionView('DETAILS')}
                  className="text-xs text-stone-600 hover:text-stone-900 font-semibold"
                >
                  Back
                </button>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                By confirming, you agree to meet the tenant at the scheduled time ({inspection.preferredDate}, {inspection.preferredTime}). Exact property coordinates and meeting point will be released to the tenant.
              </p>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Meeting Instructions / Notes for Tenant (Optional)
                </label>
                <textarea
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                  placeholder="e.g. Please ring the bell at the black gate or meet at the main junction."
                  rows={3}
                  className="w-full text-sm bg-white border border-stone-300 rounded-xl p-3 focus:outline-emerald-700"
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActionView('DETAILS')}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Confirming...' : 'Accept & Unlock Location'}</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW: RESCHEDULE ACTION FORM */}
          {actionView === 'RESCHEDULE' && (
            <form onSubmit={handleReschedule} className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-700" />
                  <span>Propose Alternative Inspection Time</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActionView('DETAILS')}
                  className="text-xs text-stone-600 hover:text-stone-900 font-semibold"
                >
                  Back
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Proposed Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full text-sm bg-white border border-stone-300 rounded-xl p-3 focus:outline-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Proposed Time Slot *
                  </label>
                  <select
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full text-sm bg-white border border-stone-300 rounded-xl p-3 focus:outline-emerald-700"
                  >
                    {timeSlots.map((ts) => (
                      <option key={ts} value={ts}>
                        {ts}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Reason for Rescheduling
                </label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Existing tenant move-out in progress or out of town until Thursday."
                  className="w-full text-sm bg-white border border-stone-300 rounded-xl p-3 focus:outline-emerald-700"
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActionView('DETAILS')}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  <span>{isSubmitting ? 'Proposing...' : 'Send Schedule Proposal'}</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW: DECLINE FORM */}
          {actionView === 'DECLINE' && (
            <form onSubmit={handleDecline} className="bg-red-50/50 p-5 rounded-2xl border border-red-200 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-red-950 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-700" />
                  <span>Decline Inspection Request</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActionView('DETAILS')}
                  className="text-xs text-stone-600 hover:text-stone-900 font-semibold"
                >
                  Back
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Decline Reason (Will be sent to tenant) *
                </label>
                <textarea
                  required
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Property already under deposit or renovation underway."
                  rows={3}
                  className="w-full text-sm bg-white border border-stone-300 rounded-xl p-3 focus:outline-red-700"
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActionView('DETAILS')}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isSubmitting ? 'Declining...' : 'Decline Inspection'}</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW: CANCEL FORM */}
          {actionView === 'CANCEL' && (
            <form onSubmit={handleCancel} className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-700" />
                  <span>Cancel Inspection Appointment</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActionView('DETAILS')}
                  className="text-xs text-stone-600 hover:text-stone-900 font-semibold"
                >
                  Back
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Cancellation Reason (Optional)
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Schedule clash or found another property."
                  className="w-full text-sm bg-white border border-stone-300 rounded-xl p-3 focus:outline-stone-700"
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActionView('DETAILS')}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-300 rounded-xl"
                >
                  Nevermind
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW: OUTCOME FORM */}
          {actionView === 'OUTCOME' && (
            <form onSubmit={handleRecordOutcome} className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  <span>Record Inspection Outcome</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActionView('DETAILS')}
                  className="text-xs text-stone-600 hover:text-stone-900 font-semibold"
                >
                  Back
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Outcome Type *
                </label>
                <select
                  value={outcomeType}
                  onChange={(e) => setOutcomeType(e.target.value as InspectionOutcomeType)}
                  className="w-full text-sm bg-white border border-stone-300 rounded-xl p-3 focus:outline-emerald-700 font-medium"
                >
                  <option value="COMPLETED">Completed Successfully (Tenant Inspected)</option>
                  <option value="TENANT_NO_SHOW">Tenant Did Not Show Up</option>
                  <option value="LANDLORD_AGENT_NO_SHOW">Host / Agent Did Not Show Up</option>
                  <option value="RESCHEDULED">Rescheduled During Walkthrough</option>
                  <option value="PROPERTY_ISSUE_REPORTED">Property Issue / Discrepancy Found</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Walkthrough Observations & Notes
                </label>
                <textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="e.g. Tenant liked the flat and was invited to submit a formal rental application."
                  rows={3}
                  className="w-full text-sm bg-white border border-stone-300 rounded-xl p-3 focus:outline-emerald-700"
                />
              </div>

              {/* Flag Listing Checkbox */}
              <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={flagListing}
                    onChange={(e) => setFlagListing(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="flex items-center gap-1 text-red-700">
                    <Flag className="w-3.5 h-3.5" />
                    <span>Flag this property listing for Admin audit</span>
                  </span>
                </label>
                {flagListing && (
                  <input
                    type="text"
                    required={flagListing}
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    placeholder="Reason for flagging (e.g. Condition does not match photos, electrical defect)"
                    className="w-full text-xs bg-stone-50 border border-red-300 rounded-lg p-2 text-stone-900"
                  />
                )}
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActionView('DETAILS')}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Inspection Outcome'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-700" />
            <span>HOMEZA Trust & Safety Network • Uyo, Akwa Ibom</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {isPaymentModalOpen && prop && (
        <PaymentModal
          property={prop}
          inspectionId={inspection.id}
          amount={inspectionFee}
          onClose={() => {
            setIsPaymentModalOpen(false);
            loadData();
          }}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

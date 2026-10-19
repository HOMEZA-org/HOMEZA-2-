import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
  User,
  Building2,
  X,
  ArrowRight,
  Phone,
  Mail,
  UserCheck,
  CreditCard,
  Eye,
  CalendarCheck2,
  RotateCcw,
} from 'lucide-react';
import { PropertyInspection, Property, User as AppUser, InspectionStatus } from '../../types';
import { Store, subscribeToStore } from '../../services/store';
import { formatNaira } from '../../config/platform';

interface AdminInspectionDetailModalProps {
  inspectionId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenChatWithTenant?: (inspectionId: string) => void;
  onViewProperty?: (property: Property) => void;
}

export const AdminInspectionDetailModal: React.FC<AdminInspectionDetailModalProps> = ({
  inspectionId,
  isOpen,
  onClose,
  onOpenChatWithTenant,
  onViewProperty,
}) => {
  const [inspection, setInspection] = useState<PropertyInspection | null>(null);
  const [tenantUser, setTenantUser] = useState<AppUser | null>(null);
  const [property, setProperty] = useState<Property | null>(null);

  // Sub-action views
  const [actionView, setActionView] = useState<'DETAILS' | 'CONFIRM' | 'RESCHEDULE' | 'REJECT'>('DETAILS');

  // Form states
  const [confirmNote, setConfirmNote] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00 AM - 12:00 PM');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = () => {
    const found = Store.getInspections().find((i) => i.id === inspectionId);
    if (found) {
      setInspection(found);
      const prop = Store.getPropertyById(found.propertyId);
      setProperty(prop || null);

      const tenant = Store.getUserById(found.tenantId);
      setTenantUser(tenant || null);
    }
  };

  useEffect(() => {
    if (isOpen && inspectionId) {
      loadData();
      setActionView('DETAILS');
      setFeedback(null);
    }
  }, [isOpen, inspectionId]);

  useEffect(() => {
    const unsub = subscribeToStore(loadData);
    return unsub;
  }, [inspectionId]);

  if (!isOpen || !inspection) return null;

  // Handlers
  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      Store.confirmInspection(inspection.id, confirmNote.trim() || undefined);
      setFeedback({
        type: 'success',
        text: 'Inspection confirmed successfully! Confirmation notifications dispatched to tenant and landlord/agent.',
      });
      setActionView('DETAILS');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to confirm inspection.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDate) {
      setFeedback({ type: 'error', text: 'Please specify the new inspection date.' });
      return;
    }
    setIsSubmitting(true);
    try {
      Store.rescheduleInspection(
        inspection.id,
        rescheduleDate,
        rescheduleTime,
        rescheduleReason.trim() || undefined
      );
      setFeedback({
        type: 'success',
        text: 'Inspection rescheduled successfully. Updated schedule sent to tenant and landlord/agent.',
      });
      setActionView('DETAILS');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to reschedule inspection.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      Store.declineInspection(inspection.id, rejectionReason.trim() || 'Declined by HOMEZA Operations');
      setFeedback({
        type: 'success',
        text: 'Inspection request rejected. Notification dispatched to tenant.',
      });
      setActionView('DETAILS');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to decline inspection.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeSlots = [
    '09:00 AM - 11:00 AM',
    '11:00 AM - 01:00 PM',
    '01:00 PM - 03:00 PM',
    '03:00 PM - 05:00 PM',
    '05:00 PM - 06:30 PM',
  ];

  return (
    <div
      id="admin-inspection-detail-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
    >
      <div
        id="admin-inspection-detail-card"
        className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden my-4"
      >
        {/* Top Header */}
        <div className="bg-stone-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300">
                  Inspection Request
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                  #{inspection.id.slice(0, 10)}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
                Inspection Request Details
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspection details"
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`px-6 py-3 border-b flex items-center gap-2 text-xs font-bold ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-red-50 text-red-900 border-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Modal Main Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status & Schedule Bar */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Requested Date & Time
                </div>
                <div className="text-sm font-extrabold text-stone-900">
                  {inspection.preferredDate} at {inspection.preferredTime}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-bold text-stone-500">Status:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  inspection.status === 'CONFIRMED'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : inspection.status === 'PENDING'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : inspection.status === 'RESCHEDULED'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : inspection.status === 'COMPLETED'
                    ? 'bg-stone-100 text-stone-800 border-stone-300'
                    : 'bg-red-100 text-red-800 border-red-300'
                }`}
              >
                {inspection.status}
              </span>
            </div>
          </div>

          {/* 1. Tenant Details Card */}
          <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <User className="w-4 h-4 text-purple-700" />
                <span>Tenant Information</span>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                ✓ Verified Account
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-500 block">Full Legal Name:</span>
                <span className="font-bold text-stone-900 text-sm">
                  {tenantUser?.fullName || inspection.tenantName || 'Tenant'}
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">Phone Number:</span>
                <span className="font-bold text-stone-900 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  {tenantUser?.phoneNumber || inspection.tenantPhone || 'Not provided'}
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">Email Address:</span>
                <span className="font-medium text-stone-900 flex items-center gap-1 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  {tenantUser?.email || 'tenant@homeza.ng'}
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">Verification Badges:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-2xs font-semibold">
                    Phone Verified
                  </span>
                  <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-2xs font-semibold">
                    Email Verified
                  </span>
                </div>
              </div>
            </div>

            {inspection.tenantNotes && (
              <div className="pt-2 border-t border-stone-100">
                <span className="text-xs text-stone-500 block mb-0.5 font-medium">Tenant Message / Notes:</span>
                <p className="text-xs text-stone-800 bg-stone-50 p-2.5 rounded-xl italic border border-stone-200/60">
                  "{inspection.tenantNotes}"
                </p>
              </div>
            )}
          </div>

          {/* 2. Property & Host Information */}
          <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <Building2 className="w-4 h-4 text-purple-700" />
                <span>Property & Host Details</span>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Ref: {inspection.propertyId.slice(0, 10)}
              </span>
            </div>

            <div className="flex items-start gap-3.5">
              {property?.images && property.images[0] ? (
                <img
                  src={property.images[0].url}
                  alt={property.title}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="text-sm font-bold text-stone-900 truncate">
                  {property?.title || inspection.propertyTitle || 'HOMEZA Verified Property'}
                </h4>
                <p className="text-xs text-stone-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>
                    {property?.location.area || inspection.propertyArea || 'Uyo'}, {property?.location.city || 'Akwa Ibom'}
                  </span>
                </p>
                {property?.pricing && (
                  <p className="text-xs font-bold text-emerald-800">
                    {formatNaira(property.pricing.rent)} / {property.pricing.rentalPeriod}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100 text-xs">
              <div>
                <span className="text-stone-500 block">Host / Landlord:</span>
                <span className="font-bold text-stone-900">
                  {inspection.landlordName || property?.landlordName || 'Verified Property Owner'}
                </span>
                <span className="text-stone-500 block text-2xs mt-0.5">
                  Phone: {inspection.landlordPhone || property?.landlordPhone || '+234 800 000 0000'}
                </span>
              </div>

              <div>
                <span className="text-stone-500 block">Inspection Fee Status:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-0.5">
                  <CreditCard className="w-3 h-3" />
                  <span>Paid ({formatNaira(inspection.inspectionFee || property?.inspectionFee || property?.pricing?.inspectionFee || 3000)} via Paystack)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Action: Confirm View */}
          {actionView === 'CONFIRM' && (
            <form onSubmit={handleConfirm} className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-3">
              <div className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Confirm this inspection request?</span>
              </div>
              <p className="text-xs text-emerald-800">
                Confirming will lock in the appointment for {inspection.preferredDate} at {inspection.preferredTime} and dispatch SMS & in-app alerts to both the tenant and host.
              </p>
              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-1">
                  Optional Confirmation Instructions / Notes
                </label>
                <textarea
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                  placeholder="e.g. HOMEZA Officer Inemesit will meet the tenant at the gate..."
                  rows={2}
                  className="w-full p-2.5 text-xs bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActionView('DETAILS')}
                  className="px-3.5 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Inspection</span>
                </button>
              </div>
            </form>
          )}

          {/* Sub-Action: Reschedule View */}
          {actionView === 'RESCHEDULE' && (
            <form onSubmit={handleReschedule} className="p-4 rounded-2xl bg-blue-50 border border-blue-300 space-y-3">
              <div className="font-bold text-blue-950 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-700" />
                <span>Reschedule Inspection Request</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-900 mb-1">New Date *</label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-900 mb-1">New Time Slot *</label>
                  <select
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-900 mb-1">
                  Reason for Rescheduling (sent to Tenant)
                </label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Landlord is out of state until Wednesday morning."
                  className="w-full p-2.5 text-xs bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActionView('DETAILS')}
                  className="px-3.5 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Send New Schedule</span>
                </button>
              </div>
            </form>
          )}

          {/* Sub-Action: Reject View */}
          {actionView === 'REJECT' && (
            <form onSubmit={handleReject} className="p-4 rounded-2xl bg-red-50 border border-red-300 space-y-3">
              <div className="font-bold text-red-950 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-700" />
                <span>Are you sure you want to reject this inspection request?</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-red-900 mb-1">
                  Rejection Reason (dispatched to Tenant)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Property has been reserved by another verified tenant."
                  rows={2}
                  className="w-full p-2.5 text-xs bg-white border border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActionView('DETAILS')}
                  className="px-3.5 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject Inspection</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Action Buttons Toolbar */}
        <div className="bg-stone-50 border-t border-stone-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {property && onViewProperty && (
              <button
                type="button"
                id="btn-admin-inspect-view-prop"
                onClick={() => {
                  onClose();
                  onViewProperty(property);
                }}
                className="px-3 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-stone-500" />
                <span>View Property</span>
              </button>
            )}

            {onOpenChatWithTenant && (
              <button
                type="button"
                id="btn-admin-inspect-contact-tenant"
                onClick={() => {
                  onClose();
                  onOpenChatWithTenant(inspection.id);
                }}
                className="px-3 py-2 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Contact Tenant</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {inspection.status === 'PENDING' && actionView === 'DETAILS' && (
              <>
                <button
                  type="button"
                  id="btn-admin-inspect-reject"
                  onClick={() => setActionView('REJECT')}
                  className="px-4 py-2.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl transition cursor-pointer"
                >
                  Reject
                </button>

                <button
                  type="button"
                  id="btn-admin-inspect-reschedule"
                  onClick={() => setActionView('RESCHEDULE')}
                  className="px-4 py-2.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition cursor-pointer"
                >
                  Reschedule
                </button>

                <button
                  type="button"
                  id="btn-admin-inspect-confirm"
                  onClick={() => setActionView('CONFIRM')}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Inspection</span>
                </button>
              </>
            )}

            {inspection.status !== 'PENDING' && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

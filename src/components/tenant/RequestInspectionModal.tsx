import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Info,
  Lock,
  MapPin,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Property, PropertyInspection } from '../../types';
import { Store } from '../../services/store';
import { formatNaira } from '../../config/platform';
import { useAuth } from '../../context/AuthContext';
import { PaymentModal } from '../common/PaymentModal';

interface RequestInspectionModalProps {
  property: Property;
  onClose: () => void;
  onSuccess?: () => void;
  onOpenAuth?: () => void;
}

export const RequestInspectionModal: React.FC<RequestInspectionModalProps> = ({
  property,
  onClose,
  onSuccess,
  onOpenAuth,
}) => {
  const { currentUser } = useAuth();

  // Get tomorrow's date formatted as YYYY-MM-DD
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Quick date presets
  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getDayLabel = (daysAhead: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
  };

  const [preferredDate, setPreferredDate] = useState(getDayLabel(1));
  const [customDate, setCustomDate] = useState(tomorrowStr);
  const [isUsingCustomDate, setIsUsingCustomDate] = useState(false);
  const [preferredTime, setPreferredTime] = useState('11:00 AM - 12:00 PM');
  const [customTime, setCustomTime] = useState('');
  const [isUsingCustomTime, setIsUsingCustomTime] = useState(false);
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState(currentUser?.phoneNumber || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdInspection, setCreatedInspection] = useState<PropertyInspection | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const inspectionFeeAmount =
    (typeof property.inspectionFee === 'number' && property.inspectionFee >= 3000 && property.inspectionFee <= 5000)
      ? property.inspectionFee
      : (typeof property.pricing?.inspectionFee === 'number' && property.pricing.inspectionFee >= 3000 && property.pricing.inspectionFee <= 5000)
      ? property.pricing.inspectionFee
      : 3000;

  const timeSlots = [
    '9:00 AM - 10:00 AM',
    '11:00 AM - 12:00 PM',
    '2:00 PM - 3:00 PM',
    '4:00 PM - 5:00 PM',
  ];

  const datePresets = [
    { label: `Tomorrow (${getDayLabel(1)})`, val: getDayLabel(1) },
    { label: `This Weekend (${getDayLabel(3)})`, val: getDayLabel(3) },
    { label: `Next Week (${getDayLabel(5)})`, val: getDayLabel(5) },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (!phone.trim()) {
      setErrorMsg('Please provide your active phone number for inspection verification.');
      return;
    }

    const finalDate = isUsingCustomDate ? customDate : preferredDate;
    const finalTime = isUsingCustomTime ? customTime || 'Flexible Time' : preferredTime;

    if (!finalDate) {
      setErrorMsg('Please select a preferred inspection date.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const insp = Store.requestInspection({
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocationArea: property.location.area,
        propertyExactAddress: `${property.location.street || ''}, ${property.location.area}, Uyo`,
        propertyPrice: property.pricing.rent,
        propertyImage: property.images[0]?.url,
        tenantId: currentUser.id,
        tenantName: fullName || currentUser.fullName,
        tenantPhone: phone,
        tenantEmail: email || currentUser.email,
        landlordId: property.landlordId,
        landlordName: property.landlordName,
        agentId: property.listingSource === 'AGENT' ? property.submittingAgentId : undefined,
        agentName: property.listingSource === 'AGENT' ? property.submittingAgentName : undefined,
        preferredDate: finalDate,
        preferredTime: finalTime,
        inspectionFee: inspectionFeeAmount,
        notes: notes.trim(),
      });

      setCreatedInspection(insp);
      setIsSubmitting(false);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setErrorMsg('Could not submit inspection request. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div
        id="request-inspection-modal"
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl text-white">
                Request Physical Inspection
              </h3>
              <p className="text-xs text-stone-300">
                Schedule an in-person viewing in {property.location.area}, Uyo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6">
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-2xl font-extrabold text-stone-950">
                Inspection Request Submitted!
              </h4>
              <p className="text-stone-600 text-sm max-w-md mx-auto leading-relaxed">
                Your inspection booking for{' '}
                <strong className="text-stone-900">{property.title}</strong> has been logged with the{' '}
                <strong>HOMEZA Inspection Team</strong> and forwarded to the{' '}
                {property.listingSource === 'AGENT' ? 'verified agent' : 'property landlord'}. A HOMEZA inspection coordinator will facilitate the appointment.
              </p>

              {/* Exact Location Release Policy Reminder */}
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-left space-y-2 text-xs text-emerald-950">
                <div className="font-bold flex items-center gap-1.5 text-sm text-emerald-900">
                  <Lock className="w-4 h-4 text-emerald-700" />
                  <span>HOMEZA Location Protection & Verification</span>
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  As part of HOMEZA's scam-prevention security policy, the exact compound address, street number, and meeting coordinates will be released to you in your dashboard once coordinated and verified for the walkthrough.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  id="btn-proceed-inspection-payment"
                  type="button"
                  onClick={() => setIsPaymentOpen(true)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-3 rounded-xl transition shadow-md cursor-pointer flex items-center justify-center gap-2 text-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Inspection Fee ({formatNaira(inspectionFeeAmount)})</span>
                </button>
                <button
                  id="btn-close-inspection-success"
                  type="button"
                  onClick={() => {
                    if (onSuccess) onSuccess();
                    onClose();
                  }}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold px-6 py-3 rounded-xl transition cursor-pointer text-sm"
                >
                  Pay Later & View Dashboard
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Property Summary Pill */}
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <img
                  src={property.images[0]?.url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300'}
                  alt={property.title}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-stone-900 text-sm truncate">{property.title}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-stone-600 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{property.location.area}, Uyo</span>
                  </div>
                  <div className="font-extrabold text-stone-950 text-sm mt-0.5">
                    {formatNaira(property.pricing.rent)} / {property.pricing.rentalPeriod.toLowerCase()}
                  </div>
                </div>
              </div>

              {/* Step 1: Select Date */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span>1. Choose Preferred Inspection Date</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {datePresets.map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => {
                        setPreferredDate(preset.val);
                        setIsUsingCustomDate(false);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition cursor-pointer ${
                        !isUsingCustomDate && preferredDate === preset.val
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsUsingCustomDate(true)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                      isUsingCustomDate
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                    }`}
                  >
                    Select Specific Calendar Date
                  </button>
                  {isUsingCustomDate && (
                    <input
                      type="date"
                      min={tomorrowStr}
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="text-xs border border-stone-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Step 2: Select Time Slot */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  <span>2. Select Time Window</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        setPreferredTime(slot);
                        setIsUsingCustomTime(false);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer ${
                        !isUsingCustomTime && preferredTime === slot
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Contact Details Verification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="e.g., Emem Bassey"
                    className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">Your Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="+234 800 000 0000"
                    className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Step 4: Notes / Questions */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Special Notes or Things You Want to Inspect (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Want to check borehole water flow, inspect master bedroom, check compound parking space..."
                  className="w-full text-xs sm:text-sm border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Privacy Policy Banner */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Location Release Policy:</strong> To protect privacy, exact street address is not displayed publicly. It will be released directly on your dashboard upon inspection confirmation.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl font-bold text-stone-700 hover:bg-stone-100 transition text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-submit-inspection"
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-3 rounded-xl transition shadow-md text-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting Request...' : 'Confirm Inspection Booking'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {isPaymentOpen && (
        <PaymentModal
          property={property}
          inspectionId={createdInspection?.id}
          amount={inspectionFeeAmount}
          onClose={() => {
            setIsPaymentOpen(false);
            if (onSuccess) onSuccess();
            onClose();
          }}
          onSuccess={() => {
            setIsPaymentOpen(false);
            if (onSuccess) onSuccess();
            onClose();
          }}
        />
      )}
    </div>
  );
};

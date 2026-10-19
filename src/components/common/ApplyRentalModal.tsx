import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, FileCheck, Send, X } from 'lucide-react';
import { Property, RentalApplication } from '../../types';
import { Store } from '../../services/store';
import { useAuth } from '../../context/AuthContext';
import { formatNaira } from '../../config/platform';

interface ApplyRentalModalProps {
  property: Property | null;
  onClose: () => void;
  onSuccess: () => void;
  onOpenAuth?: () => void;
}

export const ApplyRentalModal: React.FC<ApplyRentalModalProps> = ({
  property,
  onClose,
  onSuccess,
  onOpenAuth,
}) => {
  const { currentUser } = useAuth();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [preferredMoveInDate, setPreferredMoveInDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!property) return null;

  // Check for duplicate pending application
  const existingPendingApp = currentUser
    ? Store.getApplicationsByTenant(currentUser.id).find(
        (a) =>
          a.propertyId === property.id &&
          (a.status === 'PENDING_LANDLORD_REVIEW' ||
            a.status === 'PENDING' ||
            a.status === 'INFORMATION_REQUESTED')
      )
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (existingPendingApp) {
      setError('You already have a pending application for this property.');
      return;
    }

    if (!fullName.trim() || !phoneNumber.trim() || !email.trim() || !preferredMoveInDate) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const nowIso = new Date().toISOString();
    const newApplication: RentalApplication = {
      id: 'app-' + Date.now(),
      propertyId: property.id,
      propertyTitle: property.title,
      propertyType: property.propertyType,
      propertyLocation: `${property.location.area}, ${property.location.city}`,
      propertyPrice: property.pricing.rent,
      propertyImage:
        property.images.find((img) => img.isCover)?.url ||
        property.images[0]?.url ||
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&auto=format&fit=crop&q=80',
      landlordId: property.landlordId,
      landlordName: property.landlordName,
      tenantId: currentUser.id,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim(),
      preferredMoveInDate,
      moveInDate: preferredMoveInDate,
      message:
        message.trim() ||
        `I am interested in renting ${property.title} and would like to schedule an inspection.`,
      status: 'PENDING_LANDLORD_REVIEW',
      appliedDate: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setTimeout(() => {
      try {
        Store.addApplication(newApplication);
        setIsSubmitting(false);
        setIsSuccess(true);
      } catch (err) {
        setIsSubmitting(false);
        setError('Action Failed: Something went wrong. Please try again.');
      }
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div
        id="apply-rental-dialog"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Rental Application</h2>
              <p className="text-xs text-stone-500">Apply directly to landlord</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {existingPendingApp ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-stone-900">
              You already have a pending application for this property.
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
              Your rental application for <strong className="text-stone-800">{property.title}</strong> was submitted on{' '}
              {new Date(existingPendingApp.appliedDate).toLocaleDateString('en-NG', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              and is currently awaiting landlord review.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-amber-200/60">
                <span className="text-stone-600">Property:</span>
                <span className="font-bold text-stone-900 text-right truncate max-w-[200px]">
                  {property.title}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-amber-200/60">
                <span className="text-stone-600">Landlord:</span>
                <span className="font-medium text-stone-900">{property.landlordName}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-stone-600">Application Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300">
                  Pending Landlord Review
                </span>
              </div>
            </div>

            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                id="btn-close-dup-app"
                onClick={onClose}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                id="btn-view-existing-application"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-sm cursor-pointer"
              >
                View Existing Application
              </button>
            </div>
          </div>
        ) : isSuccess ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-stone-900">
              Application Submitted Successfully
            </h3>
            <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
              Your rental application has been sent to the landlord for review.
            </p>

            {/* Application Summary Box */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Property:</span>
                <span className="font-bold text-stone-900 text-right truncate max-w-[200px]">
                  {property.title}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Landlord:</span>
                <span className="font-medium text-stone-800">{property.landlordName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Location:</span>
                <span className="font-medium text-stone-800">
                  {property.location.area}, {property.location.city}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Rent:</span>
                <span className="font-bold text-emerald-800">
                  {formatNaira(property.pricing.rent)} / {property.pricing.rentalPeriod.toLowerCase()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-stone-500">Application Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Pending Landlord Review
                </span>
              </div>
            </div>

            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                id="btn-continue-browsing"
                onClick={onClose}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                Continue Browsing
              </button>
              <button
                id="btn-view-my-application"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-sm cursor-pointer"
              >
                View My Application
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Property summary mini card */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center gap-3">
              <img
                src={
                  property.images[0]?.url ||
                  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&auto=format&fit=crop&q=80'
                }
                alt={property.title}
                className="w-16 h-14 object-cover rounded-lg shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-900 truncate">{property.title}</div>
                <div className="text-xs text-stone-500">
                  {property.location.area}, Uyo • Landlord: <strong>{property.landlordName}</strong>
                </div>
                <div className="text-xs font-bold text-emerald-800 mt-0.5">
                  {formatNaira(property.pricing.rent)} / {property.pricing.rentalPeriod.toLowerCase()}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Inputs */}
            <div>
              <label className="block text-base font-bold text-stone-900 mb-1.5">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                id="input-applicant-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Emem Bassey"
                required
                className="w-full text-base font-medium text-stone-900 border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-base font-bold text-stone-900 mb-1.5">
                  Phone Number <span className="text-red-600">*</span>
                </label>
                <input
                  id="input-applicant-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0802 345 6789"
                  required
                  className="w-full text-base font-medium text-stone-900 border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-stone-900 mb-1.5">
                  Email Address <span className="text-red-600">*</span>
                </label>
                <input
                  id="input-applicant-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. emem@example.com"
                  required
                  className="w-full text-base font-medium text-stone-900 border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-base font-bold text-stone-900 mb-1.5">
                Preferred Move-in Date <span className="text-red-600">*</span>
              </label>
              <input
                id="input-applicant-movein"
                type="date"
                value={preferredMoveInDate}
                onChange={(e) => setPreferredMoveInDate(e.target.value)}
                required
                className="w-full text-base font-medium text-stone-900 border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-base font-bold text-stone-900 mb-1.5">
                Short Message to Landlord
              </label>
              <textarea
                id="input-applicant-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Introduce yourself, your occupation, and when you would like to inspect the property..."
                className="w-full text-base font-medium text-stone-900 border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none bg-white"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 text-base font-semibold text-stone-700 hover:bg-stone-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-submit-rental-app"
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base px-6 py-3 rounded-xl transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Application'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};


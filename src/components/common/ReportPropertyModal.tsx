import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Flag, X } from 'lucide-react';
import { Property, PropertyReport, ReportReason } from '../../types';
import { Store } from '../../services/store';
import { useAuth } from '../../context/AuthContext';

interface ReportPropertyModalProps {
  property: Property | null;
  onClose: () => void;
  onOpenAuth?: () => void;
}

const REPORT_REASONS: ReportReason[] = [
  'Fake property',
  'Wrong information',
  'Property unavailable',
  'Misleading pictures/videos',
  'Suspicious landlord',
  'Other',
];

export const ReportPropertyModal: React.FC<ReportPropertyModalProps> = ({
  property,
  onClose,
  onOpenAuth,
}) => {
  const { currentUser } = useAuth();
  const [reason, setReason] = useState<ReportReason>('Wrong information');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!property) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (!details.trim()) {
      setError('Please provide a brief explanation of the issue.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const newReport: PropertyReport = {
      id: 'rep-' + Date.now(),
      propertyId: property.id,
      propertyTitle: property.title,
      propertyLocation: `${property.location.area}, ${property.location.city}`,
      reportedByUserId: currentUser.id,
      reportedByUserName: currentUser.fullName,
      reportedByUserEmail: currentUser.email,
      reason,
      details: details.trim(),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    setTimeout(() => {
      Store.addReport(newReport);
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div
        id="report-property-dialog"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-red-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Report Property Listing</h2>
              <p className="text-xs text-stone-500">Report inaccuracies, scams, or unavailable units</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Report Received</h3>
            <p className="text-sm text-stone-600 max-w-sm mx-auto leading-relaxed">
              Thank you for keeping the Uyo community safe. Our administrative team will review this listing
              promptly.
            </p>
            <button
              onClick={onClose}
              className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
              <span className="font-semibold text-stone-700">Property: </span>
              <span className="text-stone-900 font-bold">{property.title}</span>
              <div className="text-stone-500 mt-0.5">{property.location.area}, Uyo</div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Reason for Reporting <span className="text-red-500">*</span>
              </label>
              <select
                id="select-report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                className="w-full text-base sm:text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px] cursor-pointer"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Additional Details / Evidence <span className="text-red-500">*</span>
              </label>
              <textarea
                id="input-report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                placeholder="Explain what is incorrect or suspicious about this listing..."
                required
                className="w-full text-sm border border-stone-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                id="btn-submit-report"
                type="submit"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

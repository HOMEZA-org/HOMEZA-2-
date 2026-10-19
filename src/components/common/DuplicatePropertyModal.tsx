import React from 'react';
import {
  AlertTriangle,
  Building2,
  Copy,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  ShieldAlert,
  X,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { Property } from '../../types';
import { formatNaira } from '../../config/platform';
import { DuplicateDetectionResult } from '../../utils/duplicateDetection';

interface DuplicatePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DuplicateDetectionResult | null;
  onViewExistingListing?: (property: Property) => void;
  onConfirmProceedAnyway?: () => void;
}

export const DuplicatePropertyModal: React.FC<DuplicatePropertyModalProps> = ({
  isOpen,
  onClose,
  result,
  onViewExistingListing,
  onConfirmProceedAnyway,
}) => {
  if (!isOpen || !result || !result.isDuplicate) return null;

  const isBlocked = result.confidence === 'HIGH';
  const matched = result.matchedProperty;

  return (
    <div
      id="duplicate-property-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
    >
      <div
        id="duplicate-property-modal-card"
        className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div
          className={`px-6 py-5 border-b flex items-center justify-between ${
            isBlocked ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl text-white ${
                isBlocked ? 'bg-red-600' : 'bg-amber-600'
              }`}
            >
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900">
                {isBlocked ? 'Possible Duplicate Property' : 'Similar Property Detected'}
              </h3>
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isBlocked
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {isBlocked ? 'Listing Blocked (High Confidence)' : 'Review Recommended'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close duplicate alert"
            className="w-8 h-8 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* Exact Text Requirements */}
          <div className="space-y-2">
            <p className="text-sm sm:text-base text-stone-800 leading-relaxed font-medium">
              {isBlocked
                ? '«This property appears to have already been listed on HOMEZA. Please check the existing listing before submitting it again.»'
                : '«This property appears similar to an existing listing on HOMEZA. Please confirm that this is a different property before continuing.»'}
            </p>

            {result.exactImageMatch && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <ImageIcon className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-amber-900">Image Already Used</div>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    «One or more of the images you uploaded appear to have already been used for another property listing on HOMEZA.»
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Matched Property Summary Card */}
          {matched && (
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center justify-between">
                <span>Existing Matching Listing</span>
                <span className="text-stone-700 font-mono">ID: {matched.id.slice(0, 10)}...</span>
              </div>

              <div className="flex items-start gap-3.5">
                {matched.images && matched.images[0] ? (
                  <img
                    src={matched.images[0].url}
                    alt={matched.title}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-sm font-bold text-stone-900 truncate">{matched.title}</h4>
                  <p className="text-xs text-stone-600">
                    {matched.location.area}, {matched.location.city} • {matched.propertyType}
                  </p>
                  <p className="text-xs font-bold text-emerald-800">
                    {formatNaira(matched.pricing.rent)} / {matched.pricing.rentalPeriod}
                  </p>
                </div>
              </div>

              {/* Reasons Detected */}
              {result.reasons.length > 0 && (
                <div className="pt-2 border-t border-stone-200">
                  <div className="text-xs font-bold text-stone-700 mb-1.5">Matched Signals:</div>
                  <ul className="space-y-1">
                    {result.reasons.map((r, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-stone-600 flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              id="btn-duplicate-modal-back"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>

            {matched && onViewExistingListing && (
              <button
                type="button"
                id="btn-duplicate-modal-view"
                onClick={() => {
                  onClose();
                  onViewExistingListing(matched);
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Eye className="w-4 h-4" />
                <span>View Existing Listing</span>
              </button>
            )}

            {!isBlocked && onConfirmProceedAnyway && (
              <button
                type="button"
                id="btn-duplicate-modal-proceed"
                onClick={() => {
                  onClose();
                  onConfirmProceedAnyway();
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Submit</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

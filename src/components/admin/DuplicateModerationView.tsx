import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  FileCheck2,
  HelpCircle,
  MapPin,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Property, DuplicateReviewDecision } from '../../types';
import { formatNaira } from '../../config/platform';
import { Store } from '../../services/store';

interface DuplicateModerationViewProps {
  properties: Property[];
  onViewProperty: (property: Property) => void;
}

export const DuplicateModerationView: React.FC<DuplicateModerationViewProps> = ({
  properties,
  onViewProperty,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filter properties with duplicate flags
  const flaggedProperties = properties.filter((p) => {
    const hasDuplicateFlag =
      p.isPossibleDuplicate === true ||
      (p.duplicateScore && p.duplicateScore > 0) ||
      (p.duplicateMatches && p.duplicateMatches.length > 0);

    if (!hasDuplicateFlag) return false;

    if (filter === 'PENDING') {
      return !p.duplicateDecision || p.duplicateDecision === 'PENDING';
    }
    if (filter === 'RESOLVED') {
      return p.duplicateDecision && p.duplicateDecision !== 'PENDING';
    }
    return true;
  });

  const searchedProperties = flaggedProperties.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.location.area.toLowerCase().includes(q) ||
      p.landlordName.toLowerCase().includes(q) ||
      (p.submittingAgentName && p.submittingAgentName.toLowerCase().includes(q))
    );
  });

  const handleDecision = (
    prop: Property,
    decision: 'CONFIRMED_DUPLICATE' | 'DISMISSED' | 'CLARIFICATION_REQUESTED'
  ) => {
    Store.reviewDuplicateFlag(prop.id, decision, decisionNotes.trim(), 'Admin Moderator');
    setActionSuccess(
      decision === 'CONFIRMED_DUPLICATE'
        ? `Listing "${prop.title}" confirmed as duplicate and marked REJECTED.`
        : decision === 'DISMISSED'
        ? `Duplicate flag dismissed for "${prop.title}".`
        : `Clarification requested for "${prop.title}".`
    );
    setSelectedProperty(null);
    setDecisionNotes('');
    setTimeout(() => setActionSuccess(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Copy className="w-5 h-5 text-amber-600" />
            <h2 className="text-xl font-bold text-stone-900">Duplicate Listing Moderation</h2>
            <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2.5 py-0.5 rounded-full">
              {flaggedProperties.filter((p) => !p.duplicateDecision || p.duplicateDecision === 'PENDING').length} Pending
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Automated duplicate detection flags listings with high visual or structural similarity to prevent spam, agent re-listing, and stale duplicates.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          {(['ALL', 'PENDING', 'RESOLVED'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filter === mode
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200'
              }`}
            >
              {mode === 'ALL'
                ? `All Flags (${flaggedProperties.length})`
                : mode === 'PENDING'
                ? 'Pending Review'
                : 'Resolved'}
            </button>
          ))}
        </div>
      </div>

      {/* Action Notification */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by title, landlord, agent, or area..."
          className="w-full sm:max-w-md pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
        />
      </div>

      {/* Flagged Listings Grid */}
      {searchedProperties.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-sm max-w-md mx-auto">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-900 mb-1">No Duplicate Flags Found</h3>
          <p className="text-xs text-stone-600">
            {filter === 'PENDING'
              ? 'All flagged listings have been reviewed and resolved.'
              : 'There are currently no listings matching the selected filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {searchedProperties.map((prop) => {
            const matches = prop.duplicateMatches || [];
            const primaryMatch = matches[0];
            const matchedProperty = primaryMatch ? Store.getPropertyById(primaryMatch.matchingPropertyId) : null;
            const score = prop.duplicateScore || (primaryMatch ? primaryMatch.similarityScore : 65);
            const isResolved = prop.duplicateDecision && prop.duplicateDecision !== 'PENDING';

            return (
              <div
                key={prop.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4 hover:border-amber-300 transition"
              >
                {/* Flag Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        score >= 80
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {score}%
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-stone-900">
                          {score >= 80 ? 'High Duplicate Probability' : 'Possible Duplicate Listing'}
                        </span>
                        {isResolved ? (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              prop.duplicateDecision === 'CONFIRMED_DUPLICATE'
                                ? 'bg-red-100 text-red-800'
                                : prop.duplicateDecision === 'DISMISSED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {prop.duplicateDecision?.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full animate-pulse">
                            Awaiting Moderator Action
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Flagged on submission: {new Date(prop.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onViewProperty(prop)}
                      className="text-xs font-semibold text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Listing</span>
                    </button>
                  </div>
                </div>

                {/* Comparison Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Listing */}
                  <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider bg-amber-100 px-2 py-0.5 rounded">
                        New / Flagged Listing
                      </span>
                      <span className="text-xs font-bold text-emerald-800">
                        {formatNaira(prop.pricing.rent)} / {prop.pricing.rentalPeriod.toLowerCase()}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-stone-900">{prop.title}</div>

                    <div className="flex items-center gap-1 text-xs text-stone-600">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{prop.location.area}, Uyo</span>
                    </div>

                    <div className="text-xs text-stone-500 flex items-center gap-3">
                      <span>{prop.bedrooms} Bed • {prop.bathrooms} Bath</span>
                      <span>Type: {prop.propertyType}</span>
                    </div>

                    <div className="text-xs text-stone-600 pt-1 border-t border-stone-200 flex items-center justify-between">
                      <span>Submitted by: <strong>{prop.listingSource === 'AGENT' ? `Agent: ${prop.submittingAgentName}` : `Landlord: ${prop.landlordName}`}</strong></span>
                    </div>
                  </div>

                  {/* Matched Property */}
                  {matchedProperty ? (
                    <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider bg-stone-200 px-2 py-0.5 rounded">
                          Existing / Matched Listing
                        </span>
                        <span className="text-xs font-bold text-emerald-800">
                          {formatNaira(matchedProperty.pricing.rent)} / {matchedProperty.pricing.rentalPeriod.toLowerCase()}
                        </span>
                      </div>

                      <div className="font-bold text-sm text-stone-900">{matchedProperty.title}</div>

                      <div className="flex items-center gap-1 text-xs text-stone-600">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{matchedProperty.location.area}, Uyo</span>
                      </div>

                      <div className="text-xs text-stone-500 flex items-center gap-3">
                        <span>{matchedProperty.bedrooms} Bed • {matchedProperty.bathrooms} Bath</span>
                        <span>Type: {matchedProperty.propertyType}</span>
                      </div>

                      <div className="text-xs text-stone-600 pt-1 border-t border-stone-200 flex items-center justify-between">
                        <span>Listed by: <strong>{matchedProperty.listingSource === 'AGENT' ? `Agent: ${matchedProperty.submittingAgentName}` : `Landlord: ${matchedProperty.landlordName}`}</strong></span>
                        <button
                          type="button"
                          onClick={() => onViewProperty(matchedProperty)}
                          className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Compare</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 flex flex-col justify-center text-center">
                      <p className="text-xs text-stone-600 font-semibold">Matched Listing Details</p>
                      <p className="text-xs text-stone-500 mt-1">
                        {primaryMatch ? `Property ID: ${primaryMatch.matchingPropertyId} (${primaryMatch.matchingPropertyTitle})` : 'Structural and pricing duplicate detected during submission verification.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Similarity Reasons */}
                {primaryMatch && primaryMatch.matchingReasons && primaryMatch.matchingReasons.length > 0 && (
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
                    <span className="font-bold text-amber-900">Duplicate Matching Factors:</span>
                    <ul className="list-disc list-inside text-stone-700 space-y-0.5 pl-1">
                      {primaryMatch.matchingReasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Moderator Controls */}
                {!isResolved && (
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Optional moderator notes / instructions to submitter..."
                        value={selectedProperty?.id === prop.id ? decisionNotes : ''}
                        onChange={(e) => {
                          setSelectedProperty(prop);
                          setDecisionNotes(e.target.value);
                        }}
                        className="w-full text-xs px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleDecision(prop, 'DISMISSED')}
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Dismiss Flag (Valid)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDecision(prop, 'CONFIRMED_DUPLICATE')}
                        className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Confirm Duplicate (Reject)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Decision History Notes */}
                {isResolved && prop.duplicateDecisionNotes && (
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-600">
                    <span className="font-semibold text-stone-800">Moderator Resolution Note:</span>{' '}
                    {prop.duplicateDecisionNotes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

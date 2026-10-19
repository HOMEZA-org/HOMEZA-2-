import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Eye,
  FileCheck,
  HelpCircle,
  Info,
  MapPin,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { Property, PropertyStatus } from '../../types';
import { formatNaira } from '../../config/platform';
import { Store } from '../../services/store';

interface PropertiesManagementViewProps {
  properties: Property[];
  onViewProperty: (property: Property) => void;
  onReviewProperty?: (property: Property) => void;
}

export const PropertiesManagementView: React.FC<PropertiesManagementViewProps> = ({
  properties,
  onViewProperty,
  onReviewProperty,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [rejectModalProp, setRejectModalProp] = useState<Property | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [correctionModalProp, setCorrectionModalProp] = useState<Property | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');

  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'APPROVE' | 'REJECT' | 'CORRECTION';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'APPROVE',
  });

  const filteredProperties = properties.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.location.area.toLowerCase().includes(q) ||
        p.landlordName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleApproveProperty = (prop: Property) => {
    Store.approveProperty(prop.id);
    setFeedbackModal({
      isOpen: true,
      title: 'Property Approved Successfully!',
      message: `"${prop.title}" is now verified and live on the public tenant marketplace. The landlord has been notified.`,
      type: 'APPROVE',
    });
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalProp || !rejectionReason.trim()) return;
    Store.rejectProperty(rejectModalProp.id, rejectionReason.trim());
    const title = rejectModalProp.title;
    setRejectModalProp(null);
    setRejectionReason('');
    setFeedbackModal({
      isOpen: true,
      title: 'Property Listing Rejected',
      message: `"${title}" has been marked as REJECTED. The landlord has received notification with your feedback.`,
      type: 'REJECT',
    });
  };

  const handleConfirmCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionModalProp || !correctionNote.trim()) return;
    Store.requestPropertyCorrection(correctionModalProp.id, correctionNote.trim());
    const title = correctionModalProp.title;
    setCorrectionModalProp(null);
    setCorrectionNote('');
    setFeedbackModal({
      isOpen: true,
      title: 'Correction Request Sent',
      message: `The landlord for "${title}" has been notified to modify and re-submit the listing.`,
      type: 'CORRECTION',
    });
  };

  const handleDelete = (propertyId: string, title: string) => {
    if (window.confirm(`Permanently remove listing "${title}" from the platform?`)) {
      Store.deleteProperty(propertyId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Property Moderation & Verification</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Audit, verify, approve, and moderate rental listings before they appear with verified status to tenants.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, area, landlord..."
              className="text-xs border border-stone-300 rounded-xl pl-8 pr-3 py-2 bg-white w-56 sm:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 text-xs overflow-x-auto max-w-full">
            {[
              { id: 'ALL', label: `All (${properties.length})` },
              { id: 'PENDING_REVIEW', label: 'Pending Review' },
              { id: 'CORRECTION_REQUIRED', label: 'Correction Required' },
              { id: 'AVAILABLE', label: 'Available' },
              { id: 'RENTED', label: 'Rented' },
              { id: 'REJECTED', label: 'Rejected' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  statusFilter === st.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Property</th>
                <th className="py-3.5 px-4">Submitter / Landlord</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Rent</th>
                <th className="py-3.5 px-4">Inspection Fee</th>
                <th className="py-3.5 px-4">Status & Badge</th>
                <th className="py-3.5 px-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProperties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No properties match your filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredProperties.map((prop) => {
                  const isAgentListing = prop.listingSource === 'AGENT' || !!prop.submittingAgentId;
                  return (
                    <tr key={prop.id} className="hover:bg-stone-50/50 transition">
                      {/* Property */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              prop.images[0]?.url ||
                              'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&auto=format&fit=crop&q=80'
                            }
                            alt={prop.title}
                            className="w-12 h-10 object-cover rounded-lg shrink-0 border border-stone-200"
                          />
                          <div className="min-w-0 max-w-xs">
                            <div className="font-bold text-stone-900 text-xs truncate">{prop.title}</div>
                            <div className="text-[11px] text-stone-500">
                              {prop.bedrooms} Bed • {prop.propertyType}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Landlord / Submitter */}
                      <td className="py-3.5 px-4">
                        {isAgentListing ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-purple-100 text-purple-800 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                                Agent
                              </span>
                              <span className="font-semibold text-stone-900 text-xs">
                                {prop.submittingAgentName || 'Verified Agent'}
                              </span>
                            </div>
                            {prop.submittingAgentAgency && (
                              <div className="text-[10px] text-purple-900 font-medium">
                                {prop.submittingAgentAgency}
                              </div>
                            )}
                            <div className="text-stone-400 text-[10px]">
                              Owner: {prop.landlordName}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-stone-100 text-stone-700 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                                Landlord
                              </span>
                              <span className="font-semibold text-stone-800 text-xs">
                                {prop.landlordName}
                              </span>
                            </div>
                            <div className="text-stone-500 text-[11px]">{prop.landlordPhone}</div>
                          </div>
                        )}
                      </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-stone-700">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{prop.location.area}, Uyo</span>
                      </div>
                    </td>

                    {/* Rent */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-emerald-800">{formatNaira(prop.pricing.rent)}</div>
                      <div className="text-[10px] text-stone-400">{prop.pricing.rentalPeriod}</div>
                    </td>

                    {/* Inspection Fee */}
                    <td className="py-3.5 px-4">
                      {(() => {
                        const fee = prop.inspectionFee ?? prop.pricing?.inspectionFee;
                        const isMissing = fee === undefined || fee === null || (fee as any) === '';
                        const feeNum = Number(fee);
                        const isInvalid = isMissing || isNaN(feeNum) || feeNum < 3000 || feeNum > 5000;
                        if (isInvalid) {
                          return (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3 text-amber-700" />
                                <span>Missing / Out of Range</span>
                              </span>
                              <div className="text-[10px] text-stone-500">
                                {isMissing ? 'Requires ₦3k–₦5k' : `${formatNaira(feeNum)} (must be ₦3,000–₦5,000)`}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-stone-900 text-xs">{formatNaira(feeNum)}</div>
                            <span className="inline-block text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Lister Configured
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Status & Verification */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            prop.status === 'AVAILABLE' || prop.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : prop.status === 'RENTED'
                              ? 'bg-stone-100 text-stone-700 border border-stone-300'
                              : prop.status === 'CORRECTION_REQUIRED'
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : prop.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {prop.status}
                        </span>

                        {prop.isVerified ? (
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verified Listing</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] text-stone-400">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Unverified</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Moderation Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* If pending review and onReviewProperty exists, show prominent Review button */}
                        {prop.status === 'PENDING_REVIEW' && onReviewProperty && (
                          <button
                            id={`btn-table-review-${prop.id}`}
                            onClick={() => onReviewProperty(prop)}
                            className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Open full admin review modal"
                          >
                            <FileCheck className="w-3 h-3" />
                            <span>Review</span>
                          </button>
                        )}

                        <button
                          onClick={() => onViewProperty(prop)}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                          title="View listing details"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>

                        {/* Approve Button */}
                        {prop.status !== 'AVAILABLE' && prop.status !== 'APPROVED' && (
                          <button
                            id={`btn-admin-approve-${prop.id}`}
                            onClick={() => handleApproveProperty(prop)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Approve & Verify Listing"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                        )}

                        {/* Request Correction */}
                        {prop.status !== 'CORRECTION_REQUIRED' && (
                          <button
                            id={`btn-admin-correct-${prop.id}`}
                            onClick={() => {
                              setCorrectionModalProp(prop);
                              setCorrectionNote(prop.adminCorrectionNote || '');
                            }}
                            className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-[11px] font-semibold transition border border-orange-200 cursor-pointer"
                            title="Request changes from landlord"
                          >
                            <span>Correction</span>
                          </button>
                        )}

                        {/* Reject */}
                        {prop.status !== 'REJECTED' && (
                          <button
                            id={`btn-admin-reject-${prop.id}`}
                            onClick={() => {
                              setRejectModalProp(prop);
                              setRejectionReason(prop.adminRejectionReason || '');
                            }}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-semibold transition border border-red-200 cursor-pointer"
                            title="Reject listing"
                          >
                            <span>Reject</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(prop.id, prop.title)}
                          className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete listing"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* REJECTION REASON MODAL */}
      {rejectModalProp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-red-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-700" />
                <h3 className="font-bold text-stone-900 text-base">Reject Property Listing</h3>
              </div>
              <button
                onClick={() => setRejectModalProp(null)}
                className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="p-6 space-y-4">
              <p className="text-xs text-stone-600 leading-relaxed">
                Provide a reason for rejecting <strong className="text-stone-900">{rejectModalProp.title}</strong> submitted by <strong className="text-stone-900">{rejectModalProp.landlordName}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  placeholder="e.g. Inaccurate location landmarks, blurred photos, or suspicious contact details."
                  required
                  className="w-full text-xs border border-stone-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-600 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRejectModalProp(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                >
                  Reject Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST CORRECTION MODAL */}
      {correctionModalProp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-orange-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-700" />
                <h3 className="font-bold text-stone-900 text-base">Request Property Correction</h3>
              </div>
              <button
                onClick={() => setCorrectionModalProp(null)}
                className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCorrection} className="p-6 space-y-4">
              <p className="text-xs text-stone-600 leading-relaxed">
                Specify what changes <strong className="text-stone-900">{correctionModalProp.landlordName}</strong> needs to make before <strong className="text-stone-900">{correctionModalProp.title}</strong> can be approved.
              </p>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Required Changes & Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  rows={4}
                  placeholder="e.g. Please upload high-resolution photos of the living room and bathroom, and clarify total caution deposit."
                  required
                  className="w-full text-xs border border-stone-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-600 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCorrectionModalProp(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                >
                  Send Correction Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FEEDBACK SUCCESS MODAL */}
      {feedbackModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 p-6 text-center space-y-4">
            <div
              className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
                feedbackModal.type === 'APPROVE'
                  ? 'bg-emerald-100 text-emerald-700'
                  : feedbackModal.type === 'REJECT'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-orange-100 text-orange-700'
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
            <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
              {feedbackModal.message}
            </p>

            <div className="pt-2">
              <button
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

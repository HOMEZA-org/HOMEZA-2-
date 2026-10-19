import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  FileCheck,
  FileText,
  MapPin,
  Plus,
  PlusCircle,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { AgentUser, LocationArea, Property, PropertyStatus } from '../../types';
import { formatNaira } from '../../config/platform';
import { AddEditPropertyModal } from '../landlord/AddEditPropertyModal';
import { KYCRequirementModal } from '../kyc/KYCRequirementModal';
import { Store } from '../../services/store';

interface AgentListingsViewProps {
  agent: AgentUser;
  properties: Property[];
  locations: LocationArea[];
  onViewProperty: (property: Property) => void;
  onNavigateToKYC?: () => void;
}

export const AgentListingsView: React.FC<AgentListingsViewProps> = ({
  agent,
  properties,
  locations,
  onViewProperty,
  onNavigateToKYC,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);

  // Check Agent KYC status
  const kycApplication = useMemo(() => {
    return Store.getKYCApplicationByUserId(agent.id);
  }, [agent.id]);

  const effectiveVerificationStatus = agent.verificationStatus || kycApplication?.status || 'NOT_SUBMITTED';
  const isKYCApproved = effectiveVerificationStatus === 'VERIFIED' || effectiveVerificationStatus === 'APPROVED';

  const kycState: 'NOT_STARTED' | 'PENDING' | 'REJECTED' | 'CORRECTION_REQUIRED' = useMemo(() => {
    if (effectiveVerificationStatus === 'PENDING' || effectiveVerificationStatus === 'UNDER_REVIEW') return 'PENDING';
    if (effectiveVerificationStatus === 'REJECTED') return 'REJECTED';
    if (effectiveVerificationStatus === 'CORRECTION_REQUIRED') return 'CORRECTION_REQUIRED';
    return 'NOT_STARTED';
  }, [effectiveVerificationStatus]);

  // Filter properties submitted by this agent
  const agentProperties = useMemo(() => {
    return properties.filter((p) => {
      return (
        (p.listingSource === 'AGENT' && p.submittingAgentId === agent.id) ||
        p.submittingAgentId === agent.id
      );
    });
  }, [properties, agent.id]);

  // Filtered by status and search query
  const filteredProperties = useMemo(() => {
    return agentProperties.filter((p) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'LIVE' && p.status !== 'AVAILABLE' && p.status !== 'APPROVED') return false;
        if (statusFilter === 'PENDING' && p.status !== 'PENDING_REVIEW') return false;
        if (statusFilter === 'CORRECTION' && p.status !== 'CORRECTION_REQUIRED') return false;
        if (statusFilter === 'REJECTED' && p.status !== 'REJECTED') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.location.area.toLowerCase().includes(q) ||
          p.landlordName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [agentProperties, statusFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: agentProperties.length,
      live: agentProperties.filter((p) => p.status === 'AVAILABLE' || p.status === 'APPROVED').length,
      pending: agentProperties.filter((p) => p.status === 'PENDING_REVIEW').length,
      correction: agentProperties.filter((p) => p.status === 'CORRECTION_REQUIRED').length,
      rejected: agentProperties.filter((p) => p.status === 'REJECTED').length,
    };
  }, [agentProperties]);

  const handleOpenAdd = () => {
    if (!isKYCApproved) {
      setShowKYCModal(true);
      return;
    }
    setPropertyToEdit(null);
    setIsAddModalOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEdit = (prop: Property) => {
    setPropertyToEdit(prop);
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900">Agent Property Listings</h2>
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {agentProperties.length} Total
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Submit, track, and manage rental listings representing property owners in Uyo.
            All listings undergo admin moderation and verification before appearing live to tenants.
          </p>
        </div>

        <button
          id="btn-agent-add-property"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl transition shadow-sm cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add Property Listing</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-purple-50 border-purple-300 shadow-xs'
              : 'bg-white border-stone-200 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>All Submissions</span>
            <Building2 className="w-4 h-4 text-purple-700" />
          </div>
          <p className="text-2xl font-black text-stone-900">{counts.all}</p>
        </div>

        <div
          onClick={() => setStatusFilter('LIVE')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'LIVE'
              ? 'bg-emerald-50 border-emerald-300 shadow-xs'
              : 'bg-white border-stone-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>Verified & Live</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800">{counts.live}</p>
        </div>

        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'PENDING'
              ? 'bg-amber-50 border-amber-300 shadow-xs'
              : 'bg-white border-stone-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-800">{counts.pending}</p>
        </div>

        <div
          onClick={() => setStatusFilter('CORRECTION')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'CORRECTION'
              ? 'bg-orange-50 border-orange-300 shadow-xs'
              : 'bg-white border-stone-200 hover:border-orange-200'
          }`}
        >
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>Correction Needed</span>
            <AlertCircle className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-black text-orange-800">{counts.correction}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, location area, owner..."
            className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 text-xs overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: `All (${counts.all})` },
            { id: 'PENDING', label: `Pending (${counts.pending})` },
            { id: 'LIVE', label: `Live (${counts.live})` },
            { id: 'CORRECTION', label: `Correction (${counts.correction})` },
            { id: 'REJECTED', label: `Rejected (${counts.rejected})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                statusFilter === f.id
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Property Listings Feed */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-700 mx-auto flex items-center justify-center">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">No properties found</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              {agentProperties.length === 0
                ? "You haven't submitted any property listings yet. Click 'Add Property Listing' to submit your first property for admin verification."
                : 'No property matches your search or active filter.'}
            </p>
          </div>
          {agentProperties.length === 0 && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Property Listing</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredProperties.map((prop) => {
            const isPending = prop.status === 'PENDING_REVIEW';
            const isLive = prop.status === 'AVAILABLE' || prop.status === 'APPROVED';
            const isCorrection = prop.status === 'CORRECTION_REQUIRED';
            const isRejected = prop.status === 'REJECTED';

            return (
              <div
                key={prop.id}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col"
              >
                {/* Image & Status Overlay */}
                <div className="relative h-48 bg-stone-100">
                  <img
                    src={
                      prop.images[0]?.url ||
                      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80'
                    }
                    alt={prop.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-transparent" />

                  {/* Badges on Image */}
                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                    <span className="bg-purple-900/90 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full backdrop-blur-xs">
                      AGENT LISTING
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    {isLive && (
                      <span className="bg-emerald-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-xs shadow-xs">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Live & Verified</span>
                      </span>
                    )}
                    {isPending && (
                      <span className="bg-amber-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-xs shadow-xs">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending Admin Review</span>
                      </span>
                    )}
                    {isCorrection && (
                      <span className="bg-orange-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-xs shadow-xs animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Correction Required</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="bg-red-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-xs shadow-xs">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="text-xs font-semibold text-emerald-300">
                      {formatNaira(prop.pricing.rent)}{' '}
                      <span className="text-[10px] text-stone-300">/ {prop.pricing.rentalPeriod}</span>
                    </p>
                    <h3 className="font-bold text-sm text-white truncate">{prop.title}</h3>
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <div className="flex items-center gap-1 text-stone-700 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{prop.location.area}, Uyo</span>
                      </div>
                      <span className="text-[11px] font-semibold text-stone-600">
                        {prop.bedrooms} Bed • {prop.propertyType}
                      </span>
                    </div>

                    <div className="text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 flex items-center justify-between">
                      <span className="text-stone-500">Represented Owner:</span>
                      <span className="font-bold text-stone-800">{prop.landlordName}</span>
                    </div>

                    <div className="text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 flex items-center justify-between">
                      <span className="text-stone-500">Inspection Fee:</span>
                      <span className="font-extrabold text-stone-900">
                        {formatNaira(prop.inspectionFee || prop.pricing?.inspectionFee || 3000)}
                      </span>
                    </div>

                    {/* Correction Notice Box */}
                    {isCorrection && prop.adminCorrectionNote && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-orange-900 font-bold">
                          <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                          <span>Admin Correction Instructions:</span>
                        </div>
                        <p className="text-stone-700 leading-relaxed text-[11px]">
                          {prop.adminCorrectionNote}
                        </p>
                      </div>
                    )}

                    {/* Rejection Notice Box */}
                    {isRejected && prop.adminRejectionReason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-red-900 font-bold">
                          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>Rejection Reason:</span>
                        </div>
                        <p className="text-stone-700 leading-relaxed text-[11px]">
                          {prop.adminRejectionReason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onViewProperty(prop)}
                      className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Details</span>
                    </button>

                    {isCorrection && (
                      <button
                        onClick={() => handleOpenEdit(prop)}
                        className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Fix & Resubmit</span>
                      </button>
                    )}

                    {!isCorrection && (
                      <button
                        onClick={() => handleOpenEdit(prop)}
                        className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Property Modal */}
      {isAddModalOpen && (
        <AddEditPropertyModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setPropertyToEdit(null);
          }}
          agent={agent}
          propertyToEdit={propertyToEdit}
          locations={locations}
          onSuccess={() => {
            setIsAddModalOpen(false);
            setPropertyToEdit(null);
          }}
        />
      )}

      {/* KYC Requirement Modal */}
      {showKYCModal && (
        <KYCRequirementModal
          isOpen={showKYCModal}
          onClose={() => setShowKYCModal(false)}
          role="AGENT"
          userRole="AGENT"
          kycState={kycState}
          fullName={agent.fullName}
          adminNote={agent.adminCorrectionNote || agent.adminRejectionReason}
          onNavigateToKYC={() => {
            setShowKYCModal(false);
            if (onNavigateToKYC) {
              onNavigateToKYC();
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
};

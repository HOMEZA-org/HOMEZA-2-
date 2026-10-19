import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  History,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import {
  AgentUser,
  LandlordUser,
  PendingReviewItem,
  Property,
  ReviewAuditLog,
  User as UserType,
} from '../../types';
import { Store } from '../../services/store';
import { formatNaira } from '../../config/platform';
import { AdminPropertyReviewModal } from './AdminPropertyReviewModal';
import { AdminLandlordReviewModal } from './AdminLandlordReviewModal';

interface AdminPendingReviewsViewProps {
  properties: Property[];
  users: UserType[];
  onViewProperty?: (property: Property) => void;
  initialSelectedType?: 'ALL' | 'PROPERTY' | 'KYC_AGENT' | 'KYC_LANDLORD';
  initialTargetId?: string | null;
}

export const AdminPendingReviewsView: React.FC<AdminPendingReviewsViewProps> = ({
  properties,
  users,
  onViewProperty,
  initialSelectedType = 'ALL',
  initialTargetId = null,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'PROPERTY' | 'KYC_AGENT' | 'KYC_LANDLORD' | 'AUDIT_LOGS'>(
    initialSelectedType
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Review Modals
  const [selectedPropertyForReview, setSelectedPropertyForReview] = useState<Property | null>(null);
  const [selectedLandlordForReview, setSelectedLandlordForReview] = useState<LandlordUser | null>(null);

  // Agent Review Modal state
  const [selectedAgentForReview, setSelectedAgentForReview] = useState<AgentUser | null>(null);
  const [agentActionType, setAgentActionType] = useState<'APPROVE' | 'REJECT' | 'CORRECTION' | null>(null);
  const [agentActionNote, setAgentActionNote] = useState('');
  const [isProcessingAgent, setIsProcessingAgent] = useState(false);

  // Live reviews from store
  const [pendingItems, setPendingItems] = useState<PendingReviewItem[]>(() => Store.getPendingReviewItems());
  const [auditLogs, setAuditLogs] = useState<ReviewAuditLog[]>(() => Store.getReviewAudits());

  useEffect(() => {
    const unsub = Store.subscribe(() => {
      setPendingItems(Store.getPendingReviewItems());
      setAuditLogs(Store.getReviewAudits());
    });
    return unsub;
  }, []);

  // Handle deep-linked initialTargetId
  useEffect(() => {
    if (initialTargetId) {
      if (initialSelectedType === 'PROPERTY') {
        const prop = properties.find((p) => p.id === initialTargetId);
        if (prop) setSelectedPropertyForReview(prop);
      } else if (initialSelectedType === 'KYC_LANDLORD') {
        const u = users.find((x) => x.id === initialTargetId && x.role === 'LANDLORD') as LandlordUser;
        if (u) setSelectedLandlordForReview(u);
      } else if (initialSelectedType === 'KYC_AGENT') {
        const a = users.find((x) => x.id === initialTargetId && x.role === 'AGENT') as AgentUser;
        if (a) setSelectedAgentForReview(a);
      }
    }
  }, [initialTargetId, initialSelectedType, properties, users]);

  // Metric counts
  const propertyCount = pendingItems.filter((i) => i.targetType === 'PROPERTY').length;
  const agentCount = pendingItems.filter((i) => i.targetType === 'KYC_AGENT').length;
  const landlordCount = pendingItems.filter((i) => i.targetType === 'KYC_LANDLORD').length;
  const totalPending = pendingItems.length;

  const filteredPending = pendingItems.filter((item) => {
    if (filterType !== 'ALL' && filterType !== 'AUDIT_LOGS' && item.targetType !== filterType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.titleOrName.toLowerCase().includes(q) ||
        item.submitterName.toLowerCase().includes(q) ||
        (item.submitterPhone && item.submitterPhone.includes(q)) ||
        (item.submitterEmail && item.submitterEmail.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenReview = (item: PendingReviewItem) => {
    if (item.targetType === 'PROPERTY') {
      const prop = properties.find((p) => p.id === item.targetId);
      if (prop) {
        setSelectedPropertyForReview(prop);
      }
    } else if (item.targetType === 'KYC_LANDLORD') {
      const landlord = users.find((u) => u.id === item.targetId && u.role === 'LANDLORD') as LandlordUser;
      if (landlord) {
        setSelectedLandlordForReview(landlord);
      }
    } else if (item.targetType === 'KYC_AGENT') {
      const agent = users.find((u) => u.id === item.targetId && u.role === 'AGENT') as AgentUser;
      if (agent) {
        setSelectedAgentForReview(agent);
      }
    }
  };

  const handleAgentDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentForReview || !agentActionType || isProcessingAgent) return;
    setIsProcessingAgent(true);

    try {
      if (agentActionType === 'APPROVE') {
        Store.approveAgent(selectedAgentForReview.id, 'HOMEZA Admin');
      } else if (agentActionType === 'REJECT') {
        if (!agentActionNote.trim()) {
          alert('Please enter a reason for rejecting this agent application.');
          setIsProcessingAgent(false);
          return;
        }
        Store.rejectAgent(selectedAgentForReview.id, agentActionNote.trim(), 'HOMEZA Admin');
      } else if (agentActionType === 'CORRECTION') {
        if (!agentActionNote.trim()) {
          alert('Please specify the required document or corrections.');
          setIsProcessingAgent(false);
          return;
        }
        Store.requestAgentCorrection(selectedAgentForReview.id, agentActionNote.trim(), 'HOMEZA Admin');
      }
      setIsProcessingAgent(false);
      setSelectedAgentForReview(null);
      setAgentActionType(null);
      setAgentActionNote('');
    } catch (err: any) {
      setIsProcessingAgent(false);
      alert(err?.message || 'Action failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
              Pending Reviews &amp; Verification Center
            </h2>
            {totalPending > 0 && (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-3 py-1 rounded-full">
                {totalPending} Action{totalPending > 1 ? 's' : ''} Required
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base text-stone-600 mt-1">
            Real-time moderator queue: review property listings, verify landlord KYC credentials, approve registered agents, and track audit history.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search submitter, title, phone..."
            className="w-full text-sm border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900"
          />
        </div>
      </div>

      {/* 4 Summary Pill Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setFilterType('ALL')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            filterType === 'ALL'
              ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
              : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-200'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">All Pending</span>
          <span className="text-2xl font-extrabold mt-2">{totalPending}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('PROPERTY')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            filterType === 'PROPERTY'
              ? 'bg-emerald-900 text-white border-emerald-800 shadow-sm'
              : 'bg-white hover:bg-emerald-50/50 text-stone-800 border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Properties</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-extrabold mt-2 text-emerald-600">{propertyCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('KYC_LANDLORD')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            filterType === 'KYC_LANDLORD'
              ? 'bg-amber-900 text-white border-amber-800 shadow-sm'
              : 'bg-white hover:bg-amber-50/50 text-stone-800 border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Landlord KYC</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-extrabold mt-2 text-amber-600">{landlordCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('KYC_AGENT')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            filterType === 'KYC_AGENT'
              ? 'bg-blue-900 text-white border-blue-800 shadow-sm'
              : 'bg-white hover:bg-blue-50/50 text-stone-800 border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Agent Approvals</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-extrabold mt-2 text-blue-600">{agentCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('AUDIT_LOGS')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            filterType === 'AUDIT_LOGS'
              ? 'bg-purple-900 text-white border-purple-800 shadow-sm'
              : 'bg-white hover:bg-purple-50/50 text-stone-800 border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Audit Trail</span>
            <History className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-2xl font-extrabold mt-2 text-purple-600">{auditLogs.length}</span>
        </button>
      </div>

      {/* Main Content Area */}
      {filterType === 'AUDIT_LOGS' ? (
        /* AUDIT TRAIL LOGS VIEW */
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-stone-900">Review &amp; Verification Audit Trail</h3>
              <p className="text-xs sm:text-sm text-stone-500">
                Tamper-evident history of all administrative decisions on listings, landlords, and agents.
              </p>
            </div>
            <span className="text-xs font-bold text-stone-500">{auditLogs.length} Records</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-stone-400 space-y-2">
              <History className="w-10 h-10 mx-auto text-stone-300" />
              <p className="text-sm font-semibold">No audit logs recorded yet.</p>
              <p className="text-xs text-stone-400">All approvals, rejections, and correction requests will be logged here.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 sm:p-5 hover:bg-stone-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          log.decision === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : log.decision === 'REJECTED'
                            ? 'bg-red-100 text-red-900 border border-red-300'
                            : 'bg-orange-100 text-orange-900 border border-orange-300'
                        }`}
                      >
                        {log.decision}
                      </span>
                      <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                        {log.targetType}
                      </span>
                      <strong className="font-bold text-stone-900">{log.targetTitleOrName}</strong>
                    </div>

                    <div className="text-xs text-stone-600 flex items-center gap-2 flex-wrap">
                      <span>Submitter: <strong>{log.submitterName}</strong> ({log.submitterRole})</span>
                      <span>•</span>
                      <span>Reviewer: <strong>{log.reviewerName}</strong></span>
                    </div>

                    {log.notes && (
                      <p className="text-xs text-stone-700 bg-stone-50 p-2 rounded-lg border border-stone-200/80 mt-1">
                        <strong>Notes:</strong> {log.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-stone-500 sm:text-right shrink-0">
                    {new Date(log.reviewDate).toLocaleDateString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* PENDING ITEMS LIST */
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          {filteredPending.length === 0 ? (
            <div className="p-12 sm:p-16 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-900">Review Queue is Clear!</h3>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  There are no pending submissions awaiting administrator review in this category.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredPending.map((item) => (
                <div
                  key={item.id}
                  className="p-5 sm:p-6 hover:bg-stone-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  {/* Left Column Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                          item.targetType === 'PROPERTY'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : item.targetType === 'KYC_LANDLORD'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}
                      >
                        {item.targetType === 'PROPERTY' ? (
                          <>
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Property Listing</span>
                          </>
                        ) : item.targetType === 'KYC_LANDLORD' ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Landlord KYC</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Agent KYC Application</span>
                          </>
                        )}
                      </span>

                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          item.status === 'CORRECTION_REQUIRED' || item.status === 'AGENT_CORRECTION_REQUIRED'
                            ? 'bg-orange-100 text-orange-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {item.status === 'CORRECTION_REQUIRED' || item.status === 'AGENT_CORRECTION_REQUIRED'
                          ? 'Correction Requested'
                          : 'Pending Review'}
                      </span>

                      {item.isResubmission && (
                        <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          <span>Resubmission</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-stone-900">
                      {item.titleOrName}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-stone-600">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>
                          Submitter: <strong>{item.submitterName}</strong>{' '}
                          <span className="text-xs text-stone-400">({item.submitterRole})</span>
                        </span>
                      </div>

                      {item.submitterPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{item.submitterPhone}</span>
                        </div>
                      )}

                      {item.details && (
                        <div className="sm:col-span-2 text-xs text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-200/70">
                          {item.details}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column Actions & Timestamp */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0">
                    <span className="text-xs text-stone-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        Submitted{' '}
                        {new Date(item.submittedAt).toLocaleDateString('en-NG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>

                    <button
                      type="button"
                      id={`btn-review-pending-${item.targetType}-${item.targetId}`}
                      onClick={() => handleOpenReview(item)}
                      className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-stone-900 hover:bg-stone-800 text-white transition shadow-sm cursor-pointer flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>
                        {item.targetType === 'PROPERTY'
                          ? 'Inspect Listing & Decide'
                          : item.targetType === 'KYC_LANDLORD'
                          ? 'Review Landlord KYC'
                          : 'Review Agent Credentials'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Property Review Modal */}
      {selectedPropertyForReview && (
        <AdminPropertyReviewModal
          property={selectedPropertyForReview}
          isOpen={!!selectedPropertyForReview}
          onClose={() => setSelectedPropertyForReview(null)}
          onStatusUpdated={() => {
            setSelectedPropertyForReview(null);
            setPendingItems(Store.getPendingReviewItems());
            setAuditLogs(Store.getReviewAudits());
          }}
        />
      )}

      {/* Landlord Review Modal */}
      {selectedLandlordForReview && (
        <AdminLandlordReviewModal
          landlord={selectedLandlordForReview}
          isOpen={!!selectedLandlordForReview}
          onClose={() => setSelectedLandlordForReview(null)}
          onStatusUpdated={() => {
            setSelectedLandlordForReview(null);
            setPendingItems(Store.getPendingReviewItems());
            setAuditLogs(Store.getReviewAudits());
          }}
        />
      )}

      {/* Agent Review Modal */}
      {selectedAgentForReview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5 bg-stone-950 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Agent Application Review</h2>
                  <p className="text-xs text-stone-400">Applicant: {selectedAgentForReview.fullName}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAgentForReview(null)}
                className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-5 rounded-2xl border border-stone-200">
                <div>
                  <span className="text-xs text-stone-500 block">Full Name</span>
                  <span className="font-bold text-stone-900">{selectedAgentForReview.fullName}</span>
                </div>
                <div>
                  <span className="text-xs text-stone-500 block">Agency / Business Name</span>
                  <span className="font-semibold text-stone-800">{selectedAgentForReview.agencyName || 'Independent'}</span>
                </div>
                <div>
                  <span className="text-xs text-stone-500 block">Email Address</span>
                  <span className="font-medium text-stone-800">{selectedAgentForReview.email}</span>
                </div>
                <div>
                  <span className="text-xs text-stone-500 block">Phone Number</span>
                  <span className="font-medium text-stone-800">{selectedAgentForReview.phoneNumber}</span>
                </div>
                <div>
                  <span className="text-xs text-stone-500 block">CAC Registration No.</span>
                  <span className="font-mono font-bold text-stone-900">{selectedAgentForReview.cacNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-stone-500 block">License / Practice No.</span>
                  <span className="font-mono font-bold text-stone-900">{selectedAgentForReview.licenseNumber || 'N/A'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-stone-500 block">Operating Areas</span>
                  <span className="font-semibold text-stone-800">{selectedAgentForReview.operatingArea || 'All Uyo'}</span>
                </div>
                {selectedAgentForReview.bio && (
                  <div className="sm:col-span-2">
                    <span className="text-xs text-stone-500 block">Professional Bio</span>
                    <p className="text-xs text-stone-700 mt-1">{selectedAgentForReview.bio}</p>
                  </div>
                )}
              </div>

              {/* Action Form if action selected */}
              {agentActionType && (
                <form onSubmit={handleAgentDecision} className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-4">
                  <h4 className="font-bold text-stone-900 text-sm">
                    {agentActionType === 'APPROVE'
                      ? 'Confirm Agent Approval'
                      : agentActionType === 'REJECT'
                      ? 'Decline Agent Application'
                      : 'Request Additional Agent Documents'}
                  </h4>

                  {agentActionType !== 'APPROVE' && (
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        {agentActionType === 'REJECT' ? 'Rejection Reason *' : 'Correction Instructions *'}
                      </label>
                      <textarea
                        value={agentActionNote}
                        onChange={(e) => setAgentActionNote(e.target.value)}
                        rows={3}
                        required
                        placeholder={
                          agentActionType === 'REJECT'
                            ? 'Enter reason for rejection...'
                            : 'Specify required documents (e.g. CAC certificate copy)...'
                        }
                        className="w-full text-xs sm:text-sm border border-stone-300 rounded-xl p-3 bg-white text-stone-900"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setAgentActionType(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingAgent}
                      className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition ${
                        agentActionType === 'APPROVE'
                          ? 'bg-emerald-700 hover:bg-emerald-800'
                          : agentActionType === 'REJECT'
                          ? 'bg-red-700 hover:bg-red-800'
                          : 'bg-orange-700 hover:bg-orange-800'
                      }`}
                    >
                      {isProcessingAgent ? 'Processing...' : 'Confirm Decision'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            {!agentActionType && (
              <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAgentActionType('CORRECTION');
                    setAgentActionNote('');
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-stone-100 hover:bg-orange-50 text-orange-800 border border-stone-200"
                >
                  Request Info
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAgentActionType('REJECT');
                    setAgentActionNote('');
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-stone-100 hover:bg-red-50 text-red-700 border border-stone-200"
                >
                  Decline Agent
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAgentActionType('APPROVE');
                    setAgentActionNote('');
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  Approve Agent
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

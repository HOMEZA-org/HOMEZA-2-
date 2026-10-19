import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import { AgentUser, User as UserType } from '../../types';
import { Store } from '../../services/store';

interface AgentApprovalsViewProps {
  users: UserType[];
}

export const AgentApprovalsView: React.FC<AgentApprovalsViewProps> = ({ users }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal dialog states
  const [selectedAgent, setSelectedAgent] = useState<AgentUser | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'CORRECTION' | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Filter all agents from users
  const agents = users.filter((u): u is AgentUser => u.role === 'AGENT');

  const pendingCount = agents.filter(
    (a) => a.verificationStatus === 'PENDING' || a.verificationStatus === 'PENDING_AGENT_APPROVAL'
  ).length;

  const correctionCount = agents.filter(
    (a) => a.verificationStatus === 'AGENT_CORRECTION_REQUIRED' || a.verificationStatus === 'CORRECTION_REQUIRED'
  ).length;

  const approvedCount = agents.filter(
    (a) => a.verificationStatus === 'APPROVED' || a.verificationStatus === 'VERIFIED'
  ).length;

  const rejectedCount = agents.filter((a) => a.verificationStatus === 'REJECTED').length;

  const filteredAgents = agents.filter((agent) => {
    // Status Filter
    if (statusFilter === 'PENDING') {
      if (agent.verificationStatus !== 'PENDING' && agent.verificationStatus !== 'PENDING_AGENT_APPROVAL') {
        return false;
      }
    } else if (statusFilter === 'CORRECTION') {
      if (agent.verificationStatus !== 'AGENT_CORRECTION_REQUIRED' && agent.verificationStatus !== 'CORRECTION_REQUIRED') {
        return false;
      }
    } else if (statusFilter === 'APPROVED') {
      if (agent.verificationStatus !== 'APPROVED' && agent.verificationStatus !== 'VERIFIED') {
        return false;
      }
    } else if (statusFilter === 'REJECTED') {
      if (agent.verificationStatus !== 'REJECTED') {
        return false;
      }
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = agent.fullName.toLowerCase().includes(q);
      const matchEmail = agent.email.toLowerCase().includes(q);
      const matchPhone = agent.phoneNumber.includes(q);
      const matchAgency = (agent.agencyName || '').toLowerCase().includes(q);
      const matchArea = (agent.operatingArea || '').toLowerCase().includes(q);
      const matchCac = (agent.cacNumber || '').toLowerCase().includes(q);
      const matchLic = (agent.licenseNumber || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone || matchAgency || matchArea || matchCac || matchLic;
    }

    return true;
  });

  const handleOpenActionModal = (agent: AgentUser, type: 'APPROVE' | 'REJECT' | 'CORRECTION') => {
    setSelectedAgent(agent);
    setActionType(type);
    setActionNote('');
  };

  const handleCloseModal = () => {
    setSelectedAgent(null);
    setActionType(null);
    setActionNote('');
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !actionType) return;

    if (actionType === 'APPROVE') {
      Store.approveAgent(selectedAgent.id, 'HOMEZA Admin');
      showToast('Agent approved successfully.', 'success');
    } else if (actionType === 'REJECT') {
      if (!actionNote.trim()) {
        alert('Please provide a reason for declining this agent application.');
        return;
      }
      Store.rejectAgent(selectedAgent.id, actionNote.trim(), 'HOMEZA Admin');
      showToast('Agent application rejected.', 'info');
    } else if (actionType === 'CORRECTION') {
      if (!actionNote.trim()) {
        alert('Please enter specific details on what additional information is required.');
        return;
      }
      Store.requestAgentCorrection(selectedAgent.id, actionNote.trim(), 'HOMEZA Admin');
      showToast('Correction request sent successfully.', 'info');
    }

    handleCloseModal();
  };

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED' || status === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-950 font-extrabold text-xs px-3 py-1 rounded-full border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
          <span>APPROVED</span>
        </span>
      );
    }
    if (status === 'PENDING' || status === 'PENDING_AGENT_APPROVAL') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-950 font-extrabold text-xs px-3 py-1 rounded-full border border-amber-300">
          <Clock className="w-3.5 h-3.5 text-amber-700" />
          <span>PENDING APPROVAL</span>
        </span>
      );
    }
    if (status === 'AGENT_CORRECTION_REQUIRED' || status === 'CORRECTION_REQUIRED') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-950 font-extrabold text-xs px-3 py-1 rounded-full border border-blue-300">
          <AlertCircle className="w-3.5 h-3.5 text-blue-700" />
          <span>CORRECTION REQUIRED</span>
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-950 font-extrabold text-xs px-3 py-1 rounded-full border border-red-300">
          <XCircle className="w-3.5 h-3.5 text-red-700" />
          <span>REJECTED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-800 font-bold text-xs px-3 py-1 rounded-full">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast feedback */}
      {feedbackToast && (
        <div
          id="admin-agent-feedback-toast"
          className={`fixed top-20 right-6 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-fadeIn ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : feedbackToast.type === 'error'
              ? 'bg-red-900 text-white border-red-700'
              : 'bg-stone-900 text-white border-stone-700'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm sm:text-base">{feedbackToast.message}</span>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="ml-2 text-stone-300 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & KPI Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-700" />
            <span>Agent Applications &amp; Approval</span>
          </h2>
          <p className="text-sm sm:text-base text-stone-600 mt-1">
            Review real estate intermediary credentials, verify CAC/NIESV licenses, and approve or request corrections.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, CAC, agency, license..."
            className="w-full text-sm border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 text-stone-900"
          />
        </div>
      </div>

      {/* Filter Tabs / Quick Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
              : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-50'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">All Agents</div>
          <div className="text-2xl font-black mt-1">{agents.length}</div>
        </button>

        <button
          id="btn-filter-pending-agents"
          type="button"
          onClick={() => setStatusFilter('PENDING')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'PENDING'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-50'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center justify-between">
            <span>Pending Review</span>
            {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>}
          </div>
          <div className="text-2xl font-black mt-1">{pendingCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('CORRECTION')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'CORRECTION'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-50'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Correction Required</div>
          <div className="text-2xl font-black mt-1">{correctionCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Approved</div>
          <div className="text-2xl font-black mt-1">{approvedCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'REJECTED'
              ? 'bg-red-700 text-white border-red-700 shadow-sm'
              : 'bg-white text-red-900 border-red-200 hover:bg-red-50'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Rejected</div>
          <div className="text-2xl font-black mt-1">{rejectedCount}</div>
        </button>
      </div>

      {/* Agent Applications List */}
      {filteredAgents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-stone-400 mx-auto" />
          <h3 className="text-lg font-bold text-stone-900">No agent applications found</h3>
          <p className="text-stone-500 text-sm">
            {searchQuery
              ? `No agent records matching "${searchQuery}".`
              : 'There are no agent records matching the selected status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAgents.map((agent) => {
            const isPending =
              agent.verificationStatus === 'PENDING' ||
              agent.verificationStatus === 'PENDING_AGENT_APPROVAL';
            const isApproved =
              agent.verificationStatus === 'APPROVED' ||
              agent.verificationStatus === 'VERIFIED';
            const isCorrection =
              agent.verificationStatus === 'AGENT_CORRECTION_REQUIRED' ||
              agent.verificationStatus === 'CORRECTION_REQUIRED';
            const isRejected = agent.verificationStatus === 'REJECTED';

            return (
              <div
                key={agent.id}
                id={`agent-app-card-${agent.id}`}
                className={`bg-white rounded-2xl border p-6 shadow-sm transition hover:shadow-md space-y-5 ${
                  isPending
                    ? 'border-amber-300 ring-2 ring-amber-100'
                    : isCorrection
                    ? 'border-blue-200'
                    : isRejected
                    ? 'border-red-200 opacity-90'
                    : 'border-stone-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Agent Header Info */}
                  <div className="flex items-start gap-4">
                    <img
                      src={
                        agent.avatarUrl ||
                        'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&auto=format&fit=crop&q=80'
                      }
                      alt={agent.fullName}
                      className="w-14 h-14 rounded-2xl object-cover border border-stone-200 shrink-0 shadow-xs"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-extrabold text-stone-950 text-lg sm:text-xl">
                          {agent.fullName}
                        </h3>
                        {getStatusBadge(agent.verificationStatus)}
                      </div>
                      <div className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-emerald-700" />
                        <span>{agent.agencyName || 'Independent Agent'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Submission date & status note */}
                  <div className="text-xs text-stone-500 font-medium space-y-1 lg:text-right">
                    <div>
                      Submitted:{' '}
                      <strong className="text-stone-800 font-semibold">
                        {agent.appliedDate
                          ? new Date(agent.appliedDate).toLocaleDateString('en-NG', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : new Date(agent.createdAt).toLocaleDateString('en-NG')}
                      </strong>
                    </div>
                    {agent.reviewedDate && (
                      <div>
                        Last Reviewed: {new Date(agent.reviewedDate).toLocaleDateString('en-NG')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs sm:text-sm">
                  <div>
                    <span className="text-stone-500 font-semibold uppercase tracking-wider block text-[11px]">
                      Contact Email
                    </span>
                    <span className="font-medium text-stone-900 break-all">{agent.email}</span>
                  </div>

                  <div>
                    <span className="text-stone-500 font-semibold uppercase tracking-wider block text-[11px]">
                      Phone Number
                    </span>
                    <span className="font-medium text-stone-900">{agent.phoneNumber}</span>
                  </div>

                  <div>
                    <span className="text-stone-500 font-semibold uppercase tracking-wider block text-[11px]">
                      Operating Areas
                    </span>
                    <span className="font-medium text-stone-900">
                      {agent.operatingArea || 'All Uyo Metropolitan'}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-500 font-semibold uppercase tracking-wider block text-[11px]">
                      CAC / License Number
                    </span>
                    <span className="font-bold text-stone-900">
                      {agent.cacNumber || agent.licenseNumber ? (
                        <>
                          {agent.cacNumber && <div>{agent.cacNumber}</div>}
                          {agent.licenseNumber && <div className="text-stone-600 font-normal">{agent.licenseNumber}</div>}
                        </>
                      ) : (
                        <span className="text-stone-400 font-normal">None provided</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Bio text if provided */}
                {agent.bio && (
                  <p className="text-xs sm:text-sm text-stone-700 bg-white p-3 rounded-xl border border-stone-200 italic">
                    "{agent.bio}"
                  </p>
                )}

                {/* Correction or Rejection Reason banner if present */}
                {agent.adminCorrectionNote && isCorrection && (
                  <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-xs sm:text-sm text-blue-950 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Pending Correction Request:</strong>{' '}
                      <span>{agent.adminCorrectionNote}</span>
                    </div>
                  </div>
                )}

                {agent.adminRejectionReason && isRejected && (
                  <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-xs sm:text-sm text-red-950 flex items-start gap-2.5">
                    <XCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Reason for Rejection:</strong>{' '}
                      <span>{agent.adminRejectionReason}</span>
                    </div>
                  </div>
                )}

                {/* Admin Action Buttons */}
                <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5 flex-wrap">
                  {/* Request Correction Button */}
                  <button
                    id={`btn-agent-correction-${agent.id}`}
                    type="button"
                    onClick={() => handleOpenActionModal(agent, 'CORRECTION')}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                    <span>Request Correction</span>
                  </button>

                  {/* Reject Button */}
                  {!isRejected && (
                    <button
                      id={`btn-agent-reject-${agent.id}`}
                      type="button"
                      onClick={() => handleOpenActionModal(agent, 'REJECT')}
                      className="px-4 py-2 bg-stone-100 hover:bg-red-50 text-red-700 border border-stone-300 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5 text-red-600" />
                      <span>Reject Application</span>
                    </button>
                  )}

                  {/* Approve Button */}
                  {!isApproved && (
                    <button
                      id={`btn-agent-approve-${agent.id}`}
                      type="button"
                      onClick={() => handleOpenActionModal(agent, 'APPROVE')}
                      className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-extrabold transition shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Agent</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ACTION DIALOG MODAL */}
      {selectedAgent && actionType && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-stone-200 shadow-2xl overflow-hidden">
            {/* Header */}
            <div
              className={`p-6 text-white ${
                actionType === 'APPROVE'
                  ? 'bg-emerald-800'
                  : actionType === 'REJECT'
                  ? 'bg-red-900'
                  : 'bg-blue-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {actionType === 'APPROVE' && <CheckCircle2 className="w-6 h-6 text-emerald-300" />}
                  {actionType === 'REJECT' && <XCircle className="w-6 h-6 text-red-300" />}
                  {actionType === 'CORRECTION' && <AlertCircle className="w-6 h-6 text-blue-300" />}
                  <div>
                    <h3 className="font-extrabold text-lg sm:text-xl">
                      {actionType === 'APPROVE' && 'Approve Agent Application'}
                      {actionType === 'REJECT' && 'Reject Agent Application'}
                      {actionType === 'CORRECTION' && 'Request Additional Information'}
                    </h3>
                    <p className="text-xs sm:text-sm opacity-90">
                      Applicant: {selectedAgent.fullName} ({selectedAgent.agencyName || 'Agent'})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1 rounded-lg hover:bg-white/20 text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleConfirmAction} className="p-6 space-y-5">
              {actionType === 'APPROVE' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs sm:text-sm text-emerald-950 space-y-2">
                    <p className="font-bold">
                      Are you sure you want to approve {selectedAgent.fullName} as a verified HOMEZA Agent?
                    </p>
                    <p className="text-stone-600">
                      This will unlock the full <strong>Agent Dashboard</strong>, allowing them to register clients, assist with verified property applications, and bookmark listings.
                    </p>
                  </div>

                  <div className="text-xs text-stone-500">
                    A notification will be delivered immediately to <strong>{selectedAgent.email}</strong>.
                  </div>
                </div>
              )}

              {actionType === 'REJECT' && (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs sm:text-sm text-red-950 space-y-1">
                    <p className="font-bold">Declining Agent Application</p>
                    <p className="text-stone-600 text-xs">
                      Please enter a clear explanation for declining this application. The agent will be able to see this reason.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Rejection Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="e.g. CAC registration number could not be verified in the public register..."
                      required
                      className="w-full text-sm border border-stone-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                    />
                  </div>
                </div>
              )}

              {actionType === 'CORRECTION' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs sm:text-sm text-blue-950 space-y-1">
                    <p className="font-bold">Requesting Correction / Additional Information</p>
                    <p className="text-stone-600 text-xs">
                      The agent's status will change to <strong>AGENT_CORRECTION_REQUIRED</strong>. They will receive your note and can update and resubmit their details.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Information Required <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="e.g. Please provide your active NIESV/REDAN practicing accreditation ID or upload valid business registration."
                      required
                      className="w-full text-sm border border-stone-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-100 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  id="btn-confirm-agent-action"
                  type="submit"
                  className={`px-6 py-2.5 rounded-xl text-white font-bold text-sm shadow-sm transition cursor-pointer ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : actionType === 'REJECT'
                      ? 'bg-red-700 hover:bg-red-800'
                      : 'bg-blue-700 hover:bg-blue-800'
                  }`}
                >
                  {actionType === 'APPROVE' && 'Confirm Approval'}
                  {actionType === 'REJECT' && 'Confirm Rejection'}
                  {actionType === 'CORRECTION' && 'Send Correction Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
